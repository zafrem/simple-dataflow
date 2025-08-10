#!/bin/bash

set -e

# Default mode
MODE="compose"
SERVICE=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --container|-c)
            MODE="container"
            SERVICE="$2"
            shift 2
            ;;
        --native|-n)
            MODE="native"
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --container, -c SERVICE    Start individual container for testing"
            echo "  --native, -n               Start services natively without Docker"
            echo "                             (automatically seeds database if empty)"
            echo "  --help, -h                 Show this help message"
            echo ""
            echo "Available services: postgres, redis, backend, frontend"
            echo ""
            echo "Examples:"
            echo "  $0                         Start all services with docker-compose"
            echo "  $0 -c postgres            Start only PostgreSQL container"
            echo "  $0 -c backend             Start only backend container"
            echo "  $0 -n                      Start all services natively with sample data"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

echo "🚀 Starting Simple Dataflow Development Environment..."

# Start Homebrew services
echo "🍺 Starting Homebrew services..."
if command -v brew >/dev/null 2>&1; then
    brew services start redis 2>/dev/null || echo "⚠️  Redis service not available via brew"
    brew services start postgresql 2>/dev/null || echo "⚠️  PostgreSQL service not available via brew"
else
    echo "⚠️  Homebrew not found, skipping brew services"
fi

# Check if Docker is running (only for Docker modes)
if [[ "$MODE" != "native" ]] && ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop and try again."
    exit 1
fi

if [[ "$MODE" == "container" ]]; then
    if [[ -z "$SERVICE" ]]; then
        echo "❌ Service name required when using --container mode"
        echo "Available services: postgres, redis, backend, frontend"
        exit 1
    fi

    echo "📦 Starting individual container: $SERVICE"
    
    case "$SERVICE" in
        postgres)
            docker run -d --name dataflow-postgres \
                -e POSTGRES_USER=dataflow \
                -e POSTGRES_PASSWORD=dataflow_pass \
                -e POSTGRES_DB=dataflow_db \
                -p 5432:5432 \
                -v dataflow_postgres_data:/var/lib/postgresql/data \
                postgres:15
            echo "✅ PostgreSQL started on port 5432"
            ;;
        redis)
            docker run -d --name dataflow-redis \
                -p 6379:6379 \
                -v dataflow_redis_data:/data \
                redis:7-alpine
            echo "✅ Redis started on port 6379"
            ;;
        backend)
            # Check if postgres and redis are running
            if ! docker ps --format "table {{.Names}}" | grep -q "dataflow-postgres"; then
                echo "⚠️  PostgreSQL not running. Starting it first..."
                docker run -d --name dataflow-postgres \
                    -e POSTGRES_USER=dataflow \
                    -e POSTGRES_PASSWORD=dataflow_pass \
                    -e POSTGRES_DB=dataflow_db \
                    -p 5432:5432 \
                    -v dataflow_postgres_data:/var/lib/postgresql/data \
                    postgres:15
            fi
            if ! docker ps --format "table {{.Names}}" | grep -q "dataflow-redis"; then
                echo "⚠️  Redis not running. Starting it first..."
                docker run -d --name dataflow-redis \
                    -p 6379:6379 \
                    -v dataflow_redis_data:/data \
                    redis:7-alpine
            fi
            
            # Build and run backend
            docker build -t dataflow-backend ./backend
            docker run -d --name dataflow-backend \
                -p 3001:3001 \
                -e NODE_ENV=development \
                -e DB_HOST=host.docker.internal \
                -e DB_PORT=5432 \
                -e DB_NAME=dataflow_db \
                -e DB_USER=dataflow \
                -e DB_PASSWORD=dataflow_pass \
                -e REDIS_HOST=host.docker.internal \
                -e REDIS_PORT=6379 \
                -e JWT_SECRET=your-secret-key-change-in-production \
                -v "$(pwd)/backend:/app" \
                -v /app/node_modules \
                dataflow-backend
            echo "✅ Backend started on port 3001"
            ;;
        frontend)
            docker build -t dataflow-frontend ./frontend
            docker run -d --name dataflow-frontend \
                -p 3000:3000 \
                -e VITE_API_URL=http://localhost:3001 \
                -e VITE_SOCKET_URL=http://localhost:3001 \
                -v "$(pwd)/frontend:/app" \
                -v /app/node_modules \
                dataflow-frontend
            echo "✅ Frontend started on port 3000"
            ;;
        *)
            echo "❌ Unknown service: $SERVICE"
            echo "Available services: postgres, redis, backend, frontend"
            exit 1
            ;;
    esac

    echo ""
    echo "📝 Use 'docker logs -f dataflow-$SERVICE' to view logs"
    echo "🛑 Use './stop.sh -c $SERVICE' to stop this container"

