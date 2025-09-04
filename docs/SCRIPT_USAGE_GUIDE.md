# 🚀 ISP Management System - Script Usage Guide

## 📁 **File Script yang Tersedia**

### **Windows Batch Files (Recommended untuk Windows)**

#### 1. **start-server-simple.bat** - Start System
**Fungsi**: Menjalankan sistem ISP Management dengan cara sederhana

**Cara Pakai**:
```cmd
start-server-simple.bat
```

**Yang Dilakukan**:
- ✅ Cek Node.js dan npm
- ✅ Buat direktori yang diperlukan
- ✅ Setup environment configuration
- ✅ Install dependencies jika diperlukan
- ✅ Jalankan database migration
- ✅ Start backend server
- ✅ Tunggu backend ready
- ✅ Start frontend server
- ✅ Tunggu frontend ready
- ✅ Buka browser otomatis

---

#### 2. **stop-server-simple.bat** - Stop System
**Fungsi**: Menghentikan sistem ISP Management

**Cara Pakai**:
```cmd
stop-server-simple.bat
```

**Yang Dilakukan**:
- ✅ Cek server mana yang running
- ✅ Stop frontend server (port 3000)
- ✅ Stop backend server (port 3001)
- ✅ Verifikasi semua server stopped

---

#### 3. **setup-environment-simple.bat** - Setup Environment
**Fungsi**: Setup lengkap environment untuk pertama kali

**Cara Pakai**:
```cmd
setup-environment-simple.bat
```

**Yang Dilakukan**:
- ✅ Cek Node.js dan npm
- ✅ Buat direktori yang diperlukan
- ✅ Setup file .env dari template
- ✅ Install dependencies (server & client)
- ✅ Jalankan database migration
- ✅ Validasi konfigurasi keamanan

---

### **Bash Scripts (Untuk Git Bash, Linux, macOS)**

#### 1. **start-server.sh** - Start System
**Fungsi**: Menjalankan sistem dengan fitur lengkap

**Cara Pakai**:
```bash
# Git Bash (Windows)
./start-server.sh

# Linux/macOS
bash start-server.sh
```

**Fitur**:
- ✅ Cross-platform compatibility
- ✅ Colored output
- ✅ Smart terminal detection
- ✅ Auto browser opening

---

#### 2. **stop-server.sh** - Stop System
**Fungsi**: Menghentikan sistem dengan fitur lengkap

**Cara Pakai**:
```bash
# Git Bash (Windows)
./stop-server.sh

# Linux/macOS
bash stop-server.sh
```

**Fitur**:
- ✅ Cross-platform process detection
- ✅ Smart port checking
- ✅ Graceful shutdown

---

#### 3. **setup-environment.sh** - Setup Environment
**Fungsi**: Setup environment dengan fitur lengkap

**Cara Pakai**:
```bash
# Git Bash (Windows)
./setup-environment.sh

# Linux/macOS
bash setup-environment.sh
```

**Fitur**:
- ✅ Colored output
- ✅ Detailed status reporting
- ✅ Cross-platform compatibility

---

#### 4. **troubleshoot.sh** - Troubleshooting
**Fungsi**: Diagnosa dan perbaiki masalah umum

**Cara Pakai**:
```bash
# Git Bash (Windows)
./troubleshoot.sh

# Linux/macOS
bash troubleshoot.sh
```

**Menu Options**:
1. Check system requirements
2. Check server status
3. Check database connection
4. Check environment configuration
5. Clear cache and logs
6. Reset database
7. Check security configuration
8. View system logs
9. Exit

---

## 🚀 **Quick Start Guide**

### **Windows Users (Recommended)**

#### **Setup Pertama Kali**:
```cmd
# 1. Setup environment
setup-environment-simple.bat

# 2. Edit konfigurasi (jika diperlukan)
notepad server\.env

# 3. Start sistem
start-server-simple.bat
```

#### **Penggunaan Harian**:
```cmd
# Start sistem
start-server-simple.bat

# Stop sistem
stop-server-simple.bat
```

---

### **Git Bash Users (Windows)**

#### **Setup Pertama Kali**:
```bash
# 1. Setup environment
./setup-environment.sh

# 2. Edit konfigurasi (jika diperlukan)
notepad server/.env

# 3. Start sistem
./start-server.sh
```

#### **Penggunaan Harian**:
```bash
# Start sistem
./start-server.sh

# Stop sistem
./stop-server.sh

# Troubleshooting
./troubleshoot.sh
```

