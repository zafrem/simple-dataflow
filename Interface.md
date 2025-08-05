# Simple Dataflow - System Interfaces Documentation

## Overview

This document describes the external interfaces, API endpoints, data formats, and integration points for the Simple Dataflow application - a real-time data visualization and discovery platform.

## System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  External Data  │───▶│  Simple Dataflow │───▶│   Visualized    │
│    Sources      │    │    Platform      │    │  Data Network   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Table of Contents

1. [Web Interface](#web-interface)
2. [REST API Endpoints](#rest-api-endpoints)
3. [WebSocket Interface](#websocket-interface)
4. [Data Connector Interfaces](#data-connector-interfaces)
5. [Data Import/Export Formats](#data-importexport-formats)
6. [Docker Integration](#docker-integration)
7. [Database Schema](#database-schema)
8. [Authentication & Authorization](#authentication--authorization)

---

## Web Interface

### Frontend Application
- **URL**: `http://localhost:3000` (development)
- **Technology**: Vue.js 3 with Vite
- **Features**:
  - Interactive network graph visualization
  - Real-time data updates via WebSocket
  - Domain-based filtering and grouping
  - Component relationship mapping
  - Anomaly log monitoring

### User Interface Components
- **Dashboard**: Main network visualization
- **Data Diagram**: Sankey flow diagrams
- **Data View**: Tabular data exploration
- **Groups**: Component group management
- **Domains**: Business domain organization
- **Settings**: System configuration
- **Anomaly Log**: System monitoring and alerts

---

## REST API Endpoints

### Base URL
```
http://localhost:3001/api
```

### Health Check
```http
GET /health
```
**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-08-05T12:45:23.838Z",
  "uptime": 119.903,
  "database": "connected",
  "redis": "connected",
  "memory": {
    "rss": 61108224,
    "heapTotal": 26619904,
    "heapUsed": 24699960
  },
  "version": "1.0.0"
}
```

### Components API

#### List Components
```http
GET /components
```
**Query Parameters:**
- `type`: Filter by component type (DB, API, APP, STORAGE, PIPES)
- `domain`: Filter by domain name
- `source`: Filter by source system
- `team`: Filter by team name
- `search`: Text search in name/description
- `limit`: Pagination limit (default: 50)
- `offset`: Pagination offset (default: 0)

**Response:**
```json
{
  "components": [
    {
      "id": "uuid",
      "name": "user-service-api",
      "tag": "user.api.main",
      "type": "API",
      "source": "kubernetes",
      "domain": "user-management",
      "description": "User management REST API",
      "metadata": {
        "endpoints": 15,
        "version": "v2.1.0",
        "protocol": "https"
      },
      "isActive": true,
      "lastSeen": "2025-08-05T12:00:00Z",
      "team": "backend-team",
      "createdAt": "2025-08-01T10:00:00Z",
      "updatedAt": "2025-08-05T12:00:00Z"
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

#### Create Component
```http
POST /components
Content-Type: application/json
```
**Request Body:**
```json
{
  "name": "payment-database",
  "tag": "payment.db.primary",
  "type": "DB",
  "source": "aws-rds",
  "domain": "payments",
  "description": "Primary payment processing database",
  "metadata": {
    "engine": "postgresql",
    "version": "15.2",
    "tables": 23
  },
  "team": "data-team"
}
```

#### Bulk Create Components
```http
POST /components/bulk
Content-Type: application/json
```
**Request Body:**
```json
{
  "components": [
    {
      "name": "service-1",
      "tag": "service1.api",
      "type": "API",
      "domain": "core"
    },
    {
      "name": "service-2",
      "tag": "service2.api",
      "type": "API",
      "domain": "core"
    }
  ]
}
```

### Connections API

#### Get Graph Data
```http
GET /connections/graph
```
**Query Parameters:**
- `viewMode`: `domains` | `components` | `groups`
- `includeIsolated`: `true` | `false`
- `domain`: Filter by specific domain

**Response:**
```json
{
  "nodes": [
    {
      "id": "comp-uuid-1",
      "name": "user-api",
      "type": "API",
      "domain": "users",
      "group": "api-services",
      "metadata": {}
    }
  ],
  "edges": [
    {
      "source": "comp-uuid-1",
      "target": "comp-uuid-2",
      "connectionType": "domain",
      "strength": 0.8,
      "metadata": {
        "protocol": "https",
        "direction": "outbound"
      }
    }
  ]
}
```

#### Create Connection
```http
POST /connections
Content-Type: application/json
```
**Request Body:**
```json
{
  "sourceId": "source-component-uuid",
  "targetId": "target-component-uuid",
  "connectionType": "direct",
  "strength": 0.9,
  "metadata": {
    "protocol": "tcp",
    "port": 5432,
    "description": "Database connection"
  }
}
```

### Domains API

#### List Domains
```http
GET /domains
```
**Response:**
```json
{
  "domains": [
    {
      "id": "uuid",
      "name": "user-management",
      "description": "User authentication and profile management",
      "color": "#2196F3",
      "metadata": {
        "owner": "platform-team",
        "criticality": "high"
      },
      "pipelines": {
        "data_flow": ["DB", "APP", "API"],
        "backup_flow": ["DB", "STORAGE"]
      },
      "isActive": true,
      "components": [
        {
          "id": "comp-uuid",
          "name": "user-db",
          "type": "DB"
        }
      ]
    }
  ]
}
```

### Component Groups API

#### List Groups
```http
GET /groups
```
**Query Parameters:**
- `includeComponents`: `true` | `false`
- `groupType`: `LOGICAL` | `PHYSICAL` | `FUNCTIONAL` | `SERVICE`

**Response:**
```json
{
  "groups": [
    {
      "id": "uuid",
      "name": "api-gateway-cluster",
      "description": "API Gateway service cluster",
      "groupType": "SERVICE",
      "domain": "infrastructure",
      "color": "#4CAF50",
      "position": {
        "x": 100,
        "y": 200
      },
      "components": [
        {
          "id": "comp-uuid",
          "name": "api-gateway-1",
          "membership": {
            "role": "LEADER",
            "addedAt": "2025-08-01T10:00:00Z"
          }
        }
      ]
    }
  ]
}
```

### Connectors API

#### List Connectors
```http
GET /connectors
```
**Response:**
```json
{
  "connectors": [
    {
      "id": "uuid",
      "name": "Production Database Discovery",
      "type": "database",
      "config": {
        "host": "db.example.com",
        "port": 5432,
        "database": "production",
        "ssl": true,
        "tables": ["users", "orders", "products"]
      },
      "schedule": "0 2 * * *",
      "isActive": true,
      "status": "completed",
      "lastRun": "2025-08-05T02:00:00Z",
      "nextRun": "2025-08-06T02:00:00Z",
      "successCount": 45,
      "errorCount": 2
    }
  ]
}
```

#### Test Connector
```http
POST /connectors/{id}/test
```
**Response:**
```json
{
  "success": true,
  "message": "Connection successful",
  "discoveredItems": 23,
  "testResults": {
    "connection": "success",
    "authentication": "success",
    "discovery": "success"
  }
}
```

### Sync API

#### Trigger Sync Job
```http
POST /sync/trigger
Content-Type: application/json
```
**Request Body:**
```json
{
  "connectorId": "connector-uuid",
  "priority": "high"
}
```

#### Get Sync Status
```http
GET /sync/status
```
**Response:**
```json
{
  "queue": {
    "waiting": 2,
    "active": 1,
    "completed": 45,
    "failed": 3
  },
  "activeJobs": [
    {
      "id": "job-uuid",
      "connectorId": "connector-uuid",
      "connectorName": "API Discovery",
      "status": "active",
      "progress": 65,
      "startedAt": "2025-08-05T12:30:00Z"
    }
  ]
}
```

---

## WebSocket Interface

### Connection
```javascript
// Frontend connection
const socket = io('http://localhost:3001');
```

### Event Subscriptions
```javascript
// Subscribe to component updates
socket.emit('subscribe', 'components');

// Subscribe to connection updates
socket.emit('subscribe', 'connections');

// Subscribe to sync job updates
socket.emit('subscribe', 'sync');
```

### Real-time Events

#### Component Events
```javascript
socket.on('component:created', (component) => {
  // Handle new component
});

socket.on('component:updated', (component) => {
  // Handle component update
});

socket.on('component:deleted', (componentId) => {
  // Handle component deletion
});
```

#### Sync Events
```javascript
socket.on('sync:started', (job) => {
  // Job started
});

socket.on('sync:progress', (job) => {
  // Job progress update
  console.log(`Progress: ${job.progress}%`);
});

socket.on('sync:completed', (job) => {
  // Job completed successfully
});

socket.on('sync:failed', (job) => {
  // Job failed
});
```

---

## Data Connector Interfaces

### Database Connector

#### Configuration
```json
{
  "type": "database",
  "config": {
    "host": "localhost",
    "port": 5432,
    "database": "myapp",
    "username": "user",
    "password": "password",
    "ssl": false,
    "schema": "public",
    "tables": ["users", "orders", "products"],
    "excludeTables": ["logs", "temp_*"],
    "connectionTimeout": 30000
  }
}
```

#### Discovered Component Format
```json
{
  "name": "users_table",
  "tag": "myapp.db.users",
  "type": "DB",
  "source": "postgresql",
  "metadata": {
    "engine": "postgresql",
    "schema": "public",
    "table": "users",
    "columns": 12,
    "primaryKey": "id",
    "indexes": 3,
    "constraints": ["fk_user_role"]
  }
}
```

### API Connector

#### Configuration
```json
{
  "type": "api",
  "config": {
    "baseUrl": "https://api.example.com",
    "authentication": {
      "type": "bearer",
      "token": "jwt-token"
    },
    "documentation": {
      "type": "openapi",
      "url": "https://api.example.com/swagger.json"
    },
    "endpoints": ["/users", "/orders", "/products"],
    "timeout": 10000
  }
}
```

#### Discovered Component Format
```json
{
  "name": "user_management_api",
  "tag": "api.example.users",
  "type": "API",
  "source": "openapi",
  "metadata": {
    "baseUrl": "https://api.example.com",
    "version": "v2",
    "endpoints": 15,
    "authentication": "bearer",
    "methods": ["GET", "POST", "PUT", "DELETE"],
    "responseFormats": ["json"]
  }
}
```

### Logs Connector

#### Configuration
```json
{
  "type": "logs",
  "config": {
    "logFiles": [
      "/var/log/application.log",
      "/var/log/service-*.log"
    ],
    "patterns": {
      "component": "\\[([A-Z_]+)\\]",
      "service": "service-([a-z0-9-]+)",
      "connection": "connecting to ([a-zA-Z0-9.-]+)"
    },
    "watchMode": true,
    "maxFileSize": "100MB"
  }
}
```

---

## Data Import/Export Formats

### CSV Import Format

#### Components CSV
```csv
name,tag,type,source,domain,description,team,metadata
user-service,user.api,API,kubernetes,users,User management API,backend-team,"{""version"":""2.1.0""}"
user-db,user.db,DB,postgresql,users,User database,data-team,"{""tables"":15}"
```

#### Connections CSV
```csv
sourceTag,targetTag,connectionType,strength,metadata
user.api,user.db,direct,0.9,"{""protocol"":""tcp"",""port"":5432}"
user.api,auth.api,domain,0.7,"{""method"":""rest""}"
```

#### Domains CSV
```csv
name,description,color,pipelines,metadata
users,User management domain,#2196F3,"{""flow"":[""DB"",""APP"",""API""]}","{""owner"":""platform-team""}"
payments,Payment processing,#4CAF50,"{""flow"":[""DB"",""APP"",""API""]}","{""criticality"":""high""}"
```

### Bulk Operations

#### Import Request
```http
POST /components/import
Content-Type: multipart/form-data

file: components.csv
options: {
  "validate": true,
  "dryRun": false,
  "updateExisting": true
}
```

#### Export Request
```http
GET /components/export?format=csv&domain=users
```

---

## Docker Integration

### Docker Compose Services

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: dataflow_db
      POSTGRES_USER: dataflow
      POSTGRES_PASSWORD: dataflow_pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      NODE_ENV: development
      DB_HOST: postgres
      DB_PORT: 5432
      REDIS_HOST: redis
      REDIS_PORT: 6379
    depends_on:
      - postgres
      - redis

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      VITE_API_URL: http://localhost:3001/api
      VITE_SOCKET_URL: http://localhost:3001
```

### Environment Variables

#### Backend Environment
```bash
NODE_ENV=development
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dataflow_db
DB_USER=dataflow
DB_PASSWORD=dataflow_pass
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-secret-key
```

#### Frontend Environment
```bash
VITE_API_URL=http://localhost:3001/api
VITE_SOCKET_URL=http://localhost:3001
```

---

## Database Schema

### Core Tables

#### Components
```sql
CREATE TABLE components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  tag VARCHAR(255) UNIQUE NOT NULL,
  type VARCHAR(50) NOT NULL, -- DB, API, APP, STORAGE, PIPES
  source VARCHAR(255),
  domain VARCHAR(255),
  description TEXT,
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_seen TIMESTAMP WITH TIME ZONE,
  team VARCHAR(255),
  connector_id UUID REFERENCES connectors(id),
  domain_id UUID REFERENCES domains(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Connections
```sql
CREATE TABLE connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES components(id),
  target_id UUID NOT NULL REFERENCES components(id),
  domain VARCHAR(255),
  connection_type VARCHAR(50) DEFAULT 'direct', -- domain, direct, inferred
  strength DECIMAL(3,2) DEFAULT 1.0, -- 0.0 to 1.0
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Domains
```sql
CREATE TABLE domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#2196F3',
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  pipelines JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## Authentication & Authorization

### API Key Authentication
```http
Authorization: Bearer <api-key>
```

### JWT Token Authentication
```http
Authorization: Bearer <jwt-token>
```

### Role-Based Access Control
- **Admin**: Full system access
- **Editor**: Create/update components and connections
- **Viewer**: Read-only access
- **Connector**: Automated connector access

### Security Headers
```http
X-API-Version: 1.0
X-Client-ID: client-identifier
X-Request-ID: unique-request-id
```

---

## Error Handling

### Error Response Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid component type",
    "details": {
      "field": "type",
      "allowedValues": ["DB", "API", "APP", "STORAGE", "PIPES"]
    },
    "requestId": "req-uuid"
  }
}
```

### Common Error Codes
- `VALIDATION_ERROR`: Request validation failed
- `NOT_FOUND`: Resource not found
- `DUPLICATE_ENTRY`: Unique constraint violation
- `CONNECTOR_ERROR`: Connector configuration or execution error
- `QUEUE_ERROR`: Job queue operation failed
- `DATABASE_ERROR`: Database operation error

---

## Rate Limiting

### API Rate Limits
- **Standard endpoints**: 1000 requests/hour
- **Bulk operations**: 100 requests/hour
- **Connector sync**: 10 requests/hour
- **Export operations**: 50 requests/hour

### Headers
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1625097600
```

---

## Monitoring & Observability

### Health Check Endpoints
- `GET /health` - Overall system health
- `GET /health/database` - Database connectivity
- `GET /health/redis` - Redis connectivity
- `GET /health/connectors` - Connector status

### Metrics Endpoints
- `GET /metrics` - Prometheus metrics
- `GET /stats` - System statistics
- `GET /api/sync/health` - Queue health

### Log Formats
```json
{
  "timestamp": "2025-08-05T12:00:00Z",
  "level": "info",
  "service": "dataflow-backend",
  "message": "Component created",
  "metadata": {
    "componentId": "uuid",
    "userId": "user-uuid",
    "requestId": "req-uuid"
  }
}
```

---

## Integration Examples

### JavaScript/Node.js
```javascript
const axios = require('axios');
const io = require('socket.io-client');

// REST API client
const client = axios.create({
  baseURL: 'http://localhost:3001/api',
  headers: {
    'Authorization': 'Bearer your-api-key'
  }
});

// Create component
const component = await client.post('/components', {
  name: 'my-service',
  tag: 'myservice.api',
  type: 'API',
  domain: 'core'
});

// WebSocket client
const socket = io('http://localhost:3001');
socket.emit('subscribe', 'components');
socket.on('component:created', (data) => {
  console.log('New component:', data);
});
```

### Python
```python
import requests
import socketio

# REST API client
headers = {'Authorization': 'Bearer your-api-key'}
response = requests.post(
    'http://localhost:3001/api/components',
    json={
        'name': 'python-service',
        'tag': 'python.api',
        'type': 'API',
        'domain': 'analytics'
    },
    headers=headers
)

# WebSocket client
sio = socketio.Client()
sio.connect('http://localhost:3001')
sio.emit('subscribe', 'components')

@sio.on('component:created')
def on_component_created(data):
    print(f'New component: {data}')
```

### cURL Examples
```bash
# Create component
curl -X POST http://localhost:3001/api/components \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
    "name": "curl-test",
    "tag": "curl.test",
    "type": "API",
    "domain": "testing"
  }'

# Get graph data
curl -X GET "http://localhost:3001/api/connections/graph?viewMode=domains" \
  -H "Authorization: Bearer your-api-key"

# Trigger sync job
curl -X POST http://localhost:3001/api/sync/trigger \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{"connectorId": "connector-uuid"}'
```

---

## Support & Documentation

- **API Documentation**: `http://localhost:3001/api/docs` (Swagger UI)
- **WebSocket Events**: Real-time event documentation
- **GitHub Repository**: Source code and issue tracking
- **Docker Hub**: Container images and deployment guides

---

*This interface documentation is automatically generated and maintained. Last updated: 2025-08-05*