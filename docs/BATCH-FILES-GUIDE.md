# Batch Files Guide

## File Batch yang Tersedia

### 🚀 **Start All Services**
```bash
scripts\start-all.bat
```
- Start semua server (Backend + Frontend + WhatsApp)
- Auto-open browser ke http://localhost:3000
- Production build untuk performa optimal

### 🛑 **Stop All Services**
```bash
scripts\stop-all.bat
```
- Stop semua server dan proses Node.js
- Kill proses di port 3000 dan 3001
- Verifikasi semua services sudah berhenti

### 🔧 **Individual Services**
```bash
# Start Backend Server (Port 3001)
scripts\start-backend.bat

# Start Frontend Client (Port 3000)
scripts\start-frontend.bat

# Start WhatsApp Bot
scripts\start-whatsapp.bat
```

## Cara Penggunaan

### **Quick Start (Recommended)**
```bash
scripts\start-all.bat
```

### **Manual Start (Jika ada masalah)**
```bash
# Terminal 1
scripts\start-backend.bat

# Terminal 2
scripts\start-frontend.bat

# Terminal 3
scripts\start-whatsapp.bat
```

### **Stop All**
```bash
scripts\stop-all.bat
```

## Access URLs
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

## Default Login
- **Username**: superadmin
- **Password**: super123

## Troubleshooting
- Jika ada error, jalankan individual services untuk debug
- Pastikan port 3000 dan 3001 tidak digunakan oleh aplikasi lain
- Gunakan `stop-all.bat` untuk cleanup sebelum start ulang
