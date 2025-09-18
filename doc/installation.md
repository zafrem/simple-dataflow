# Installation Guide

## Prerequisites
- Docker & Docker Compose (recommended)
- Or: Node.js 18+, PostgreSQL 13+, Redis 6+

## Running the Application

### Option 1: Docker Compose (Recommended)
```bash
./start.sh
# or
docker-compose up --build
```

### Option 2: Native Development
```bash
./start.sh --native
```

### Option 3: Individual Services
```bash
./start.sh --container backend
./start.sh --container frontend
```

## Access Points
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Stop**: `./stop.sh`