#!/bin/bash

# =============================================================================
# LINUX CLONE SETUP SCRIPT
# =============================================================================
# Script untuk clone dan setup project di Linux server
# =============================================================================

set -e  # Exit on any error

echo "🚀 LINUX CLONE SETUP SCRIPT"
echo "============================"
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

# =============================================================================
# STEP 1: CHECK REQUIREMENTS
# =============================================================================
print_status "Step 1: Checking system requirements..."

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "Jangan jalankan script ini sebagai root!"
   print_error "Gunakan user biasa dan gunakan sudo jika diperlukan"
   exit 1
fi

# Check if git is installed
if ! command -v git &> /dev/null; then
    print_error "Git tidak ditemukan! Install git terlebih dahulu:"
    echo "sudo apt update && sudo apt install git -y"
    exit 1
fi

# Check if node is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js tidak ditemukan! Install Node.js terlebih dahulu:"
    echo "curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -"
    echo "sudo apt-get install -y nodejs"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm tidak ditemukan! Install npm terlebih dahulu:"
    echo "sudo apt install npm -y"
    exit 1
fi

print_success "System requirements checked"
echo ""

# =============================================================================
# STEP 2: CLONE REPOSITORY
# =============================================================================
print_status "Step 2: Cloning repository from GitHub..."

# Get current directory
CURRENT_DIR=$(pwd)
PROJECT_NAME="unnet-web-management"

# Check if project directory already exists
if [ -d "$PROJECT_NAME" ]; then
    print_warning "Directory $PROJECT_NAME sudah ada!"
    print_warning "Apakah Anda ingin menghapus dan clone ulang? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        print_status "Menghapus directory lama..."
        rm -rf "$PROJECT_NAME"
        print_success "Directory lama dihapus"
    else
        print_status "Menggunakan directory yang sudah ada..."
        cd "$PROJECT_NAME"
        print_status "Menjalankan update script..."
        chmod +x scripts/linux-git-update.sh
        ./scripts/linux-git-update.sh
        exit 0
    fi
fi

# Clone repository
print_status "Cloning repository..."
git clone https://github.com/abcdefak87/unnet-web-management.git
cd "$PROJECT_NAME"

print_success "Repository cloned successfully"
echo ""

# =============================================================================
# STEP 3: SETUP ENVIRONMENT
# =============================================================================
print_status "Step 3: Setting up environment files..."

# Create server/.env
print_status "Creating server environment file..."
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

# Create root .env
print_status "Creating root environment file..."
cat > .env << 'EOF'
NODE_ENV=production
EOF

print_success "Environment files created"
echo ""

# =============================================================================
# STEP 4: INSTALL DEPENDENCIES
# =============================================================================
print_status "Step 4: Installing dependencies..."

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

print_success "Dependencies installed"
echo ""

# =============================================================================
# STEP 5: DATABASE SETUP
# =============================================================================
print_status "Step 5: Setting up database..."

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
# STEP 6: BUILD PROJECT
# =============================================================================
print_status "Step 6: Building project..."

# Build client
print_status "Building client..."
cd client
npm run build --silent
cd ..

print_success "Project built successfully"
echo ""

# =============================================================================
# STEP 7: INSTALL PM2 (OPTIONAL)
# =============================================================================
print_status "Step 7: Installing PM2 (Process Manager)..."

if ! command -v pm2 &> /dev/null; then
    print_status "Installing PM2..."
    sudo npm install -g pm2
    print_success "PM2 installed"
else
    print_success "PM2 already installed"
fi

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
echo "🎉 CLONE SETUP COMPLETED SUCCESSFULLY!"
echo "======================================"
echo ""
print_success "✅ Repository cloned from GitHub"
print_success "✅ Environment files created"
print_success "✅ Dependencies installed"
print_success "✅ Database setup completed"
print_success "✅ Services started"
echo ""
print_status "🌐 Access URLs:"
echo "   - Frontend: http://localhost:3000"
echo "   - Backend API: http://localhost:3001"
echo "   - Health Check: http://localhost:3001/api/health"
echo ""
print_status "📋 Default Login Credentials:"
echo "   - Super Admin: superadmin/super123"
echo "   - Admin: admin/admin123"
echo "   - Inventory Admin: gudang/gudang123"
echo "   - Regular User: userbiasa/user123"
echo ""
print_status "📋 Useful Commands:"
echo "   - Check status: pm2 status"
echo "   - View logs: pm2 logs"
echo "   - Restart services: pm2 restart all"
echo "   - Stop services: pm2 stop all"
echo "   - Update project: ./scripts/linux-git-update.sh"
echo ""

# Show PM2 status if available
if command -v pm2 &> /dev/null; then
    echo "📊 Current PM2 Status:"
    pm2 status
    echo ""
fi

print_success "Setup completed! 🚀"
echo ""
print_status "📁 Project location: $(pwd)"
print_status "📝 Server logs: logs/server.log"
print_status "📝 Client logs: logs/client.log"
