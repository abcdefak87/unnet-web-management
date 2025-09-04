const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class AdminBotConfig {
  constructor() {
    // Admin bot configuration with Chat ID and Phone mapping
    this.adminUsers = new Map();
    this.loadAdminUsers();
    this.setupPredefinedAdmins();
  }

  setupPredefinedAdmins() {
    // Set predefined admin Chat IDs for automatic detection
    const predefinedAdmins = [
      {
        chatId: '7440324107',
        username: 'Admin Bot',
        role: 'superadmin',
        isActive: true,
        isPredefined: true
      }
    ];

    predefinedAdmins.forEach(admin => {
      this.adminUsers.set(admin.chatId, admin);
      console.log(`✅ Admin Bot activated: Chat ID ${admin.chatId} as ${admin.role}`);
    });
  }

  async loadAdminUsers() {
    try {
      // Load admin users from database
      const systemUsers = await prisma.user.findMany({
        where: {
          role: { in: ['superadmin', 'admin'] },
          telegramChatId: { not: null }
        }
      });

      systemUsers.forEach(user => {
        this.adminUsers.set(user.telegramChatId, {
          userId: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          phone: user.phone || null,
          isActive: true
        });
      });

      console.log(`Loaded ${this.adminUsers.size} admin users for bot`);
    } catch (error) {
      console.error('Error loading admin users:', error);
    }
  }

  // Add new admin user with Chat ID only
  async addAdminUser(chatId, userInfo = {}) {
    try {
      const adminUser = {
        chatId: chatId.toString(),
        username: userInfo.first_name || 'Admin User',
        role: 'admin',
        isActive: true,
        isPredefined: false
      };

      this.adminUsers.set(chatId.toString(), adminUser);

      return {
        success: true,
        message: 'Admin user added successfully',
        user: adminUser
      };

    } catch (error) {
      console.error('Error adding admin user:', error);
      return {
        success: false,
        message: 'Error adding admin user: ' + error.message
      };
    }
  }

  // Add admin by Chat ID only (simplified)
  async addAdminByChatId(chatId, role = 'admin') {
    try {
      const adminUser = {
        chatId: chatId.toString(),
        username: `Admin_${chatId}`,
        role: role,
        isActive: true,
        isPredefined: false,
        addedAt: new Date()
      };

      this.adminUsers.set(chatId.toString(), adminUser);

      return {
        success: true,
        message: `Admin access granted for Chat ID ${chatId}`,
        user: adminUser
      };

    } catch (error) {
      console.error('Error adding admin by chat ID:', error);
      return {
        success: false,
        message: 'Error adding admin: ' + error.message
      };
    }
  }

  // Check if Chat ID is admin
  isAdmin(chatId) {
    return this.adminUsers.has(chatId.toString());
  }

  // Get admin user info
  getAdminUser(chatId) {
    return this.adminUsers.get(chatId.toString());
  }

  // Remove admin user
  removeAdminUser(chatId) {
    return this.adminUsers.delete(chatId.toString());
  }

  // Get all admin users
  getAllAdminUsers() {
    return Array.from(this.adminUsers.entries()).map(([chatId, user]) => ({
      chatId,
      ...user
    }));
  }

  // Normalize phone number
  normalizePhoneNumber(phone) {
    // Remove all non-digit characters
    let normalized = phone.replace(/\D/g, '');
    
    // Handle Indonesian phone numbers
    if (normalized.startsWith('0')) {
      normalized = '62' + normalized.substring(1);
    } else if (normalized.startsWith('8')) {
      normalized = '62' + normalized;
    } else if (!normalized.startsWith('62')) {
      normalized = '62' + normalized;
    }
    
    return '+' + normalized;
  }

  // Validate phone number format
  isValidPhoneNumber(phone) {
    const phoneRegex = /^(\+62|62|0)[\d\-\s]{8,13}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  }

  // Refresh admin users from database
  async refreshAdminUsers() {
    this.adminUsers.clear();
    await this.loadAdminUsers();
  }
}

// Singleton instance
let adminBotConfigInstance = null;

function getAdminBotConfig() {
  if (!adminBotConfigInstance) {
    adminBotConfigInstance = new AdminBotConfig();
  }
  return adminBotConfigInstance;
}

module.exports = {
  AdminBotConfig,
  getAdminBotConfig
};
