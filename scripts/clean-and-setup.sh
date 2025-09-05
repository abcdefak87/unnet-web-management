#!/bin/bash

# ISP Management System - Complete Clean and Fresh Setup Script
# Script ini akan membersihkan SEMUA konfigurasi lama dan setup ulang dari awal

echo "========================================="
echo "ISP Management System - Clean & Setup"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
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

print_info() {
    echo -e "${BLUE}[i]${NC} $1"
}

print_cleaning() {
    echo -e "${MAGENTA}[×]${NC} $1"
}

# Configuration
SERVER_IP="172.17.2.3"
PROJECT_DIR="/var/www/isp-management"
BACKUP_DIR="/var/backups/isp-management"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
GITHUB_REPO="https://github.com/abcdefak87/unnet-web-management.git"

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "Script ini harus dijalankan sebagai root atau dengan sudo"
   exit 1
fi

echo "╔════════════════════════════════════════╗"
echo "║         FASE 1: PEMBERSIHAN            ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Step 1: Stop all services
print_cleaning "Menghentikan semua services..."

# Stop PM2 processes
pm2 delete isp-management-server 2>/dev/null && print_status "PM2 backend dihentikan"
pm2 delete isp-management-client 2>/dev/null && print_status "PM2 frontend dihentikan"
pm2 delete all 2>/dev/null
pm2 kill 2>/dev/null

# Kill any remaining Node.js processes on ports
kill -9 $(lsof -t -i:3000) 2>/dev/null && print_status "Port 3000 dibersihkan"
kill -9 $(lsof -t -i:3001) 2>/dev/null && print_status "Port 3001 dibersihkan"

# Step 2: Backup important files if they exist
if [ -d "$PROJECT_DIR" ]; then
    print_info "Backup file penting..."
    mkdir -p $BACKUP_DIR
    
    # Backup env files
    [ -f "$PROJECT_DIR/server/.env" ] && cp "$PROJECT_DIR/server/.env" "$BACKUP_DIR/.env.backend.$TIMESTAMP"
    [ -f "$PROJECT_DIR/client/.env.local" ] && cp "$PROJECT_DIR/client/.env.local" "$BACKUP_DIR/.env.frontend.$TIMESTAMP"
    [ -f "$PROJECT_DIR/server/prisma/dev.db" ] && cp "$PROJECT_DIR/server/prisma/dev.db" "$BACKUP_DIR/dev.db.$TIMESTAMP"
    
    print_status "Backup selesai di $BACKUP_DIR"
fi

