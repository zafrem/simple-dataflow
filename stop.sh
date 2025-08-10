#!/bin/bash

set -e

# Default mode
MODE="compose"
SERVICE=""
REMOVE_VOLUMES=false

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
        --volumes|-v)
            REMOVE_VOLUMES=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --container, -c SERVICE    Stop individual container"
            echo "  --native, -n               Stop native services"
            echo "  --volumes, -v              Remove volumes when stopping"
            echo "  --help, -h                 Show this help message"
            echo ""
            echo "Available services: postgres, redis, backend, frontend"
            echo ""
            echo "Examples:"
            echo "  $0                         Stop all services with docker-compose"
            echo "  $0 -c postgres            Stop only PostgreSQL container"
            echo "  $0 -n                      Stop native services"
            echo "  $0 -v                      Stop all services and remove volumes"
            echo "  $0 -c backend -v           Stop backend container and remove its volumes"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

echo "🛑 Stopping Simple Dataflow Development Environment..."

# Stop Homebrew services
echo "🍺 Stopping Homebrew services..."
if command -v brew >/dev/null 2>&1; then
    brew services stop redis 2>/dev/null || echo "⚠️  Redis service not running via brew"
    brew services stop postgresql 2>/dev/null || echo "⚠️  PostgreSQL service not running via brew"
else
    echo "⚠️  Homebrew not found, skipping brew services"
fi

# Check if Docker is running (only for Docker modes)
if [[ "$MODE" != "native" ]] && ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Nothing to stop."
    exit 0
fi

if [[ "$MODE" == "container" ]]; then
    if [[ -z "$SERVICE" ]]; then
        echo "❌ Service name required when using --container mode"
        echo "Available services: postgres, redis, backend, frontend"
        exit 1
    fi

    echo "📦 Stopping individual container: $SERVICE"
    
    CONTAINER_NAME="dataflow-$SERVICE"
    
    # Check if container exists and is running
    if docker ps -a --format "table {{.Names}}" | grep -q "$CONTAINER_NAME"; then
        echo "🛑 Stopping container: $CONTAINER_NAME"
        docker stop "$CONTAINER_NAME" 2>/dev/null || true
        docker rm "$CONTAINER_NAME" 2>/dev/null || true
        echo "✅ Container $CONTAINER_NAME stopped and removed"
        
        if [[ "$REMOVE_VOLUMES" == true ]]; then
            echo "🗑️  Removing volumes for $SERVICE..."
            case "$SERVICE" in
                postgres)
                    docker volume rm dataflow_postgres_data 2>/dev/null || true
                    echo "✅ PostgreSQL volumes removed"
                    ;;
                redis)
                    docker volume rm dataflow_redis_data 2>/dev/null || true
                    echo "✅ Redis volumes removed"
                    ;;
                backend|frontend)
                    echo "ℹ️  No persistent volumes to remove for $SERVICE"
                    ;;
            esac
        fi
    else
        echo "ℹ️  Container $CONTAINER_NAME is not running"
    fi

    # Clean up any built images if requested
    if [[ "$REMOVE_VOLUMES" == true ]] && [[ "$SERVICE" == "backend" || "$SERVICE" == "frontend" ]]; then
        IMAGE_NAME="dataflow-$SERVICE"
        if docker images --format "table {{.Repository}}" | grep -q "$IMAGE_NAME"; then
            echo "🗑️  Removing image: $IMAGE_NAME"
            docker rmi "$IMAGE_NAME" 2>/dev/null || true
        fi
    fi

elif [[ "$MODE" == "native" ]]; then
    # Native mode - stop Node.js processes
    echo "🏃 Stopping native services..."
    
    # Stop backend
    if [[ -f "backend.pid" ]]; then
        BACKEND_PID=$(cat backend.pid)
        if ps -p $BACKEND_PID > /dev/null 2>&1; then
            echo "🔧 Stopping backend (PID: $BACKEND_PID)..."
            kill $BACKEND_PID 2>/dev/null || true
            # Wait a moment then force kill if still running
            sleep 2
            if ps -p $BACKEND_PID > /dev/null 2>&1; then
                kill -9 $BACKEND_PID 2>/dev/null || true
            fi
            echo "✅ Backend stopped"
        else
            echo "ℹ️  Backend process not running"
        fi
        rm -f backend.pid
    else
        echo "ℹ️  No backend PID file found"
    fi
    
    # Stop frontend
    if [[ -f "frontend.pid" ]]; then
        FRONTEND_PID=$(cat frontend.pid)
        if ps -p $FRONTEND_PID > /dev/null 2>&1; then
            echo "🌐 Stopping frontend (PID: $FRONTEND_PID)..."
            kill $FRONTEND_PID 2>/dev/null || true
            # Wait a moment then force kill if still running
            sleep 2
            if ps -p $FRONTEND_PID > /dev/null 2>&1; then
                kill -9 $FRONTEND_PID 2>/dev/null || true
            fi
            echo "✅ Frontend stopped"
        else
            echo "ℹ️  Frontend process not running"
        fi
        rm -f frontend.pid
    else
        echo "ℹ️  No frontend PID file found"
    fi
    
    # Clean up any remaining Node.js processes that might be related
    echo "🧹 Cleaning up any remaining processes..."
    pkill -f "npm run dev" 2>/dev/null || true
    pkill -f "nodemon" 2>/dev/null || true
    pkill -f "vite" 2>/dev/null || true
    
    # Clean up log files
    rm -f backend.log frontend.log
    
    echo ""
    echo "✅ Native services stopped successfully!"
    echo ""
    echo "💡 PostgreSQL and Redis (via Homebrew) are still running"
    echo "   To stop them: brew services stop postgresql redis"

else
    # Docker Compose mode (default)
    echo "📦 Stopping all services..."
    
    if [[ "$REMOVE_VOLUMES" == true ]]; then
        echo "🗑️  Removing volumes..."
        docker-compose down -v
    else
        docker-compose down
    fi

    echo ""
    echo "✅ Development environment stopped successfully!"
    
    if [[ "$REMOVE_VOLUMES" == false ]]; then
        echo ""
        echo "💡 To remove all data volumes, run: docker-compose down -v"
        echo "💡 Or use: ./stop.sh -v"
    fi
fi

# Clean up any dangling containers with our naming pattern
echo "🧹 Cleaning up any dangling containers..."
docker ps -a --filter "name=dataflow-" --format "{{.Names}}" | while read -r container; do
    if [[ -n "$container" ]]; then
        docker stop "$container" 2>/dev/null || true
        docker rm "$container" 2>/dev/null || true
    fi
done