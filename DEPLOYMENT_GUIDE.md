# ISP Management System - Complete Deployment Guide

## 📋 Prerequisites

### Local Development Machine (Windows)
- Git installed and configured
- Node.js and npm installed
- SSH client (for server access)

### Production Server (Linux)
- Ubuntu/Debian-based system
- Node.js 18+ and npm installed
- PM2 installed globally
- Nginx installed and configured
- Git installed

## 🚀 Quick Deployment

### From Windows (Automated)
```batch
cd "d:\backup\backup\projek web"
scripts\deploy-from-windows.bat
```

### From Server (Manual)
```bash
cd /var/www/isp-management
sudo bash scripts/deploy-server.sh
```

## 📝 Step-by-Step Manual Deployment

### 1. Local Development (Windows)

#### Fix and Test Locally
```powershell
# Navigate to project
cd "d:\backup\backup\projek web"

# Install dependencies
cd server
npm install
cd ../client
npm install
cd ..

# Generate Prisma client
cd server
npx prisma generate
cd ..

# Test locally
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd client
npm run dev
```

#### Commit and Push Changes
```powershell
git add .
git commit -m "Your commit message"
git push origin main
```

### 2. Server Deployment

#### SSH to Server
```bash
ssh root@172.17.2.3
```

#### Navigate to Project
```bash
cd /var/www/isp-management
```

#### Pull Latest Changes
```bash
git pull origin main
```

#### Install Dependencies and Build
```bash
# Backend
cd server
npm install
npx prisma generate
npx prisma db push

# Seed database if needed
npm run seed

# Frontend
cd ../client
npm install
npm run build
```

#### Restart Services
```bash
# Restart PM2 services
pm2 restart isp-management-server
pm2 restart isp-management-client
pm2 save
```

#### Check Status
```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs --lines 50

# Test endpoints
curl http://localhost:3001/api/health
curl -I http://localhost:3000
curl -I http://172.17.2.3
```

## 🔧 Configuration Files

### Backend Environment (.env)
Location: `/var/www/isp-management/server/.env`

```env
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="your-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret"
PORT=3001
NODE_ENV=production
CORS_ORIGIN="http://172.17.2.3"
```

### Frontend Environment (.env.local)
Location: `/var/www/isp-management/client/.env.local`

```env
NEXT_PUBLIC_API_URL=http://172.17.2.3/api
```

### Nginx Configuration
Location: `/etc/nginx/sites-available/isp-management`

```nginx
server {
    listen 80;
    server_name 172.17.2.3;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
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
    }

    # WebSocket
    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## 🔍 Troubleshooting

### Common Issues and Solutions

#### 1. Prisma Client Error
```bash
# Regenerate Prisma client
cd /var/www/isp-management/server
npx prisma generate
pm2 restart isp-management-server
```

#### 2. Database Issues
```bash
# Reset database
cd /var/www/isp-management/server
rm prisma/dev.db
npx prisma db push
npm run seed
```

#### 3. Port Already in Use
```bash
# Find and kill process
lsof -i :3001
kill -9 <PID>
# Or restart PM2
pm2 delete all
pm2 start ecosystem.config.js
```

#### 4. Frontend Not Building
```bash
cd /var/www/isp-management/client
rm -rf .next node_modules
npm install
npm run build
```

#### 5. Nginx Issues
```bash
# Test configuration
nginx -t
# Restart Nginx
systemctl restart nginx
# Check logs
tail -f /var/log/nginx/error.log
```

## 📊 Monitoring

### PM2 Monitoring
```bash
# Real-time monitoring
pm2 monit

# View logs
pm2 logs

# View specific service logs
pm2 logs isp-management-server
pm2 logs isp-management-client
```

### System Resources
```bash
# Check memory and CPU
htop

# Check disk space
df -h

# Check network connections
netstat -tulpn
```

## 🔐 Security Checklist

- [ ] Change default passwords
- [ ] Update JWT secrets in production
- [ ] Configure firewall (ufw)
- [ ] Set up SSL certificate (Let's Encrypt)
- [ ] Regular backups configured
- [ ] Log rotation configured
- [ ] Rate limiting enabled
- [ ] CORS properly configured

## 📱 Default Login Credentials

| Role | Username | Password |
|------|----------|----------|
| Super Admin | superadmin | super123 |
| Admin | admin | admin123 |
| Warehouse | gudang | gudang123 |
| User | userbiasa | user123 |

**⚠️ Important:** Change these passwords immediately after first login!

## 🆘 Support

### Logs Location
- PM2 logs: `~/.pm2/logs/`
- Nginx logs: `/var/log/nginx/`
- Application logs: `/var/www/isp-management/server/logs/`

### Backup Location
- Automatic backups: `/var/backups/isp-management/`

### Quick Health Check
```bash
# Run health check script
curl http://172.17.2.3/api/health
```

## 📅 Maintenance

### Daily
- Check PM2 status
- Monitor logs for errors

### Weekly
- Check disk space
- Review error logs
- Test backup restoration

### Monthly
- Update dependencies
- Security patches
- Performance review

## 🎯 Deployment Checklist

Before deployment:
- [ ] All tests passing locally
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] Backup current deployment

During deployment:
- [ ] Pull latest code
- [ ] Install dependencies
- [ ] Run migrations
- [ ] Build frontend
- [ ] Restart services

After deployment:
- [ ] Test all endpoints
- [ ] Check logs for errors
- [ ] Verify user login
- [ ] Test critical features
- [ ] Monitor for 15 minutes

---

**Last Updated:** December 2024
**Version:** 1.0.0
**Maintained by:** ISP Management Team
