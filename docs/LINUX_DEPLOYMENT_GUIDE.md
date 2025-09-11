# 🐧 Linux Deployment Guide (Mobaxterm)

Panduan lengkap untuk deploy ISP Management System di Linux server via Mobaxterm.

## 📋 **Persyaratan Sistem**

### **Server Linux:**
- **OS**: Ubuntu 20.04+ / CentOS 8+ / Debian 11+
- **RAM**: Minimal 2GB (Recommended 4GB+)
- **Storage**: Minimal 10GB free space
- **Network**: Port 3000, 3001, 22 (SSH) terbuka

### **Software yang Diperlukan:**
- **Node.js**: v16+ (Recommended v18+)
- **npm**: v8+
- **Git**: Latest version
- **PM2**: Process manager
- **Nginx**: Reverse proxy (optional)

## 🚀 **Setup Awal di Linux**

### **1. Update System**
```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
```

### **2. Install Node.js**
```bash
# Install Node.js v18 (LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### **3. Install PM2 (Process Manager)**
```bash
sudo npm install -g pm2
```

### **4. Install Git**
```bash
# Ubuntu/Debian
sudo apt install git -y

# CentOS/RHEL
sudo yum install git -y
```

## 📥 **Clone & Setup Project**

### **1. Clone Repository**
```bash
# Clone dari GitHub
git clone https://github.com/YOUR_USERNAME/isp-management-system.git
cd isp-management-system

# Atau jika sudah ada, update
git pull origin main
```

### **2. Install Dependencies**
```bash
# Install root dependencies
npm install

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
cd ..
```

### **3. Setup Environment**
```bash
# Copy environment template
cp .env.example .env

# Create server environment file
cat > server/.env << 'EOF'
# ISP Management System - Server Environment Variables
NODE_ENV=production
PORT=3001

# Database
DATABASE_URL="file:./prisma/prod.db"

# JWT Secrets (CHANGE THESE!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# WhatsApp Configuration
WHATSAPP_SESSION_PATH=./auth_info_baileys
WHATSAPP_QR_PATH=./public/qr

# Security
BCRYPT_ROUNDS=10
SESSION_SECRET=your-session-secret-change-this

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/combined.log
EOF

# Edit environment files if needed
nano .env
nano server/.env
```

### **4. Fix Vulnerabilities (Important!)**
```bash
# Run vulnerability fix script
chmod +x scripts/fix-vulnerabilities.sh
./scripts/fix-vulnerabilities.sh

# Or manually fix vulnerabilities
npm audit fix --force
cd server && npm audit fix --force && cd ..
cd client && npm audit fix --force && cd ..
```

### **5. Database Setup**
```bash
cd server

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma db push

# Seed database
npx prisma db seed
```

## 🔧 **Production Configuration**

### **1. Environment Variables (server/.env)**
```env
NODE_ENV=production
PORT=3001
DATABASE_URL="file:./prisma/prod.db"
JWT_SECRET=your-super-secret-jwt-key-here
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here

# WhatsApp Configuration
WHATSAPP_SESSION_PATH=./auth_info_baileys
WHATSAPP_QR_PATH=./public/qr

# Security
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### **2. Environment Variables (.env)**
```env
NODE_ENV=production
```

## 🚀 **Deployment dengan PM2**

### **1. Buat PM2 Ecosystem File**
```bash
# Buat file ecosystem.config.js
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'isp-backend',
      script: 'server/index.js',
      cwd: '/path/to/your/project',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
      time: true
    },
    {
      name: 'isp-frontend',
      script: 'npm',
      args: 'start',
      cwd: '/path/to/your/project/client',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_file: './logs/frontend-combined.log',
      time: true
    },
    {
      name: 'isp-whatsapp',
      script: 'scripts/whatsapp-bot-integrated.js',
      cwd: '/path/to/your/project',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/whatsapp-error.log',
      out_file: './logs/whatsapp-out.log',
      log_file: './logs/whatsapp-combined.log',
      time: true
    }
  ]
};
EOF
```

### **2. Update Path di Ecosystem**
```bash
# Ganti /path/to/your/project dengan path sebenarnya
sed -i 's|/path/to/your/project|'$(pwd)'|g' ecosystem.config.js
```

