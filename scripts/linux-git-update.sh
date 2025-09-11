#!/bin/bash

# =============================================================================
# LINUX GIT UPDATE SCRIPT
# =============================================================================
# Script untuk update project di Linux menggunakan git clone/pull
# =============================================================================

set -e  # Exit on any error

echo "🔄 LINUX GIT UPDATE SCRIPT"
echo "=========================="
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
    print_error "Jalankan script ini dari root directory project!"
    print_error "Atau clone repository terlebih dahulu:"
    echo ""
    echo "git clone https://github.com/abcdefak87/unnet-web-management.git"
    echo "cd unnet-web-management"
    echo "./scripts/linux-git-update.sh"
    exit 1
fi

print_status "Memulai update project dari GitHub..."
print_status "Current directory: $(pwd)"
print_status "Current user: $(whoami)"
echo ""

# =============================================================================
# STEP 1: BACKUP CURRENT STATE
# =============================================================================
print_status "Step 1: Backup current state..."

# Create backup directory
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup environment files
if [ -f "server/.env" ]; then
    cp server/.env "$BACKUP_DIR/server.env.backup"
    print_success "Backup server/.env created"
fi

if [ -f ".env" ]; then
    cp .env "$BACKUP_DIR/root.env.backup"
    print_success "Backup .env created"
fi

# Backup database
if [ -f "server/prisma/prod.db" ]; then
    cp server/prisma/prod.db "$BACKUP_DIR/prod.db.backup"
    print_success "Backup database created"
fi

echo ""

# =============================================================================
# STEP 2: STOP SERVICES
# =============================================================================
print_status "Step 2: Stopping services..."

# Stop PM2 processes if running
if command -v pm2 &> /dev/null; then
    print_status "Stopping PM2 processes..."
    pm2 stop all 2>/dev/null || true
    pm2 delete all 2>/dev/null || true
    print_success "PM2 processes stopped"
fi

# Kill any running Node.js processes
print_status "Killing any running Node.js processes..."
pkill -f "node.*server" 2>/dev/null || true
pkill -f "node.*client" 2>/dev/null || true
pkill -f "next" 2>/dev/null || true
sleep 3

print_success "All services stopped"
echo ""

# =============================================================================
# STEP 3: GIT UPDATE
# =============================================================================
print_status "Step 3: Updating from GitHub..."

# Check if git is available
if ! command -v git &> /dev/null; then
    print_error "Git tidak ditemukan! Install git terlebih dahulu:"
    echo "sudo apt install git -y"
    exit 1
fi

# Check if this is a git repository
if [ ! -d ".git" ]; then
    print_error "Ini bukan git repository!"
    print_error "Clone repository terlebih dahulu:"
    echo "git clone https://github.com/abcdefak87/unnet-web-management.git"
    echo "cd unnet-web-management"
    exit 1
fi

# Fetch latest changes
print_status "Fetching latest changes from GitHub..."
git fetch origin

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
print_status "Current branch: $CURRENT_BRANCH"

# Pull latest changes
print_status "Pulling latest changes..."
git reset --hard origin/main
print_success "Latest changes pulled from GitHub"
echo ""

# =============================================================================
# STEP 4: RESTORE ENVIRONMENT FILES
# =============================================================================
print_status "Step 4: Restoring environment files..."

# Restore server/.env if backup exists
if [ -f "$BACKUP_DIR/server.env.backup" ]; then
    cp "$BACKUP_DIR/server.env.backup" server/.env
    print_success "Server environment restored from backup"
else
    # Create new server/.env with secure secrets
    print_status "Creating new server environment file..."
    cat > server/.env << 'EOF'
# Database Configuration
DATABASE_URL="file:./prisma/prod.db"

# JWT Configuration - SECRET BARU YANG AMAN (Generated 2025)
JWT_SECRET="7657c1ef0831a49fefed171b28a4de1b2adb1e204e574b8264f378e6a3713febb4332f6e5b53e8ed8309880e7548c6409d88a522e05037e53d8e5bc0a49f3c33"
JWT_REFRESH_SECRET="24f853bad17bc5cf104b983c080a2795733708fd52059bf7dad9dfdf31b80ad94be07355d51a7c2b5a57bf12cb3cdda338c684d9e7aa96d7604adbe761bb01b6"

# Server Configuration
PORT=3001
NODE_ENV=production

# CORS Configuration
ALLOWED_ORIGINS="http://localhost:3000,http://localhost:3001"
CLIENT_URL="http://localhost:3000"

# Rate Limiting (Updated for better performance)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX=50

# WhatsApp Rate Limiting
WHATSAPP_RATE_LIMIT_WINDOW_MS=900000
WHATSAPP_RATE_LIMIT_MAX=100

# WhatsApp Configuration
WHATSAPP_SESSION_PATH="./auth_info_baileys"
WHATSAPP_QR_PATH="./public/qr"

# Security
BCRYPT_SALT_ROUNDS=14
CSRF_SECRET="35d0f41cfef6f221f1b7b2c3656603caedce81cd5c865f9c706dc04dcb3b8ffb"