# Step 3: Clean old installations
print_cleaning "Menghapus instalasi lama..."
rm -rf $PROJECT_DIR
rm -rf /root/.pm2/logs/*
rm -rf /tmp/npm-*
rm -rf /tmp/node-*

# Step 4: Clean Nginx configurations
print_cleaning "Membersihkan konfigurasi Nginx lama..."
rm -f /etc/nginx/sites-enabled/isp-management
rm -f /etc/nginx/sites-available/isp-management
rm -f /etc/nginx/sites-enabled/default 2>/dev/null

# Step 5: Clean npm cache
print_cleaning "Membersihkan NPM cache..."
npm cache clean --force 2>/dev/null

# Step 6: Remove unnecessary packages from system
print_cleaning "Membersihkan package yang tidak perlu..."
apt-get autoremove -y 2>/dev/null
apt-get autoclean -y 2>/dev/null

print_status "Pembersihan selesai!"
echo ""

echo "╔════════════════════════════════════════╗"
echo "║       FASE 2: INSTALASI FRESH          ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Step 7: Update system packages
print_info "Update system packages..."
apt-get update -qq

# Step 8: Ensure required packages are installed
print_info "Memastikan dependencies sistem..."
which node >/dev/null 2>&1 || {
    print_error "Node.js tidak terinstall"
    exit 1
}
which npm >/dev/null 2>&1 || {
    print_error "NPM tidak terinstall"
    exit 1
}
which pm2 >/dev/null 2>&1 || {
    print_warning "PM2 tidak terinstall, installing..."
    npm install -g pm2
}
which nginx >/dev/null 2>&1 || {
    print_error "Nginx tidak terinstall"
    exit 1
}

# Step 9: Clone fresh repository
print_info "Clone repository dari GitHub..."
mkdir -p /var/www
cd /var/www
git clone $GITHUB_REPO isp-management || {
    print_error "Gagal clone repository"
    exit 1
}
print_status "Repository berhasil di-clone"

# Step 10: Create Backend .env
print_info "Setup Backend Environment..."
cd $PROJECT_DIR/server

# Generate strong JWT secrets
JWT_SECRET=$(openssl rand -hex 64)
JWT_REFRESH_SECRET=$(openssl rand -hex 64)

cat > .env << EOF
# Database Configuration (SQLite)
DATABASE_URL="file:./prisma/dev.db"

# JWT Configuration (Auto-generated secure secrets)
JWT_SECRET="$JWT_SECRET"
JWT_REFRESH_SECRET="$JWT_REFRESH_SECRET"

# Server Configuration
PORT=3001
NODE_ENV=production

# CORS Configuration
CORS_ORIGIN="http://$SERVER_IP"
FRONTEND_URL="http://$SERVER_IP"
ALLOWED_ORIGINS="http://$SERVER_IP,http://localhost:3000"

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH="./uploads"
ALLOWED_FILE_TYPES="image/jpeg,image/png,image/jpg,image/gif,application/pdf"

# Rate Limiting (Security)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# Password Policy
MIN_PASSWORD_LENGTH=8
REQUIRE_PASSWORD_COMPLEXITY=false

# Telegram Bot Configuration (Optional)
TELEGRAM_BOT_TOKEN=""
TELEGRAM_WEBHOOK_URL=""

# Logging Configuration
LOG_LEVEL="info"
LOG_FILE="./logs/app.log"
EOF

print_status "Backend .env created with secure secrets"

# Step 11: Create Frontend .env.local
print_info "Setup Frontend Environment..."
cd $PROJECT_DIR/client

cat > .env.local << EOF
# API Configuration
NEXT_PUBLIC_API_URL=http://$SERVER_IP/api
NEXT_PUBLIC_WEBSOCKET_URL=ws://$SERVER_IP

# Application Configuration
NEXT_PUBLIC_APP_NAME="ISP Management System"
NEXT_PUBLIC_APP_VERSION="1.0.0"

# Environment
NODE_ENV=production
EOF

print_status "Frontend .env.local created"

# Step 12: Install Backend Dependencies
print_info "Install Backend Dependencies..."
cd $PROJECT_DIR/server

# Remove old lock files if any
rm -f package-lock.json

npm install --production || {
    print_error "Gagal install backend dependencies"
    exit 1
}
print_status "Backend dependencies installed"

# Step 13: Generate Prisma Client
print_info "Generate Prisma Client..."
npx prisma generate || {
    print_error "Gagal generate Prisma client"
    exit 1
}
print_status "Prisma client generated"

# Step 14: Setup Database
print_info "Setup SQLite Database..."
npx prisma db push --skip-seed || {
    print_error "Gagal setup database"
    exit 1
}
print_status "Database schema created"

# Step 15: Seed Database
print_info "Seed database dengan data awal..."
npm run seed || print_warning "Database seeding gagal, continuing..."

# Step 16: Create required directories
print_info "Create required directories..."
mkdir -p uploads logs
chmod 755 uploads logs

# Step 17: Install Frontend Dependencies
print_info "Install Frontend Dependencies..."
cd $PROJECT_DIR/client

# Remove old files
rm -rf .next node_modules package-lock.json

npm install --production || {
    print_error "Gagal install frontend dependencies"
    exit 1
}
print_status "Frontend dependencies installed"

# Step 18: Build Frontend
print_info "Building Frontend untuk Production..."
npm run build || {
    print_error "Gagal build frontend"
    exit 1
}
print_status "Frontend build success"

echo ""
echo "╔════════════════════════════════════════╗"
echo "║      FASE 3: KONFIGURASI SERVICE       ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Step 19: Setup PM2 Services
print_info "Setup PM2 Services..."

# Start Backend
cd $PROJECT_DIR/server
pm2 start index.js --name isp-management-server --max-memory-restart 500M || {
    print_error "Gagal start backend"
    exit 1
}
print_status "Backend running on PM2"

# Start Frontend
cd $PROJECT_DIR/client
pm2 start npm --name isp-management-client --max-memory-restart 500M -- start || {
    print_error "Gagal start frontend"
    exit 1
}
print_status "Frontend running on PM2"

# Save PM2 configuration
pm2 save
pm2 startup systemd -u root --hp /root > /dev/null 2>&1
print_status "PM2 configured for auto-start"

# Step 20: Configure Nginx
print_info "Configure Nginx Reverse Proxy..."

cat > /etc/nginx/sites-available/isp-management << 'NGINX_CONFIG'
server {
    listen 80;
    server_name 172.17.2.3;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    # File upload size
    client_max_body_size 10M;
    client_body_buffer_size 10M;
    
    # Timeouts
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
    
    # Frontend
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Backend API
    location /api {
        rewrite ^/api(.*)$ $1 break;
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # WebSocket Support
    location /socket.io {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Static files optimization
    location /_next/static {
        proxy_pass http://127.0.0.1:3000;
        proxy_cache_valid 60m;
        add_header Cache-Control "public, immutable";
    }
    
    # API health check endpoint
    location /health {
        proxy_pass http://127.0.0.1:3001/api/health;
        access_log off;
    }
}
NGINX_CONFIG

# Enable site
ln -sf /etc/nginx/sites-available/isp-management /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default 2>/dev/null

# Test Nginx configuration
nginx -t || {
    print_error "Nginx configuration error"
    exit 1
}

# Reload Nginx
systemctl reload nginx
print_status "Nginx configured and reloaded"

echo ""
echo "╔════════════════════════════════════════╗"
echo "║        FASE 4: VERIFIKASI              ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Wait for services to stabilize
print_info "Waiting for services to start..."
sleep 5

# Step 21: Verify Services
print_info "Verifying services..."

# Check PM2 status
pm2 list

# Test Backend
BACKEND_TEST=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health)
if [ "$BACKEND_TEST" = "200" ]; then
    print_status "Backend API: OK (HTTP $BACKEND_TEST)"
else
    print_warning "Backend API: HTTP $BACKEND_TEST"
fi

# Test Frontend
FRONTEND_TEST=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
if [ "$FRONTEND_TEST" = "200" ]; then
    print_status "Frontend: OK (HTTP $FRONTEND_TEST)"
else
    print_warning "Frontend: HTTP $FRONTEND_TEST"
fi

# Test Main Site
SITE_TEST=$(curl -s -o /dev/null -w "%{http_code}" http://$SERVER_IP)
if [ "$SITE_TEST" = "200" ]; then
    print_status "Main Site: OK (HTTP $SITE_TEST)"
else
    print_warning "Main Site: HTTP $SITE_TEST"
fi

# Show recent logs
echo ""
print_info "Recent PM2 Logs:"
pm2 logs --lines 5 --nostream

# Final Summary
echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║           SETUP COMPLETE! ✓                    ║"
echo "╚════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}Access Information:${NC}"
echo "  Main URL: http://$SERVER_IP"
echo "  API Health: http://$SERVER_IP/api/health"
echo ""
echo -e "${GREEN}Default Login Credentials:${NC}"
echo "  Username: superadmin"
echo "  Password: super123"
echo ""
echo -e "${YELLOW}Security Note:${NC}"
echo "  JWT Secrets telah di-generate secara otomatis"
echo "  Ganti password default setelah login pertama!"
echo ""
echo -e "${BLUE}Management Commands:${NC}"
echo "  pm2 status         - Check service status"
echo "  pm2 logs           - View application logs"
echo "  pm2 monit          - Real-time monitoring"
echo "  pm2 restart all    - Restart all services"
echo ""
echo -e "${BLUE}File Locations:${NC}"
echo "  Project: $PROJECT_DIR"
echo "  Backups: $BACKUP_DIR"
echo "  Nginx: /etc/nginx/sites-available/isp-management"
echo ""

# Save setup info
cat > "$PROJECT_DIR/SETUP_INFO.txt" << EOF
ISP Management System - Setup Information
==========================================
Setup Date: $(date)
Server IP: $SERVER_IP
Project Directory: $PROJECT_DIR

Services:
- Backend: http://localhost:3001 (PM2: isp-management-server)
- Frontend: http://localhost:3000 (PM2: isp-management-client)
- Nginx: http://$SERVER_IP

Database: SQLite ($PROJECT_DIR/server/prisma/dev.db)

Default Accounts:
- superadmin / super123
- admin / admin123
- gudang / gudang123
- userbiasa / user123

JWT Secrets have been auto-generated and saved in:
$PROJECT_DIR/server/.env
EOF

print_status "Setup information saved to $PROJECT_DIR/SETUP_INFO.txt"
echo ""
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}    CLEAN & SETUP COMPLETED SUCCESSFULLY!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
