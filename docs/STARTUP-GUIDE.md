# ISP Management System - Startup Guide

## 🚀 Quick Start

### Production Mode (Recommended)
```bash
# Double-click atau jalankan:
scripts\start-all-production.bat
```

### Manual Start
```bash
# WhatsApp Bot only
scripts\start-whatsapp.bat
```

## 📁 Available Scripts

### Main Script
- `start-all-production.bat` - Start semua service dalam production mode (RECOMMENDED)

### Utility Scripts
- `start-whatsapp.bat` - Start WhatsApp bot only
- `stop-all.bat` - Stop semua service

## 🔧 Troubleshooting

### Error: ENOENT: no such file or directory, open 'BUILD_ID'
**Solusi**: Script `start-all-production.bat` sudah otomatis handle build, jadi error ini tidak akan terjadi lagi.

### Port Already in Use
**Solusi**: Stop service yang berjalan atau gunakan port berbeda:
```bash
# Check port usage
netstat -ano | findstr :3000
netstat -ano | findstr :3001

# Kill process by PID
taskkill /PID <PID_NUMBER> /F
```

## 🌐 Access URLs

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **WhatsApp Bot**: Check console window

## 📝 Notes

- **Production Mode**: Script otomatis build frontend sebelum start, optimized untuk production
- **WhatsApp Bot**: Requires proper session files in `server/auth_info_baileys/`
- **Auto Build**: Script `start-all-production.bat` otomatis menjalankan `npm run build` untuk frontend

## 🆘 Support

Jika mengalami masalah:
1. Pastikan Node.js dan npm sudah terinstall
2. Jalankan `npm install` di folder `client/` dan `server/`
3. Gunakan development mode untuk debugging
4. Check log files di `server/logs/`
