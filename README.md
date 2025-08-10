# DataFlow Visualization System

A comprehensive full-stack web application for visualizing large-scale system architecture with real-time data connectors.
## Demo
![Demo](./image/Dataflow_View.gif)

## 🚀 Features

### Visualization & Interaction
- **Interactive Network Graphs**: Visualize relationships between DB, API, and App components
- **Sankey Data Flow Diagrams**: Beautiful flow visualization showing DB → APP → API patterns
- **Domain Drill-down**: Navigate from domains → groups → components with seamless transitions
- **Real-time Updates**: WebSocket connections for live system monitoring
- **Advanced Filtering**: Filter by type, domain, component properties, and anomaly importance
- **Responsive UI**: Works across desktop and mobile with Element Plus components

### Data Management
- **CSV Bulk Import**: Comprehensive CSV import system with validation and duplicate detection
- **RESTful APIs**: Full CRUD operations for all entity types with real-time broadcasting
- **Smart Connectors**: Automatic discovery from databases, APIs, and log files
- **Anomaly Detection**: Comprehensive logging system with importance levels and retention management
- **Data Integrity**: Duplicate prevention logic across all data entry forms

### Performance & Scalability
- **High Performance**: Handles 25,000+ components smoothly with optimized rendering
- **Real-time Sync**: WebSocket-based live updates with auto-reconnection
- **Background Processing**: Bull Queue system for connector synchronization
- **Memory Optimization**: Efficient connection pooling and cleanup

## 🏗️ Architecture

### Backend (Node.js + Express)
- **API Server**: RESTful endpoints for components, connections, and connectors
- **Real-time Communication**: Socket.io for live updates
- **Database**: PostgreSQL with Sequelize ORM
- **Job Queue**: Bull Queue with Redis for background processing
- **Data Connectors**: Modular plugin system for various data sources

### Frontend (Vue.js 3)
- **Interactive Visualization**: Cytoscape.js for network graphs, ECharts for Sankey diagrams
- **State Management**: Pinia stores for components, connections, and real-time data
- **UI Framework**: Element Plus for professional interface
- **Responsive Design**: Works across desktop and mobile devices

## 🛠️ Technology Stack

- **Backend**: Node.js, Express, Socket.io, PostgreSQL, Redis, Bull Queue
- **Frontend**: Vue.js 3, Cytoscape.js, ECharts, Element Plus, Pinia
- **Database**: PostgreSQL with JSON support
- **Containerization**: Docker & Docker Compose
- **Real-time**: WebSocket connections for live updates

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 13+
- Redis 6+
- Docker & Docker Compose (optional)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd simple-dataflow
   ```

2. **Start with Docker Compose**
   ```bash
   docker-compose up --build
   ```

3. **Or run manually:**

   **Backend:**
   ```bash
   cd backend
   npm install
   npm run dev
   ```

   **Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001

## 📊 Data Flow Patterns

The system automatically discovers and connects components based on domain patterns:

- **Database Components**: `{domain}_db` (e.g., `ecommerce_product_db`)
- **Application Components**: `{domain}_app` (e.g., `ecommerce_product_app`)
- **API Components**: `{domain}_api` (e.g., `ecommerce_product_api`)

**Connection Pattern**: DB → APP → API (Database feeds Applications, which expose APIs)

## 🔌 Data Connectors

### Built-in Connectors:
- **Database Connector**: Scans PostgreSQL databases for tables and relationships
- **API Connector**: Discovers REST endpoints and OpenAPI specifications
- **Log Connector**: Parses application logs for component discovery

### Adding Custom Connectors:
1. Extend the `BaseConnector` class
2. Implement required methods (`discover`, `validate`, `transform`)
3. Register in the connector factory

## 🎨 Visualization Features

### Network Graph (Dashboard)
- **Interactive Navigation**: Pan, zoom, and click interactions
- **Multiple Layouts**: Dagre, CoSE, Circle, Grid algorithms
- **Filtering**: By component type, domain, and properties
- **Real-time Updates**: Live component and connection changes

### Sankey Diagram (Data Flow)
- **Flow Visualization**: Clear DB → APP → API flow patterns
- **Domain Filtering**: Focus on specific business domains
- **Interactive Navigation**: Zoom, pan, and hover details
- **Performance Optimized**: Handles large datasets smoothly

## 🔧 Configuration

### Environment Variables
```bash
# Backend
DATABASE_URL=postgresql://user:password@localhost:5432/dataflow_db
REDIS_URL=redis://localhost:6379
PORT=3001

