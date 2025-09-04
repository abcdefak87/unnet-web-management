# 🖥️ Deploy ke Linux Server dengan MobaXterm

## 📋 **Panduan Lengkap Deployment**

### **1. Persiapan Server Linux**

#### **Connect ke Server via MobaXterm:**
```bash
# Buka MobaXterm
# Session → SSH
# Remote host: IP_SERVER_ANDA
# Username: root atau user dengan sudo privileges
# Port: 22 (default)
```

#### **Update Server:**
```bash
# Setelah connect via SSH
sudo apt update && sudo apt upgrade -y
```

### **2. Upload dan Jalankan Script Installation**

#### **Method 1: Clone dari GitHub (Recommended)**
```bash
# Clone repository Anda
git clone https://github.com/username/isp-management-system.git /var/www/isp-management

# Masuk ke directory
cd /var/www/isp-management

# Jalankan installation script
chmod +x setup/install-server.sh
./setup/install-server.sh
```

#### **Method 2: Upload Manual via MobaXterm**
```bash
# Di MobaXterm, gunakan SFTP panel (kiri)
# Upload folder project ke /var/www/isp-management
# Atau drag & drop files ke MobaXterm

# Set permissions
sudo chown -R $USER:$USER /var/www/isp-management
chmod +x setup/*.sh
```

### **3. Konfigurasi Aplikasi**

```bash
# Jalankan script konfigurasi
cd /var/www/isp-management
./setup/configure-app.sh

# Edit environment file
nano server/.env

# Update dengan data Anda:
# - Database password
# - Domain name
# - JWT secrets (sudah auto-generated)
# - Telegram bot token (optional)
```

### **4. Konfigurasi Nginx dan SSL**

```bash
# Jalankan script Nginx
./setup/configure-nginx.sh

# Script akan meminta:
# - Domain name (contoh: myisp.com)
# - Email untuk SSL certificate
```

### **5. Test Deployment**

```bash
# Check status services
sudo systemctl status nginx
pm2 status

# Test endpoints
curl http://localhost:3001/health
curl https://yourdomain.com/api/health

# Check logs
pm2 logs
sudo tail -f /var/log/nginx/access.log
```

## 🔄 **Workflow Update Setelah Online**

### **Update dari GitHub:**

```bash
# Connect ke server via MobaXterm
ssh user@your-server-ip

# Masuk ke directory project
cd /var/www/isp-management

# Pull changes dari GitHub
git pull origin main

# Jalankan update script
./update-app.sh
```

### **Update Manual via MobaXterm:**

```bash
# Upload files yang berubah via SFTP panel
# Atau drag & drop ke MobaXterm

# Restart applications
pm2 restart all

# Reload Nginx jika ada perubahan config
sudo systemctl reload nginx
```

## 🛠️ **MobaXterm Tips & Tricks**

### **File Transfer:**
- **SFTP Panel**: Gunakan panel kiri untuk drag & drop files
- **Upload**: Drag files dari Windows ke MobaXterm
- **Download**: Right-click file di server → Download

### **Multiple Sessions:**
```bash
# Buka multiple tabs untuk:
# Tab 1: Main server management
# Tab 2: Log monitoring (pm2 logs)
# Tab 3: Database operations
# Tab 4: File editing
```

### **Useful MobaXterm Commands:**
```bash
# File operations
ls -la                    # List files with permissions
nano filename            # Edit file
chmod +x script.sh       # Make executable
sudo chown user:group    # Change ownership

# Process management
pm2 status               # Check PM2 processes
pm2 logs                 # View application logs
pm2 restart all          # Restart applications
sudo systemctl status nginx  # Check Nginx status

# System monitoring
htop                     # System resources
df -h                    # Disk usage
free -h                  # Memory usage
netstat -tlnp           # Network ports
```

## 🔧 **Troubleshooting**

### **Common Issues:**

#### **"Permission denied"**
```bash
# Fix permissions
sudo chown -R $USER:www-data /var/www/isp-management
chmod +x setup/*.sh
```

#### **"Port already in use"**
```bash
# Check what's using the port
sudo netstat -tlnp | grep :3001
sudo netstat -tlnp | grep :3000

# Kill process if needed
sudo kill -9 PID_NUMBER

# Restart PM2
pm2 restart all
```

#### **"Database connection failed"**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check database exists
sudo -u postgres psql -l

# Reset database password
sudo -u postgres psql
ALTER USER isp_user WITH PASSWORD 'new_password';
\q

# Update .env file
nano server/.env
```

#### **"SSL certificate failed"**
```bash
# Check domain DNS
nslookup yourdomain.com

# Manual SSL certificate
sudo certbot --nginx -d yourdomain.com

# Check certificate status
sudo certbot certificates
```

### **Log Locations:**
```bash
# Application logs
tail -f /var/www/isp-management/server/logs/app.log

# PM2 logs
pm2 logs

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# System logs
sudo journalctl -u isp-management -f
```

## 📊 **Monitoring & Maintenance**

### **Daily Commands:**
```bash
# Check system status
pm2 status
sudo systemctl status nginx
df -h                    # Check disk space
free -h                  # Check memory

# Update system
sudo apt update && sudo apt upgrade -y

# Backup database
pg_dump -U isp_user -h localhost isp_management > backup_$(date +%Y%m%d).sql
```

### **Weekly Tasks:**
```bash
# Check SSL certificate expiry
sudo certbot certificates

# Clean old logs
pm2 flush
sudo logrotate -f /etc/logrotate.conf

# Update application
cd /var/www/isp-management
git pull origin main
./update-app.sh
```

## 🔐 **Security Checklist**

- ✅ **Firewall**: UFW enabled with necessary ports
- ✅ **SSL**: HTTPS certificate installed and auto-renewal enabled
- ✅ **Database**: Strong passwords and restricted access
- ✅ **File Permissions**: Proper ownership and permissions set
- ✅ **Rate Limiting**: Nginx configured with rate limits
- ✅ **Updates**: Regular system and application updates
- ✅ **Backups**: Database and file backups scheduled
- ✅ **Monitoring**: Log monitoring and alerts configured

## 📱 **MobaXterm Mobile Access**

### **Setup SSH Key Authentication:**
```bash
# Generate SSH key di MobaXterm
# Tools → MobaKeyGen
# Generate RSA key
# Save private key
# Copy public key ke server

# Di server:
mkdir -p ~/.ssh
echo "PUBLIC_KEY_CONTENT" >> ~/.ssh/authorized_keys
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

### **Save Session:**
```bash
# Di MobaXterm:
# Session → SSH → Advanced SSH settings
# Use private key: Browse to your private key
# Save session dengan nama "ISP Management Server"
```

## 🚀 **Production Checklist**

Sebelum go-live, pastikan:

- ✅ Domain sudah pointing ke server IP
- ✅ SSL certificate terinstall dan valid
- ✅ Database password sudah diganti
- ✅ JWT secrets sudah secure
- ✅ Environment variables sudah production-ready
- ✅ Backup system sudah setup
- ✅ Monitoring sudah aktif
- ✅ Firewall sudah dikonfigurasi
- ✅ Rate limiting sudah aktif
- ✅ Error pages sudah custom

---

**🎉 Selamat! ISP Management System Anda sudah online dan siap digunakan!**
