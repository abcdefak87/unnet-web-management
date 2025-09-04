# 🚀 ISP Management System - Deployment Guide

## 📋 **Overview**

Panduan lengkap untuk deploy ISP Management System ke production server menggunakan GitHub dan Linux hosting.

## 🎯 **Deployment Architecture**

```
GitHub Repository
       ↓
   Linux Server
   ├── Nginx (Reverse Proxy + SSL)
   ├── PM2 (Process Manager)
   ├── Node.js Backend (Port 3001)
   ├── Next.js Frontend (Port 3000)
   └── PostgreSQL Database
```

## 📁 **File Structure**

```
isp-management-system/
├── .github/
│   └── workflows/
│       └── deploy.yml           # GitHub Actions CI/CD
├── setup/
│   ├── install-server.sh        # Server installation script
│   ├── configure-app.sh         # Application configuration
│   ├── configure-nginx.sh       # Nginx & SSL setup
│   └── deploy-mobaxterm.md      # MobaXterm deployment guide
├── deploy-to-github.md          # GitHub setup guide
├── DEPLOYMENT.md                # This file
└── update-app.sh                # Auto-generated update script
```

## 🚀 **Quick Start Deployment**

### **Step 1: Upload ke GitHub**
```bash
# Initialize git repository
git init
git remote add origin https://github.com/username/isp-management-system.git

# Commit and push
git add .
git commit -m "Initial commit: ISP Management System"
git push -u origin main
```

### **Step 2: Server Installation**
```bash
# Connect to server via MobaXterm
ssh user@your-server-ip

# Clone repository
git clone https://github.com/username/isp-management-system.git /var/www/isp-management

# Run installation
cd /var/www/isp-management
chmod +x setup/install-server.sh
./setup/install-server.sh
```

### **Step 3: Configure Application**
```bash
# Configure application
./setup/configure-app.sh

# Edit environment variables
nano server/.env
# Update: database password, domain, secrets
```

### **Step 4: Setup Nginx & SSL**
```bash
# Configure web server
./setup/configure-nginx.sh
# Input: domain name and email for SSL
```

### **Step 5: Verify Deployment**
```bash
# Check services
pm2 status
sudo systemctl status nginx

# Test endpoints
curl https://yourdomain.com/api/health
```

## 🔄 **Update Workflow**

### **Development to Production:**

1. **Local Development**
   ```bash
   # Make changes locally
   git checkout -b feature/new-feature
   # ... make changes ...
   git commit -m "feat: add new feature"
   git push origin feature/new-feature
   ```

2. **Create Pull Request**
   - Create PR on GitHub
   - Review and merge to main branch

3. **Auto-Deploy (GitHub Actions)**
   - Automatic deployment when pushing to main
   - Or manual deployment via server

4. **Manual Update on Server**
   ```bash
   # Connect to server
   ssh user@your-server-ip
   cd /var/www/isp-management
   
   # Run update script
   ./update-app.sh
   ```

## 🛠️ **Server Requirements**

### **Minimum Specifications:**
- **OS**: Ubuntu 20.04+ / Debian 11+
- **RAM**: 2GB minimum, 4GB recommended
- **Storage**: 20GB minimum, 50GB recommended
- **CPU**: 1 core minimum, 2 cores recommended
- **Network**: Public IP with domain pointing to it

### **Software Stack:**
- **Node.js**: 18.x
- **PostgreSQL**: 12+
- **Nginx**: 1.18+
- **PM2**: Latest
- **Certbot**: For SSL certificates

## 🔐 **Security Configuration**

### **Firewall (UFW):**
```bash
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
```

### **SSL Certificate:**
- Automatic installation via Let's Encrypt
- Auto-renewal configured
- HTTPS redirect enabled

### **Application Security:**
- JWT authentication with refresh tokens
- Rate limiting on API endpoints
- CORS protection
- Input validation and sanitization
- File upload restrictions
- Security headers configured

## 📊 **Monitoring & Maintenance**

### **Health Checks:**
- **Frontend**: `https://yourdomain.com`
- **API Health**: `https://yourdomain.com/api/health`
- **Backend Health**: `https://yourdomain.com/health`

### **Log Monitoring:**
```bash
# Application logs
pm2 logs

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# System logs
sudo journalctl -u isp-management -f
```

### **Performance Monitoring:**
```bash
# System resources
htop
df -h          # Disk usage
free -h        # Memory usage
pm2 monit      # PM2 monitoring
```

## 🔧 **Troubleshooting**

### **Common Issues:**

#### **Application Won't Start**
```bash
# Check PM2 status
pm2 status
pm2 logs

# Check environment file
cat server/.env

# Restart applications
pm2 restart all
```

#### **Database Connection Issues**
```bash
# Check PostgreSQL
sudo systemctl status postgresql

# Test database connection
sudo -u postgres psql -l

# Check database credentials in .env
```

#### **SSL Certificate Issues**
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate manually
sudo certbot renew

# Test SSL configuration
openssl s_client -connect yourdomain.com:443
```

#### **Nginx Configuration Issues**
```bash
# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Check Nginx status
sudo systemctl status nginx
```

## 📱 **MobaXterm Specific Instructions**

### **File Transfer:**
1. Use SFTP panel (left side) for drag & drop
2. Upload changed files directly
3. Set proper permissions after upload

### **Session Management:**
1. Save SSH session for quick access
2. Use multiple tabs for different tasks
3. Setup SSH key authentication for security

### **Useful MobaXterm Features:**
- **X11 Forwarding**: For GUI applications
- **Port Forwarding**: For database access
- **Terminal Splitting**: Multiple terminals in one window
- **Session Recording**: Record deployment sessions

## 🎯 **Production Checklist**

Before going live:

### **Server Setup:**
- ✅ Server provisioned with adequate resources
- ✅ Domain name configured and pointing to server
- ✅ SSH access configured with key authentication
- ✅ Firewall configured and enabled

### **Application Deployment:**
- ✅ Code deployed from GitHub repository
- ✅ Dependencies installed and updated
- ✅ Database created and migrated
- ✅ Environment variables configured
- ✅ PM2 processes running and stable

### **Web Server Configuration:**
- ✅ Nginx configured as reverse proxy
- ✅ SSL certificate installed and valid
- ✅ Security headers configured
- ✅ Rate limiting enabled
- ✅ Gzip compression enabled

### **Security Measures:**
- ✅ Strong database passwords set
- ✅ JWT secrets generated and secure
- ✅ File permissions properly configured
- ✅ Sensitive data not exposed
- ✅ Regular security updates scheduled

### **Monitoring & Backup:**
- ✅ Health check endpoints working
- ✅ Log monitoring configured
- ✅ Database backup strategy implemented
- ✅ SSL certificate auto-renewal enabled
- ✅ Performance monitoring tools installed

## 📞 **Support & Resources**

### **Documentation:**
- `deploy-to-github.md` - GitHub setup guide
- `setup/deploy-mobaxterm.md` - MobaXterm specific instructions
- `README.md` - General project documentation

### **Scripts:**
- `setup/install-server.sh` - Server installation
- `setup/configure-app.sh` - Application configuration
- `setup/configure-nginx.sh` - Web server setup
- `update-app.sh` - Application updates

### **Useful Commands:**
```bash
# Quick status check
pm2 status && sudo systemctl status nginx

# Quick restart
pm2 restart all && sudo systemctl reload nginx

# View all logs
pm2 logs --lines 50

# Update application
cd /var/www/isp-management && ./update-app.sh
```

---

**🎉 Deployment Complete!**

Your ISP Management System is now live and ready for production use. Monitor the system regularly and keep it updated for optimal performance and security.