# Frontend
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
```

## 📊 Data Input Methods

### CSV Import System

The system includes a comprehensive CSV import tool for bulk data management:

**Features:**
- ✅ **Bulk Import**: Import domains, groups, components, connections, and anomaly logs
- ✅ **Smart Validation**: Comprehensive data validation with detailed error reporting
- ✅ **Duplicate Detection**: Intelligent duplicate checking with force-update options
- ✅ **Batch Processing**: Import multiple CSV files at once with auto-detection
- ✅ **Dry Run Mode**: Test imports without making changes
- ✅ **Real-time Updates**: Changes appear instantly in the frontend via WebSocket

**Quick Start:**
```bash
# Install dependencies
npm install csv-parser commander chalk

# Import single file
node scripts/dataImport.js file -f domains.csv -t domains

# Batch import all CSV files
node scripts/dataImport.js batch -d ./import_data/

# Dry run (validation only)
node scripts/dataImport.js file -f components.csv -t components --dry-run

# Force mode (update existing records)
node scripts/dataImport.js file -f connections.csv -t connections --force
```

**Supported Entity Types:**
- `domains` - Business domains and their properties
- `groups` - Component groups and organizational structures
- `components` - System components (DB, API, APP, STORAGE, PIPES) with team assignments
- `connections` - Component relationships and data flows
- `anomaly-logs` - System logs and anomaly detection entries

**CSV Templates:**
Use the provided template files in `backend/scripts/templates/` as starting points:
- `domains_template.csv`
- `groups_template.csv`
- `components_template.csv`
- `connections_template.csv`
- `anomaly_logs_template.csv`

**Documentation:** Complete guide available at `backend/scripts/README_DataImport.md`

### Data Deletion System

The system includes comprehensive deletion tools for database cleanup and maintenance:

**Features:**
- ✅ **Full Database Cleanup**: Complete system reset with safety confirmations
- ✅ **Targeted Deletion**: Advanced filtering for specific record deletion
- ✅ **Dry Run Mode**: Preview deletions without making changes
- ✅ **Cascade Handling**: Automatic deletion of related records
- ✅ **Safety Confirmations**: Manual confirmation required for destructive operations
- ✅ **Team-based Filtering**: Delete components by team assignment

**Quick Start:**
```bash
# Preview what would be deleted (safe)
node scripts/dataDelete.js full --dry-run

# Delete components from specific team
node scripts/dataDelete.js target --type components --team "DevOps Team" --dry-run

# Clean up old anomaly logs
node scripts/dataDelete.js target --type anomaly-logs --older-than 30

