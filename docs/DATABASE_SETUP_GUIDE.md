# 🗄️ Database Setup & Migration Guide

## 📋 **Overview**

Panduan lengkap setup database untuk ISP Management System dengan perlindungan data existing dan zero-downtime deployment.

## 🎯 **Database Architecture**

```
Development Environment:
├── SQLite (file:./prisma/dev.db)
└── Local development only

Production Environment:
├── PostgreSQL 12+
├── Automated backups
├── Connection pooling
└── SSL encryption
```

## 🔐 **Existing User Accounts Protection**

### **Current 4 User Accounts:**
1. **superadmin** - Full system access
2. **admin** - Limited administrative access  
3. **gudang** - Inventory management only
4. **userbiasa** - View-only access

### **Account Preservation Strategy:**
- ✅ Database backup before migration
- ✅ User data export/import scripts
- ✅ Password hash preservation
- ✅ Role and permission retention

## 🚀 **Database Setup Process**

### **Step 1: Development Environment**

```bash
# Navigate to server directory
cd server/

# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Create SQLite database (development)
npm run db:push

# Seed initial data (creates 4 user accounts)
npm run db:seed
```

### **Step 2: Production Database Setup**

#### **A. PostgreSQL Installation (Linux Server)**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE isp_management;
CREATE USER isp_user WITH PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE isp_management TO isp_user;
ALTER USER isp_user CREATEDB;
\q
EOF
```

#### **B. Environment Configuration**
```bash
# Copy environment template
cp server/.env.example server/.env

# Edit production environment
nano server/.env
```

**Production .env Configuration:**
```env
# Database Configuration (PRODUCTION)
DATABASE_URL="postgresql://isp_user:your_secure_password_here@localhost:5432/isp_management"

# JWT Secret (Generate new one for production)
JWT_SECRET="generate_new_64_char_secret_here"

# Server Configuration
PORT=3001
NODE_ENV=production

# CORS Configuration (Update with your domain)
FRONTEND_URL="https://yourdomain.com"
ALLOWED_ORIGINS="https://yourdomain.com,https://www.yourdomain.com"

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH="./uploads"
ALLOWED_FILE_TYPES="image/jpeg,image/png,image/jpg"

# Rate Limiting (Production values)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Password Policy (Enable for production)
MIN_PASSWORD_LENGTH=8
REQUIRE_PASSWORD_COMPLEXITY=true

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN="your_telegram_bot_token"
TELEGRAM_WEBHOOK_URL="https://yourdomain.com/api/telegram/webhook"

# Logging Configuration
LOG_LEVEL="info"
LOG_FILE="./logs/app.log"
```

### **Step 3: Database Migration & Data Preservation**

#### **A. Backup Existing Data (If Upgrading)**
```bash
# Create backup directory
mkdir -p backups/$(date +%Y%m%d_%H%M%S)

