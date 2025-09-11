# ISP Management System - Batch Scripts

Koleksi script batch untuk menjalankan sistem ISP Management dengan mudah.

## 📁 File Scripts

### 1. `start-all.bat` - Menjalankan Semua Service
**Fungsi**: Menjalankan WhatsApp Bot, Backend Server, dan Frontend Client secara bersamaan.

**Fitur**:
- ✅ Auto-install dependencies jika belum ada
- ✅ Membuka 3 window terpisah dengan warna berbeda
- ✅ Auto-open browser ke frontend
- ✅ Menampilkan informasi login default

**Cara Pakai**:
```bash
start-all.bat
```

### 2. `stop-all.bat` - Menghentikan Semua Service
**Fungsi**: Menghentikan semua service yang sedang berjalan.

**Fitur**:
- ✅ Menghentikan WhatsApp Bot
- ✅ Menghentikan Backend Server  
- ✅ Menghentikan Frontend Client
- ✅ Menghentikan semua proses Node.js lainnya

**Cara Pakai**:
```bash
stop-all.bat
```

### 3. `restart-all.bat` - Restart Semua Service
**Fungsi**: Menghentikan semua service lalu menjalankan ulang.

**Cara Pakai**:
```bash
restart-all.bat
```

### 4. `dev-quick.bat` - Mode Development Cepat
**Fungsi**: Menjalankan service dengan frontend di foreground untuk hot reload.

**Fitur**:
- ✅ WhatsApp Bot dan Backend di background
- ✅ Frontend di foreground untuk hot reload
- ✅ Lebih cepat untuk development

**Cara Pakai**:
```bash
dev-quick.bat
```

### 5. `test-whatsapp.bat` - Test WhatsApp Bot
**Fungsi**: Menjalankan WhatsApp Bot dan Server untuk testing.

**Cara Pakai**:
```bash
test-whatsapp.bat
```

## 🚀 Quick Start

### Untuk Development:
```bash
# Pilihan 1: Semua service dengan window terpisah
start-all.bat

# Pilihan 2: Mode development dengan hot reload
dev-quick.bat
```

### Untuk Testing:
```bash
# Test WhatsApp Bot saja
test-whatsapp.bat
```

### Untuk Stop:
```bash
# Stop semua service
stop-all.bat

# Atau restart semua
restart-all.bat
```

## 🌐 URL Access

Setelah menjalankan script, akses:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001  
- **Health Check**: http://localhost:3001/health
- **WhatsApp Status**: http://localhost:3001/api/whatsapp/status

## 🔑 Default Login

- **Username**: `superadmin`
- **Password**: `super123`

## 📱 WhatsApp Bot

- **Bot Number**: 6282229261247
- **Status File**: `whatsapp-status.json`
- **Session**: `server/auth_info_baileys/`

## 🛠️ Troubleshooting

### Service Tidak Start:
1. Pastikan Node.js terinstall
2. Jalankan `npm install` di folder `server` dan `client`
3. Cek port 3000 dan 3001 tidak digunakan aplikasi lain

### WhatsApp Bot Tidak Connect:
1. Scan QR code di window "WhatsApp Bot"
2. Pastikan nomor admin benar di `scripts/whatsapp-bot-integrated.js`
3. Cek file `whatsapp-status.json` untuk status

### Frontend Error:
1. Pastikan backend sudah running
2. Cek console browser untuk error
3. Restart dengan `restart-all.bat`

## 📋 Service Status

| Service | Port | Window Title | Status Check |
|---------|------|--------------|--------------|
| WhatsApp Bot | - | WhatsApp Bot | File: `whatsapp-status.json` |
| Backend Server | 3001 | Backend Server | http://localhost:3001/health |
| Frontend Client | 3000 | Frontend Client | http://localhost:3000 |

## 🔧 Customization

### Mengubah Port:
- **Backend**: Edit `server/.env` atau `server/index.js`
- **Frontend**: Edit `client/next.config.js`

### Mengubah Admin WhatsApp:
- Edit `scripts/whatsapp-bot-integrated.js` line 58:
```javascript
const adminNumber = '6282229261247'; // Ganti dengan nomor admin
```

### Mengubah Warna Window:
- Edit script bat dan ubah `color` command:
  - `0A` = Hijau
  - `0B` = Cyan  
  - `0C` = Merah
  - `0D` = Magenta
  - `0E` = Kuning

## 📞 Support

Jika ada masalah:
1. Cek log di masing-masing window
2. Restart dengan `restart-all.bat`
3. Cek file `whatsapp-status.json` untuk status bot
4. Pastikan semua dependencies terinstall
