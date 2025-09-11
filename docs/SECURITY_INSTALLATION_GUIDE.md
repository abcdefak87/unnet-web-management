# Security Installation Guide

## 🚀 Quick Start - Security Setup

### Step 1: Environment Variables Setup

1. **Buat file `.env` di folder `server/`:**
```bash
cd server
cp .env.example .env  # Jika ada template
# Atau buat file baru dengan konten dari ENVIRONMENT_SETUP.md
```

2. **Generate secure secrets:**
```bash
# Generate JWT Secret
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"

# Generate JWT Refresh Secret
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"

# Generate CSRF Secret
node -e "console.log('CSRF_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

3. **Update file `.env` dengan secrets yang dihasilkan**

### Step 2: Install Dependencies

```bash
cd server
npm install sharp
```

### Step 3: Test Security Features

```bash
# Test server startup
npm run dev

# Test file upload security (di terminal lain)
curl -X POST http://localhost:3001/api/customers/register \
  -F "name=Test User" \
  -F "phone=081234567890" \
  -F "packageType=10MBPS"

# Test rate limiting
for i in {1..6}; do 
  curl -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"test"}'
done
```

## 🔧 Detailed Configuration

### Environment Variables Reference

```bash
# Database
DATABASE_URL="file:./dev.db"

# JWT Configuration (GANTI DENGAN SECRET YANG AMAN!)
JWT_SECRET="7657c1ef0831a49fefed171b28a4de1b2adb1e204e574b8264f378e6a3713febb4332f6e5b53e8ed8309880e7548c6409d88a522e05037e53d8e5bc0a49f3c33"
JWT_REFRESH_SECRET="24f853bad17bc5cf104b983c080a2795733708fd52059bf7dad9dfdf31b80ad94be07355d51a7c2b5a57bf12cb3cdda338c684d9e7aa96d7604adbe761bb01b6"

# Server
PORT=3001
NODE_ENV=development

# Security
BCRYPT_SALT_ROUNDS=14
CSRF_SECRET="35d0f41cfef6f221f1b7b2c3656603caedce81cd5c865f9c706dc04dcb3b8ffb"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX=5

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_PATH="./uploads"

# CORS
ALLOWED_ORIGINS="http://localhost:3000,http://localhost:3001"
```

### Security Features Enabled

1. **Enhanced Password Hashing**
   - Bcrypt with 14 salt rounds
   - Configurable via environment

2. **File Upload Security**
   - File signature validation
   - Threat scanning
   - Secure filename generation
   - Automatic cleanup

3. **WhatsApp Session Encryption**
   - AES-256-GCM encryption
   - Automatic encryption/decryption
   - Session key rotation

4. **Rate Limiting**
   - Configurable per endpoint
   - IP-based and user-based limits
   - Automatic cleanup

5. **Error Handling**
   - Centralized error management
   - Sanitized error messages
   - Comprehensive logging

## 🧪 Testing Security Features

### 1. Test Password Security

```bash
# Test password strength
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "weak",
    "name": "Test User"
  }'
# Should return password strength error
```

### 2. Test File Upload Security

```bash
# Test malicious file upload
echo "malicious content" > test.txt
curl -X POST http://localhost:3001/api/customers/register \
  -F "name=Test User" \
  -F "phone=081234567890" \
  -F "packageType=10MBPS" \
  -F "ktpPhoto=@test.txt"
# Should be rejected
```

### 3. Test Rate Limiting

```bash
# Test authentication rate limiting
for i in {1..10}; do
  curl -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"test"}'
  echo "Request $i"
done
# Should be rate limited after 5 attempts
```

### 4. Test WhatsApp Session Encryption

```bash
# Test session encryption
node -e "
const encryption = require('./utils/sessionEncryption');
console.log('Session encryption utility loaded successfully');
"
```

## 🔍 Verification Checklist

- [ ] Environment variables configured
- [ ] Dependencies installed
- [ ] Server starts without errors
- [ ] Password hashing works (14 rounds)
- [ ] File upload security active
- [ ] Rate limiting functional
- [ ] Error handling working
- [ ] WhatsApp session encryption ready

## 🚨 Troubleshooting

### Common Issues

1. **"JWT_SECRET not configured"**
   - Solution: Add JWT_SECRET to .env file

2. **"Failed to encrypt session file"**
   - Solution: Check file permissions in auth_info_baileys folder

3. **"Rate limit exceeded"**
   - Solution: Wait for rate limit window to reset

4. **"File validation failed"**
   - Solution: Check file type and size limits

### Debug Mode

```bash
# Enable debug logging
LOG_LEVEL=debug npm run dev
```

## 📞 Support

If you encounter issues:

1. Check the logs in `server/logs/`
2. Verify environment variables
3. Test individual components
4. Review error messages
5. Contact development team

---

**Security Status**: ✅ Implemented
**Last Updated**: [Current Date]
**Version**: 1.0.0