# Export existing user data (SQLite to JSON)
node << 'EOF'
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function backupUsers() {
  try {
    const users = await prisma.user.findMany();
    const technicians = await prisma.technician.findMany();
    const customers = await prisma.customer.findMany();
    const items = await prisma.item.findMany();
    
    const backup = {
      users,
      technicians, 
      customers,
      items,
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync(`backups/data_backup_${Date.now()}.json`, JSON.stringify(backup, null, 2));
    console.log('✅ Data backup completed');
  } catch (error) {
    console.error('❌ Backup failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

backupUsers();
EOF
```

#### **B. Production Database Migration**
```bash
# Generate Prisma client for production
npm run db:generate

# Deploy database schema to production
npm run db:deploy

# Alternative: Push schema if no migrations exist
npm run db:push
```

#### **C. Restore User Data (Production)**
```bash
# Create restore script
cat > restore_users.js << 'EOF'
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function restoreUsers() {
  try {
    // Find latest backup file
    const backupFiles = fs.readdirSync('backups/').filter(f => f.includes('data_backup_'));
    if (backupFiles.length === 0) {
      console.log('🌱 No backup found, seeding fresh data...');
      // Run seed script for fresh installation
      require('./prisma/seed.js');
      return;
    }
    
    const latestBackup = backupFiles.sort().pop();
    const backup = JSON.parse(fs.readFileSync(`backups/${latestBackup}`, 'utf8'));
    
    console.log(`📥 Restoring from backup: ${latestBackup}`);
    
    // Restore users (preserve passwords and roles)
    for (const user of backup.users) {
      await prisma.user.upsert({
        where: { email: user.email },
        update: {
          name: user.name,
          role: user.role,
          permissions: user.permissions,
          phone: user.phone,
          isActive: user.isActive,
          // Keep existing password hash
          password: user.password
        },
        create: user
      });
    }
    
    // Restore other data
    for (const tech of backup.technicians) {
      await prisma.technician.upsert({
        where: { phone: tech.phone },
        update: tech,
        create: tech
      });
    }
    
    console.log('✅ User data restored successfully');
    console.log(`📊 Restored: ${backup.users.length} users, ${backup.technicians.length} technicians`);
    
  } catch (error) {
    console.error('❌ Restore failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

restoreUsers();
EOF

# Run restore script
node restore_users.js
```

### **Step 4: Database Verification**

```bash
# Test database connection
node << 'EOF'
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testConnection() {
  try {
    await prisma.$connect();
    const userCount = await prisma.user.count();
    console.log(`✅ Database connected successfully`);
    console.log(`👥 Users in database: ${userCount}`);
    
    // Verify 4 main accounts exist
    const mainAccounts = await prisma.user.findMany({
      where: {
        email: { in: ['superadmin', 'admin', 'gudang', 'userbiasa'] }
      },
      select: { email: true, name: true, role: true, isActive: true }
    });
    
    console.log('🔐 Main accounts status:');
    mainAccounts.forEach(user => {
      console.log(`  - ${user.email}: ${user.name} (${user.role}) - ${user.isActive ? 'Active' : 'Inactive'}`);
    });
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
EOF
```

## 🔄 **Database Maintenance Scripts**

### **Daily Backup Script**
```bash
# Create backup script
cat > backup_database.sh << 'EOF'
#!/bin/bash

# Configuration
BACKUP_DIR="/var/backups/isp-management"
DB_NAME="isp_management"
DB_USER="isp_user"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# PostgreSQL backup
pg_dump -U $DB_USER -h localhost $DB_NAME > $BACKUP_DIR/db_backup_$TIMESTAMP.sql

# Compress backup
gzip $BACKUP_DIR/db_backup_$TIMESTAMP.sql

# Keep only last 7 days of backups
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +7 -delete

echo "✅ Database backup completed: db_backup_$TIMESTAMP.sql.gz"
EOF

chmod +x backup_database.sh

# Add to crontab for daily backup at 2 AM
(crontab -l 2>/dev/null; echo "0 2 * * * /var/www/isp-management/backup_database.sh") | crontab -
```

### **Database Health Check Script**
```bash
# Create health check script
cat > check_database.sh << 'EOF'
#!/bin/bash

echo "🔍 Database Health Check - $(date)"
echo "=================================="

# Check PostgreSQL service
if systemctl is-active --quiet postgresql; then
    echo "✅ PostgreSQL service: Running"
else
    echo "❌ PostgreSQL service: Stopped"
    exit 1
fi

# Check database connection
if sudo -u postgres psql -d isp_management -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Database connection: OK"
else
    echo "❌ Database connection: Failed"
    exit 1
fi

# Check user count
USER_COUNT=$(sudo -u postgres psql -d isp_management -t -c "SELECT COUNT(*) FROM users;")
echo "👥 Total users: $USER_COUNT"

# Check main accounts
echo "🔐 Main accounts status:"
sudo -u postgres psql -d isp_management -c "SELECT email, name, role, \"isActive\" FROM users WHERE email IN ('superadmin', 'admin', 'gudang', 'userbiasa');"

echo "✅ Database health check completed"
EOF

chmod +x check_database.sh
```

## 🚨 **Error Prevention Checklist**

### **Before Migration:**
- ✅ Backup existing database
- ✅ Export user accounts data
- ✅ Test restore procedure
- ✅ Verify PostgreSQL installation
- ✅ Check disk space (minimum 10GB free)

### **During Migration:**
- ✅ Stop application services
- ✅ Run database migration
- ✅ Restore user data
- ✅ Verify data integrity
- ✅ Test database connections

### **After Migration:**
- ✅ Start application services
- ✅ Test login with all 4 accounts
- ✅ Verify all features working
- ✅ Setup automated backups
- ✅ Monitor application logs

## 🔧 **Troubleshooting**

### **Common Database Issues:**

#### **Connection Refused**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check if PostgreSQL is listening
sudo netstat -plunt | grep postgres

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*.log
```

#### **Authentication Failed**
```bash
# Check PostgreSQL authentication config
sudo nano /etc/postgresql/*/main/pg_hba.conf

# Ensure this line exists:
# local   all             all                                     md5

# Restart PostgreSQL after changes
sudo systemctl restart postgresql
```

#### **Migration Errors**
```bash
# Reset migration state (DANGER: Only if needed)
npm run db:push -- --force-reset

# Or manually fix migration
npx prisma migrate resolve --rolled-back "migration_name"
```

#### **Missing User Accounts**
```bash
# Re-run seed script
npm run db:seed

# Or manually restore from backup
node restore_users.js
```

## 📊 **Database Performance Optimization**

### **PostgreSQL Configuration**
```bash
# Edit PostgreSQL configuration
sudo nano /etc/postgresql/*/main/postgresql.conf

# Recommended settings for small-medium workload:
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### **Connection Pooling**
```javascript
// Add to server/lib/database.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Connection pooling
  __internal: {
    engine: {
      connectionLimit: 10,
    },
  },
});

module.exports = prisma;
```

## 🎯 **Production Deployment Commands**

### **Complete Database Setup (Production)**
```bash
# 1. Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# 2. Create database and user
sudo -u postgres createdb isp_management
sudo -u postgres createuser -P isp_user

# 3. Grant permissions
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE isp_management TO isp_user;"

# 4. Configure environment
cp server/.env.example server/.env
# Edit DATABASE_URL and other settings

# 5. Deploy schema
cd server && npm run db:deploy

# 6. Seed/restore data
npm run db:seed  # For fresh install
# OR
node restore_users.js  # For migration

# 7. Verify setup
./check_database.sh
```

---

## 🎉 **Database Setup Complete!**

Your database is now configured for production with:
- ✅ PostgreSQL production database
- ✅ 4 user accounts preserved/created
- ✅ Automated backup system
- ✅ Health monitoring
- ✅ Performance optimization
- ✅ Error prevention measures

**Login Credentials:**
- `superadmin/super123` - Full system access
- `admin/admin123` - Limited administrative access
- `gudang/gudang123` - Inventory management only
- `userbiasa/user123` - View-only access
