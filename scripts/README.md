# ISP Management System - Scripts

## 📁 Available Scripts

### 1. `clean-and-setup.sh`
**Purpose:** Complete clean installation and setup on Linux server
- Removes old installation
- Backups important data
- Installs fresh from GitHub
- Auto-generates JWT secrets
- Configures PM2 and Nginx

**Usage on Linux:**
```bash
sudo bash clean-and-setup.sh
```

### 2. `run-setup-linux.sh`
**Purpose:** Downloads and runs clean-and-setup.sh from GitHub
- Downloads latest script from repository
- Runs the setup automatically

**Usage on Linux:**
```bash
wget https://raw.githubusercontent.com/abcdefak87/unnet-web-management/main/scripts/run-setup-linux.sh
sudo bash run-setup-linux.sh
```

### 3. `run-fresh-setup.bat`
**Purpose:** Run setup from Windows machine via SSH
- Uploads script to server
- Executes setup remotely

**Usage on Windows:**
```batch
scripts\run-fresh-setup.bat
```

## 🚀 Quick Start

### From Linux Server:
```bash
# Option 1: Direct download and run
curl -sL https://raw.githubusercontent.com/abcdefak87/unnet-web-management/main/scripts/run-setup-linux.sh | sudo bash

# Option 2: Clone and run
git clone https://github.com/abcdefak87/unnet-web-management.git
cd unnet-web-management/scripts
sudo bash clean-and-setup.sh
```

### From Windows:
```batch
cd "d:\backup\backup\projek web"
scripts\run-fresh-setup.bat
```

## 📝 Default Credentials
- Username: `superadmin`
- Password: `super123`

**Important:** Change password after first login!

## 🔗 Access
- Main URL: `http://172.17.2.3`
- API Health: `http://172.17.2.3/api/health`
