# ISP Management System - Quick Setup Guide

## 🚀 Fastest Setup Method

### Step 1: SSH to Server
```bash
ssh root@172.17.2.3
```

### Step 2: Run Setup Script
```bash
# Download and run in one command
curl -sL https://raw.githubusercontent.com/abcdefak87/unnet-web-management/main/scripts/clean-and-setup.sh | sudo bash
```

Or if you prefer to review first:
```bash
# Download script
wget https://raw.githubusercontent.com/abcdefak87/unnet-web-management/main/scripts/clean-and-setup.sh

# Review script (optional)
less clean-and-setup.sh

# Run script
sudo bash clean-and-setup.sh
```

## ✅ What the Script Does

1. **Cleans Old Installation**
   - Stops PM2 services
   - Backs up data to `/var/backups/isp-management`
   - Removes old files

2. **Fresh Installation**
   - Clones from GitHub
   - Auto-generates JWT secrets
   - Sets up SQLite database
   - Seeds initial users

3. **Configures Services**
   - PM2 for process management
   - Nginx reverse proxy
   - Auto-start on boot

## 📱 Access After Setup

- **URL:** http://172.17.2.3
- **Login:** superadmin / super123

## 🔍 Verify Installation

```bash
# Check services
pm2 status

# Test endpoints
curl http://localhost:3001/api/health
curl -I http://172.17.2.3

# View logs
pm2 logs --lines 20
```

## ⚡ Quick Commands

```bash
# Restart all services
pm2 restart all

# View real-time logs
pm2 logs

# Monitor resources
pm2 monit
```

---
Setup takes ~3-5 minutes to complete.
