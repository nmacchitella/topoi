#!/bin/bash

# Topoi Development Environment Setup Script
# Run this ONCE to create the dev apps on Fly.io

set -e

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

echo_info "Setting up Topoi Development Environment on Fly.io"
echo ""

# Check if fly CLI is installed
if ! command -v fly &> /dev/null; then
    echo_error "Fly CLI not found. Install it first: https://fly.io/docs/hands-on/install-flyctl/"
    exit 1
fi

# Check if logged in
if ! fly auth whoami &> /dev/null; then
    echo_error "Not logged in to Fly.io. Run 'fly auth login' first."
    exit 1
fi

echo_info "Creating development apps..."

# Create backend dev app
echo_info "Creating topoi-backend-dev..."
cd backend
fly apps create topoi-backend-dev --org personal 2>/dev/null || echo_warn "App topoi-backend-dev may already exist"

# Create volume for dev database
echo_info "Creating volume for dev database..."
fly volumes create topoi_data_dev --region iad --size 1 --app topoi-backend-dev 2>/dev/null || echo_warn "Volume may already exist"

cd ..

# Create frontend dev app
echo_info "Creating topoi-frontend-dev..."
cd frontend
fly apps create topoi-frontend-dev --org personal 2>/dev/null || echo_warn "App topoi-frontend-dev may already exist"
cd ..

echo ""
echo_info "Apps created! Now you need to set secrets for the dev environment."
echo ""
echo_warn "Run these commands to set backend secrets:"
echo ""
echo "  cd backend"
echo "  fly secrets set SECRET_KEY=\"your-dev-secret-key\" --app topoi-backend-dev"
echo "  fly secrets set DATABASE_URL=\"sqlite:////data/topoi_dev.db\" --app topoi-backend-dev"
echo "  fly secrets set GOOGLE_CLIENT_ID=\"your-google-client-id\" --app topoi-backend-dev"
echo "  fly secrets set GOOGLE_CLIENT_SECRET=\"your-google-client-secret\" --app topoi-backend-dev"
echo "  fly secrets set GOOGLE_REDIRECT_URI=\"https://topoi-frontend-dev.fly.dev/auth/callback\" --app topoi-backend-dev"
echo "  fly secrets set FRONTEND_URL=\"https://topoi-frontend-dev.fly.dev\" --app topoi-backend-dev"
echo ""
echo_warn "If you use email features, also set:"
echo "  fly secrets set MAIL_USERNAME=\"...\" --app topoi-backend-dev"
echo "  fly secrets set MAIL_PASSWORD=\"...\" --app topoi-backend-dev"
echo "  fly secrets set MAIL_FROM=\"...\" --app topoi-backend-dev"
echo "  fly secrets set MAIL_SERVER=\"...\" --app topoi-backend-dev"
echo "  fly secrets set MAIL_PORT=\"...\" --app topoi-backend-dev"
echo ""
echo_info "After setting secrets, deploy with:"
echo "  ./deploy.sh dev all"
echo ""
echo_info "=== GitHub Actions Setup ==="
echo ""
echo "To enable automatic deployments, add FLY_API_TOKEN to GitHub secrets:"
echo ""
echo "1. Generate a Fly.io API token:"
echo "   fly tokens create deploy -x 999999h"
echo ""
echo "2. Add it to GitHub repository secrets:"
echo "   - Go to your repo → Settings → Secrets and variables → Actions"
echo "   - Click 'New repository secret'"
echo "   - Name: FLY_API_TOKEN"
echo "   - Value: (paste the token from step 1)"
echo ""
echo "3. Create the 'development' branch:"
echo "   git checkout -b development"
echo "   git push -u origin development"
echo ""
echo_info "Automatic deployment branches:"
echo "  - 'development' branch → deploys to DEV"
echo "  - 'main' branch → deploys to PRODUCTION"
echo ""
echo_info "Setup complete!"
