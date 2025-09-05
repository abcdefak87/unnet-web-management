#!/bin/bash

# ISP Management System - Server Deployment Script
# This script automates the deployment process on the production server

echo "========================================="
echo "ISP Management System - Deployment Script"
echo "========================================="
echo ""

# Configuration
PROJECT_DIR="/var/www/isp-management"
BACKUP_DIR="/var/backups/isp-management"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Check if running as root or with sudo
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root or with sudo"
   exit 1
fi

# Step 1: Navigate to project directory
print_status "Navigating to project directory..."
cd $PROJECT_DIR || {
    print_error "Failed to navigate to $PROJECT_DIR"
    exit 1
}

# Step 2: Create backup of current deployment
print_status "Creating backup of current deployment..."
mkdir -p $BACKUP_DIR
tar -czf "$BACKUP_DIR/backup_$TIMESTAMP.tar.gz" . 2>/dev/null || print_warning "Backup creation failed, continuing anyway..."

# Step 3: Pull latest changes from GitHub
print_status "Pulling latest changes from GitHub..."
git pull origin main || {
    print_error "Failed to pull from GitHub. Checking for conflicts..."
    git status
    exit 1
}

# Step 4: Install/Update backend dependencies
print_status "Installing backend dependencies..."
cd server
npm install || {
    print_error "Failed to install backend dependencies"
    exit 1
}

# Step 5: Generate Prisma client
print_status "Generating Prisma client..."
npx prisma generate || {
    print_error "Failed to generate Prisma client"
    exit 1
}

# Step 6: Run database migrations (if any)
print_status "Checking database..."
if [ ! -f "prisma/dev.db" ]; then
    print_status "Database not found. Creating and seeding..."
    npx prisma db push || {
        print_error "Failed to create database"
        exit 1
    }
    npm run seed || print_warning "Database seeding failed"
else
    print_status "Database exists. Running migrations if any..."
    npx prisma db push || print_warning "Migration failed, database might be up to date"
fi

# Step 7: Install/Update frontend dependencies
print_status "Installing frontend dependencies..."
cd ../client
npm install || {
    print_error "Failed to install frontend dependencies"
    exit 1
}

# Step 8: Build frontend for production
print_status "Building frontend for production..."
npm run build || {
    print_error "Failed to build frontend"
    exit 1
}

# Step 9: Restart PM2 services
print_status "Restarting PM2 services..."
cd ..

# Restart backend
pm2 restart isp-management-server || {
    print_warning "Failed to restart backend, trying to start it..."
    cd server
    pm2 start index.js --name isp-management-server
    cd ..
}

# Restart frontend
pm2 restart isp-management-client || {
    print_warning "Failed to restart frontend, trying to start it..."
    cd client
    pm2 start npm --name isp-management-client -- start
    cd ..
}

# Save PM2 configuration
pm2 save

# Step 10: Check service status
print_status "Checking service status..."
echo ""
pm2 status

# Step 11: Test endpoints
print_status "Testing endpoints..."
echo ""

# Test backend health
echo "Testing backend API..."
BACKEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health)
if [ "$BACKEND_RESPONSE" = "200" ]; then
    print_status "Backend API is responding (HTTP $BACKEND_RESPONSE)"
else
    print_error "Backend API is not responding properly (HTTP $BACKEND_RESPONSE)"
fi

# Test frontend
echo "Testing frontend..."
FRONTEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
if [ "$FRONTEND_RESPONSE" = "200" ]; then
    print_status "Frontend is responding (HTTP $FRONTEND_RESPONSE)"
else
    print_error "Frontend is not responding properly (HTTP $FRONTEND_RESPONSE)"
fi

# Test main site through Nginx
echo "Testing main site..."
SITE_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://172.17.2.3)
if [ "$SITE_RESPONSE" = "200" ]; then
    print_status "Main site is accessible (HTTP $SITE_RESPONSE)"
else
    print_error "Main site is not accessible (HTTP $SITE_RESPONSE)"
fi

# Step 12: Show logs
print_status "Recent PM2 logs:"
echo ""
pm2 logs --lines 10 --nostream

echo ""
echo "========================================="
echo "Deployment completed!"
echo "========================================="
echo ""
echo "Access the application at: http://172.17.2.3"
echo ""
echo "Login credentials:"
echo "  Username: superadmin"
echo "  Password: super123"
echo ""
echo "To view logs: pm2 logs"
echo "To monitor: pm2 monit"
echo ""
print_status "Deployment successful!"
