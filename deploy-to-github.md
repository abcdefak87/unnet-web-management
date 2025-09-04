# 🚀 Deploy ke GitHub Repository

## 📋 **Langkah-langkah Upload ke GitHub**

### **1. Persiapan Repository GitHub**

```bash
# 1. Buat repository baru di GitHub (via web interface)
# 2. Clone atau inisialisasi repository lokal
git init
git remote add origin https://github.com/username/isp-management-system.git
```

### **2. Setup Environment untuk Production**

```bash
# Copy environment template
cp server/.env.example server/.env.production

# Edit file environment production
nano server/.env.production
```

**Konfigurasi `.env.production`:**
```env
# Database Configuration (PostgreSQL untuk production)
DATABASE_URL="postgresql://username:password@localhost:5432/isp_management"

# JWT Secret (Generate secret yang kuat!)
JWT_SECRET="your-super-secret-jwt-key-here-64-chars-minimum"

# Server Configuration
PORT=3001
NODE_ENV=production

# CORS Configuration (Ganti dengan domain Anda)
FRONTEND_URL="https://yourdomain.com"
ALLOWED_ORIGINS="https://yourdomain.com,https://www.yourdomain.com"

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH="./uploads"
ALLOWED_FILE_TYPES="image/jpeg,image/png,image/jpg"

# Rate Limiting (Lebih ketat untuk production)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Telegram Bot (Optional)
TELEGRAM_BOT_TOKEN="your-telegram-bot-token"
TELEGRAM_WEBHOOK_URL="https://yourdomain.com/api/telegram/webhook"

# Logging
LOG_LEVEL="info"
LOG_FILE="./logs/app.log"
```

### **3. Setup GitHub Secrets untuk CI/CD**

Sebelum menggunakan GitHub Actions, konfigurasikan secrets di repository:

**Go to GitHub Repository → Settings → Secrets and variables → Actions**

#### **Production Secrets:**
```
PROD_HOST=your-production-server-ip
PROD_USER=your-server-username
PROD_SSH_KEY=your-private-ssh-key-content
PROD_PORT=22
```

#### **Staging Secrets (Optional):**
```
STAGING_HOST=your-staging-server-ip
STAGING_USER=your-server-username
STAGING_SSH_KEY=your-private-ssh-key-content
STAGING_PORT=22
```

#### **Generate SSH Key untuk Deployment:**
```bash
# Di local machine atau server
ssh-keygen -t rsa -b 4096 -C "github-actions@yourdomain.com"

# Copy private key untuk GitHub Secret
cat ~/.ssh/id_rsa

# Copy public key ke server
ssh-copy-id user@your-server-ip
# atau manual:
cat ~/.ssh/id_rsa.pub >> ~/.ssh/authorized_keys
```

### **4. Commit dan Push ke GitHub**

```bash
# Add semua file
git add .

# Commit pertama
git commit -m "Initial commit: ISP Management System v1.0

Features:
- Next.js frontend with Tailwind CSS
- Node.js backend with Express
- Prisma ORM with SQLite/PostgreSQL
- JWT authentication with refresh tokens
- Real-time WebSocket notifications
- Telegram bot integration
- File upload system
- Comprehensive security features
- Rate limiting and CORS protection"

# Push ke GitHub
git push -u origin main
```

### **5. Setup GitHub Actions (CI/CD)**

File akan dibuat di `.github/workflows/deploy.yml`

### **6. Branching Strategy**

```bash
# Buat branch untuk development
git checkout -b development
git push -u origin development

# Buat branch untuk staging
git checkout -b staging
git push -u origin staging

# Kembali ke main branch
git checkout main
```

## 🔄 **Workflow Update Setelah Online**

### **Development Workflow:**

```bash
# 1. Buat branch feature baru
git checkout development
git pull origin development
git checkout -b feature/nama-fitur

# 2. Lakukan perubahan code
# ... edit files ...

# 3. Test lokal
npm run dev

# 4. Commit changes
git add .
git commit -m "feat: tambah fitur baru"

# 5. Push ke GitHub
git push origin feature/nama-fitur

# 6. Buat Pull Request ke development branch
# 7. Setelah review, merge ke development
# 8. Deploy ke staging untuk testing
# 9. Setelah testing OK, merge ke main untuk production
```

### **Hotfix Workflow:**

```bash
# 1. Buat branch hotfix dari main
git checkout main
git pull origin main
git checkout -b hotfix/nama-fix

# 2. Fix bug
# ... edit files ...

# 3. Test fix
npm run dev

# 4. Commit dan push
git add .
git commit -m "fix: perbaiki bug critical"
git push origin hotfix/nama-fix

# 5. Merge ke main dan development
git checkout main
git merge hotfix/nama-fix
git push origin main

git checkout development
git merge hotfix/nama-fix
git push origin development
```

## 📝 **Git Commands Cheat Sheet**

```bash
# Status dan info
git status                    # Lihat status file
git log --oneline            # Lihat history commit
git branch -a                # Lihat semua branch

# Update dari remote
git pull origin main         # Update main branch
git fetch --all             # Fetch semua branch

# Branching
git checkout -b new-branch   # Buat dan pindah ke branch baru
git checkout branch-name     # Pindah ke branch
git branch -d branch-name    # Hapus branch lokal

# Commit
git add .                    # Add semua file
git add file.js             # Add file specific
git commit -m "message"     # Commit dengan message
git push origin branch      # Push ke remote branch

# Merge
git merge branch-name       # Merge branch ke current branch
git rebase main            # Rebase current branch dengan main
```

## 🔐 **Security Checklist untuk GitHub**

- ✅ File `.env` sudah di `.gitignore`
- ✅ Tidak ada hardcoded secrets di code
- ✅ Database credentials tidak ter-commit
- ✅ API keys menggunakan environment variables
- ✅ Sensitive files sudah di `.gitignore`

## 📚 **Repository Structure untuk GitHub**

```
isp-management-system/
├── .github/
│   └── workflows/
│       └── deploy.yml
├── client/
├── server/
├── setup/                  # Folder deployment scripts
├── docs/
├── .gitignore
├── README.md
├── package.json
├── deploy-to-github.md     # This file
└── DEPLOYMENT.md           # Deployment guide
