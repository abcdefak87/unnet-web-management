# 📁 Scripts Directory

This directory contains all utility scripts, batch files, and development documentation for the ISP Management System.

## 📁 Available Scripts

### Development Scripts

#### `dev.bat`
**Purpose:** Start both frontend and backend servers for development
```batch
scripts\dev.bat
```

#### `test-local.bat`
**Purpose:** Test local environment setup and dependencies
```batch
scripts\test-local.bat
```

#### `start-dev.bat`
**Purpose:** Alternative development server starter with browser auto-open
```batch
scripts\start-dev.bat
```

### Setup Scripts

#### `run-fresh-setup.bat`
**Purpose:** Fresh installation and setup of the entire project
```batch
scripts\run-fresh-setup.bat
```

## 📚 Documentation

- **LOCAL_DEV_GUIDE.md** - Complete local development workflow guide
- **DEVELOPMENT_STATUS.md** - Current development environment status

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
