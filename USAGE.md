# 🚀 ISP Management System - Quick Usage Guide

## 📋 **Cara Penggunaan**

### **Setup Pertama Kali**
```bash
# 1. Setup environment
./setup.sh

# 2. Edit konfigurasi (jika diperlukan)
nano server/.env

# 3. Start sistem
./start.sh
```

### **Penggunaan Harian**
```bash
# Start sistem (dengan waiting)
./start.sh

# Start sistem (fast mode - 8 detik timeout)
./start-fast.sh

# Start sistem (instant mode - tidak menunggu)
./start-instant.sh

# Stop sistem
./stop.sh
```

## 🌐 **Access URLs**

Setelah sistem berjalan:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

## 🔧 **Troubleshooting**

### **Jika ada masalah:**
```bash
# Jalankan troubleshooting
./scripts/troubleshoot.sh
```

### **Common Issues:**

#### **"Node.js is not installed"**
- Download Node.js dari https://nodejs.org/
- Install dengan default settings
- Restart terminal

#### **"Port already in use"**
```bash
# Stop servers yang sedang berjalan
./stop.sh
```

#### **"Permission denied" (Linux/macOS)**
```bash
chmod +x *.sh
chmod +x scripts/*.sh
```

## 📚 **Dokumentasi Lengkap**

- **[README.md](README.md)** - Dokumentasi utama
- **[docs/SECURITY_IMPROVEMENTS.md](docs/SECURITY_IMPROVEMENTS.md)** - Fitur keamanan
- **[docs/SCRIPT_USAGE_GUIDE.md](docs/SCRIPT_USAGE_GUIDE.md)** - Panduan scripts

## 🔒 **Security Features**

- ✅ JWT dengan refresh tokens
- ✅ Enhanced file upload security
- ✅ Rate limiting protection
- ✅ SQL injection prevention
- ✅ CORS protection
- ✅ Caching optimization

---

**Made with ❤️ for ISP Management**