### **3. Build & Start Services**
```bash
# Build client untuk production
cd client
npm run build
cd ..

# Start semua services dengan PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup
pm2 startup
```

## 🔄 **Update & Maintenance**

### **1. Update dari GitHub**
```bash
# Pull latest changes
git pull origin main

# Install new dependencies (jika ada)
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..

# Restart services
pm2 restart all
```

### **2. PM2 Commands**
```bash
# Status semua services
pm2 status

# Logs
pm2 logs
pm2 logs isp-backend
pm2 logs isp-frontend
pm2 logs isp-whatsapp

# Restart specific service
pm2 restart isp-backend

# Stop all services
pm2 stop all

# Delete all services
pm2 delete all
```

### **3. Database Maintenance**
```bash
cd server

# Backup database
cp prisma/prod.db prisma/backup-$(date +%Y%m%d).db

# Run migrations
npx prisma db push

# Regenerate client
npx prisma generate
```

## 🌐 **Nginx Configuration (Optional)**

### **1. Install Nginx**
```bash
sudo apt install nginx -y
```

### **2. Nginx Config**
```bash
sudo nano /etc/nginx/sites-available/isp-management
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### **3. Enable Site**
```bash
sudo ln -s /etc/nginx/sites-available/isp-management /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 🔒 **Security & Firewall**

### **1. Firewall Setup**
```bash
# Ubuntu/Debian
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=22/tcp
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --reload
```

### **2. SSL Certificate (Let's Encrypt)**
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d your-domain.com
```

## 📊 **Monitoring & Logs**

### **1. PM2 Monitoring**
```bash
# Install PM2 monitoring
pm2 install pm2-logrotate

# Monitor resources
pm2 monit
```

### **2. Log Rotation**
```bash
# PM2 log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

## 🚨 **Troubleshooting**

### **1. DATABASE_URL Error**
```bash
# Error: Environment variable not found: DATABASE_URL
# Solution: Create server/.env file
cat > server/.env << 'EOF'
DATABASE_URL="file:./prisma/prod.db"
NODE_ENV=production
PORT=3001
JWT_SECRET=your-secret-key
EOF
```

### **2. NPM Vulnerabilities & ESLint Conflicts**
```bash
# Fix all vulnerabilities and ESLint conflicts
./scripts/fix-vulnerabilities.sh

# Or manually fix ESLint conflicts
cd client
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
cd ..

# Fix vulnerabilities
npm audit fix --force
cd server && npm audit fix --force && cd ..
```

### **3. ESLint Dependency Conflict (ERESOLVE)**
```bash
# Error: ERESOLVE could not resolve eslint-config-next@14.0.0
# Solution: Use legacy peer deps
cd client
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps

# Alternative: Force resolution
npm install --force
```

### **4. Deprecated Packages**
```bash
# Update Baileys
cd server
npm uninstall @whiskeysockets/baileys
npm install baileys

# Update Multer
npm install multer@^2.0.0

# Update ESLint (if needed)
cd ../client
npm install eslint@^8.57.1 --legacy-peer-deps
```

### **5. Service Tidak Start**
```bash
# Check logs
pm2 logs

# Check port usage
sudo netstat -tlnp | grep :3000
sudo netstat -tlnp | grep :3001

# Check disk space
df -h
```

### **6. Database Issues**
```bash
cd server
npx prisma studio --port 5556
```

### **7. WhatsApp Bot Issues**
```bash
# Check WhatsApp status
cat scripts/whatsapp-status.json

# Restart WhatsApp service
pm2 restart isp-whatsapp
```

## 📱 **Access URLs**

Setelah deployment berhasil:
- **Frontend**: http://your-server-ip:3000
- **Backend API**: http://your-server-ip:3001
- **Health Check**: http://your-server-ip:3001/api/health
- **Prisma Studio**: http://your-server-ip:5556

## 🔑 **Default Login Credentials**

- **Super Admin**: `superadmin/super123`
- **Admin**: `admin/admin123`
- **Inventory Admin**: `gudang/gudang123`
- **Regular User**: `userbiasa/user123`

---

**🎉 Selamat! Sistem ISP Management sudah berjalan di Linux server Anda!**

*Untuk update selanjutnya, cukup jalankan `git pull origin main` dan `pm2 restart all`*
