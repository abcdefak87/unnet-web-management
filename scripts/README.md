# 🛠️ Scripts & Automation

Folder ini berisi script dan file otomatisasi untuk sistem manajemen ISP.

## 📁 **Struktur Folder**

```
scripts/
├── 📁 batch/                    # Script batch untuk Windows
│   ├── start-all-production.bat # Start semua service production
│   ├── start-whatsapp.bat       # Start WhatsApp bot
│   ├── stop-all.bat             # Stop semua service
│   └── whatsapp-bot-integrated.js # WhatsApp bot script
├── whatsapp-status.json         # Status WhatsApp bot
└── README.md                    # File ini
```

## 🚀 **Script Batch (Windows)**

### **start-all-production.bat**
Menjalankan semua service dalam mode production:
- Server Express (port 3001)
- Client Next.js (port 3000)
- WhatsApp Bot

### **start-whatsapp.bat**
Menjalankan hanya WhatsApp bot dengan konfigurasi khusus.

### **stop-all.bat**
Menghentikan semua service yang sedang berjalan.

## 📊 **WhatsApp Status**

File `whatsapp-status.json` berisi informasi status koneksi WhatsApp bot:
- Status koneksi
- Informasi user
- Uptime
- Command count

## 🔧 **Cara Penggunaan**

### **Development**
```bash
# Start semua service
cd scripts/batch
./start-all-production.bat

# Start hanya WhatsApp bot
./start-whatsapp.bat

# Stop semua service
./stop-all.bat
```

### **Production**
```bash
# Gunakan script production
cd scripts/batch
./start-all-production.bat
```

## 📝 **Troubleshooting**

### **Port Already in Use**
- Pastikan tidak ada service lain yang menggunakan port 3000/3001
- Gunakan `stop-all.bat` untuk menghentikan service yang berjalan

### **WhatsApp Bot Issues**
- Periksa file `whatsapp-status.json` untuk status koneksi
- Pastikan session WhatsApp masih valid
- Restart bot jika diperlukan

## 🔒 **Security Notes**

- File session WhatsApp (`auth_info_baileys/`) tidak disertakan dalam repository
- File status WhatsApp berisi informasi sensitif, jangan commit ke repository
- Gunakan environment variables untuk konfigurasi sensitif

---

*Untuk dokumentasi lengkap, lihat folder [../docs/](../docs/)*