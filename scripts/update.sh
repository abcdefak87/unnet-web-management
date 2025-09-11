#!/bin/bash

# ISP Management System - Auto Update Script
# Untuk Linux deployment via Mobaxterm

set -e

echo "🔄 ISP Management System - Auto Update"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "server" ] || [ ! -d "client" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    print_error "PM2 is not installed. Please install it first:"
    echo "npm install -g pm2"
    exit 1
fi

print_status "Starting update process..."

# 1. Backup current database
print_status "Creating database backup..."
if [ -f "server/prisma/prod.db" ]; then
    cp server/prisma/prod.db "server/prisma/backup-$(date +%Y%m%d-%H%M%S).db"
    print_success "Database backed up"
else
    print_warning "No production database found to backup"
fi

# 2. Pull latest changes from GitHub
print_status "Pulling latest changes from GitHub..."
git pull origin main
print_success "Code updated from GitHub"

# 3. Install/Update dependencies
print_status "Installing dependencies..."

# Root dependencies
print_status "Installing root dependencies..."
npm install

# Server dependencies
print_status "Installing server dependencies..."
cd server
npm install
cd ..

# Client dependencies
print_status "Installing client dependencies..."
cd client
npm install
cd ..

print_success "Dependencies updated"

# 4. Database migrations
print_status "Running database migrations..."
cd server
npx prisma generate
npx prisma db push
cd ..
print_success "Database migrations completed"

# 5. Build client for production
print_status "Building client for production..."
cd client
npm run build
cd ..
print_success "Client built for production"

# 6. Restart PM2 services
print_status "Restarting PM2 services..."
pm2 restart all
print_success "All services restarted"

# 7. Show status
print_status "Current service status:"
pm2 status

# 8. Show logs (last 10 lines)
print_status "Recent logs:"
pm2 logs --lines 10

echo ""
print_success "Update completed successfully!"
echo ""
echo "🌐 Access URLs:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:3001"
echo "   Health:   http://localhost:3001/api/health"
echo ""
echo "📊 PM2 Commands:"
echo "   pm2 status          - Check service status"
echo "   pm2 logs            - View logs"
echo "   pm2 restart all     - Restart all services"
echo "   pm2 stop all        - Stop all services"
echo ""
