# 🚀 ISP Management System

Sistem manajemen ISP yang lengkap dengan fitur keamanan tingkat enterprise dan antarmuka modern.

## 📋 **Fitur Utama**

### 🔐 **Keamanan Enterprise**
- ✅ JWT dengan refresh tokens (15 menit access, 7 hari refresh)
- ✅ Enhanced file upload security dengan validasi MIME type
- ✅ Rate limiting protection (auth, upload, general API)
- ✅ SQL injection prevention dengan parameterized queries
- ✅ CORS protection yang konfigurasi
- ✅ Caching optimization untuk performa

### 🎯 **Fitur Bisnis**
- ✅ Manajemen pelanggan dan teknisi
- ✅ Sistem job assignment otomatis
- ✅ Inventory management dengan low stock alerts
- ✅ Real-time notifications via WebSocket
- ✅ Telegram bot integration untuk admin
- ✅ Comprehensive reporting system

### 🎨 **User Experience**
- ✅ Modern UI dengan Tailwind CSS
- ✅ Responsive design untuk semua device
- ✅ Real-time updates tanpa refresh
- ✅ Multi-step forms dengan validation
- ✅ Dark/Light mode support

## 🚀 **Quick Start**

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

## 📁 **Struktur Project**

```
isp-management-system/
├── 📁 client/                 # Frontend (Next.js + React)
│   ├── 📁 components/         # React components
│   ├── 📁 pages/             # Next.js pages
│   ├── 📁 contexts/          # React contexts
│   ├── 📁 hooks/             # Custom hooks
│   ├── 📁 lib/               # Utilities & API client
│   └── 📁 styles/            # CSS & Tailwind
├── 📁 server/                # Backend (Node.js + Express)
│   ├── 📁 routes/            # API routes
│   ├── 📁 middleware/        # Express middleware
│   ├── 📁 services/          # Business logic
│   ├── 📁 prisma/            # Database schema
│   └── 📁 uploads/           # File uploads
├── 📁 scripts/               # Bash scripts
│   ├── start-server.sh       # Start system
│   ├── stop-server.sh        # Stop system
│   ├── setup-environment.sh  # Environment setup
│   └── troubleshoot.sh       # Troubleshooting
├── 📁 docs/                  # Documentation
│   ├── SECURITY_IMPROVEMENTS.md
│   ├── BATCH_FILES_README.md
│   └── BATCH_USAGE_GUIDE.md
├── start.sh                  # Quick start script (dengan waiting)
├── start-fast.sh             # Fast start script (8 detik timeout)
├── start-instant.sh          # Instant start script (tidak menunggu)
├── stop.sh                   # Quick stop script
├── setup.sh                  # Quick setup script
└── README.md                 # This file
```

## 🔧 **Requirements**

### **System Requirements**
- **Node.js**: 18.x atau lebih tinggi
- **npm**: 8.x atau lebih tinggi
- **Database**: SQLite (development) / PostgreSQL (production)
- **OS**: Windows, macOS, atau Linux

### **Development Tools**
- **Git Bash** (Windows) atau **Terminal** (macOS/Linux)
- **Code Editor**: VS Code (recommended)
- **Browser**: Chrome, Firefox, atau Safari

## 🌐 **Access URLs**

Setelah sistem berjalan:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health
- **API Health**: http://localhost:3001/api/health

## 🔒 **Security Configuration**

### **Environment Variables (server/.env)**
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

## 🛠️ **Development**

### **Available Scripts**
```bash
# Setup environment
./setup.sh

# Start development servers
./start.sh              # Dengan waiting (10 detik backend, 15 detik frontend)
./start-fast.sh         # Fast mode (8 detik backend, 10 detik frontend)
./start-instant.sh      # Instant mode (tidak menunggu)

# Stop all servers
./stop.sh

# Troubleshooting
./scripts/troubleshoot.sh
```

### **Manual Commands**
```bash
# Backend development
cd server
npm run dev

# Frontend development
cd client
npm run dev

# Database operations
cd server
npx prisma studio          # Database GUI
npx prisma db push         # Push schema changes
npx prisma generate        # Generate Prisma client
```

## 📚 **Documentation**

- **[Security Features](docs/SECURITY_IMPROVEMENTS.md)** - Dokumentasi lengkap fitur keamanan
- **[Scripts Guide](docs/BATCH_USAGE_GUIDE.md)** - Panduan penggunaan scripts
- **[Batch Files](docs/BATCH_FILES_README.md)** - Dokumentasi batch files

## 🔧 **Troubleshooting**

### **Common Issues**

#### **"Node.js is not installed"**
```bash
# Download dan install Node.js dari https://nodejs.org/
# Restart terminal setelah instalasi
```

#### **"Port already in use"**
```bash
# Stop servers yang sedang berjalan
./stop.sh

# Atau kill process manual
# Windows: taskkill //F //IM node.exe
# Linux/macOS: pkill -f node
```

#### **"Database migration failed"**
```bash
# Cek DATABASE_URL di server/.env
# Pastikan database file/directory writable
# Run setup ulang
./setup.sh
```

#### **"Permission denied" (Linux/macOS)**
```bash
# Berikan permission execute
chmod +x *.sh
chmod +x scripts/*.sh
```

### **Advanced Troubleshooting**
```bash
# Jalankan troubleshooting script
./scripts/troubleshoot.sh

# Pilih option sesuai masalah:
# 1. Check system requirements
# 2. Check server status
# 3. Check database connection
# 4. Check environment configuration
# 5. Clear cache and logs
# 6. Reset database
# 7. Check security configuration
# 8. View system logs
```

## 🚀 **Production Deployment**

### **Environment Setup**
1. Set `NODE_ENV=production` di server/.env
2. Gunakan PostgreSQL untuk database production
3. Set JWT secrets yang kuat dan unik
4. Konfigurasi HTTPS dan domain yang benar
5. Setup reverse proxy (nginx/Apache)

### **Security Checklist**
- ✅ JWT secrets yang kuat dan unik
- ✅ HTTPS enabled
- ✅ CORS origins yang benar
- ✅ Rate limiting yang sesuai
- ✅ File upload validation
- ✅ Database connection secure
- ✅ Log monitoring aktif

## 🤝 **Contributing**

1. Fork repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 **Support**

Jika mengalami masalah:
1. Cek dokumentasi di folder `docs/`
2. Jalankan `./scripts/troubleshoot.sh`
3. Cek logs di `server/logs/`
4. Buat issue di repository

---

**Made with ❤️ for ISP Management**

*Last updated: September 2025*
*Version: 2.0 with Enhanced Security Features*
