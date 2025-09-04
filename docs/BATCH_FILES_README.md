# 🚀 ISP Management System - Batch Files

## Overview
This directory contains Windows batch files to help you manage the ISP Management System with enhanced security features.

## 📁 Available Files

### 🔧 **start-server.bat** - Enhanced Startup Script
**Purpose**: Starts the ISP Management System with full security features

**Features**:
- ✅ **System Requirements Check**: Verifies Node.js and npm installation
- ✅ **Environment Setup**: Automatically creates .env from template if missing
- ✅ **Dependency Management**: Installs missing dependencies automatically
- ✅ **Database Migration**: Runs Prisma database migration
- ✅ **Health Monitoring**: Waits for servers to be ready before opening browser
- ✅ **Security Validation**: Ensures all security features are active
- ✅ **Directory Creation**: Creates all required upload directories

**Usage**:
```batch
start-server.bat
```

**What it does**:
1. Checks Node.js and npm installation
2. Creates required directories
3. Sets up environment configuration
4. Installs dependencies if needed
5. Runs database migration
6. Starts backend server
7. Waits for backend to be ready
8. Starts frontend server
9. Waits for frontend to be ready
10. Opens browser to http://localhost:3000

---

### 🛑 **stop-server.bat** - Enhanced Shutdown Script
**Purpose**: Safely stops the ISP Management System

**Features**:
- ✅ **Smart Detection**: Checks which servers are actually running
- ✅ **Graceful Shutdown**: Stops processes safely
- ✅ **Status Reporting**: Shows detailed shutdown status
- ✅ **Optional Global Cleanup**: Option to stop all Node.js processes
- ✅ **Verification**: Double-checks that servers are stopped

**Usage**:
```batch
stop-server.bat
```

**What it does**:
1. Checks which servers are running
2. Stops frontend server (port 3000)
3. Stops backend server (port 3001)
4. Verifies all servers are stopped
5. Optionally stops all Node.js processes
6. Reports shutdown status

---

### 🔧 **setup-environment.bat** - Environment Setup Script
**Purpose**: Sets up the complete development environment

**Features**:
- ✅ **System Validation**: Checks Node.js and npm versions
- ✅ **Directory Creation**: Creates all required directories
- ✅ **Environment Configuration**: Sets up .env file from template
- ✅ **Dependency Installation**: Installs all required packages
- ✅ **Database Setup**: Runs initial database migration
- ✅ **Security Check**: Validates security configuration
- ✅ **Comprehensive Reporting**: Shows setup status and next steps

**Usage**:
```batch
setup-environment.bat
```

**When to use**:
- First time setup
- After cloning the repository
- When dependencies are corrupted
- When environment configuration is missing

---

### 🔍 **troubleshoot.bat** - Troubleshooting Script
**Purpose**: Diagnoses and fixes common issues

**Features**:
- ✅ **System Requirements Check**: Verifies all prerequisites
- ✅ **Server Status Check**: Tests server connectivity
- ✅ **Database Connection Test**: Validates database connectivity
- ✅ **Environment Validation**: Checks configuration files
- ✅ **Cache and Log Cleanup**: Clears temporary files
- ✅ **Database Reset**: Option to reset database
- ✅ **Security Configuration Check**: Validates security setup
- ✅ **Log Viewer**: Displays system logs

**Usage**:
```batch
troubleshoot.bat
```

**Menu Options**:
1. **Check system requirements** - Verifies Node.js, npm, ports
2. **Check server status** - Tests frontend/backend connectivity
3. **Check database connection** - Validates database setup
4. **Check environment configuration** - Reviews .env settings
5. **Clear cache and logs** - Cleans temporary files
6. **Reset database** - Resets database (⚠️ DESTRUCTIVE)
7. **Check security configuration** - Validates security features
8. **View system logs** - Shows recent log entries

---

## 🔒 Security Features Included

### JWT Security
- ✅ Access tokens expire in 15 minutes
- ✅ Refresh tokens with 7-day expiration
- ✅ Token revocation on logout
- ✅ Secure token storage

### File Upload Security
- ✅ Enhanced MIME type validation
- ✅ File extension verification
- ✅ Executable file detection
- ✅ Path traversal protection
- ✅ File size limits (5MB per file, 20MB total)

### Rate Limiting
- ✅ Auth endpoints: 5 attempts per 15 minutes
- ✅ Upload endpoints: 10 uploads per hour
- ✅ General API: 1000 requests per 15 minutes

### Database Security
- ✅ SQL injection prevention
- ✅ Parameterized queries only
- ✅ Input validation

### Monitoring & Logging
- ✅ Health check endpoints
- ✅ Database connection monitoring
- ✅ Comprehensive error logging
- ✅ Performance monitoring

---

## 🚀 Quick Start Guide

### First Time Setup
1. **Run Environment Setup**:
   ```batch
   setup-environment.bat
   ```

2. **Edit Configuration** (if needed):
   - Edit `server\.env` file
   - Change JWT_SECRET and JWT_REFRESH_SECRET
   - Configure other settings as needed

3. **Start the System**:
   ```batch
   start-server.bat
   ```

4. **Access the Application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Health Check: http://localhost:3001/health

### Daily Usage
1. **Start**: `start-server.bat`
2. **Stop**: `stop-server.bat`

### Troubleshooting
1. **Run Diagnostics**: `troubleshoot.bat`
2. **Follow the menu options**
3. **Check logs and fix issues**

---

## ⚠️ Important Notes

### Environment Variables
- **JWT_SECRET**: Must be a strong, unique secret key
- **JWT_REFRESH_SECRET**: Must be different from JWT_SECRET
- **DATABASE_URL**: Set to your database connection string
- **NODE_ENV**: Set to 'development' or 'production'

### Security Considerations
- Never use default JWT secrets in production
- Always use HTTPS in production
- Regularly update dependencies
- Monitor logs for security events

### Port Requirements
- **Port 3000**: Frontend (Next.js)
- **Port 3001**: Backend (Express.js)
- Ensure these ports are available

---

## 🆘 Troubleshooting Common Issues

### "Node.js is not installed"
- Install Node.js from https://nodejs.org/
- Recommended version: 18.x or higher

### "Database migration failed"
- Check DATABASE_URL in server\.env
- Ensure database file/directory is writable
- Run `troubleshoot.bat` → Option 3

### "Port already in use"
- Stop other applications using ports 3000/3001
- Run `stop-server.bat` to stop existing servers
- Use `troubleshoot.bat` → Option 1 to check ports

### "Environment file not found"
- Run `setup-environment.bat`
- Or manually copy `server\env.example` to `server\.env`

### "Dependencies installation failed"
- Check internet connection
- Clear npm cache: `npm cache clean --force`
- Delete `node_modules` folders and reinstall

---

## 📞 Support

For additional help:
1. Check `SECURITY_IMPROVEMENTS.md` for detailed documentation
2. Run `troubleshoot.bat` for automated diagnostics
3. Check server logs in `server\logs\` directory
4. Review error messages in the console output

---

## 🔄 Updates and Maintenance

### Regular Maintenance
- Run `troubleshoot.bat` periodically
- Check for dependency updates
- Monitor log files for errors
- Backup database regularly

### Security Updates
- Keep Node.js and npm updated
- Review security logs regularly
- Update JWT secrets periodically
- Monitor for security advisories

---

*Last updated: September 2025*
*Version: 2.0 with Enhanced Security Features*
