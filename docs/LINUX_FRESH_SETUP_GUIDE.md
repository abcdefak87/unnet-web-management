# ISP Management System - Panduan Setup Ulang di Linux

## 📋 Prerequisites

Pastikan server Linux Anda sudah memiliki:
- Ubuntu/Debian OS
- Node.js 18+ dan npm
- PM2 (`npm install -g pm2`)
- Nginx
- Git
- OpenSSL (untuk generate JWT secrets)

## 🚀 Quick Setup (Otomatis)

### Dari Windows:
```batch
cd "d:\backup\backup\projek web"
scripts\run-fresh-setup.bat
```

### Langsung di Server:
```bash
# Download script
wget https://raw.githubusercontent.com/unnet-web-management/unnet-web-management/main/scripts/fresh-setup-linux.sh

# Atau copy manual dan jalankan
chmod +x fresh-setup-linux.sh
sudo bash fresh-setup-linux.sh
```

## 📝 Manual Setup Step-by-Step

### Step 1: Backup Data Lama (Jika Ada)

```bash
# Backup environment files
sudo cp /var/www/isp-management/server/.env /tmp/backend.env.backup
sudo cp /var/www/isp-management/client/.env.local /tmp/frontend.env.backup

# Backup database
sudo cp /var/www/isp-management/server/prisma/dev.db /tmp/database.backup.db

# Hapus instalasi lama
sudo rm -rf /var/www/isp-management
```

### Step 2: Clone Repository

```bash
cd /var/www
sudo git clone https://github.com/unnet-web-management/unnet-web-management.git isp-management
cd isp-management
```

### Step 3: Setup Backend Environment

```bash
cd /var/www/isp-management/server

# Buat file .env
sudo nano .env
```

Isi dengan:
```env
# Database Configuration (SQLite)
DATABASE_URL="file:./prisma/dev.db"

# JWT Configuration (Generate dengan: openssl rand -hex 64)
JWT_SECRET="your-generated-jwt-secret-here"
JWT_REFRESH_SECRET="your-generated-refresh-secret-here"

# Server Configuration
PORT=3001
NODE_ENV=production

# CORS Configuration
CORS_ORIGIN="http://172.17.2.3"
FRONTEND_URL="http://172.17.2.3"
ALLOWED_ORIGINS="http://172.17.2.3,http://localhost:3000"

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH="./uploads"
ALLOWED_FILE_TYPES="image/jpeg,image/png,image/jpg"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# Password Policy
MIN_PASSWORD_LENGTH=8
REQUIRE_PASSWORD_COMPLEXITY=false

# Telegram Bot (Optional)
TELEGRAM_BOT_TOKEN=""
TELEGRAM_WEBHOOK_URL=""

# Logging
LOG_LEVEL="info"
LOG_FILE="./logs/app.log"
```

### Step 4: Setup Frontend Environment

```bash
cd /var/www/isp-management/client

# Buat file .env.local
sudo nano .env.local
```

Isi dengan:
```env
# API Configuration
NEXT_PUBLIC_API_URL=http://172.17.2.3/api
NEXT_PUBLIC_WEBSOCKET_URL=ws://172.17.2.3

# Environment
NODE_ENV=production
```

### Step 5: Install Dependencies & Setup Database

```bash
# Backend
cd /var/www/isp-management/server
sudo npm install
sudo npx prisma generate
sudo npx prisma db push
sudo npm run seed

# Frontend
cd /var/www/isp-management/client
sudo npm install
sudo npm run build
```

### Step 6: Setup PM2

```bash
# Stop services lama (jika ada)
pm2 delete all

# Start Backend
cd /var/www/isp-management/server
pm2 start index.js --name isp-management-server --env production

# Start Frontend
cd /var/www/isp-management/client
pm2 start npm --name isp-management-client -- start

# Save PM2 config
pm2 save
pm2 startup systemd -u root --hp /root
```

### Step 7: Konfigurasi Nginx

```bash
# Buat file konfigurasi
sudo nano /etc/nginx/sites-available/isp-management
```

Isi dengan:
```nginx
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
    
    # Static files cache
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 60m;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable site:
```bash
# Enable site
sudo ln -sf /etc/nginx/sites-available/isp-management /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test dan restart
sudo nginx -t
sudo systemctl restart nginx
```

### Step 8: Verifikasi Setup

```bash
# Check PM2 status
pm2 status

# Test endpoints
curl http://localhost:3001/api/health
curl -I http://localhost:3000
curl -I http://172.17.2.3

# Check logs
pm2 logs --lines 20
```

## 🔍 Troubleshooting

### Error: Port Already in Use
```bash
# Find process using port
sudo lsof -i :3001
sudo lsof -i :3000

# Kill process
sudo kill -9 <PID>

# Atau restart PM2
pm2 delete all
pm2 start ecosystem.config.js
```

### Error: Prisma Client Not Found
```bash
cd /var/www/isp-management/server
sudo npx prisma generate
pm2 restart isp-management-server
```

### Error: Database Not Found
```bash
cd /var/www/isp-management/server
sudo npx prisma db push
sudo npm run seed
```

### Error: Frontend Build Failed
```bash
cd /var/www/isp-management/client
sudo rm -rf .next node_modules package-lock.json
sudo npm install
sudo npm run build
pm2 restart isp-management-client
```

### Error: Nginx 502 Bad Gateway
```bash
# Check if services running
pm2 status

# Check Nginx error log
sudo tail -f /var/log/nginx/error.log

# Restart services
pm2 restart all
sudo systemctl restart nginx
```

## 📊 Monitoring Commands

```bash
# Real-time monitoring
pm2 monit

# View logs
pm2 logs
pm2 logs isp-management-server
pm2 logs isp-management-client

# System resources
htop
df -h
free -m

# Network connections
netstat -tulpn | grep -E '3000|3001|80'
```

## 🔐 Security Checklist

- [ ] Generate strong JWT secrets
- [ ] Change default passwords after first login
- [ ] Configure firewall (ufw)
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```
- [ ] Setup SSL certificate (optional)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

## 📱 Default Login Credentials

| Role | Username | Password |
|------|----------|----------|
| Super Admin | superadmin | super123 |
| Admin | admin | admin123 |
| Warehouse | gudang | gudang123 |
| User | userbiasa | user123 |

**⚠️ PENTING:** Ganti password default segera setelah login pertama!

## 🆘 Quick Commands Reference

```bash
# Status check
pm2 status
curl http://172.17.2.3/api/health

# Restart services
pm2 restart all
sudo systemctl restart nginx

# View logs
pm2 logs --lines 50
tail -f /var/log/nginx/error.log

# Update from GitHub
cd /var/www/isp-management
git pull origin main
cd server && npm install && npx prisma generate
cd ../client && npm install && npm run build
pm2 restart all
```

## 📅 Maintenance Tasks

### Daily
- Check PM2 status: `pm2 status`
- Monitor logs: `pm2 logs --lines 100`

### Weekly
- Check disk space: `df -h`
- Review error logs
- Backup database: `cp /var/www/isp-management/server/prisma/dev.db /backup/`

### Monthly
- Update dependencies
- Security updates: `sudo apt update && sudo apt upgrade`
- Performance review

---

**Last Updated:** December 2024
**Version:** 1.0.0
