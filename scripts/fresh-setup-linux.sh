#!/bin/bash

# ISP Management System - Fresh Setup Script for Linux Server
# Script ini akan melakukan setup ulang lengkap dari awal

echo "========================================="
echo "ISP Management System - Fresh Setup Linux"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# Configuration
SERVER_IP="172.17.2.3"
PROJECT_DIR="/var/www/isp-management"
BACKUP_DIR="/var/backups/isp-management"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
GITHUB_REPO="https://github.com/unnet-web-management/unnet-web-management.git"

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "Script ini harus dijalankan sebagai root atau dengan sudo"
   exit 1
fi

# Step 1: Backup konfigurasi lama
print_info "Step 1: Backup konfigurasi lama..."
if [ -d "$PROJECT_DIR" ]; then
    print_status "Membuat backup dari instalasi sebelumnya..."
    mkdir -p $BACKUP_DIR
    
    # Backup environment files jika ada
    if [ -f "$PROJECT_DIR/server/.env" ]; then
        cp "$PROJECT_DIR/server/.env" "$BACKUP_DIR/.env.backend.$TIMESTAMP"
        print_status "Backend .env di-backup"
    fi
    
    if [ -f "$PROJECT_DIR/client/.env.local" ]; then
        cp "$PROJECT_DIR/client/.env.local" "$BACKUP_DIR/.env.frontend.$TIMESTAMP"
        print_status "Frontend .env.local di-backup"
    fi
    
    # Backup database jika ada
    if [ -f "$PROJECT_DIR/server/prisma/dev.db" ]; then
        cp "$PROJECT_DIR/server/prisma/dev.db" "$BACKUP_DIR/dev.db.$TIMESTAMP"
        print_status "Database SQLite di-backup"
    fi
    
    # Hapus folder lama
    print_warning "Menghapus instalasi lama..."
    rm -rf $PROJECT_DIR
else
    print_info "Tidak ada instalasi sebelumnya"
fi

# Step 2: Clone repository dari GitHub
print_info "Step 2: Clone repository dari GitHub..."
mkdir -p /var/www
cd /var/www
git clone $GITHUB_REPO isp-management || {
    print_error "Gagal clone repository"
    exit 1
}
print_status "Repository berhasil di-clone"

# Step 3: Setup Backend Environment Variables
print_info "Step 3: Setup Backend Environment Variables..."
cd $PROJECT_DIR/server

# Generate JWT secrets
JWT_SECRET=$(openssl rand -hex 64)
JWT_REFRESH_SECRET=$(openssl rand -hex 64)

cat > .env << EOF
# Database Configuration (SQLite)
DATABASE_URL="file:./prisma/dev.db"

# JWT Configuration
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
ALLOWED_FILE_TYPES="image/jpeg,image/png,image/jpg"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# Password Policy
MIN_PASSWORD_LENGTH=8
REQUIRE_PASSWORD_COMPLEXITY=false

# Telegram Bot Configuration (Optional)
TELEGRAM_BOT_TOKEN=""
TELEGRAM_WEBHOOK_URL=""

# Logging
LOG_LEVEL="info"
LOG_FILE="./logs/app.log"
EOF

print_status "Backend .env berhasil dibuat"

# Step 4: Setup Frontend Environment Variables
print_info "Step 4: Setup Frontend Environment Variables..."
cd $PROJECT_DIR/client

cat > .env.local << EOF
# API Configuration
NEXT_PUBLIC_API_URL=http://$SERVER_IP/api
NEXT_PUBLIC_WEBSOCKET_URL=ws://$SERVER_IP

# Environment
NODE_ENV=production
EOF

print_status "Frontend .env.local berhasil dibuat"

# Step 5: Install Backend Dependencies dan Generate Prisma
print_info "Step 5: Install Backend Dependencies..."
cd $PROJECT_DIR/server
npm install || {
    print_error "Gagal install backend dependencies"
    exit 1
}
print_status "Backend dependencies terinstall"

print_info "Generate Prisma Client..."
npx prisma generate || {
    print_error "Gagal generate Prisma client"
    exit 1
}
print_status "Prisma client berhasil di-generate"

# Step 6: Setup Database SQLite
print_info "Step 6: Setup Database SQLite..."
npx prisma db push || {
    print_error "Gagal setup database"
    exit 1
}
print_status "Database schema berhasil dibuat"

