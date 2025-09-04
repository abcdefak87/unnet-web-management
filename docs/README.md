# ISP Management System

Sistem Manajemen ISP Berbasis Web dengan Integrasi WhatsApp & Telegram Bot

## 🚀 Fitur Utama

### Core Features
- **Manajemen Job**: Pemasangan dan perbaikan dengan tracking real-time
- **Manajemen Inventory**: Tracking stok barang dengan alert otomatis
- **Manajemen Customer**: Database pelanggan terintegrasi
- **Manajemen Teknisi**: Registrasi dan assignment otomatis
- **Dashboard Real-time**: Monitoring dengan WebSocket updates

### Integrasi & Notifikasi
- **Telegram Bot**: Notifikasi job, registrasi teknisi, admin commands
- **WhatsApp Business API**: Komunikasi dengan pelanggan
- **Smart Job Assignment**: AI-based assignment berdasarkan lokasi & performa
- **Real-time Updates**: WebSocket untuk update langsung

### Security & Monitoring
- **JWT Authentication**: Secure login dengan role-based access
- **Password Policy**: Validasi kompleksitas password
- **Structured Logging**: Winston logger dengan log rotation
- **CORS Protection**: Dynamic origin validation
- **Rate Limiting**: API protection

## 🛠️ Tech Stack

- **Frontend**: Next.js 13+ + React + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + Prisma ORM
- **Database**: SQLite (dev) / PostgreSQL (production)
- **Real-time**: Socket.io WebSocket
- **Integrations**: Telegram Bot API, WhatsApp Business API
- **Security**: JWT, bcryptjs, helmet, express-rate-limit
- **Logging**: Winston with log rotation

## 📦 Installation

### Quick Start
```bash
# Clone repository
git clone <repository-url>
cd projek-web

# Install dependencies
npm install
cd server && npm install
cd ../client && npm install

# Setup environment
cp server/.env.example server/.env
# Edit .env file dengan konfigurasi Anda

# Setup database
cd server && npx prisma generate && npx prisma db push

# Start development
npm run dev
```

### Production Deployment
```bash
# Build aplikasi
cd client && npm run build
cd ../server

# Start production server
NODE_ENV=production npm start
```

## 🏗️ Project Structure

```
├── client/                 # Frontend Next.js
│   ├── components/        # React components
│   ├── contexts/          # React contexts (Auth, Realtime)
│   ├── hooks/             # Custom hooks
│   ├── lib/               # Utilities & API client
│   └── pages/             # Next.js pages
├── server/                # Backend Express API
│   ├── config/            # Configuration files
│   ├── middleware/        # Express middleware
│   ├── prisma/            # Database schema & migrations
│   ├── routes/            # API routes
│   ├── services/          # Business logic services
│   └── utils/             # Utilities & helpers
└── uploads/               # File storage
```

## ⚙️ Environment Configuration

### Server (.env)
```env
# Database
DATABASE_URL="file:./dev.db"  # SQLite for development
# DATABASE_URL="postgresql://user:pass@localhost:5432/isp_db"  # PostgreSQL for production

# Authentication
JWT_SECRET="your-super-secure-jwt-secret-key"
JWT_EXPIRES_IN="7d"

# Server
NODE_ENV="development"
PORT=3001

# CORS
ALLOWED_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"

# Security
MIN_PASSWORD_LENGTH=8
REQUIRE_PASSWORD_COMPLEXITY=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload
MAX_FILE_SIZE_MB=10
ALLOWED_FILE_TYPES="image/jpeg,image/png,image/jpg,application/pdf"

# Telegram Bot
TELEGRAM_BOT_TOKEN="your-telegram-bot-token"

# WhatsApp Business API
WHATSAPP_API_URL="your-whatsapp-api-url"
WHATSAPP_TOKEN="your-whatsapp-token"

# Logging
LOG_LEVEL="info"
LOG_MAX_SIZE="20m"
LOG_MAX_FILES="14d"
```

## 🔄 Workflow

### Job Management
1. **Job Creation**: Admin input job (pemasangan/perbaikan)
2. **Smart Assignment**: Sistem assign berdasarkan lokasi & skill
3. **Notification**: Broadcast via Telegram ke teknisi
4. **Acceptance**: Teknisi terima job via bot
5. **Tracking**: Real-time status updates
6. **Completion**: Upload foto bukti & laporan

### Inventory Management
1. **Stock Monitoring**: Alert otomatis untuk stok rendah
2. **Auto Deduction**: Barang keluar otomatis saat job
3. **Return Process**: Barang sisa dikembalikan ke gudang
4. **Reporting**: Laporan penggunaan per periode

### Technician Registration
1. **Telegram Registration**: Teknisi daftar via bot
2. **Admin Approval**: Verifikasi data teknisi
3. **Account Creation**: Auto-generate akun sistem
4. **Job Assignment**: Mulai terima job notifications

## 👥 User Roles

- **Superadmin**: Full system access
- **Admin**: Job & inventory management
- **Manager**: Reporting & monitoring
- **CS**: Customer service operations
- **Gudang**: Inventory management only
- **User**: Basic access

## 🤖 Telegram Bot Commands

### For Technicians
- `/start` - Registrasi teknisi baru
- `/jobs` - Lihat job tersedia
- `/myjobs` - Job yang sudah diambil
- `/profile` - Lihat profil
- `/help` - Bantuan

### For Admins
- `/admin` - Admin dashboard
- `/jobs_admin` - Kelola semua job
- `/inventory` - Kelola inventory
- `/reports` - Lihat laporan
- `/technicians` - Kelola teknisi

## 📊 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile

### Jobs
- `GET /api/jobs` - List jobs with filters
- `POST /api/jobs` - Create new job
- `GET /api/jobs/:id` - Get job details
- `PUT /api/jobs/:id` - Update job
- `POST /api/jobs/:id/assign` - Assign technician

### Inventory
- `GET /api/inventory` - List inventory items
- `POST /api/inventory` - Add new item
- `PUT /api/inventory/:id` - Update item
- `POST /api/inventory/usage` - Record usage

## 🔒 Security Features

- **JWT Authentication** dengan refresh tokens
- **Password Complexity** validation
- **Rate Limiting** per IP address
- **CORS Protection** dengan dynamic origins
- **Input Validation** dengan express-validator
- **SQL Injection Protection** via Prisma ORM
- **File Upload Security** dengan type & size validation

## 📝 Logging & Monitoring

- **Structured Logging** dengan Winston
- **Log Rotation** otomatis
- **Error Tracking** dengan stack traces
- **Performance Monitoring** via WebSocket metrics
- **Audit Trail** untuk user actions

## 🚀 Production Deployment

1. **Environment Setup**: Configure production .env
2. **Database Migration**: Setup PostgreSQL
3. **Build Process**: Build client & server
4. **Process Management**: Use PM2 atau Docker
5. **Reverse Proxy**: Setup Nginx
6. **SSL Certificate**: Configure HTTPS
7. **Monitoring**: Setup logging & alerts

## 📞 Support

Untuk bantuan teknis atau pertanyaan, hubungi tim development atau buat issue di repository ini.
