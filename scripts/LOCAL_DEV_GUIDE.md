# 🚀 Local Development Guide

## Quick Start untuk Test Local

### 1️⃣ Start Backend (Terminal 1)
```bash
cd server
npm install
npm run dev
```
Backend akan jalan di: http://localhost:3001

### 2️⃣ Start Frontend (Terminal 2)
```bash
cd client
npm install
npm run dev
```
Frontend akan jalan di: http://localhost:3000

## 📝 Development Workflow

### Sebelum Edit:
1. **Pastikan di branch development:**
   ```bash
   git checkout -b development
   ```

2. **Pull latest changes:**
   ```bash
   git pull origin main
   ```

### Saat Development:
1. **Edit code sesuai kebutuhan**
2. **Test di browser:** http://localhost:3000
3. **Check console untuk errors**
4. **Test semua fitur yang berubah**

### Setelah Selesai Test:
1. **Commit changes:**
   ```bash
   git add .
   git commit -m "Add: [feature name]"
   ```

2. **Push ke GitHub:**
   ```bash
   git push origin development
   ```

3. **Merge ke main (kalau sudah OK):**
   ```bash
   git checkout main
   git merge development
   git push origin main
   ```

4. **Deploy ke Production Server:**
   ```bash
   ssh user@172.17.2.3
   cd ~/unnet-web-management
   git pull origin main
   pm2 restart all
   ```

## 🔥 Hot Tips

### Test Different Users:
- **superadmin/super123** - Full access
- **admin/admin123** - Limited admin
- **gudang/gudang123** - Inventory only
- **userbiasa/user123** - View only

### Common Commands:
```bash
# Check backend logs
cd server && npm run dev

# Check frontend logs
cd client && npm run dev

# Reset database
cd server
npx prisma db push --force-reset
node prisma/seed.js

# Generate Prisma Client
cd server
npx prisma generate
```

### Environment Variables:
- Development: `NODE_ENV=development`
- Production: `NODE_ENV=production`
- Database: SQLite untuk local, PostgreSQL untuk production

## 🐛 Troubleshooting

### Port sudah dipakai:
```bash
# Windows
netstat -ano | findstr :3000
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :3000
lsof -i :3001
kill -9 <PID>
```

### Database error:
```bash
cd server
rm prisma/dev.db
npx prisma db push
node prisma/seed.js
```

### Module not found:
```bash
rm -rf node_modules
npm install
```

## 📱 Test di Mobile:
1. Pastikan PC & HP di network yang sama
2. Cek IP PC: `ipconfig`
3. Akses dari HP: `http://[IP-PC]:3000`

## ✅ Checklist Sebelum Push:
- [ ] Test login semua role
- [ ] Test CRUD operations
- [ ] Check console errors
- [ ] Test responsive design
- [ ] Verify API responses
- [ ] Test file uploads
- [ ] Check form validations
