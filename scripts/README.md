# ISP Management System - Scripts

## 📁 Available Scripts

### 1. `run-fresh-setup.bat`
**Purpose:** Setup development environment on Windows
- Installs all dependencies
- Sets up database
- Configures environment variables

**Usage on Windows:**
```batch
scripts\run-fresh-setup.bat
```

## 🚀 Quick Start

### Development Setup:
```bash
# Install dependencies
npm run install-all

# Setup database
cd server
npx prisma generate
npx prisma db push
cd ..

# Start development
npm run dev
```

## 📝 Default Credentials
- Username: `superadmin`
- Password: `super123`

**Important:** Change password after first login!

## 🔗 Local Access
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:3001`
- API Health: `http://localhost:3001/api/health`
