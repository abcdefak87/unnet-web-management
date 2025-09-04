# 🐘 PostgreSQL Setup Guide - Windows

## 📋 **Step-by-Step Installation**

### **Step 1: Install PostgreSQL**

1. **Run PostgreSQL Installer**
   - Double-click installer yang sudah didownload
   - Pilih "Next" untuk melanjutkan

2. **Installation Directory**
   - Default: `C:\Program Files\PostgreSQL\15`
   - Klik "Next"

3. **Select Components**
   - ✅ PostgreSQL Server
   - ✅ pgAdmin 4 (GUI management tool)
   - ✅ Stack Builder (optional)
   - ✅ Command Line Tools
   - Klik "Next"

4. **Data Directory**
   - Default: `C:\Program Files\PostgreSQL\15\data`
   - Klik "Next"

5. **Password for Database Superuser (postgres)**
   - **PENTING**: Buat password yang kuat dan INGAT!
   - Contoh: `PostgreSQL123!`
   - Konfirmasi password
   - Klik "Next"

6. **Port Number**
   - Default: `5432`
   - Klik "Next"

7. **Advanced Options**
   - Locale: Default
   - Klik "Next"

8. **Ready to Install**
   - Review settings
   - Klik "Next" untuk install

### **Step 2: Verify Installation**

1. **Check PostgreSQL Service**
   - Tekan `Win + R`, ketik `services.msc`
   - Cari "postgresql-x64-15" (atau versi Anda)
   - Status harus "Running"

2. **Test Connection via Command Line**
   ```cmd
   # Buka Command Prompt as Administrator
   cd "C:\Program Files\PostgreSQL\15\bin"
   
   # Test connection
   psql -U postgres -h localhost
   # Enter password yang dibuat tadi
   ```

3. **Test Connection via pgAdmin**
   - Buka pgAdmin 4 dari Start Menu
   - Klik "Servers" → "PostgreSQL 15"
   - Enter master password

## 🔧 **Setup Database untuk ISP Management**

### **Step 3: Create Database dan User**

1. **Via Command Line (Recommended)**
   ```cmd
   # Buka Command Prompt as Administrator
   cd "C:\Program Files\PostgreSQL\15\bin"
   
   # Connect sebagai postgres
   psql -U postgres -h localhost
   
   # Jalankan commands berikut:
   CREATE DATABASE isp_management;
   CREATE USER isp_user WITH PASSWORD 'isp_secure_password_123';
   GRANT ALL PRIVILEGES ON DATABASE isp_management TO isp_user;
   ALTER USER isp_user CREATEDB;
   \q
   ```

2. **Via pgAdmin (Alternative)**
   - Buka pgAdmin 4
   - Right-click "Databases" → "Create" → "Database"
   - Name: `isp_management`
   - Owner: postgres
   - Save
   
   - Right-click "Login/Group Roles" → "Create" → "Login/Group Role"
   - General tab: Name = `isp_user`
   - Definition tab: Password = `isp_secure_password_123`
   - Privileges tab: ✅ Can login, ✅ Create databases
   - Save

### **Step 4: Configure Environment**

1. **Update .env File**
   ```env
   # Database Configuration (Windows PostgreSQL)
   DATABASE_URL="postgresql://isp_user:isp_secure_password_123@localhost:5432/isp_management"
   
   # JWT Secret (Generate new one)
   JWT_SECRET="generate_new_64_char_secret_here"
   
   # Server Configuration
   PORT=3001
   NODE_ENV=development
   
   # CORS Configuration
   FRONTEND_URL="http://localhost:3000"
   ALLOWED_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"
   
   # File Upload Configuration
   MAX_FILE_SIZE=10485760
   UPLOAD_PATH="./uploads"
   ALLOWED_FILE_TYPES="image/jpeg,image/png,image/jpg"
   
   # Rate Limiting
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=1000
   
   # Password Policy
   MIN_PASSWORD_LENGTH=8
   REQUIRE_PASSWORD_COMPLEXITY=false
   
   # Telegram Bot Configuration
   TELEGRAM_BOT_TOKEN="your_telegram_bot_token"
   TELEGRAM_WEBHOOK_URL="http://localhost:3001/api/telegram/webhook"
   
   # Logging Configuration
   LOG_LEVEL="info"
   LOG_FILE="./logs/app.log"
   ```

