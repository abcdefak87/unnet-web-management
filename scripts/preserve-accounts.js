#!/usr/bin/env node

/**
 * Account Preservation Script
 * Protects existing 4 user accounts during database migration
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Main accounts that must be preserved
const PROTECTED_ACCOUNTS = ['superadmin', 'admin', 'gudang', 'userbiasa'];

async function backupAccounts() {
  console.log('🔐 Starting account backup process...');
  
  try {
    // Create backups directory
    const backupDir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Get all users
    const users = await prisma.user.findMany();
    const technicians = await prisma.technician.findMany();
    const customers = await prisma.customer.findMany();
    const items = await prisma.item.findMany();
    
    // Create backup object
    const backup = {
      timestamp: new Date().toISOString(),
      users: users,
      technicians: technicians,
      customers: customers,
      items: items,
      protectedAccounts: PROTECTED_ACCOUNTS
    };
    
    // Save backup file
    const backupFile = path.join(backupDir, `accounts_backup_${Date.now()}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
    
    console.log(`✅ Backup completed: ${backupFile}`);
    console.log(`📊 Backed up: ${users.length} users, ${technicians.length} technicians`);
    
    // Verify protected accounts exist
    const protectedUsers = users.filter(user => PROTECTED_ACCOUNTS.includes(user.email));
    console.log('🔐 Protected accounts found:');
    protectedUsers.forEach(user => {
      console.log(`  - ${user.email}: ${user.name} (${user.role})`);
    });
    
    if (protectedUsers.length !== PROTECTED_ACCOUNTS.length) {
      console.warn('⚠️ Warning: Not all protected accounts found in database');
    }
    
    return backupFile;
    
  } catch (error) {
    console.error('❌ Backup failed:', error);
    throw error;
  }
}

async function restoreAccounts(backupFile = null) {
  console.log('📥 Starting account restoration process...');
  
  try {
    let backup;
    
    if (backupFile) {
      // Use specified backup file
      backup = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
    } else {
      // Find latest backup
      const backupDir = path.join(__dirname, '..', 'backups');
      const backupFiles = fs.readdirSync(backupDir)
        .filter(f => f.startsWith('accounts_backup_') && f.endsWith('.json'))
        .sort()
        .reverse();
      
      if (backupFiles.length === 0) {
        console.log('🌱 No backup found, will seed fresh accounts');
        return await seedFreshAccounts();
      }
      
      const latestBackup = path.join(backupDir, backupFiles[0]);
      backup = JSON.parse(fs.readFileSync(latestBackup, 'utf8'));
      console.log(`📂 Using backup: ${backupFiles[0]}`);
    }
    
    // Restore users with upsert (preserve existing, create if missing)
    let restoredCount = 0;
    let createdCount = 0;
    
    for (const user of backup.users) {
      const result = await prisma.user.upsert({
        where: { email: user.email },
        update: {
          name: user.name,
          role: user.role,
          permissions: user.permissions,
          phone: user.phone,
          isActive: user.isActive,
          telegramChatId: user.telegramChatId,
          // Preserve password hash
          password: user.password
        },
        create: {
          id: user.id,
          email: user.email,
          password: user.password,
          name: user.name,
          role: user.role,
          permissions: user.permissions,
          phone: user.phone,
          isActive: user.isActive,
          telegramChatId: user.telegramChatId,
          lastLogin: user.lastLogin,
          refreshTokenHash: user.refreshTokenHash,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      });
      
      if (PROTECTED_ACCOUNTS.includes(user.email)) {
        console.log(`✅ Protected account restored: ${user.email}`);
        restoredCount++;
      }
    }
    
    // Restore technicians
    for (const tech of backup.technicians) {
      await prisma.technician.upsert({
        where: { phone: tech.phone },
        update: tech,
        create: tech
      });
    }
    
    // Restore customers (if any)
    for (const customer of backup.customers) {
      await prisma.customer.upsert({
        where: { id: customer.id },
        update: customer,
        create: customer
      });
    }
    
    // Restore items (if any)
    for (const item of backup.items) {
      await prisma.item.upsert({
        where: { code: item.code },
        update: item,
        create: item
      });
    }
    
    console.log(`✅ Account restoration completed`);
    console.log(`📊 Protected accounts restored: ${restoredCount}/${PROTECTED_ACCOUNTS.length}`);
    
    // Verify all protected accounts exist
    await verifyProtectedAccounts();
    
  } catch (error) {
    console.error('❌ Restoration failed:', error);
    throw error;
  }
}

async function seedFreshAccounts() {
  console.log('🌱 Seeding fresh accounts...');
  
  const bcrypt = require('bcryptjs');
  
  try {
    // Create protected accounts
    const accounts = [
      {
        email: 'superadmin',
        password: await bcrypt.hash('super123', 10),
        name: 'Super Administrator',
        role: 'superadmin',
        permissions: 'ALL'
      },
      {
        email: 'admin',
        password: await bcrypt.hash('admin123', 10),
        name: 'Administrator',
        role: 'admin',
        permissions: 'LIMITED'
      },
      {
        email: 'gudang',
        password: await bcrypt.hash('gudang123', 10),
        name: 'Inventory Administrator',
        role: 'gudang',
        permissions: 'INVENTORY_ONLY'
      },
      {
        email: 'userbiasa',
        password: await bcrypt.hash('user123', 10),
        name: 'Regular User',
        role: 'user',
        permissions: 'VIEW_ONLY'
      }
    ];
    
    for (const account of accounts) {
      await prisma.user.upsert({
        where: { email: account.email },
        update: account,
        create: { ...account, isActive: true }
      });
      console.log(`✅ Created account: ${account.email}`);
    }
    
    console.log('🎉 Fresh accounts seeded successfully');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
}

async function verifyProtectedAccounts() {
  console.log('🔍 Verifying protected accounts...');
  
  try {
    const users = await prisma.user.findMany({
      where: {
        email: { in: PROTECTED_ACCOUNTS }
      },
      select: {
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });
    
    console.log('🔐 Protected accounts status:');
    console.log('┌─────────────┬──────────────────────────┬─────────────┬────────┐');
    console.log('│ Email       │ Name                     │ Role        │ Status │');
    console.log('├─────────────┼──────────────────────────┼─────────────┼────────┤');
    
    PROTECTED_ACCOUNTS.forEach(email => {
      const user = users.find(u => u.email === email);
      if (user) {
        const status = user.isActive ? '✅ Active' : '❌ Inactive';
        console.log(`│ ${email.padEnd(11)} │ ${user.name.padEnd(24)} │ ${user.role.padEnd(11)} │ ${status.padEnd(6)} │`);
      } else {
        console.log(`│ ${email.padEnd(11)} │ ${'NOT FOUND'.padEnd(24)} │ ${'N/A'.padEnd(11)} │ ${'❌ Missing'.padEnd(6)} │`);
      }
    });
    
    console.log('└─────────────┴──────────────────────────┴─────────────┴────────┘');
    
    const missingAccounts = PROTECTED_ACCOUNTS.filter(email => 
      !users.find(u => u.email === email)
    );
    
    if (missingAccounts.length > 0) {
      console.error(`❌ Missing protected accounts: ${missingAccounts.join(', ')}`);
      return false;
    }
    
    console.log('✅ All protected accounts verified successfully');
    return true;
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    return false;
  }
}

async function main() {
  const command = process.argv[2];
  const backupFile = process.argv[3];
  
  try {
    await prisma.$connect();
    
    switch (command) {
      case 'backup':
        await backupAccounts();
        break;
        
      case 'restore':
        await restoreAccounts(backupFile);
        break;
        
      case 'verify':
        await verifyProtectedAccounts();
        break;
        
      case 'seed':
        await seedFreshAccounts();
        break;
        
      default:
        console.log('🔐 Account Preservation Script');
        console.log('');
        console.log('Usage:');
        console.log('  node preserve-accounts.js backup                    # Backup current accounts');
        console.log('  node preserve-accounts.js restore [backup-file]     # Restore accounts from backup');
        console.log('  node preserve-accounts.js verify                    # Verify protected accounts exist');
        console.log('  node preserve-accounts.js seed                      # Seed fresh accounts');
        console.log('');
        console.log('Protected Accounts:');
        PROTECTED_ACCOUNTS.forEach(email => {
          console.log(`  - ${email}`);
        });
        break;
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  backupAccounts,
  restoreAccounts,
  verifyProtectedAccounts,
  seedFreshAccounts
};
