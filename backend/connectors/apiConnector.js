const BaseConnector = require('./BaseConnector');
const axios = require('axios');
const SwaggerParser = require('swagger-parser');
const yaml = require('yamljs');

class APIConnector extends BaseConnector {
  constructor(config) {
    super(config);
    this.validateConfig();
  }

  validateConfig() {
    super.validateConfig();
    if (!this.config.swaggerUrl && !this.config.baseUrl) {
      throw new Error('API connector requires either swaggerUrl or baseUrl');
    }
  }

  async test() {
    try {
      if (this.config.swaggerUrl) {
        await this.fetchSwaggerDoc();
      } else if (this.config.baseUrl) {
        await this.testBaseUrl();
      }
      return { success: true, message: 'API connection successful' };
    } catch (error) {
      throw new Error(`API connection failed: ${error.message}`);
    }
  }

  async sync() {
    this.log('info', 'Starting API sync', { config: this.sanitizeConfig() });
    
    try {
      if (this.config.swaggerUrl) {
        await this.syncFromSwagger();
      } else if (this.config.endpoints) {
        await this.syncFromEndpoints();
      } else {
        await this.discoverEndpoints();
      }
      
      this.log('info', 'API sync completed', {
        componentsFound: this.components.length
      });
      
      return this.components;
    } catch (error) {
      this.log('error', 'API sync failed', { error: error.message });
      throw error;
    }
  }

  async syncFromSwagger() {
    const swaggerDoc = await this.fetchSwaggerDoc();
    const api = await SwaggerParser.validate(swaggerDoc);
    
    const serviceName = api.info?.title || this.extractServiceName(this.config.swaggerUrl);
    const version = api.info?.version || '1.0.0';
    
    const tag = this.generateTag(serviceName, 'api');
    
    const endpoints = [];
    const paths = api.paths || {};
    
    for (const [path, pathItem] of Object.entries(paths)) {
      for (const [method, operation] of Object.entries(pathItem)) {
        if (['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].includes(method)) {
          endpoints.push({
            path,
            method: method.toUpperCase(),
            operationId: operation.operationId,
            summary: operation.summary,
            tags: operation.tags || [],
            parameters: operation.parameters || [],
            responses: Object.keys(operation.responses || {})
          });
        }
      }
    }
    
    this.addComponent(
      serviceName,
      'API',
      {
        baseUrl: this.config.baseUrl || api.servers?.[0]?.url || '',
        version,
        swaggerUrl: this.config.swaggerUrl,
        endpointCount: endpoints.length,
        endpoints: endpoints.slice(0, 50), // Limit to first 50 for metadata
        specification: {
          openapi: api.openapi || api.swagger,
          info: api.info,
          servers: api.servers
        }
      }
    );

    for (const endpoint of endpoints) {
      if (endpoint.tags && endpoint.tags.length > 0) {
        for (const tagName of endpoint.tags) {
          const endpointTag = this.generateTag(`${serviceName}_${tagName}`, 'api');
          
          this.addComponent(
            `${serviceName} - ${tagName}`,
            'API',
            {
              baseUrl: this.config.baseUrl || api.servers?.[0]?.url || '',
              service: serviceName,
              tag: tagName,
              endpointPath: endpoint.path,
              method: endpoint.method,
              operationId: endpoint.operationId,
              summary: endpoint.summary
            }
          );
        }
      }
    }
  }

  async syncFromEndpoints() {
    const baseUrl = this.config.baseUrl;
    const endpoints = this.config.endpoints || [];
    
    for (const endpoint of endpoints) {
      try {
        const response = await this.makeRequest(endpoint.method || 'GET', `${baseUrl}${endpoint.path}`);
        
        const endpointName = endpoint.name || `${endpoint.method || 'GET'} ${endpoint.path}`;
        const tag = this.generateTag(endpointName, 'api');
        
        this.addComponent(
          endpointName,
          'API',
          {
            baseUrl,
            path: endpoint.path,
            method: endpoint.method || 'GET',
            status: response.status,
            responseTime: response.responseTime,
            lastChecked: new Date().toISOString()
          }
        );
      } catch (error) {
        this.log('warn', `Failed to check endpoint ${endpoint.path}`, { error: error.message });
      }
    }
  }

  async discoverEndpoints() {
    const baseUrl = this.config.baseUrl;
    const commonPaths = [
      '/health', '/status', '/api', '/v1', '/docs', '/swagger',
      '/users', '/auth', '/login', '/logout', '/admin'
    ];
    
    const discoveredEndpoints = [];
    
    for (const path of commonPaths) {
      try {
        const response = await this.makeRequest('GET', `${baseUrl}${path}`);
        if (response.status < 400) {
          discoveredEndpoints.push({
            path,
            method: 'GET',
            status: response.status,
            responseTime: response.responseTime
          });
        }
      } catch (error) {
        // Ignore failed requests during discovery
      }
    }
    
    if (discoveredEndpoints.length > 0) {
      const serviceName = this.extractServiceName(baseUrl);
      const tag = this.generateTag(serviceName, 'api');
      
      this.addComponent(
        serviceName,
        'API',
        {
          baseUrl,
          discoveredEndpoints,
          endpointCount: discoveredEndpoints.length,
          discoveryMethod: 'path_scanning',
          lastDiscovered: new Date().toISOString()
        }
      );
    }
  }

  async fetchSwaggerDoc() {
    const response = await this.makeRequest('GET', this.config.swaggerUrl);
    
    if (response.data) {
      // Try to parse as JSON first, then YAML
      try {
        return typeof response.data === 'object' ? response.data : JSON.parse(response.data);
      } catch (jsonError) {
        try {
          return yaml.parse(response.data);
        } catch (yamlError) {
          throw new Error('Could not parse swagger documentation as JSON or YAML');
        }
      }
    }
    
    throw new Error('No swagger documentation found');
  }

  async testBaseUrl() {
    await this.makeRequest('GET', this.config.baseUrl);
  }

  async makeRequest(method, url, data = null) {
    const startTime = Date.now();
    
    const config = {
      method,
      url,
      timeout: this.config.timeout || 10000,
      headers: {
        'User-Agent': 'DataFlow-Connector/1.0',
        'Accept': 'application/json, text/plain, */*'
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    if (this.config.authentication) {
      switch (this.config.authentication.type) {
        case 'bearer':
          config.headers.Authorization = `Bearer ${this.config.authentication.token}`;
          break;
        case 'basic':
          config.auth = {
            username: this.config.authentication.username,
            password: this.config.authentication.password
          };
          break;
        case 'apikey':
          config.headers[this.config.authentication.header || 'X-API-Key'] = this.config.authentication.key;
          break;
      }
    }
    
    try {
      const response = await axios(config);
      const responseTime = Date.now() - startTime;
      
      return {
        status: response.status,
        data: response.data,
        headers: response.headers,
        responseTime
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      if (error.response) {
        return {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers,
          responseTime,
          error: error.message
        };
      }
      
      throw error;
    }
  }

  extractServiceName(url) {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.replace(/^www\./, '');
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      
      if (pathParts.length > 0 && pathParts[0] !== 'api') {
        return `${hostname}_${pathParts[0]}`;
      }
      
      return hostname.replace(/\./g, '_');
    } catch (error) {
      return 'unknown_api';
    }
  }

  sanitizeConfig() {
    const sanitized = { ...this.config };
    if (sanitized.authentication) {
      sanitized.authentication = { ...sanitized.authentication };
      delete sanitized.authentication.token;
      delete sanitized.authentication.password;
      delete sanitized.authentication.key;
    }
    return sanitized;
  }
}

module.exports = APIConnector;