elif [[ "$MODE" == "native" ]]; then
    # Native mode - run services without Docker
    echo "🏃 Starting services natively..."
    
    # Check if npm/node is available
    if ! command -v npm >/dev/null 2>&1; then
        echo "❌ npm not found. Please install Node.js and npm"
        exit 1
    fi
    
    # Check if dependencies are installed
    if [[ ! -d "backend/node_modules" ]]; then
        echo "📦 Installing backend dependencies..."
        cd backend && npm install && cd ..
    fi
    
    if [[ ! -d "frontend/node_modules" ]]; then
        echo "📦 Installing frontend dependencies..."
        cd frontend && npm install && cd ..
    fi
    
    # Create .env files if they don't exist
    if [[ ! -f "backend/.env" ]]; then
        echo "📝 Creating backend .env file..."
        cat > backend/.env << EOF
NODE_ENV=development
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dataflow_db
DB_USER=dataflow
DB_PASSWORD=dataflow_pass
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-secret-key-change-in-production
EOF
    fi
    
    if [[ ! -f "frontend/.env" ]]; then
        echo "📝 Creating frontend .env file..."
        cat > frontend/.env << EOF
VITE_API_URL=http://localhost:3001/api
VITE_SOCKET_URL=http://localhost:3001
EOF
    fi
    
    # Start backend in background
    echo "🔧 Starting backend on port 3001..."
    cd backend
    npm run dev > ../backend.log 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > ../backend.pid
    cd ..
    
    # Start frontend in background
    echo "🌐 Starting frontend on port 3000..."
    cd frontend
    npm run dev > ../frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > ../frontend.pid
    cd ..
    
    # Wait for services to start
    echo "⏳ Waiting for services to be ready..."
    sleep 8
    
    # Check if database has data, if not seed it
    echo "🌱 Checking if database needs initial data..."
    cd backend
    COMPONENT_COUNT=$(node -e "
      const { Component } = require('./models');
      const { initializeDatabase } = require('./models');
      initializeDatabase().then(() => {
        Component.count().then(count => {
          console.log(count);
          process.exit(0);
        }).catch(() => {
          console.log(0);
          process.exit(0);
        });
      }).catch(() => {
        console.log(0);
        process.exit(0);
      });
    " 2>/dev/null || echo 0)
    
    if [ "$COMPONENT_COUNT" -eq 0 ]; then
      echo "📊 No data found, seeding database with sample data..."
      node scripts/seedData.js
      echo "✅ Database seeded with sample data!"
    else
      echo "📊 Found $COMPONENT_COUNT components in database, skipping seed"
    fi
    cd ..
    
    echo ""
    echo "✅ Development environment is ready!"
    echo ""
    echo "🌐 Frontend: http://localhost:3000"
    echo "🔧 Backend API: http://localhost:3001"
    echo "🗄️  PostgreSQL: localhost:5432 (via Homebrew)"
    echo "🔴 Redis: localhost:6379 (via Homebrew)"
    echo ""
    echo "📝 Backend logs: tail -f backend.log"
    echo "📝 Frontend logs: tail -f frontend.log"
    echo "🛑 Use './stop.sh -n' to stop native services"
    echo ""
    echo "💡 Make sure PostgreSQL and Redis are running via Homebrew:"
    echo "   brew services start postgresql"
    echo "   brew services start redis"

else
    # Docker Compose mode (default)
    echo "📦 Starting all services with Docker Compose..."
    docker-compose up -d

    # Wait for services to be healthy
    echo "⏳ Waiting for services to be ready..."
    sleep 10

    # Check service health
    echo "🔍 Checking service status..."
    docker-compose ps

    echo ""
    echo "✅ Development environment is ready!"
    echo ""
    echo "🌐 Frontend: http://localhost:3000"
    echo "🔧 Backend API: http://localhost:3001"
    echo "🗄️  PostgreSQL: localhost:5432"
    echo "🔴 Redis: localhost:6379"
    echo ""
    echo "📝 Use 'docker-compose logs -f [service]' to view logs"
    echo "🛑 Use './stop.sh' or 'docker-compose down' to stop"
fi