# Emergency full database reset (with confirmation)
node scripts/dataDelete.js full
```

**Supported Deletions:**
- `full` - Complete database cleanup (ALL data)
- `domains` - Domain definitions with cascade deletion
- `groups` - Component groups and memberships
- `components` - System components with automatic connection cleanup
- `connections` - Component relationships and data flows
- `anomaly-logs` - System logs with retention management
- `connectors` - Data connectors and configurations

**Advanced Filtering:**
- Filter by type, domain, source, team, status
- Date-based filtering for anomaly logs
- Name pattern matching across all entities
- Active/inactive status filtering

**Documentation:** Complete guide available at `backend/scripts/README_DataDelete.md`

### API Integration

The system provides comprehensive REST APIs for programmatic data management:

**Real-time Updates:**
- ✅ **WebSocket Integration**: All API changes broadcast to connected clients instantly
- ✅ **Auto-reconnection**: Robust connection handling with heartbeat monitoring
- ✅ **Event Subscriptions**: Subscribe to specific data channels (components, connections, etc.)

## 📝 API Documentation

### Components API
- `GET /api/components` - List components with filtering and pagination (supports type, domain, source, team filters)
- `GET /api/components/:id` - Get specific component with relationships
- `POST /api/components` - Create new component (supports team assignment)
- `PUT /api/components/:id` - Update existing component (supports team updates)
- `DELETE /api/components/:id` - Delete component and connections
- `GET /api/components/:id/connections` - Get component's connections

### Connections API
- `GET /api/connections` - List connections with filtering
- `GET /api/connections/graph` - Generate graph visualization data
- `GET /api/connections/stats` - Get connection statistics
- `POST /api/connections` - Create new connection
- `POST /api/connections/rebuild` - Rebuild all connections

### Domains API
- `GET /api/domains` - List all domains with statistics
- `GET /api/domains/:id` - Get domain with groups and components
- `POST /api/domains` - Create new domain
- `PUT /api/domains/:id` - Update domain
- `DELETE /api/domains/:id` - Delete domain (soft delete)
- `POST /api/domains/:id/pipelines` - Add pipeline to domain

### Groups API
- `GET /api/groups` - List component groups with pagination
- `GET /api/groups/:id` - Get specific group with components
- `POST /api/groups` - Create new component group
- `PUT /api/groups/:id` - Update group
- `DELETE /api/groups/:id` - Delete group
- `POST /api/groups/:id/components/:componentId` - Add component to group
- `DELETE /api/groups/:id/components/:componentId` - Remove component from group

### Connectors API
- `GET /api/connectors` - List all connectors with filtering
- `GET /api/connectors/:id` - Get specific connector
- `POST /api/connectors` - Create new connector
- `PUT /api/connectors/:id` - Update connector
- `DELETE /api/connectors/:id` - Delete connector
- `POST /api/connectors/:id/test` - Test connector configuration
- `POST /api/connectors/:id/sync` - Trigger connector synchronization

### Anomaly Logs API
- `GET /api/anomaly-logs` - List anomaly logs with filtering
- `GET /api/anomaly-logs/:id` - Get specific log entry
- `POST /api/anomaly-logs` - Create new log entry
- `PUT /api/anomaly-logs/:id` - Update log entry
- `DELETE /api/anomaly-logs/:id` - Delete log entry
- `POST /api/anomaly-logs/cleanup` - Clean up expired logs
- `GET /api/anomaly-logs/stats/summary` - Get log statistics

### Sync API
- `GET /api/sync/status` - Get synchronization queue status
- `POST /api/sync/trigger` - Trigger sync jobs
- `GET /api/sync/jobs` - List sync jobs with filtering
- `DELETE /api/sync/jobs/:jobId` - Remove sync job
- `POST /api/sync/jobs/:jobId/retry` - Retry failed sync job

**API Features:**
- ✅ **Comprehensive CRUD**: Full create, read, update, delete operations
- ✅ **Advanced Filtering**: Query parameters for precise data retrieval
- ✅ **Pagination**: Efficient handling of large datasets
- ✅ **Validation**: Input validation with detailed error messages
- ✅ **Relationships**: Automatic handling of entity relationships
- ✅ **Real-time Broadcasting**: Changes pushed to connected clients

**Authentication & Authorization:**
Currently operating in development mode. Production deployments should implement:
- JWT token authentication
- Role-based access control (RBAC)
- API rate limiting
- Request logging and monitoring

## 🧪 Testing

```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test
```

## 🚀 Production Deployment

1. **Build the application**
   ```bash
   docker-compose -f docker-compose.prod.yml up --build
   ```

2. **Environment Setup**
   - Configure production database
   - Set up Redis cluster
   - Configure load balancer
   - Set up monitoring

## 📈 Performance

- **Optimized Rendering**: Handles 25,000+ components
- **Efficient Queries**: Indexed database with pagination
- **Memory Management**: Connection pooling and cleanup
- **Caching**: Redis caching for frequently accessed data

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🏆 Features Highlight

### Visualization & UX
- ✅ Interactive network visualization with Cytoscape.js
- ✅ Beautiful Sankey flow diagrams with ECharts
- ✅ Domain drill-down navigation (Domain → Group → Component)
- ✅ Real-time WebSocket updates with auto-reconnection
- ✅ Advanced filtering and search with anomaly importance levels
- ✅ Responsive design with Element Plus UI framework

### Data Management & Integration
- ✅ Comprehensive CSV import system with validation
- ✅ Smart duplicate detection and prevention
- ✅ RESTful APIs with real-time broadcasting
- ✅ Modular data connector system
- ✅ Anomaly detection logging with retention management
- ✅ Force-mode updates for existing records

### Infrastructure & Performance
- ✅ Docker containerization with multi-stage builds
- ✅ PostgreSQL with JSON support and optimized queries
- ✅ Redis caching and Bull Queue background processing
- ✅ Performance optimized for 25,000+ components
- ✅ Comprehensive error handling and validation
- ✅ Production-ready with monitoring and health checks