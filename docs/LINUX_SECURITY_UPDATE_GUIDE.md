# 🔒 Linux Security Update Guide

## Overview
Panduan ini untuk mengupdate server Linux (MobaXterm) setelah cleanup keamanan repository GitHub. Script ini akan menghapus file sensitif dan mengupdate dengan secrets baru yang aman.

## ⚠️ PENTING SEBELUM UPDATE

### 1. Backup Data Penting
```bash
# Backup database
cp server/prisma/prod.db server/prisma/prod.db.backup.$(date +%Y%m%d_%H%M%S)

# Backup uploads
tar -czf uploads_backup_$(date +%Y%m%d_%H%M%S).tar.gz server/uploads/

# Backup logs
tar -czf logs_backup_$(date +%Y%m%d_%H%M%S).tar.gz server/logs/
```

### 2. Catat Informasi Penting
- **Database**: Pastikan data penting sudah di-backup
- **WhatsApp Sessions**: Akan dihapus dan perlu re-authentication
- **User Tokens**: Semua JWT tokens akan invalid, user perlu login ulang

## 🚀 Cara Update

### Metode 1: Menggunakan Script Otomatis (Recommended)

```bash
# 1. Masuk ke directory project
cd /path/to/your/project

# 2. Jalankan script update
chmod +x scripts/update-linux-security.sh
./scripts/update-linux-security.sh
```

### Metode 2: Manual Update

```bash
# 1. Stop services
pm2 stop all
pm2 delete all

# 2. Pull latest changes
git fetch origin
git reset --hard origin/main

# 3. Remove sensitive files
rm -f server/.session-key
rm -f server/.env.backup
rm -f scripts/server/auth_info_baileys/*

# 4. Update environment variables
# Copy content dari server/ENVIRONMENT_SETUP.md ke server/.env

# 5. Install dependencies
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..

# 6. Setup database
cd server
npx prisma generate
npx prisma db push
npx prisma db seed
cd ..

# 7. Build project
cd client && npm run build && cd ..

# 8. Start services
pm2 start ecosystem.config.js
pm2 save
```

## 🔧 Yang Akan Dilakukan Script

### 1. **Backup Environment**
- Backup file `.env` yang ada
- Backup konfigurasi lama

### 2. **Stop Services**
- Stop semua PM2 processes
- Kill Node.js processes yang running

### 3. **Pull Latest Changes**
- Fetch dan reset ke `origin/main`
- Update semua file dari GitHub

### 4. **Remove Sensitive Files**
- Hapus `server/.session-key`
- Hapus `server/.env.backup`
- Hapus file session WhatsApp yang sensitif

### 5. **Update Environment Variables**
- Buat `server/.env` baru dengan secrets yang aman
- Update semua JWT, CSRF, dan Session secrets

### 6. **Install Dependencies**
- Update semua dependencies
- Fix security vulnerabilities

### 7. **Database Setup**
- Generate Prisma client
- Push database schema
- Seed database jika diperlukan

### 8. **Build & Start**
- Build client untuk production
- Start services dengan PM2

## 🔐 Secrets Baru yang Digunakan

```env
# JWT Secrets (Generated 2025)
JWT_SECRET="7657c1ef0831a49fefed171b28a4de1b2adb1e204e574b8264f378e6a3713febb4332f6e5b53e8ed8309880e7548c6409d88a522e05037e53d8e5bc0a49f3c33"
JWT_REFRESH_SECRET="24f853bad17bc5cf104b983c080a2795733708fd52059bf7dad9dfdf31b80ad94be07355d51a7c2b5a57bf12cb3cdda338c684d9e7aa96d7604adbe761bb01b6"

# CSRF & Session Secrets
CSRF_SECRET="35d0f41cfef6f221f1b7b2c3656603caedce81cd5c865f9c706dc04dcb3b8ffb"
SESSION_SECRET="1a5c0f271af7fb8291a185f4fb24b12656aa40445097291c25c8865d8d984452"
```

## ✅ Verifikasi Setelah Update

### 1. **Check Services Status**
```bash
pm2 status
pm2 logs
```

### 2. **Test API Endpoints**
```bash
# Health check
curl http://localhost:3001/api/health

# Test login (akan gagal karena token lama invalid)
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your_password"}'
```

### 3. **Check Logs**
```bash
# Server logs
tail -f server/logs/combined.log

# PM2 logs
pm2 logs
```

### 4. **Test Frontend**
- Buka http://localhost:3000
- Test login dengan user yang ada
- Verifikasi semua fitur berfungsi

## 🚨 Troubleshooting

### Problem: Services tidak start
```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs

# Restart services
pm2 restart all
```

### Problem: Database error
```bash
cd server
npx prisma db push
npx prisma generate
```

### Problem: WhatsApp tidak connect
```bash
# Check WhatsApp session files
ls -la server/auth_info_baileys/

# Re-authenticate WhatsApp
# QR code akan muncul di server/public/qr/
```

### Problem: JWT token error
```bash
# Clear browser cookies/localStorage
# Atau test dengan incognito mode
```

## 📋 Checklist Post-Update

- [ ] Services running (PM2 status OK)
- [ ] API health check passed
- [ ] Frontend accessible
- [ ] Login functionality working
- [ ] Database operations working
- [ ] WhatsApp integration working
- [ ] File upload working
- [ ] All features tested

## 🔄 Rollback (Jika Diperlukan)

Jika ada masalah setelah update:

```bash
# 1. Stop services
pm2 stop all

# 2. Restore backup
cp server/.env.backup.* server/.env

# 3. Restore database
cp server/prisma/prod.db.backup.* server/prisma/prod.db

# 4. Restart services
pm2 start ecosystem.config.js
```

## 📞 Support

Jika mengalami masalah:
1. Check logs: `pm2 logs` dan `tail -f server/logs/combined.log`
2. Check PM2 status: `pm2 status`
3. Restart services: `pm2 restart all`
4. Check environment variables: `cat server/.env`

---

**⚠️ PENTING**: Setelah update, semua user perlu login ulang karena JWT tokens sudah invalid!