print_info "Seeding database dengan data awal..."
npm run seed || print_warning "Seeding gagal, lanjut tanpa seed data"

# Step 7: Install Frontend Dependencies dan Build
print_info "Step 7: Install Frontend Dependencies..."
cd $PROJECT_DIR/client
npm install || {
    print_error "Gagal install frontend dependencies"
    exit 1
}
print_status "Frontend dependencies terinstall"

print_info "Building frontend untuk production..."
npm run build || {
    print_error "Gagal build frontend"
    exit 1
}
print_status "Frontend berhasil di-build"

# Step 8: Setup PM2
print_info "Step 8: Setup PM2..."

# Stop dan hapus service lama jika ada
pm2 delete isp-management-server 2>/dev/null
pm2 delete isp-management-client 2>/dev/null

# Start Backend dengan PM2
cd $PROJECT_DIR/server
pm2 start index.js --name isp-management-server --env production || {
    print_error "Gagal start backend dengan PM2"
    exit 1
}
print_status "Backend berjalan di PM2"

# Start Frontend dengan PM2
cd $PROJECT_DIR/client
pm2 start npm --name isp-management-client -- start || {
    print_error "Gagal start frontend dengan PM2"
    exit 1
}
print_status "Frontend berjalan di PM2"

# Save PM2 configuration
pm2 save
pm2 startup systemd -u root --hp /root

print_status "PM2 dikonfigurasi untuk auto-start"

# Step 9: Konfigurasi Nginx
print_info "Step 9: Konfigurasi Nginx..."

# Backup konfigurasi lama jika ada
if [ -f "/etc/nginx/sites-available/isp-management" ]; then
    cp /etc/nginx/sites-available/isp-management "$BACKUP_DIR/nginx.conf.$TIMESTAMP"
    print_info "Nginx config lama di-backup"
fi

# Buat konfigurasi Nginx baru
cat > /etc/nginx/sites-available/isp-management << 'EOF'
server {
    listen 80;
    server_name 172.17.2.3;
    
    client_max_body_size 10M;
    
    # Frontend
    location / {
        proxy_pass http://localhost:3000;
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
        proxy_pass http://localhost:3001;
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
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Static files
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 60m;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/isp-management /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default 2>/dev/null

# Test dan restart Nginx
nginx -t || {
    print_error "Konfigurasi Nginx tidak valid"
    exit 1
}

systemctl restart nginx || {
    print_error "Gagal restart Nginx"
    exit 1
}

print_status "Nginx berhasil dikonfigurasi dan di-restart"

# Step 10: Test Endpoints
print_info "Step 10: Testing endpoints..."
sleep 5  # Tunggu service startup

echo ""
print_info "Testing Backend API..."
BACKEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health)
if [ "$BACKEND_RESPONSE" = "200" ]; then
    print_status "Backend API OK (HTTP $BACKEND_RESPONSE)"
else
    print_warning "Backend API response: HTTP $BACKEND_RESPONSE"
fi

print_info "Testing Frontend..."
FRONTEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
if [ "$FRONTEND_RESPONSE" = "200" ]; then
    print_status "Frontend OK (HTTP $FRONTEND_RESPONSE)"
else
    print_warning "Frontend response: HTTP $FRONTEND_RESPONSE"
fi

print_info "Testing Main Site..."
SITE_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://$SERVER_IP)
if [ "$SITE_RESPONSE" = "200" ]; then
    print_status "Main site accessible (HTTP $SITE_RESPONSE)"
else
    print_warning "Main site response: HTTP $SITE_RESPONSE"
fi

# Final Status
echo ""
echo "========================================="
echo -e "${GREEN}Setup Selesai!${NC}"
echo "========================================="
echo ""
echo "Informasi Akses:"
echo "  URL: http://$SERVER_IP"
echo "  Backend API: http://$SERVER_IP/api"
echo ""
echo "Login Credentials:"
echo "  Username: superadmin"
echo "  Password: super123"
echo ""
echo "PM2 Commands:"
echo "  pm2 status       - Lihat status services"
echo "  pm2 logs         - Lihat logs"
echo "  pm2 monit        - Monitor real-time"
echo ""
echo "File Locations:"
echo "  Project: $PROJECT_DIR"
echo "  Backup: $BACKUP_DIR"
echo "  Nginx Config: /etc/nginx/sites-available/isp-management"
echo ""
print_status "Fresh setup completed successfully!"
