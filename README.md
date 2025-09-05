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
# 1. Install dependencies
npm run install-all

# 2. Setup database
cd server
npx prisma generate
npx prisma db push
cd ..

# 3. Start development
npm run dev
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
├── 📁 scripts/               # Utility scripts
│   ├── run-fresh-setup.bat   # Windows setup script
│   └── README.md             # Scripts documentation
├── run-setup.bat             # Windows quick setup
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
# Install all dependencies
npm run install-all

# Start development servers
npm run dev

# Build production
npm run build

# Start production server
npm start
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

- **[Scripts Guide](scripts/README.md)** - Panduan penggunaan scripts

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

#### **"Permission denied" (Windows)**
```bash
# Run as Administrator
# Atau gunakan PowerShell dengan elevated privileges
```

## 🚀 **Production Build**

### **Environment Setup**
1. Set `NODE_ENV=production` di server/.env
2. Gunakan PostgreSQL untuk database production
3. Set JWT secrets yang kuat dan unik
4. Build frontend dengan `npm run build`

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
1. Cek dokumentasi di folder `scripts/`
2. Cek logs di `server/logs/`
3. Restart development server dengan `npm run dev`

---

**Made with ❤️ for ISP Management**

*Last updated: September 2025*
*Version: 2.0 with Enhanced Security Features*
