# Data Interface API Documentation

This document provides comprehensive information about the data input APIs for the Simple DataFlow system, including components, groups, connections, and connectors.

## Table of Contents

1. [Components API](#components-api)
2. [Component Groups API](#component-groups-api)
3. [Connections API](#connections-api)
4. [Connectors API](#connectors-api)
5. [Data Models](#data-models)
6. [Usage Examples](#usage-examples)

---

## Components API

Components are the core entities representing individual system elements like databases, APIs, applications, storage systems, and data pipelines.

### Base URL
```
http://localhost:3001/api/components
```

### Component Types
- `DB` - Database systems
- `API` - API endpoints and services
- `APP` - Application services
- `STORAGE` - Storage systems (cache, queues, file systems)
- `PIPES` - Data pipelines and ETL processes

### Endpoints

#### 1. Get All Components
```http
GET /api/components
```

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 50, max: 1000)
- `type` (string): Filter by component type
- `domain` (string): Filter by domain
- `source` (string): Filter by discovery source

**Example Request:**
```bash
curl "http://localhost:3001/api/components?limit=100&type=DB&domain=user"
```

**Example Response:**
```json
{
  "components": [
    {
      "id": 1,
      "name": "User Database",
      "tag": "user_db",
      "type": "DB",
      "source": "database",
      "domain": "user",
      "description": "PostgreSQL database storing user accounts and profiles",
      "metadata": {
        "host": "db.example.com",
        "port": 5432,
        "engine": "PostgreSQL",
        "version": "13.4"
      },
      "isActive": true,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 100,
    "total": 1,
    "pages": 1
  }
}
```

#### 2. Get Single Component
```http
GET /api/components/:id
```

**Example Request:**
```bash
curl "http://localhost:3001/api/components/1"
```

#### 3. Create Single Component
```http
POST /api/components
```

**Request Body:**
```json
{
  "name": "User Authentication Service",
  "tag": "auth_service",
  "type": "APP",
  "source": "manual",
  "domain": "authentication",
  "description": "Handles user login, registration, and session management",
  "metadata": {
    "version": "2.1.0",
    "language": "Node.js",
    "framework": "Express",
    "port": 3000,
    "database": "MongoDB",
    "environment": "production"
  }
}
```

**Required Fields:**
- `name` (string): Human-readable component name
- `tag` (string): Unique identifier (must be unique across all components)
- `type` (enum): One of `DB`, `API`, `APP`, `STORAGE`, `PIPES`

**Optional Fields:**
- `source` (string): Discovery method (`manual`, `config_scan`, `logs`, `swagger`, `database`)
- `domain` (string): Business domain or system area
- `description` (string): Detailed description
- `metadata` (object): Custom key-value data

#### 4. Create Multiple Components (Bulk)
```http
POST /api/components/bulk
```

**Request Body:**
```json
{
  "components": [
    {
      "name": "Order Database",
      "tag": "order_db",
      "type": "DB",
      "source": "database",
      "domain": "order",
      "description": "MySQL database for order management",
      "metadata": {
        "engine": "MySQL",
        "version": "8.0",
        "host": "order-db.example.com",
        "port": 3306
      }
    },
    {
      "name": "Order Processing Service",
      "tag": "order_service",
      "type": "APP",
      "source": "config_scan",
      "domain": "order",
      "description": "Core order processing logic",
      "metadata": {
        "language": "Java",
        "framework": "Spring Boot",
        "version": "2.7.0"
      }
    }
  ]
}
```

#### 5. Update Component
```http
PUT /api/components/:id
```

#### 6. Delete Component
```http
DELETE /api/components/:id
```

---

## Component Groups API

Groups allow you to organize related components into logical, functional, physical, or service-based collections.

### Base URL
``` 
http://localhost:3001/api/groups
```

### Group Types
- `FUNCTIONAL` - Grouped by business function
- `LOGICAL` - Grouped by logical relationships
- `PHYSICAL` - Grouped by physical infrastructure
- `SERVICE` - Grouped by service boundaries

### Endpoints

#### 1. Get All Groups
```http
GET /api/groups
```

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `groupType` (string): Filter by group type
- `domain` (string): Filter by domain
- `includeComponents` (boolean): Include component details (default: false)

**Example Request:**
```bash
curl "http://localhost:3001/api/groups?includeComponents=true&groupType=FUNCTIONAL"
```

#### 2. Create Group
```http
POST /api/groups
```

**Request Body:**
```json
{
  "name": "User Management Stack",
  "description": "Complete user management system including database, service, and API",
  "groupType": "FUNCTIONAL",
  "domain": "user",
  "color": "#3498db",
  "position": { "x": 100, "y": 200 },
  "metadata": {
    "owner": "user-team",
    "criticality": "high",
    "uptime_requirement": "99.9%"
  },
  "componentIds": [1, 2, 3, 4]
}
```

**Required Fields:**
- `name` (string): Group name
- `groupType` (enum): One of `FUNCTIONAL`, `LOGICAL`, `PHYSICAL`, `SERVICE`

#### 3. Add Component to Group
```http
POST /api/groups/:id/memberships
```

**Request Body:**
```json
{
  "componentId": 5,
  "role": "MEMBER"
}
```

**Membership Roles:**
- `MEMBER` - Regular group member
- `LEADER` - Primary component in the group
- `BACKUP` - Backup/secondary component
- `DEPENDENCY` - External dependency

#### 4. Remove Component from Group
```http
DELETE /api/groups/:id/memberships/:componentId
```

#### 5. Get Group Statistics
```http
GET /api/groups/:id/stats
```

**Example Response:**
```json
{
  "totalComponents": 4,
  "componentsByType": {
    "DB": 1,
    "APP": 1,
    "API": 1,
    "STORAGE": 1
  },
  "componentsByRole": {
    "MEMBER": 3,
    "LEADER": 1
  }
}
```

---

## Connections API

Connections represent relationships and data flows between components.

### Base URL
```
http://localhost:3001/api/connections
```

### Connection Types
- `domain` - Same-domain connections (default)
- `direct` - Explicitly defined connections
- `inferred` - Automatically discovered connections

### Endpoints

#### 1. Get All Connections
```http
GET /api/connections
```

**Query Parameters:**
- `domain` (string): Filter by domain  
- `connectionType` (string): Filter by connection type
- `include` (string): Include related data (`components`)

#### 2. Create Connection
```http
POST /api/connections
```

**Request Body:**
```json
{
  "sourceId": 1,
  "targetId": 2,
  "domain": "user",
  "connectionType": "direct",
  "strength": 0.8,
  "metadata": {
    "protocol": "HTTP",
    "port": 5432,
    "description": "User service connects to user database",
    "data_flow": "bidirectional"
  }
}
```

#### 3. Get Graph Data
```http
GET /api/connections/graph
```

Returns nodes and edges formatted for graph visualization, including both component nodes and group nodes with appropriate connections.

**Example Response:**
```json
{
  "nodes": [
    {
      "data": {
        "id": "1",
        "name": "User Database",
        "type": "DB",
        "domain": "user"
      }
    },
    {
      "data": {
        "id": "group-1",
        "name": "Core Business Logic",
        "type": "group",
        "groupType": "FUNCTIONAL",
        "color": "#e74c3c"
      }
    }
  ],
  "edges": [
    {
      "data": {
        "id": "1-2",
        "source": "1",
        "target": "2",
        "connectionType": "domain"
      }
    },
    {
      "data": {
        "id": "pipes-5-group-1",
        "source": "5",
        "target": "group-1",
        "connectionType": "group-pipe"
      }
    }
  ],
  "stats": {
    "nodeCount": 25,
    "componentCount": 20,
    "groupCount": 5,
    "edgeCount": 30
  }
}
```

---

## Connectors API

Connectors enable automated discovery of components from various sources.

### Base URL
```
http://localhost:3001/api/connectors
```

### Connector Types
- `database` - Database schema discovery
- `api` - API endpoint discovery (Swagger/OpenAPI)
- `logs` - Log file analysis
- `config` - Configuration file scanning
- `network` - Network service discovery

### Endpoints

#### 1. Get All Connectors
```http
GET /api/connectors
```

#### 2. Create Database Connector
```http
POST /api/connectors
```

**Request Body:**
```json
{
  "name": "Production Database Scanner",
  "type": "database",
  "config": {
    "host": "db.example.com",
    "port": 5432,
    "database": "production",
    "username": "scanner_user",
    "password": "secure_password",
    "type": "postgresql",
    "ssl": true,
    "schema_patterns": ["public", "app_*"],
    "table_patterns": ["users", "orders", "products"]
  },
  "schedule": "0 */6 * * *",
  "isActive": true
}
```

#### 3. Create API Connector
```http
POST /api/connectors
```

**Request Body:**
```json
{
  "name": "API Documentation Scanner",
  "type": "api",
  "config": {
    "base_url": "https://api.example.com",
    "swagger_paths": ["/docs", "/api-docs", "/swagger.json"],
    "auth_type": "bearer",
    "auth_token": "your_api_token_here",
    "headers": {
      "User-Agent": "DataFlow-Scanner/1.0"
    },
    "timeout": 30000
  },
  "schedule": "0 */12 * * *",
  "isActive": true
}
```

#### 4. Create Log Connector  
```http
POST /api/connectors
```

**Request Body:**
```json
{
  "name": "Application Log Analyzer",
  "type": "logs",
  "config": {
    "log_paths": [
      "/var/log/app/*.log",
      "/var/log/nginx/access.log",
      "/app/logs/**/*.log"
    ],
    "patterns": [
      "\\[SERVICE\\]\\s+(\\w+)",
      "connecting to (\\w+_db)",
      "API call to ([\\w-]+)",
      "Cache hit: (\\w+)"
    ],
    "exclusions": ["health", "ping", "metrics"],
    "max_file_size": "100MB"
  },
  "schedule": "0 */2 * * *",
  "isActive": true
}
```

#### 5. Trigger Connector Run
```http
POST /api/connectors/:id/run
```

---

## Data Models

### Component Model
```typescript
interface Component {
  id: number;
  name: string;                    // Required: Human-readable name
  tag: string;                     // Required: Unique identifier
  type: 'DB' | 'API' | 'APP' | 'STORAGE' | 'PIPES'; // Required
  source: string;                  // Discovery method
  domain?: string;                 // Business domain
  description?: string;            // Detailed description
  metadata: Record<string, any>;   // Custom data
  isActive: boolean;              // Active status
  connectorId?: number;           // Associated connector
  lastSeen?: Date;                // Last discovery time
  createdAt: Date;
  updatedAt: Date;
}
```

### Component Group Model
```typescript
interface ComponentGroup {
  id: number;
  name: string;                    // Required: Group name
  description?: string;            // Group description
  groupType: 'LOGICAL' | 'PHYSICAL' | 'FUNCTIONAL' | 'SERVICE'; // Required
  domain?: string;                 // Associated domain
  color?: string;                  // Hex color code
  position: { x: number, y: number }; // Position in visualization
  metadata: Record<string, any>;   // Custom data
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  components?: Component[];        // Associated components (when included)
}
```

### Connection Model
```typescript
interface Connection {
  id: number;
  sourceId: number;               // Required: Source component ID
  targetId: number;               // Required: Target component ID
  domain: string;                 // Required: Connection domain
  connectionType: 'domain' | 'direct' | 'inferred'; // Connection type
  strength: number;               // Connection strength (0.0-1.0)
  metadata: Record<string, any>;  // Custom connection data
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Connector Model
```typescript
interface Connector {
  id: number;
  name: string;                   // Required: Connector name
  type: 'database' | 'api' | 'logs' | 'config' | 'network'; // Required
  config: Record<string, any>;    // Required: Type-specific configuration
  schedule?: string;              // Cron expression for automatic runs
  isActive: boolean;              // Enable/disable connector
  status: 'idle' | 'running' | 'success' | 'error';
  lastRun?: Date;                 // Last execution time
  nextRun?: Date;                 // Next scheduled run
  lastError?: string;             // Last error message
  successCount: number;           // Successful runs
  errorCount: number;             // Failed runs
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Usage Examples

### Complete Workflow Example

#### 1. Create Components for an E-commerce System

```bash
# Create database components
curl -X POST http://localhost:3001/api/components/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "components": [
      {
        "name": "User Database",
        "tag": "user_db",
        "type": "DB",
        "domain": "user",
        "description": "PostgreSQL database for user accounts",
        "metadata": {
          "engine": "PostgreSQL",
          "version": "13.4",
          "host": "users-db.prod.com"
        }
      },
      {
        "name": "Product Catalog DB",
        "tag": "product_db", 
        "type": "DB",
        "domain": "catalog",
        "description": "Product information database",
        "metadata": {
          "engine": "MongoDB",
          "version": "5.0"
        }
      }
    ]
  }'

# Create application services
curl -X POST http://localhost:3001/api/components/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "components": [
      {
        "name": "User Management Service",
        "tag": "user_service",
        "type": "APP", 
        "domain": "user",
        "description": "Handles user authentication and profiles",
        "metadata": {
          "language": "Node.js",
          "framework": "Express",
          "version": "2.1.0"
        }
      },
      {
        "name": "Product Catalog Service",
        "tag": "catalog_service",
        "type": "APP",
        "domain": "catalog", 
        "description": "Product search and management",
        "metadata": {
          "language": "Python",
          "framework": "FastAPI"
        }
      }
    ]
  }'
```

#### 2. Create Component Groups

```bash
# Create functional group for user management
curl -X POST http://localhost:3001/api/groups \
  -H "Content-Type: application/json" \
  -d '{
    "name": "User Management Stack",
    "description": "Complete user management functionality",
    "groupType": "FUNCTIONAL", 
    "domain": "user",
    "color": "#3498db",
    "componentIds": [1, 3]
  }'

# Create physical infrastructure group
curl -X POST http://localhost:3001/api/groups \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Database Cluster",
    "description": "All database systems",
    "groupType": "PHYSICAL",
    "color": "#9b59b6",
    "componentIds": [1, 2]
  }'
```

#### 3. Create Explicit Connections

```bash
# Connect user service to user database
curl -X POST http://localhost:3001/api/connections \
  -H "Content-Type: application/json" \
  -d '{
    "sourceId": 3,
    "targetId": 1,
    "domain": "user",
    "connectionType": "direct",
    "strength": 1.0,
    "metadata": {
      "protocol": "PostgreSQL",
      "description": "User service reads/writes user data"
    }
  }'
```

#### 4. Set Up Automated Discovery

```bash
# Create database connector for ongoing discovery
curl -X POST http://localhost:3001/api/connectors \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production DB Scanner",
    "type": "database",
    "config": {
      "host": "prod-db.example.com",
      "port": 5432,
      "database": "main",
      "username": "scanner",
      "password": "secure_pass",
      "type": "postgresql"
    },
    "schedule": "0 2 * * *",
    "isActive": true
  }'
```

### Error Handling

All APIs return standard HTTP status codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `404` - Not Found
- `409` - Conflict (duplicate tag/name)
- `500` - Internal Server Error

**Error Response Format:**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "tag",
      "message": "Tag 'user_db' already exists"
    }
  ]
}
```

### Rate Limiting & Performance

- API endpoints support pagination for large datasets
- Use `limit` parameter (max 1000) for bulk operations
- Connectors run on schedules to avoid overwhelming the system
- Graph API optimizes for visualization performance

### Security Considerations

- All connector passwords should be encrypted in production
- API endpoints should be secured with authentication tokens
- Database connectors should use read-only users when possible
- Log connectors should have restricted file system access

---

For more information or support, please refer to the main project documentation or create an issue in the project repository.