const { getAdminBotConfig } = require('../config/adminBotConfig');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class AdminBotSetupService {
  constructor(bot) {
    this.bot = bot;
    this.adminConfig = getAdminBotConfig();
    this.setupAdminCommands();
    this.userSessions = new Map(); // Store user setup sessions
  }

  setupAdminCommands() {
    // Simple admin add command - only Chat ID needed
    this.bot.onText(/\/addadmin (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const targetChatId = match[1].trim();
      await this.handleAddAdmin(chatId, targetChatId, msg.from);
    });

    // Check admin status
    this.bot.onText(/\/adminstatus/, async (msg) => {
      const chatId = msg.chat.id;
      await this.checkAdminStatus(chatId);
    });

    // List all admin users (superadmin only)
    this.bot.onText(/\/adminlist/, async (msg) => {
      const chatId = msg.chat.id;
      await this.listAdminUsers(chatId);
    });

    // Remove admin access (superadmin only)
    this.bot.onText(/\/removeadmin (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const targetChatId = match[1].trim();
      await this.removeAdminAccess(chatId, targetChatId);
    });

    // Handle text messages for setup sessions
    this.bot.on('text', async (msg) => {
      const chatId = msg.chat.id;
      const text = msg.text;
      
      // Skip if it's a command
      if (text.startsWith('/')) return;
      
      const session = this.userSessions.get(chatId);
      if (session) {
        await this.handleSetupSession(chatId, text, session);
      }
    });
  }

  async handleAddAdmin(chatId, targetChatId, userInfo) {
    try {
      // Check if requester is superadmin
      const currentUser = this.adminConfig.getAdminUser(chatId);
      if (!currentUser || currentUser.role !== 'superadmin') {
        await this.bot.sendMessage(chatId, '❌ Perintah ini hanya untuk superadmin.');
        return;
      }

      // Check if target is already admin
      if (this.adminConfig.isAdmin(targetChatId)) {
        const existingAdmin = this.adminConfig.getAdminUser(targetChatId);
        await this.bot.sendMessage(chatId,
          `ℹ️ <b>Chat ID sudah admin</b>\n\n` +
          `Chat ID: <code>${targetChatId}</code>\n` +
          `Role: ${existingAdmin.role}\n` +
          `Status: ${existingAdmin.isActive ? 'Aktif' : 'Tidak Aktif'}`,
          { parse_mode: 'HTML' }
        );
        return;
      }

      // Add new admin
      const result = await this.adminConfig.addAdminByChatId(targetChatId, 'admin');
      
      if (result.success) {
        await this.bot.sendMessage(chatId,
          `✅ <b>Admin Berhasil Ditambahkan</b>\n\n` +
          `Chat ID: <code>${targetChatId}</code>\n` +
          `Role: admin\n` +
          `Status: Aktif\n\n` +
          `User dengan Chat ID tersebut sekarang memiliki akses admin bot.`,
          { parse_mode: 'HTML' }
        );

        // Notify the new admin
        try {
          await this.bot.sendMessage(targetChatId,
            `🎉 <b>Selamat! Anda sekarang Admin Bot</b>\n\n` +
            `Anda telah diberikan akses admin bot oleh superadmin.\n\n` +
            `Gunakan /adminstatus untuk cek status Anda.\n` +
            `Gunakan /help untuk melihat command yang tersedia.`,
            { parse_mode: 'HTML' }
          );
        } catch (error) {
          console.log('Could not notify new admin:', error.message);
        }
      } else {
        await this.bot.sendMessage(chatId,
          `❌ <b>Gagal Menambahkan Admin</b>\n\n${result.message}`,
          { parse_mode: 'HTML' }
        );
      }
    } catch (error) {
      console.error('Add admin error:', error);
      await this.bot.sendMessage(chatId, '❌ Terjadi kesalahan saat menambahkan admin.');
    }
  }

  async handleAdminLogin(chatId, username, password, phoneNumber, userInfo) {
    try {
      // Validate phone number format
      if (!this.adminConfig.isValidPhoneNumber(phoneNumber)) {
        await this.bot.sendMessage(chatId,
          '❌ <b>Format nomor telepon tidak valid</b>\n\n' +
          'Gunakan format: 08123456789 atau +628123456789',
          { parse_mode: 'HTML' }
        );
        return;
      }

      const result = await this.adminConfig.linkAdminAccount(chatId, username, password, phoneNumber);
      
      if (result.success) {
        await this.bot.sendMessage(chatId,
          `✅ <b>Login Admin Berhasil!</b>\n\n` +
          `👤 Username: ${result.user.username}\n` +
          `🎭 Role: ${result.user.role}\n` +
          `📱 Phone: ${result.user.phone}\n` +
          `🆔 Chat ID: <code>${chatId}</code>\n\n` +
          `🎉 Sekarang Anda dapat menggunakan fitur admin bot!\n\n` +
          `Gunakan /help untuk melihat command yang tersedia.`,
          { 
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [{ text: '📊 Dashboard Admin', callback_data: 'admin_dashboard' }],
                [{ text: '❓ Bantuan', callback_data: 'help' }]
              ]
            }
          }
        );
      } else {
        await this.bot.sendMessage(chatId,
          `❌ <b>Login Gagal</b>\n\n${result.message}`,
          { parse_mode: 'HTML' }
        );
      }
    } catch (error) {
      console.error('Admin login error:', error);
      await this.bot.sendMessage(chatId, '❌ Terjadi kesalahan saat login admin.');
    }
  }

  async checkAdminStatus(chatId) {
    try {
      if (this.adminConfig.isAdmin(chatId)) {
        const adminUser = this.adminConfig.getAdminUser(chatId);
        
        let message = `✅ <b>Status Admin</b>\n\n`;
        message += `👤 Username: ${adminUser.username}\n`;
        message += `📧 Email: ${adminUser.email}\n`;
        message += `🎭 Role: ${adminUser.role}\n`;
        message += `📱 Phone: ${adminUser.phone}\n`;
        message += `🆔 Chat ID: <code>${chatId}</code>\n`;
        message += `🟢 Status: Aktif\n\n`;
        message += `🕐 Terakhir login: ${new Date().toLocaleString('id-ID')}`;

        await this.bot.sendMessage(chatId, message, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📊 Dashboard', callback_data: 'admin_dashboard' }],
              [{ text: '🔄 Refresh Status', callback_data: 'admin_status_refresh' }]
            ]
          }
        });
      } else {
        await this.bot.sendMessage(chatId,
          `❌ <b>Bukan Admin</b>\n\n` +
          `Anda tidak memiliki akses admin bot.\n\n` +
          `Gunakan /adminsetup untuk setup akun admin.`,
          { parse_mode: 'HTML' }
        );
      }
    } catch (error) {
      console.error('Check admin status error:', error);
      await this.bot.sendMessage(chatId, '❌ Gagal mengecek status admin.');
    }
  }

  async listAdminUsers(chatId) {
    try {
      // Check if superadmin
      const currentUser = this.adminConfig.getAdminUser(chatId);
      if (!currentUser || currentUser.role !== 'superadmin') {
        await this.bot.sendMessage(chatId, '❌ Perintah ini hanya untuk superadmin.');
        return;
      }

      const adminUsers = this.adminConfig.getAllAdminUsers();
      
      if (adminUsers.length === 0) {
        await this.bot.sendMessage(chatId, 'Belum ada admin user yang terdaftar.');
        return;
      }

      let message = `👥 <b>Daftar Admin Users (${adminUsers.length})</b>\n\n`;
      
      adminUsers.forEach((user, index) => {
        const roleEmoji = user.role === 'superadmin' ? '👑' : '👨‍💼';
        message += `${index + 1}. ${roleEmoji} <b>${user.username}</b>\n`;
        message += `   📧 ${user.email}\n`;
        message += `   📱 ${user.phone}\n`;
        message += `   🆔 <code>${user.chatId}</code>\n`;
        message += `   🎭 ${user.role}\n\n`;
      });

      await this.bot.sendMessage(chatId, message, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔄 Refresh', callback_data: 'admin_list_refresh' }],
            [{ text: '➕ Tambah Admin', callback_data: 'admin_add_new' }]
          ]
        }
      });
    } catch (error) {
      console.error('List admin users error:', error);
      await this.bot.sendMessage(chatId, '❌ Gagal memuat daftar admin.');
    }
  }

  async removeAdminAccess(chatId, targetChatId) {
    try {
      // Check if superadmin
      const currentUser = this.adminConfig.getAdminUser(chatId);
      if (!currentUser || currentUser.role !== 'superadmin') {
        await this.bot.sendMessage(chatId, '❌ Perintah ini hanya untuk superadmin.');
        return;
      }

      // Check if target is admin
      if (!this.adminConfig.isAdmin(targetChatId)) {
        await this.bot.sendMessage(chatId, '❌ Chat ID tersebut bukan admin.');
        return;
      }

      const targetUser = this.adminConfig.getAdminUser(targetChatId);
      
      // Remove from database
      await prisma.user.update({
        where: { id: targetUser.userId },
        data: { telegramChatId: null }
      });

      // Remove from memory
      this.adminConfig.removeAdminUser(targetChatId);

      await this.bot.sendMessage(chatId,
        `✅ <b>Admin Access Removed</b>\n\n` +
        `Admin access untuk ${targetUser.username} telah dihapus.`,
        { parse_mode: 'HTML' }
      );

      // Notify the removed user
      try {
        await this.bot.sendMessage(targetChatId,
          `❌ <b>Admin Access Revoked</b>\n\n` +
          `Akses admin Anda telah dicabut oleh superadmin.\n` +
          `Hubungi administrator untuk informasi lebih lanjut.`,
          { parse_mode: 'HTML' }
        );
      } catch (error) {
        // User might have blocked the bot
        console.log('Could not notify removed user:', error.message);
      }
    } catch (error) {
      console.error('Remove admin access error:', error);
      await this.bot.sendMessage(chatId, '❌ Gagal menghapus akses admin.');
    }
  }

  async handleSetupSession(chatId, text, session) {
    try {
      if (session.step === 'waiting_username') {
        session.username = text;
        session.step = 'waiting_password';
        
        await this.bot.sendMessage(chatId,
          `🔐 <b>Masukkan Password</b>\n\n` +
          `Username: ${session.username}\n` +
          `Sekarang masukkan password akun admin Anda:`,
          { parse_mode: 'HTML' }
        );
      } else if (session.step === 'waiting_password') {
        session.password = text;
        session.step = 'waiting_phone';
        
        await this.bot.sendMessage(chatId,
          `📱 <b>Masukkan Nomor Telepon</b>\n\n` +
          `Username: ${session.username}\n` +
          `Password: ••••••••\n\n` +
          `Masukkan nomor telepon Anda:\n` +
          `Format: 08123456789 atau +628123456789`,
          { parse_mode: 'HTML' }
        );
      } else if (session.step === 'waiting_phone') {
        const phoneNumber = text;
        
        // Clear session
        this.userSessions.delete(chatId);
        
        // Process login
        await this.handleAdminLogin(chatId, session.username, session.password, phoneNumber, session.userInfo);
      }
    } catch (error) {
      console.error('Handle setup session error:', error);
      this.userSessions.delete(chatId);
      await this.bot.sendMessage(chatId, '❌ Terjadi kesalahan dalam setup. Silakan coba lagi dengan /adminsetup');
    }
  }

  // Handle callback queries for setup
  async handleSetupCallback(chatId, data, userInfo) {
    try {
      if (data === 'admin_setup_login') {
        // Start login session
        this.userSessions.set(chatId, {
          step: 'waiting_username',
          userInfo: userInfo
        });
        
        await this.bot.sendMessage(chatId,
          `🔐 <b>Login Admin Account</b>\n\n` +
          `Masukkan username (email) akun admin Anda:`,
          { parse_mode: 'HTML' }
        );
      } else if (data === 'admin_setup_manual') {
        await this.bot.sendMessage(chatId,
          `📱 <b>Setup Manual</b>\n\n` +
          `Untuk setup manual, gunakan format:\n` +
          `<code>/adminlogin [username] [password] [phone]</code>\n\n` +
          `Contoh:\n` +
          `<code>/adminlogin admin@unnet.com mypassword 08123456789</code>\n\n` +
          `⚠️ <b>Perhatian:</b> Pastikan tidak ada yang melihat saat mengetik password!`,
          { parse_mode: 'HTML' }
        );
      } else if (data === 'admin_setup_help') {
        await this.showSetupHelp(chatId);
      } else if (data === 'admin_status_refresh') {
        await this.adminConfig.refreshAdminUsers();
        await this.checkAdminStatus(chatId);
      } else if (data === 'admin_list_refresh') {
        await this.adminConfig.refreshAdminUsers();
        await this.listAdminUsers(chatId);
      }
    } catch (error) {
      console.error('Handle setup callback error:', error);
      await this.bot.sendMessage(chatId, '❌ Terjadi kesalahan dalam setup.');
    }
  }

  async showSetupHelp(chatId) {
    const message = `❓ <b>Bantuan Setup Admin Bot</b>\n\n` +
      `📋 <b>Cara Setup:</b>\n\n` +
      `1️⃣ <b>Login dengan Akun Admin:</b>\n` +
      `   • Gunakan username dan password akun admin yang sudah ada\n` +
      `   • Masukkan nomor telepon untuk verifikasi\n` +
      `   • Akun akan terhubung dengan Chat ID Telegram Anda\n\n` +
      `2️⃣ <b>Setup Manual:</b>\n` +
      `   • Gunakan command: /adminlogin [username] [password] [phone]\n` +
      `   • Pastikan data sesuai dengan akun admin di sistem\n\n` +
      `📱 <b>Format Nomor Telepon:</b>\n` +
      `   • 08123456789\n` +
      `   • +628123456789\n` +
      `   • 628123456789\n\n` +
      `🔒 <b>Keamanan:</b>\n` +
      `   • Password akan diverifikasi dengan database\n` +
      `   • Hanya akun dengan role admin/superadmin yang bisa akses\n` +
      `   • Chat ID akan disimpan untuk identifikasi\n\n` +
      `❓ <b>Butuh Bantuan?</b>\n` +
      `Hubungi administrator sistem untuk bantuan lebih lanjut.`;

    await this.bot.sendMessage(chatId, message, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔙 Kembali ke Setup', callback_data: 'admin_setup_back' }]
        ]
      }
    });
  }
}

module.exports = AdminBotSetupService;
