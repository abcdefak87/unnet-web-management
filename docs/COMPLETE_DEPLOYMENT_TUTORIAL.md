# 🚀 Complete Deployment Tutorial - Zero Error Guide

## 📋 **Pre-Deployment Checklist**

### **Requirements Verification:**
- ✅ Linux Server (Ubuntu 20.04+ / Debian 11+)
- ✅ Domain name pointing to server IP
- ✅ SSH access to server
- ✅ Minimum 2GB RAM, 20GB storage
- ✅ GitHub account and repository

### **Local Preparation:**
```bash
# 1. Verify project structure
ls -la
# Should show: client/, server/, setup/, docs/, .github/

# 2. Test local development
cd server && npm install && npm run dev
cd ../client && npm install && npm run dev

# 3. Backup existing data (if upgrading)
cd server && node ../scripts/preserve-accounts.js backup
```

## 🎯 **Step-by-Step Deployment Process**

### **Phase 1: GitHub Repository Setup**

#### **Step 1.1: Initialize Git Repository**
```bash
# Initialize git (if not already done)
git init

# Add GitHub remote
git remote add origin https://github.com/yourusername/isp-management-system.git

# Create .gitignore if missing
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*

# Environment variables
.env
.env.local
.env.production

# Database
server/prisma/dev.db
server/prisma/dev.db-journal

# Uploads
server/uploads/
client/public/uploads/

# Logs
*.log
logs/

# OS generated files
.DS_Store
Thumbs.db

# IDE files
.vscode/
.idea/

# Backup files
backups/
*.backup

# Build outputs
client/.next/
client/out/
server/dist/
EOF
```

#### **Step 1.2: Commit and Push**
```bash
# Add all files
git add .

# Commit
git commit -m "feat: ISP Management System - Production Ready"

# Push to GitHub
git push -u origin main
```

### **Phase 2: Server Preparation**

#### **Step 2.1: Connect to Server**
```bash
# Connect via SSH
ssh root@your-server-ip
# OR
ssh username@your-server-ip

# Update system
sudo apt update && sudo apt upgrade -y
```

#### **Step 2.2: Clone Repository**
```bash
# Clone to web directory
sudo git clone https://github.com/yourusername/isp-management-system.git /var/www/isp-management

# Set ownership
sudo chown -R $USER:$USER /var/www/isp-management

# Navigate to project
cd /var/www/isp-management
```

### **Phase 3: Automated Server Installation**

#### **Step 3.1: Run Installation Script**
```bash
# Make script executable
chmod +x setup/install-server.sh

# Run installation (this will install Node.js, PostgreSQL, Nginx, PM2, SSL)
./setup/install-server.sh

# Script will prompt for:
# - PostgreSQL password
# - Domain name
# - Email for SSL certificate
```

**What the script installs:**
- ✅ Node.js 18.x
- ✅ PostgreSQL 12+
- ✅ Nginx web server
- ✅ PM2 process manager
- ✅ Certbot for SSL
- ✅ UFW firewall
- ✅ Required system dependencies

#### **Step 3.2: Verify Installation**
```bash
# Check services status
sudo systemctl status postgresql
sudo systemctl status nginx
pm2 --version
node --version
```

### **Phase 4: Application Configuration**

#### **Step 4.1: Run Configuration Script**
```bash
# Configure application
./setup/configure-app.sh

# Script will:
# - Copy .env.example to .env
# - Generate secure JWT secret
# - Install dependencies
# - Setup database
```

#### **Step 4.2: Manual Environment Configuration**
```bash
# Edit environment file
nano server/.env

# Update these critical values:
DATABASE_URL="postgresql://isp_user:YOUR_DB_PASSWORD@localhost:5432/isp_management"
JWT_SECRET="auto_generated_secret_from_script"
FRONTEND_URL="https://yourdomain.com"
ALLOWED_ORIGINS="https://yourdomain.com,https://www.yourdomain.com"
TELEGRAM_BOT_TOKEN="your_telegram_bot_token"
TELEGRAM_WEBHOOK_URL="https://yourdomain.com/api/telegram/webhook"
```

### **Phase 5: Database Setup & Account Protection**

#### **Step 5.1: Database Creation**
```bash
# Database should be created by configure-app.sh, but verify:
sudo -u postgres psql -l | grep isp_management

# If not exists, create manually:
sudo -u postgres createdb isp_management
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE isp_management TO isp_user;"
```

