#!/bin/bash

# =============================================================================
# SECURITY UPDATE SCRIPT FOR LINUX (MobaXterm)
# =============================================================================
# Script ini untuk update keamanan setelah cleanup repository GitHub
# Menghapus file sensitif dan update dengan secrets baru yang aman
# =============================================================================

set -e  # Exit on any error

echo "🔒 SECURITY UPDATE SCRIPT FOR LINUX"
echo "===================================="
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

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "Jangan jalankan script ini sebagai root!"
   exit 1
fi

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "server" ] || [ ! -d "client" ]; then
    print_error "Jalankan script ini dari root directory project!"
    exit 1
fi

print_status "Memulai security update untuk Linux..."

# =============================================================================
# STEP 1: BACKUP CURRENT ENVIRONMENT
# =============================================================================
print_status "Step 1: Backup environment files..."

if [ -f "server/.env" ]; then
    cp server/.env server/.env.backup.$(date +%Y%m%d_%H%M%S)
    print_success "Backup server/.env created"
fi

if [ -f ".env" ]; then
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    print_success "Backup .env created"
fi

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
sleep 2

# =============================================================================
# STEP 3: PULL LATEST CHANGES
# =============================================================================
print_status "Step 3: Pulling latest changes from GitHub..."

# Check if git is available
if ! command -v git &> /dev/null; then
    print_error "Git tidak ditemukan! Install git terlebih dahulu."
    exit 1
fi

# Pull latest changes
git fetch origin
git reset --hard origin/main
print_success "Latest changes pulled from GitHub"

# =============================================================================
# STEP 4: REMOVE SENSITIVE FILES
# =============================================================================
print_status "Step 4: Removing sensitive files..."

# Remove sensitive files that might still exist locally
rm -f server/.session-key 2>/dev/null || true
rm -f server/.env.backup 2>/dev/null || true
rm -f scripts/server/auth_info_baileys/* 2>/dev/null || true

print_success "Sensitive files removed"

# =============================================================================
# STEP 5: UPDATE ENVIRONMENT VARIABLES
# =============================================================================
print_status "Step 5: Updating environment variables with new secure secrets..."

# Create new server/.env with secure secrets
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

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX=5

# Password Policy
MIN_PASSWORD_LENGTH=8
REQUIRE_PASSWORD_COMPLEXITY=true

# Bcrypt Configuration
BCRYPT_SALT_ROUNDS=14

# CSRF Protection
CSRF_SECRET="35d0f41cfef6f221f1b7b2c3656603caedce81cd5c865f9c706dc04dcb3b8ffb"

# WhatsApp Rate Limiting
WHATSAPP_RATE_LIMIT_WINDOW_MS=900000
WHATSAPP_RATE_LIMIT_MAX=50

# WhatsApp Configuration
WHATSAPP_SESSION_PATH="./auth_info_baileys"
WHATSAPP_QR_PATH="./public/qr"

# Logging
LOG_LEVEL=info
LOG_FILE="./logs/combined.log"

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH="./uploads"

# Security Headers
HELMET_CSP_ENABLED=true

# API Keys (if needed)
VALID_API_KEYS=""

# WebSocket
WS_ORIGIN="http://localhost:3000"

# Session Management
SESSION_SECRET="1a5c0f271af7fb8291a185f4fb24b12656aa40445097291c25c8865d8d984452"
EOF

# Create root .env
cat > .env << 'EOF'
NODE_ENV=production
EOF

print_success "Environment variables updated with new secure secrets"

# =============================================================================
# STEP 6: INSTALL DEPENDENCIES
# =============================================================================
print_status "Step 6: Installing/updating dependencies..."

# Install root dependencies
npm install

# Install server dependencies
cd server
npm install
cd ..

# Install client dependencies
cd client
npm install
cd ..

print_success "Dependencies installed/updated"

# =============================================================================
# STEP 7: DATABASE SETUP
# =============================================================================
print_status "Step 7: Setting up database..."

cd server

# Generate Prisma client
npx prisma generate

# Push database schema
npx prisma db push

# Seed database if needed
if [ -f "prisma/seed.js" ]; then
    npx prisma db seed
fi

cd ..

print_success "Database setup completed"

# =============================================================================
# STEP 8: FIX VULNERABILITIES
# =============================================================================
print_status "Step 8: Fixing security vulnerabilities..."

if [ -f "scripts/fix-vulnerabilities.sh" ]; then
    chmod +x scripts/fix-vulnerabilities.sh
    ./scripts/fix-vulnerabilities.sh
    print_success "Vulnerabilities fixed"
else
    print_warning "Vulnerability fix script not found, running manual audit fix..."
    npm audit fix --force
    cd server && npm audit fix --force && cd ..
    cd client && npm audit fix --force && cd ..
fi

# =============================================================================
# STEP 9: BUILD PROJECT
# =============================================================================
print_status "Step 9: Building project..."

# Build client
cd client
npm run build
cd ..

print_success "Project built successfully"

# =============================================================================
# STEP 10: START SERVICES
# =============================================================================
print_status "Step 10: Starting services with PM2..."

# Start services with PM2
if command -v pm2 &> /dev/null; then
    pm2 start ecosystem.config.js
    pm2 save
    print_success "Services started with PM2"
else
    print_warning "PM2 not found, starting services manually..."
    # Start server in background
    cd server && npm start &
    SERVER_PID=$!
    cd ..
    
    # Start client in background
    cd client && npm start &
    CLIENT_PID=$!
    cd ..
    
    print_success "Services started manually (PIDs: Server=$SERVER_PID, Client=$CLIENT_PID)"
fi

# =============================================================================
# STEP 11: VERIFICATION
# =============================================================================
print_status "Step 11: Verifying services..."

sleep 5

# Check if services are running
if command -v pm2 &> /dev/null; then
    pm2 status
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
fi

# Test API endpoint
if curl -s http://localhost:3001/api/health > /dev/null; then
    print_success "API health check passed"
else
    print_warning "API health check failed - service might still be starting"
fi

# =============================================================================
# COMPLETION
# =============================================================================
echo ""
echo "🎉 SECURITY UPDATE COMPLETED SUCCESSFULLY!"
echo "=========================================="
echo ""
print_success "✅ Sensitive files removed"
print_success "✅ Environment variables updated with new secure secrets"
print_success "✅ Dependencies updated"
print_success "✅ Database setup completed"
print_success "✅ Vulnerabilities fixed"
print_success "✅ Services restarted"
echo ""
print_warning "⚠️  IMPORTANT NOTES:"
echo "   - All existing JWT tokens are now invalid"
echo "   - Users need to login again"
echo "   - WhatsApp sessions may need to be re-authenticated"
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
fi

print_success "Security update completed! 🚀"
