# Environment Variables Setup

## Critical: Buat file `.env` di folder `server/`

Buat file `server/.env` dengan konten berikut:

```bash
# Database Configuration
DATABASE_URL="file:./dev.db"

# JWT Configuration - SECRET BARU YANG AMAN (Generated 2025)
JWT_SECRET="7657c1ef0831a49fefed171b28a4de1b2adb1e204e574b8264f378e6a3713febb4332f6e5b53e8ed8309880e7548c6409d88a522e05037e53d8e5bc0a49f3c33"
JWT_REFRESH_SECRET="24f853bad17bc5cf104b983c080a2795733708fd52059bf7dad9dfdf31b80ad94be07355d51a7c2b5a57bf12cb3cdda338c684d9e7aa96d7604adbe761bb01b6"

# Server Configuration
PORT=3001
NODE_ENV=development

# CORS Configuration
ALLOWED_ORIGINS="http://localhost:3000,http://localhost:3001"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX=5

# Password Policy
MIN_PASSWORD_LENGTH=8
REQUIRE_PASSWORD_COMPLEXITY=true

# Bcrypt Configuration
BCRYPT_SALT_ROUNDS=14

# CSRF Protection
CSRF_SECRET="35d0f41cfef6f221f1b7b2c3656603caedce81cd5c865f9c706dc04dcb3b8ffb"

# WhatsApp Rate Limiting
WHATSAPP_RATE_LIMIT_WINDOW_MS=900000
WHATSAPP_RATE_LIMIT_MAX=50

# WhatsApp Configuration
WHATSAPP_SESSION_PATH="./auth_info_baileys"

# Logging
LOG_LEVEL=info

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_PATH="./uploads"

# Security Headers
HELMET_CSP_ENABLED=true

# API Keys (if needed)
VALID_API_KEYS=""

# WebSocket
WS_ORIGIN="http://localhost:3000"
```

## Cara Generate Secret yang Aman:

```bash
# Generate JWT Secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate CSRF Secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## ⚠️ PENTING:
1. **JANGAN** commit file `.env` ke git
2. **GANTI** semua secret dengan nilai yang unik
3. **GUNAKAN** secret yang berbeda untuk production
4. **BACKUP** secret yang aman untuk production