#### **Step 5.2: Schema Migration**
```bash
cd server

# Generate Prisma client
npm run db:generate

# Deploy database schema
npm run db:deploy

# Alternative if migrations fail:
npm run db:push
```

#### **Step 5.3: Account Protection & Seeding**
```bash
# If this is fresh installation:
node ../scripts/preserve-accounts.js seed

# If upgrading from existing system:
# 1. First backup was created in pre-deployment
# 2. Restore accounts:
node ../scripts/preserve-accounts.js restore

# Verify all 4 accounts exist:
node ../scripts/preserve-accounts.js verify
```

### **Phase 6: Web Server Configuration**

#### **Step 6.1: Configure Nginx & SSL**
```bash
# Run Nginx configuration script
./setup/configure-nginx.sh

# Script will prompt for:
# - Domain name (e.g., yourdomain.com)
# - Email for SSL certificate

# Script configures:
# - Nginx reverse proxy
# - SSL certificate via Let's Encrypt
# - Security headers
# - Gzip compression
```

#### **Step 6.2: Verify Nginx Configuration**
```bash
# Test Nginx configuration
sudo nginx -t

# If successful, reload
sudo systemctl reload nginx

# Check SSL certificate
sudo certbot certificates
```

### **Phase 7: Application Deployment**

#### **Step 7.1: Build Applications**
```bash
# Build client (Next.js)
cd client
npm install
npm run build

# Install server dependencies
cd ../server
npm install
```

#### **Step 7.2: Start Applications with PM2**
```bash
# Start backend
pm2 start server/index.js --name "isp-backend"

# Start frontend
cd client
pm2 start npm --name "isp-frontend" -- start

# Save PM2 configuration
pm2 save
pm2 startup
```

#### **Step 7.3: Verify Applications**
```bash
# Check PM2 status
pm2 status

# Check application logs
pm2 logs

# Test endpoints
curl https://yourdomain.com/api/health
curl https://yourdomain.com
```

### **Phase 8: Final Verification & Testing**

#### **Step 8.1: Health Checks**
```bash
# Run comprehensive health check
./scripts/health-check.sh

# Manual checks:
# 1. Database connection
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$connect().then(() => {
  console.log('✅ Database connected');
  return prisma.user.count();
}).then(count => {
  console.log(\`👥 Users: \${count}\`);
  process.exit(0);
}).catch(err => {
  console.error('❌ Database error:', err);
  process.exit(1);
});
"

# 2. Web server response
curl -I https://yourdomain.com

# 3. API endpoints
curl https://yourdomain.com/api/health
```

#### **Step 8.2: Login Testing**
```bash
# Test all 4 protected accounts
echo "Testing login endpoints..."

# Test superadmin
curl -X POST https://yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin","password":"super123"}'

# Test admin
curl -X POST https://yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin","password":"admin123"}'

# Test gudang
curl -X POST https://yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"gudang","password":"gudang123"}'

# Test userbiasa
curl -X POST https://yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"userbiasa","password":"user123"}'
```

## 🔧 **Troubleshooting Common Issues**

### **Issue 1: Database Connection Failed**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check database exists
sudo -u postgres psql -l | grep isp_management

# Check user permissions
sudo -u postgres psql -c "\du"

# Fix: Recreate database and user
sudo -u postgres dropdb isp_management
sudo -u postgres createdb isp_management
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE isp_management TO isp_user;"
```

### **Issue 2: PM2 Applications Not Starting**
```bash
# Check PM2 logs
pm2 logs

# Restart applications
pm2 restart all

# Check environment variables
cat server/.env

# Fix: Ensure all required env vars are set
nano server/.env
```

### **Issue 3: Nginx 502 Bad Gateway**
```bash
# Check if backend is running
pm2 status

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Test backend directly
curl http://localhost:3001/api/health

# Fix: Restart backend
pm2 restart isp-backend
```

### **Issue 4: SSL Certificate Issues**
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate
sudo certbot renew --dry-run

# Fix: Reconfigure SSL
sudo certbot --nginx -d yourdomain.com
```