---

### **Linux/macOS Users**

#### **Setup Pertama Kali**:
```bash
# 1. Setup environment
bash setup-environment.sh

# 2. Edit konfigurasi (jika diperlukan)
nano server/.env

# 3. Start sistem
bash start-server.sh
```

#### **Penggunaan Harian**:
```bash
# Start sistem
bash start-server.sh

# Stop sistem
bash stop-server.sh

# Troubleshooting
bash troubleshoot.sh
```

---

## 🔧 **Troubleshooting**

### **Windows CMD Issues**

#### **Error: "Node.js is not installed"**
**Solusi**:
1. Download Node.js dari https://nodejs.org/
2. Install dengan default settings
3. Restart Command Prompt

#### **Error: "Port already in use"**
**Solusi**:
1. Jalankan `stop-server-simple.bat` terlebih dahulu
2. Atau kill process yang menggunakan port tersebut

#### **Error: "Access is denied"**
**Solusi**:
1. Run as Administrator
2. Atau buka Command Prompt sebagai Administrator

---

### **Git Bash Issues**

#### **Error: "Permission denied"**
**Solusi**:
```bash
chmod +x *.sh
```

#### **Error: "Command not found"**
**Solusi**:
1. Pastikan Git Bash terinstall
2. Atau gunakan file batch sederhana

---

### **Linux/macOS Issues**

#### **Error: "Permission denied"**
**Solusi**:
```bash
chmod +x *.sh
```

#### **Error: "Terminal not found"**
**Solusi**:
1. Install gnome-terminal (Linux)
2. Atau install xterm
3. Atau gunakan terminal yang tersedia

---

## 📋 **Environment Variables**

### **File: server/.env**
```env
# Database
DATABASE_URL="file:./prisma/dev.db"

# JWT Configuration (PENTING: Ganti dengan secret yang kuat!)
JWT_SECRET="your-super-secret-jwt-key-here"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-here"

# Server Configuration
PORT=3001
NODE_ENV=development

# CORS Configuration
ALLOWED_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"
CLIENT_URL="http://localhost:3000"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# File Upload
MAX_FILE_SIZE=5242880

# Telegram Bot (Optional)
TELEGRAM_BOT_TOKEN="your-telegram-bot-token-here"
```

---

## 🔒 **Security Features**

### **JWT Security**:
- ✅ Access tokens expire dalam 15 menit
- ✅ Refresh tokens dengan 7 hari expiration
- ✅ Token revocation saat logout
- ✅ Secure token storage

### **File Upload Security**:
- ✅ Enhanced MIME type validation
- ✅ File extension verification
- ✅ Executable file detection
- ✅ Path traversal protection
- ✅ File size limits (5MB per file, 20MB total)

### **Rate Limiting**:
- ✅ Auth endpoints: 5 attempts per 15 menit
- ✅ Upload endpoints: 10 uploads per jam
- ✅ General API: 1000 requests per 15 menit

### **Database Security**:
- ✅ SQL injection prevention
- ✅ Parameterized queries only
- ✅ Input validation

---

## 📞 **Support**

### **Jika Masih Ada Masalah**:

1. **Windows Users**:
   - Gunakan file batch sederhana
   - Jalankan sebagai Administrator jika perlu

2. **Git Bash Users**:
   - Gunakan bash scripts
   - Pastikan Git Bash terinstall

3. **Linux/macOS Users**:
   - Gunakan bash scripts
   - Pastikan terminal emulator tersedia

4. **Dokumentasi**:
   - `SECURITY_IMPROVEMENTS.md` - Dokumentasi fitur keamanan
   - `BATCH_FILES_README.md` - Dokumentasi batch files
   - `BATCH_USAGE_GUIDE.md` - Panduan penggunaan batch files

---

## ⚠️ **Catatan Penting**

### **Compatibility**:
- **Windows CMD**: Gunakan file `.bat` sederhana
- **Git Bash**: Gunakan file `.sh` atau `.bat`
- **Linux/macOS**: Gunakan file `.sh`

### **Security**:
- **JANGAN** gunakan default JWT secrets di production
- **SELALU** gunakan HTTPS di production
- **REGULER** update dependencies

### **Maintenance**:
- **BACKUP** database secara berkala
- **MONITOR** log files untuk errors
- **UPDATE** Node.js dan npm secara berkala

---

*Last updated: September 2025*
*Version: 2.0 with Enhanced Security Features*
*Compatible with Windows CMD, Git Bash, Linux, and macOS*
