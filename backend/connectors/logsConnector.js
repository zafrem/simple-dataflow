const BaseConnector = require('./BaseConnector');
const fs = require('fs').promises;
const path = require('path');
const chokidar = require('chokidar');
const { glob } = require('glob');

class LogsConnector extends BaseConnector {
  constructor(config) {
    super(config);
    this.validateConfig();
    this.watcher = null;
    this.processedLines = new Set();
  }

  validateConfig() {
    super.validateConfig();
    if (!this.config.path) {
      throw new Error('Logs connector requires path configuration');
    }
    if (!this.config.regex) {
      throw new Error('Logs connector requires regex pattern');
    }
  }

  async test() {
    try {
      const files = await this.getLogFiles();
      if (files.length === 0) {
        throw new Error('No log files found matching the specified pattern');
      }
      
      // Test regex pattern
      const regex = new RegExp(this.config.regex, 'g');
      if (!regex) {
        throw new Error('Invalid regex pattern');
      }
      
      return { 
        success: true, 
        message: `Found ${files.length} log file(s)`,
        files: files.slice(0, 5) // Show first 5 files
      };
    } catch (error) {
      throw new Error(`Log connector test failed: ${error.message}`);
    }
  }

  async sync() {
    this.log('info', 'Starting logs sync', { config: this.sanitizeConfig() });
    
    try {
      const files = await this.getLogFiles();
      
      if (files.length === 0) {
        this.log('warn', 'No log files found');
        return this.components;
      }
      
      for (const file of files) {
        await this.processLogFile(file);
      }
      
      if (this.config.watchMode) {
        await this.startWatching();
      }
      
      this.log('info', 'Logs sync completed', {
        filesProcessed: files.length,
        componentsFound: this.components.length
      });
      
      return this.components;
    } catch (error) {
      this.log('error', 'Logs sync failed', { error: error.message });
      throw error;
    }
  }

  async getLogFiles() {
    try {
      const files = await glob(this.config.path, {
        absolute: true,
        ignore: this.config.ignore || ['**/node_modules/**', '**/.*']
      });
      
      const validFiles = [];
      for (const file of files) {
        try {
          const stats = await fs.stat(file);
          if (stats.isFile()) {
            validFiles.push(file);
          }
        } catch (error) {
          this.log('warn', `Cannot access file ${file}`, { error: error.message });
        }
      }
      
      return validFiles.sort((a, b) => {
        return fs.stat(b).then(bStats => fs.stat(a).then(aStats => 
          bStats.mtime - aStats.mtime
        ));
      });
    } catch (error) {
      this.log('error', 'Error getting log files', { error: error.message });
      return [];
    }
  }

  async processLogFile(filePath) {
    try {
      this.log('info', `Processing log file: ${filePath}`);
      
      const content = await fs.readFile(filePath, 'utf8');
      const lines = content.split('\n');
      const regex = new RegExp(this.config.regex, 'g');
      
      const matches = new Map();
      let lineNumber = 0;
      
      for (const line of lines) {
        lineNumber++;
        
        if (this.config.maxLines && lineNumber > this.config.maxLines) {
          break;
        }
        
        let match;
        regex.lastIndex = 0; // Reset regex for each line
        
        while ((match = regex.exec(line)) !== null) {
          const matchedValue = match[1] || match[0]; // Use first capture group or full match
          
          if (!matchedValue || matchedValue.length < 2) {
            continue;
          }
          
          const lineId = `${filePath}:${lineNumber}:${match.index}`;
          if (this.processedLines.has(lineId)) {
            continue;
          }
          
          this.processedLines.add(lineId);
          
          if (!matches.has(matchedValue)) {
            matches.set(matchedValue, {
              name: matchedValue,
              count: 0,
              firstSeen: lineNumber,
              lastSeen: lineNumber,
              contexts: []
            });
          }
          
          const entry = matches.get(matchedValue);
          entry.count++;
          entry.lastSeen = lineNumber;
          
          if (entry.contexts.length < 5) {
            entry.contexts.push({
              line: lineNumber,
              context: line.trim(),
              timestamp: this.extractTimestamp(line)
            });
          }
        }
      }
      
      const fileStats = await fs.stat(filePath);
      
      for (const [matchValue, data] of matches) {
        const tag = this.generateTag(matchValue, 'app');
        
        this.addComponent(
          data.name,
          'APP',
          {
            logFile: path.basename(filePath),
            logPath: filePath,
            fileSize: fileStats.size,
            fileModified: fileStats.mtime,
            matchCount: data.count,
            firstSeenLine: data.firstSeen,
            lastSeenLine: data.lastSeen,
            contexts: data.contexts,
            regex: this.config.regex
          }
        );
      }
      
      this.log('info', `Processed ${filePath}: found ${matches.size} unique matches`);
      
    } catch (error) {
      this.log('error', `Error processing log file ${filePath}`, { error: error.message });
    }
  }

  async startWatching() {
    if (this.watcher) {
      await this.stopWatching();
    }
    
    this.log('info', 'Starting file watcher', { path: this.config.path });
    
    this.watcher = chokidar.watch(this.config.path, {
      ignored: this.config.ignore || ['**/node_modules/**', '**/.*'],
      persistent: true,
      usePolling: this.config.usePolling || false,
      interval: this.config.watchInterval || 1000
    });
    
    this.watcher.on('change', async (filePath) => {
      this.log('info', `Log file changed: ${filePath}`);
      await this.processLogFile(filePath);
    });
    
    this.watcher.on('add', async (filePath) => {
      this.log('info', `New log file detected: ${filePath}`);
      await this.processLogFile(filePath);
    });
    
    this.watcher.on('error', (error) => {
      this.log('error', 'File watcher error', { error: error.message });
    });
  }

  async stopWatching() {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
      this.log('info', 'File watcher stopped');
    }
  }

  extractTimestamp(line) {
    const timestampPatterns = [
      /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?)/,
      /(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/,
      /(\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2})/,
      /(\d{10,13})/ // Unix timestamp
    ];
    
    for (const pattern of timestampPatterns) {
      const match = line.match(pattern);
      if (match) {
        try {
          const timestamp = match[1];
          if (/^\d{10,13}$/.test(timestamp)) {
            // Unix timestamp
            const ms = timestamp.length === 10 ? parseInt(timestamp) * 1000 : parseInt(timestamp);
            return new Date(ms).toISOString();
          } else {
            return new Date(timestamp).toISOString();
          }
        } catch (error) {
          // Invalid timestamp, continue to next pattern
        }
      }
    }
    
    return null;
  }

  async cleanup() {
    await this.stopWatching();
    this.processedLines.clear();
    await super.cleanup();
  }

  sanitizeConfig() {
    const sanitized = { ...this.config };
    // Remove any sensitive file paths if needed
    return sanitized;
  }
}

module.exports = LogsConnector;