### **Issue 5: Missing User Accounts**
```bash
# Check current users
node ../scripts/preserve-accounts.js verify

# Restore from backup
node ../scripts/preserve-accounts.js restore

# Or seed fresh accounts
node ../scripts/preserve-accounts.js seed
```

## 🔄 **Update Procedures**

### **Method 1: GitHub Actions (Automatic)**
```bash
# Push changes to main branch
git add .
git commit -m "feat: new feature"
git push origin main

# GitHub Actions will automatically deploy
```

### **Method 2: Manual Server Update**
```bash
# Connect to server
ssh user@your-server-ip
cd /var/www/isp-management

# Pull latest changes
git pull origin main

# Update dependencies
cd server && npm install
cd ../client && npm install

# Rebuild client
cd client && npm run build

# Restart applications
pm2 restart all

# Verify update
pm2 status
```

## 📊 **Monitoring & Maintenance**

### **Daily Health Check Script**
```bash
# Create monitoring script
cat > /var/www/isp-management/daily-check.sh << 'EOF'
#!/bin/bash
echo "🔍 Daily Health Check - $(date)"
echo "=================================="

# Check services
echo "📊 Service Status:"
sudo systemctl is-active postgresql && echo "✅ PostgreSQL: Running" || echo "❌ PostgreSQL: Stopped"
sudo systemctl is-active nginx && echo "✅ Nginx: Running" || echo "❌ Nginx: Stopped"

# Check PM2 applications
echo "📱 PM2 Applications:"
pm2 jlist | jq -r '.[] | "- \(.name): \(.pm2_env.status)"'

# Check disk space
echo "💾 Disk Usage:"
df -h / | tail -1

# Check database
echo "🗄️ Database Status:"
cd /var/www/isp-management/server
node ../scripts/preserve-accounts.js verify

echo "✅ Health check completed"
EOF

chmod +x /var/www/isp-management/daily-check.sh

# Add to crontab for daily execution
(crontab -l 2>/dev/null; echo "0 8 * * * /var/www/isp-management/daily-check.sh") | crontab -
```

### **Backup Strategy**
```bash
# Database backup (already configured in setup)
# Files are saved to /var/backups/isp-management/

# Application backup
tar -czf /var/backups/isp-management/app_backup_$(date +%Y%m%d).tar.gz \
  /var/www/isp-management \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=uploads
```

## 🎯 **Production Checklist**

### **Before Going Live:**
- ✅ All 4 user accounts working (superadmin, admin, gudang, userbiasa)
- ✅ Database properly configured and accessible
- ✅ SSL certificate installed and valid
- ✅ All API endpoints responding correctly
- ✅ Frontend loading and functional
- ✅ Telegram bot configured (if used)
- ✅ File upload functionality working
- ✅ Backup systems configured
- ✅ Monitoring scripts installed
- ✅ Firewall properly configured

### **Security Verification:**
- ✅ Strong database passwords set
- ✅ JWT secrets are secure and unique
- ✅ HTTPS redirect working
- ✅ Security headers configured
- ✅ Rate limiting enabled
- ✅ File upload restrictions in place
- ✅ CORS properly configured

### **Performance Verification:**
- ✅ Gzip compression enabled
- ✅ Static files served efficiently
- ✅ Database queries optimized
- ✅ Connection pooling configured
- ✅ PM2 cluster mode (if needed)

## 🎉 **Deployment Complete!**

Your ISP Management System is now successfully deployed with:

### **🔐 Login Credentials:**
- **Super Admin**: `superadmin` / `super123`
- **Admin**: `admin` / `admin123` 
- **Inventory**: `gudang` / `gudang123`
- **User**: `userbiasa` / `user123`

### **🌐 Access URLs:**
- **Frontend**: `https://yourdomain.com`
- **API Health**: `https://yourdomain.com/api/health`
- **Backend Health**: `https://yourdomain.com/health`

### **📱 Management Commands:**
```bash
# Check status
pm2 status && sudo systemctl status nginx

# View logs
pm2 logs

# Restart applications
pm2 restart all

# Update application
cd /var/www/isp-management && git pull && pm2 restart all

# Database backup
./backup_database.sh

# Health check
./daily-check.sh
```

**🚨 Important Notes:**
- Change default passwords after first login
- Setup regular backups
- Monitor system resources
- Keep system updated
- Review logs regularly

Your system is now production-ready and secure! 🎊
