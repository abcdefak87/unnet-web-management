# 🚀 ISP Management System - Batch Files Usage Guide

## ⚠️ **PENTING: Cara Menjalankan File Batch**

### **Di PowerShell (Recommended)**
```powershell
.\start-server.bat
.\stop-server.bat
.\setup-environment.bat
.\troubleshoot.bat
```

### **Di Command Prompt (CMD)**
```cmd
start-server.bat
stop-server.bat
setup-environment.bat
troubleshoot.bat
```

### **Di Windows Explorer**
- Double-click pada file batch yang diinginkan
- File akan otomatis terbuka di Command Prompt

---

## 📁 **File Batch yang Tersedia**

### 1. **setup-environment.bat** - Setup Awal
**Fungsi**: Setup lengkap environment untuk pertama kali

**Cara Pakai**:
```powershell
.\setup-environment.bat
```

**Yang Dilakukan**:
- ✅ Cek instalasi Node.js dan npm
- ✅ Buat direktori yang diperlukan
- ✅ Setup file .env dari template
- ✅ Install dependencies (server & client)
- ✅ Jalankan database migration
- ✅ Validasi konfigurasi keamanan

**Kapan Digunakan**:
- Setup pertama kali
- Setelah clone repository
- Ketika dependencies rusak
- Ketika environment configuration hilang

---

### 2. **start-server.bat** - Start System
**Fungsi**: Menjalankan sistem ISP Management

**Cara Pakai**:
```powershell
.\start-server.bat
```

**Yang Dilakukan**:
- ✅ Cek requirements (Node.js, npm)
- ✅ Buat direktori yang diperlukan
- ✅ Setup environment configuration
- ✅ Install dependencies jika diperlukan
- ✅ Jalankan database migration
- ✅ Start backend server
- ✅ Tunggu backend ready
- ✅ Start frontend server
- ✅ Tunggu frontend ready
- ✅ Buka browser otomatis

**Output**:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Health Check: http://localhost:3001/health

---

### 3. **stop-server.bat** - Stop System
**Fungsi**: Menghentikan sistem ISP Management

**Cara Pakai**:
```powershell
.\stop-server.bat
```

**Yang Dilakukan**:
- ✅ Cek server mana yang running
- ✅ Stop frontend server (port 3000)
- ✅ Stop backend server (port 3001)
- ✅ Verifikasi semua server stopped
- ✅ Opsi stop semua Node.js processes
- ✅ Laporan status shutdown

---

### 4. **troubleshoot.bat** - Troubleshooting
**Fungsi**: Diagnosa dan perbaiki masalah umum

**Cara Pakai**:
```powershell
.\troubleshoot.bat
```

**Menu Options**:
1. **Check system requirements** - Cek Node.js, npm, ports
2. **Check server status** - Test konektivitas server
3. **Check database connection** - Validasi database
4. **Check environment configuration** - Review .env settings
5. **Clear cache and logs** - Bersihkan file temporary
6. **Reset database** - Reset database (⚠️ HATI-HATI!)
7. **Check security configuration** - Validasi fitur keamanan
8. **View system logs** - Tampilkan log sistem

---

## 🔧 **Troubleshooting File Batch**

### **Error: "The term 'filename.bat' is not recognized"**
**Solusi**: Gunakan `.\` di depan nama file
```powershell
# SALAH
setup-environment.bat

# BENAR
.\setup-environment.bat
```

### **Error: "Access is denied"**
**Solusi**: 
1. Run as Administrator
2. Atau buka Command Prompt sebagai Administrator

### **Error: "Node.js is not installed"**
**Solusi**:
1. Download Node.js dari https://nodejs.org/
2. Install dengan default settings
3. Restart Command Prompt/PowerShell

### **Error: "npm is not installed"**
**Solusi**:
1. npm biasanya terinstall bersama Node.js
2. Jika tidak ada, reinstall Node.js
3. Atau install npm secara manual

### **Error: "Port already in use"**
**Solusi**:
1. Jalankan `.\stop-server.bat` terlebih dahulu
2. Atau gunakan `.\troubleshoot.bat` → Option 1 untuk cek ports
3. Kill process yang menggunakan port tersebut

---

## 🚀 **Quick Start Guide**

### **Setup Pertama Kali**:
```powershell
# 1. Setup environment
.\setup-environment.bat

# 2. Edit konfigurasi (jika diperlukan)
notepad server\.env

# 3. Start sistem
.\start-server.bat
```

### **Penggunaan Harian**:
```powershell
# Start sistem
.\start-server.bat

# Stop sistem
.\stop-server.bat
```

### **Troubleshooting**:
```powershell
# Jalankan troubleshooting
.\troubleshoot.bat

# Pilih option sesuai masalah
```

---

## 📋 **Environment Variables yang Perlu Dikonfigurasi**

### **File: server\.env**
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

## 🔒 **Security Features yang Aktif**

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

## 📞 **Support dan Bantuan**

### **Jika Masih Ada Masalah**:
1. **Jalankan Troubleshooting**:
   ```powershell
   .\troubleshoot.bat
   ```

2. **Cek Logs**:
   - Server logs: `server\logs\`
   - Error logs: `server\logs\error.log`
   - Combined logs: `server\logs\combined.log`

3. **Dokumentasi**:
   - `SECURITY_IMPROVEMENTS.md` - Dokumentasi fitur keamanan
   - `BATCH_FILES_README.md` - Dokumentasi lengkap batch files

4. **Reset Environment**:
   ```powershell
   .\setup-environment.bat
   ```

---

## ⚠️ **Catatan Penting**

### **Security**:
- **JANGAN** gunakan default JWT secrets di production
- **SELALU** gunakan HTTPS di production
- **REGULER** update dependencies
- **MONITOR** logs untuk security events

### **Maintenance**:
- **REGULER** jalankan `.\troubleshoot.bat`
- **BACKUP** database secara berkala
- **UPDATE** Node.js dan npm secara berkala
- **MONITOR** log files untuk errors

### **Development**:
- **GUNAKAN** `.\setup-environment.bat` untuk setup awal
- **GUNAKAN** `.\start-server.bat` untuk daily development
- **GUNAKAN** `.\stop-server.bat` untuk stop development
- **GUNAKAN** `.\troubleshoot.bat` untuk debugging

---

*Last updated: September 2025*
*Version: 2.0 with Enhanced Security Features*
*Compatible with Windows CMD and PowerShell*