### **Step 5: Database Migration**

1. **Backup Existing Data (PENTING!)**
   ```cmd
   cd server
   node ../scripts/preserve-accounts.js backup
   ```

2. **Install Dependencies**
   ```cmd
   cd server
   npm install
   ```

3. **Generate Prisma Client**
   ```cmd
   npm run db:generate
   ```

4. **Deploy Database Schema**
   ```cmd
   # Option 1: Using migrations
   npm run db:deploy
   
   # Option 2: If migrations fail, use push
   npm run db:push
   ```

5. **Restore/Seed Data**
   ```cmd
   # If you have existing data backup
   node ../scripts/preserve-accounts.js restore
   
   # If fresh installation
   npm run db:seed
   ```

### **Step 6: Test Connection**

1. **Test Database Connection**
   ```cmd
   node -e "
   const { PrismaClient } = require('@prisma/client');
   const prisma = new PrismaClient();
   prisma.$connect()
     .then(() => {
       console.log('✅ Database connected successfully');
       return prisma.user.count();
     })
     .then(count => {
       console.log('👥 Users in database:', count);
       process.exit(0);
     })
     .catch(err => {
       console.error('❌ Database connection failed:', err);
       process.exit(1);
     })
     .finally(() => prisma.$disconnect());
   "
   ```

2. **Verify Protected Accounts**
   ```cmd
   node ../scripts/preserve-accounts.js verify
   ```

3. **Start Application**
   ```cmd
   # Start backend
   npm run dev
   
   # In another terminal, start frontend
   cd ../client
   npm run dev
   ```

## 🔧 **Troubleshooting**

### **Issue 1: PostgreSQL Service Not Running**
```cmd
# Start service manually
net start postgresql-x64-15

# Or via Services
services.msc → postgresql-x64-15 → Start
```

### **Issue 2: Connection Refused**
```cmd
# Check if PostgreSQL is listening
netstat -an | findstr :5432

# Check pg_hba.conf
# File location: C:\Program Files\PostgreSQL\15\data\pg_hba.conf
# Add line: host all all 127.0.0.1/32 md5
```

### **Issue 3: Authentication Failed**
- Verify username/password in .env
- Check user exists in PostgreSQL
- Reset password if needed:
  ```sql
  ALTER USER isp_user WITH PASSWORD 'new_password';
  ```

### **Issue 4: Database Not Found**
```sql
-- Recreate database
DROP DATABASE IF EXISTS isp_management;
CREATE DATABASE isp_management;
GRANT ALL PRIVILEGES ON DATABASE isp_management TO isp_user;
```

### **Issue 5: Prisma Migration Errors**
```cmd
# Reset database (DANGER: loses data)
npm run db:push -- --force-reset

# Or fix migration manually
npx prisma migrate resolve --rolled-back "migration_name"
```

## 🎯 **Windows-Specific Commands**

### **PostgreSQL Service Management**
```cmd
# Start service
net start postgresql-x64-15

# Stop service  
net stop postgresql-x64-15

# Restart service
net stop postgresql-x64-15 && net start postgresql-x64-15
```

### **Database Backup (Windows)**
```cmd
# Create backup
"C:\Program Files\PostgreSQL\15\bin\pg_dump.exe" -U postgres -h localhost isp_management > backup.sql

# Restore backup
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -h localhost isp_management < backup.sql
```

### **Environment Variables (Windows)**
```cmd
# Add PostgreSQL to PATH (optional)
setx PATH "%PATH%;C:\Program Files\PostgreSQL\15\bin"
```

## ✅ **Success Checklist**

- ✅ PostgreSQL installed and running
- ✅ Database `isp_management` created
- ✅ User `isp_user` created with proper permissions
- ✅ .env file updated with correct DATABASE_URL
- ✅ Prisma client generated
- ✅ Database schema deployed
- ✅ 4 protected accounts verified (superadmin, admin, gudang, userbiasa)
- ✅ Application connects to PostgreSQL successfully
- ✅ Frontend and backend running without errors

## 🎉 **Next Steps**

After successful setup:
1. Test all login accounts
2. Verify all features working
3. Setup production deployment (if needed)
4. Configure automated backups
5. Setup monitoring

**Your PostgreSQL is now ready for ISP Management System!** 🚀
