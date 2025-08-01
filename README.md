# DataFlow Visualization System

A comprehensive full-stack web application for visualizing large-scale system architecture with real-time data connectors.
## Demo
![Demo](./image/Dataflow_View.gif)

## 🚀 Features

- **Interactive Network Graphs**: Visualize relationships between DB, API, and App components
- **Real-time Data Connectors**: Automatic discovery from databases, APIs, and log files
- **Sankey Data Flow Diagrams**: Beautiful flow visualization showing DB → APP → API patterns
- **Real-time Updates**: WebSocket connections for live system monitoring
- **Filtering & Search**: Advanced filtering by type, domain, and component properties
- **Scalable Architecture**: Handles 25,000+ components smoothly

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

## 📝 API Documentation

### Components
- `GET /api/components` - List all components
- `POST /api/components` - Create component
- `PUT /api/components/:id` - Update component
- `DELETE /api/components/:id` - Delete component

### Connections
- `GET /api/connections` - List all connections
- `POST /api/connections/rebuild` - Rebuild connections

### Connectors
- `GET /api/connectors` - List connectors
- `POST /api/connectors/:id/sync` - Trigger connector sync

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

- ✅ Interactive network visualization with Cytoscape.js
- ✅ Beautiful Sankey flow diagrams with ECharts
- ✅ Real-time WebSocket updates
- ✅ Modular data connector system
- ✅ Advanced filtering and search
- ✅ Responsive design
- ✅ Docker containerization
- ✅ PostgreSQL with JSON support
- ✅ Background job processing
- ✅ Performance optimized for large datasets