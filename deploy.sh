#!/bin/bash

# Topoi Deployment Script
# Usage: ./deploy.sh [dev|prod] [backend|frontend|all]

set -e

ENV=${1:-dev}
TARGET=${2:-all}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

echo_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

echo_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Validate environment
if [[ "$ENV" != "dev" && "$ENV" != "prod" ]]; then
    echo_error "Invalid environment. Use 'dev' or 'prod'"
    echo "Usage: ./deploy.sh [dev|prod] [backend|frontend|all]"
    exit 1
fi

# Validate target
if [[ "$TARGET" != "backend" && "$TARGET" != "frontend" && "$TARGET" != "all" ]]; then
    echo_error "Invalid target. Use 'backend', 'frontend', or 'all'"
    echo "Usage: ./deploy.sh [dev|prod] [backend|frontend|all]"
    exit 1
fi

# Set config file based on environment
if [[ "$ENV" == "dev" ]]; then
    BACKEND_CONFIG="fly.dev.toml"
    FRONTEND_CONFIG="fly.dev.toml"
    echo_info "Deploying to DEVELOPMENT environment"
else
    BACKEND_CONFIG="fly.toml"
    FRONTEND_CONFIG="fly.toml"
    echo_warn "Deploying to PRODUCTION environment"
fi

# Deploy backend
deploy_backend() {
    echo_info "Deploying backend..."
    cd backend
    fly deploy --config "$BACKEND_CONFIG"
    cd ..
    echo_info "Backend deployed successfully!"
}

# Deploy frontend
deploy_frontend() {
    echo_info "Deploying frontend..."
    cd frontend
    fly deploy --config "$FRONTEND_CONFIG"
    cd ..
    echo_info "Frontend deployed successfully!"
}

# Execute deployment
case $TARGET in
    backend)
        deploy_backend
        ;;
    frontend)
        deploy_frontend
        ;;
    all)
        deploy_backend
        deploy_frontend
        ;;
esac

echo_info "Deployment complete!"

# Show URLs
if [[ "$ENV" == "dev" ]]; then
    echo ""
    echo_info "Development URLs:"
    echo "  Backend:  https://topoi-backend-dev.fly.dev"
    echo "  Frontend: https://topoi-frontend-dev.fly.dev"
else
    echo ""
    echo_info "Production URLs:"
    echo "  Backend:  https://topoi-backend.fly.dev"
    echo "  Frontend: https://topoi-frontend.fly.dev"
fi
