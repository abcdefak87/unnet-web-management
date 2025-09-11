# Environment Variables Setup

## Critical: Buat file `.env` di folder `server/`

Buat file `server/.env` dengan konten berikut:

```bash
# Database Configuration
DATABASE_URL="file:./dev.db"

# JWT Configuration - GANTI DENGAN SECRET YANG AMAN!
JWT_SECRET="your-super-secure-jwt-secret-change-this-in-production"
JWT_REFRESH_SECRET="your-super-secure-refresh-secret-different-from-jwt"

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
CSRF_SECRET="your-csrf-secret-key-change-this"

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
