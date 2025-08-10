const BaseConnector = require('./BaseConnector');
const { Client: PgClient } = require('pg');
const mysql = require('mysql2/promise');
const { MongoClient } = require('mongodb');

class DatabaseConnector extends BaseConnector {
  constructor(config) {
    super(config);
    this.validateConfig();
  }

  validateConfig() {
    super.validateConfig();
    const required = ['host', 'port', 'database', 'username', 'password'];
    for (const field of required) {
      if (!this.config[field]) {
        throw new Error(`Database connector requires ${field}`);
      }
    }
  }

  async test() {
    try {
      const client = await this.createConnection();
      await this.closeConnection(client);
      return { success: true, message: 'Database connection successful' };
    } catch (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  async sync() {
    this.log('info', 'Starting database sync', { config: this.sanitizeConfig() });
    
    try {
      const client = await this.createConnection();
      
      switch (this.config.type || 'postgresql') {
        case 'postgresql':
          await this.syncPostgreSQL(client);
          break;
        case 'mysql':
          await this.syncMySQL(client);
          break;
        case 'mongodb':
          await this.syncMongoDB(client);
          break;
        default:
          throw new Error(`Unsupported database type: ${this.config.type}`);
      }
      
      await this.closeConnection(client);
      
      this.log('info', 'Database sync completed', {
        componentsFound: this.components.length
      });
      
      return this.components;
    } catch (error) {
      this.log('error', 'Database sync failed', { error: error.message });
      throw error;
    }
  }

  async createConnection() {
    const dbType = this.config.type || 'postgresql';
    
    switch (dbType) {
      case 'postgresql':
        const pgClient = new PgClient({
          host: this.config.host,
          port: this.config.port,
          database: this.config.database,
          user: this.config.username,
          password: this.config.password,
          ssl: this.config.ssl || false,
          connectionTimeoutMillis: 10000
        });
        await pgClient.connect();
        return pgClient;
        
      case 'mysql':
        return await mysql.createConnection({
          host: this.config.host,
          port: this.config.port,
          database: this.config.database,
          user: this.config.username,
          password: this.config.password,
          ssl: this.config.ssl || false,
          connectTimeout: 10000
        });
        
      case 'mongodb':
        const mongoUrl = `mongodb://${this.config.username}:${this.config.password}@${this.config.host}:${this.config.port}/${this.config.database}`;
        const client = new MongoClient(mongoUrl, {
          serverSelectionTimeoutMS: 10000
        });
        await client.connect();
        return client;
        
      default:
        throw new Error(`Unsupported database type: ${dbType}`);
    }
  }

  async closeConnection(client) {
    try {
      if (this.config.type === 'mongodb') {
        await client.close();
      } else {
        await client.end();
      }
    } catch (error) {
      this.log('warn', 'Error closing connection', { error: error.message });
    }
  }

  async syncPostgreSQL(client) {
    const tablesToScan = this.config.tables === 'all' ? null : this.config.tables;
    
    let query = `
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    if (tablesToScan && tablesToScan.length > 0) {
      const tableList = tablesToScan.map(t => `'${t}'`).join(',');
      query += ` AND table_name IN (${tableList})`;
    }
    
    const result = await client.query(query);
    
    for (const row of result.rows) {
      const tableName = row.table_name;
      const tableType = row.table_type;
      
      const countResult = await client.query(`SELECT COUNT(*) FROM "${tableName}"`);
      const rowCount = parseInt(countResult.rows[0].count);
      
      const columnsResult = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = $1 AND table_schema = 'public'
        ORDER BY ordinal_position
      `, [tableName]);
      
      const tag = this.generateTag(tableName, 'db');
      
      this.addComponent(
        `${this.config.database}.${tableName}`,
        'DB',
        {
          database: this.config.database,
          table: tableName,
          tableType,
          rowCount,
          columns: columnsResult.rows.map(col => ({
            name: col.column_name,
            type: col.data_type,
            nullable: col.is_nullable === 'YES'
          })),
          host: this.config.host,
          port: this.config.port
        }
      );
    }
  }

  async syncMySQL(client) {
    const tablesToScan = this.config.tables === 'all' ? null : this.config.tables;
    
    let query = 'SHOW TABLES';
    const [tables] = await client.execute(query);
    
    for (const tableRow of tables) {
      const tableName = Object.values(tableRow)[0];
      
      if (tablesToScan && tablesToScan.length > 0 && !tablesToScan.includes(tableName)) {
        continue;
      }
      
      const [countResult] = await client.execute(`SELECT COUNT(*) as count FROM \`${tableName}\``);
      const rowCount = countResult[0].count;
      
      const [columnsResult] = await client.execute(`DESCRIBE \`${tableName}\``);
      
      const tag = this.generateTag(tableName, 'db');
      
      this.addComponent(
        `${this.config.database}.${tableName}`,
        'DB',
        {
          database: this.config.database,
          table: tableName,
          rowCount,
          columns: columnsResult.map(col => ({
            name: col.Field,
            type: col.Type,
            nullable: col.Null === 'YES',
            key: col.Key,
            default: col.Default
          })),
          host: this.config.host,
          port: this.config.port
        }
      );
    }
  }

  async syncMongoDB(client) {
    const db = client.db(this.config.database);
    const collections = await db.listCollections().toArray();
    
    const collectionsToScan = this.config.collections === 'all' ? null : this.config.collections;
    
    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      
      if (collectionsToScan && collectionsToScan.length > 0 && !collectionsToScan.includes(collectionName)) {
        continue;
      }
      
      const collection = db.collection(collectionName);
      const documentCount = await collection.countDocuments();
      
      const sampleDoc = await collection.findOne();
      const fields = sampleDoc ? Object.keys(sampleDoc) : [];
      
      const tag = this.generateTag(collectionName, 'db');
      
      this.addComponent(
        `${this.config.database}.${collectionName}`,
        'DB',
        {
          database: this.config.database,
          collection: collectionName,
          documentCount,
          sampleFields: fields,
          host: this.config.host,
          port: this.config.port
        }
      );
    }
  }

  sanitizeConfig() {
    const sanitized = { ...this.config };
    delete sanitized.password;
    return sanitized;
  }
}

module.exports = DatabaseConnector;