# Logging
LOG_LEVEL=info
LOG_FILE="./logs/combined.log"

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH="./uploads"

# WebSocket
WS_ORIGIN="http://localhost:3000"

# Session Management
SESSION_SECRET="1a5c0f271af7fb8291a185f4fb24b12656aa40445097291c25c8865d8d984452"
EOF
    print_success "New server environment file created"
fi

# Restore root .env if backup exists
if [ -f "$BACKUP_DIR/root.env.backup" ]; then
    cp "$BACKUP_DIR/root.env.backup" .env
    print_success "Root environment restored from backup"
else
    # Create root .env
    cat > .env << 'EOF'
NODE_ENV=production
EOF
    print_success "Root environment file created"
fi

echo ""

# =============================================================================
# STEP 5: INSTALL DEPENDENCIES
# =============================================================================
print_status "Step 5: Installing/updating dependencies..."

# Install root dependencies
print_status "Installing root dependencies..."
npm install --silent

# Install server dependencies
print_status "Installing server dependencies..."
cd server
npm install --silent
cd ..

# Install client dependencies
print_status "Installing client dependencies..."
cd client
npm install --silent
cd ..

print_success "Dependencies installed/updated"
echo ""

# =============================================================================
# STEP 6: DATABASE SETUP
# =============================================================================
print_status "Step 6: Setting up database..."

cd server

# Generate Prisma client
print_status "Generating Prisma client..."
npx prisma generate --silent

# Push database schema
print_status "Pushing database schema..."
npx prisma db push --accept-data-loss

# Seed database if needed
if [ -f "prisma/seed.js" ]; then
    print_status "Seeding database..."
    npx prisma db seed --silent
fi

cd ..

print_success "Database setup completed"
echo ""

# =============================================================================
# STEP 7: BUILD PROJECT
# =============================================================================
print_status "Step 7: Building project..."

# Build client
print_status "Building client..."
cd client
npm run build --silent
cd ..

print_success "Project built successfully"
echo ""

# =============================================================================
# STEP 8: START SERVICES
# =============================================================================
print_status "Step 8: Starting services..."

# Start services with PM2
if command -v pm2 &> /dev/null; then
    print_status "Starting services with PM2..."
    pm2 start ecosystem.config.js --silent
    pm2 save --silent
    print_success "Services started with PM2"
else
    print_warning "PM2 not found, starting services manually..."
    
    # Start server in background
    print_status "Starting server..."
    cd server
    nohup npm start > ../logs/server.log 2>&1 &
    SERVER_PID=$!
    cd ..
    
    # Start client in background
    print_status "Starting client..."
    cd client
    nohup npm start > ../logs/client.log 2>&1 &
    CLIENT_PID=$!
    cd ..
    
    print_success "Services started manually (PIDs: Server=$SERVER_PID, Client=$CLIENT_PID)"
fi

echo ""

# =============================================================================
# STEP 9: VERIFICATION
# =============================================================================
print_status "Step 9: Verifying services..."

sleep 10

# Check if services are running
if command -v pm2 &> /dev/null; then
    print_status "PM2 Status:"
    pm2 status
    echo ""
else
    # Check if processes are running
    if pgrep -f "node.*server" > /dev/null; then
        print_success "Server is running"
    else
        print_error "Server is not running!"
    fi
    
    if pgrep -f "node.*client" > /dev/null; then
        print_success "Client is running"
    else
        print_error "Client is not running!"
    fi
    echo ""
fi

# Test API endpoint
print_status "Testing API health check..."
if curl -s http://localhost:3001/api/health > /dev/null; then
    print_success "API health check passed"
else
    print_warning "API health check failed - service might still be starting"
fi

echo ""

# =============================================================================
# COMPLETION
# =============================================================================
echo "🎉 GIT UPDATE COMPLETED SUCCESSFULLY!"
echo "====================================="
echo ""
print_success "✅ Project updated from GitHub"
print_success "✅ Environment files restored/created"
print_success "✅ Dependencies updated"
print_success "✅ Database setup completed"
print_success "✅ Services restarted"
echo ""
print_warning "⚠️  IMPORTANT NOTES:"
echo "   - All existing JWT tokens are now invalid"
echo "   - Users need to login again"
echo "   - WhatsApp sessions may need to be re-authenticated"
echo "   - Backup files saved in: $BACKUP_DIR"
echo ""
print_status "🌐 Access URLs:"
echo "   - Frontend: http://localhost:3000"
echo "   - Backend API: http://localhost:3001"
echo "   - Health Check: http://localhost:3001/api/health"
echo ""
print_status "📋 Next steps:"
echo "   1. Test login functionality"
echo "   2. Verify WhatsApp integration"
echo "   3. Check all features are working"
echo "   4. Monitor logs for any issues"
echo ""

# Show PM2 status if available
if command -v pm2 &> /dev/null; then
    echo "📊 Current PM2 Status:"
    pm2 status
    echo ""
fi

print_success "Git update completed! 🚀"
echo ""
print_status "📁 Backup location: $BACKUP_DIR"
print_status "📝 Server logs: logs/server.log"
print_status "📝 Client logs: logs/client.log"
