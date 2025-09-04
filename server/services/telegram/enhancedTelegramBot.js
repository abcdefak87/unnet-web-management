const TelegramBot = require('node-telegram-bot-api');
const { PrismaClient } = require('@prisma/client');
const { PERMISSIONS, roleHasPermission } = require('../../utils/permissions');

const prisma = new PrismaClient();

class EnhancedTelegramBot {
  constructor(token) {
    // Singleton pattern - prevent multiple instances
    if (EnhancedTelegramBot.instance) {
      return EnhancedTelegramBot.instance;
    }
    
    try {
      this.bot = new TelegramBot(token, { 
        polling: true,
        // Add error handling for polling conflicts
        polling_options: {
          timeout: 10,
          limit: 100,
          retryTimeout: 5000,
          allowed_updates: ['message', 'callback_query', 'inline_query']
        }
      });
      
      // Add error handlers
      this.bot.on('polling_error', (error) => {
        console.error('Telegram Bot polling error:', error.message);
        
        // If it's a conflict error, stop polling and restart after delay
        if (error.code === 'ETELEGRAM' && error.message.includes('409 Conflict')) {
          console.log('🔄 Detected polling conflict, restarting bot...');
          this.restartBot(token);
        }
      });
      
      this.bot.on('error', (error) => {
        console.error('Telegram Bot error:', error);
      });
      
      this.setupCommands();
      this.setupCallbackHandlers();
      this.initializeAdminBot();
      
      // Store the instance
      EnhancedTelegramBot.instance = this;
    } catch (error) {
      console.error('Failed to initialize Telegram Bot:', error);
      throw error;
    }
  }

  initializeAdminBot() {
    // Initialize admin bot functionality
    try {
      const AdminBotSetupService = require('../adminBotSetup');
      this.adminBotSetup = new AdminBotSetupService(this.bot);
      console.log('✅ Admin bot setup service initialized successfully');
      console.log('✅ Predefined admin Chat ID: 7440324107');
    } catch (error) {
      console.error('❌ Failed to initialize admin bot setup:', error);
    }
  }

  setupCommands() {
    // Set default bot commands menu (will be customized per user)
    this.bot.setMyCommands([
      { command: 'start', description: '🚀 Mulai menggunakan bot' },
      { command: 'help', description: '❓ Bantuan penggunaan bot' }
    ]);

    // Welcome message and user identification
    this.bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      const username = msg.from.username || msg.from.first_name;

      try {
        // Check if user already registered (technician or system user)
        const [technician, systemUser, existingRegistration] = await Promise.all([
          prisma.technician.findUnique({
            where: { telegramChatId: chatId.toString() }
          }),
          prisma.user.findUnique({
            where: { telegramChatId: chatId.toString() }
          }),
          prisma.technicianRegistration.findFirst({
            where: { 
              telegramChatId: chatId.toString()
            },
            orderBy: { createdAt: 'desc' }
          })
        ]);

        // Check predefined admin first - Debug logging
        console.log(`🔍 Checking admin for Chat ID: ${chatId}`);
        console.log(`🔍 AdminBotSetup exists: ${!!this.adminBotSetup}`);
        console.log(`🔍 AdminConfig exists: ${!!(this.adminBotSetup && this.adminBotSetup.adminConfig)}`);
        
        if (this.adminBotSetup && this.adminBotSetup.adminConfig) {
          const isAdmin = this.adminBotSetup.adminConfig.isAdmin(chatId);
          console.log(`🔍 Is admin check result: ${isAdmin}`);
          
          if (isAdmin) {
            const adminUser = this.adminBotSetup.adminConfig.getAdminUser(chatId);
            console.log(`✅ Admin user found:`, adminUser);
            await this.sendAdminWelcome(chatId, adminUser);
            return;
          }
        }
        
        if (technician) {
          await this.sendTechnicianWelcome(chatId, technician);
        } else if (systemUser) {
          await this.sendSystemUserWelcome(chatId, systemUser);
        } else if (existingRegistration && existingRegistration.status === 'PENDING') {
          // User has pending registration, show pending message instead of registration form
          await this.bot.sendMessage(chatId, 
            '⏳ <b>Registrasi Sedang Diproses</b>\n\n' +
            'Anda sudah memiliki registrasi yang sedang menunggu persetujuan admin.\n\n' +
            `📱 Nomor: ${existingRegistration.phone || 'Belum diset'}\n\n` +
            'Silakan tunggu konfirmasi dari admin atau hubungi admin untuk informasi lebih lanjut.\n\n' +
            '💡 Jika ingin mengubah nomor telepon, hubungi admin terlebih dahulu.',
            { parse_mode: 'HTML' }
          );
        } else {
          await this.sendInitialRegistrationMessage(chatId, username);
        }
      } catch (error) {
        console.error('Start command error:', error);
        await this.bot.sendMessage(chatId, '❌ Terjadi kesalahan. Silakan coba lagi.');
      }
    });


    // Registration command for technicians
    this.bot.onText(/\/daftar (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const phoneNumber = match[1].trim();
      
      console.log('=== DAFTAR COMMAND DEBUG ===');
      console.log('Message received:', JSON.stringify(msg, null, 2));
      console.log('Match result:', match);
      console.log('ChatId:', chatId);
      console.log('Phone number:', phoneNumber);
      console.log('User info:', JSON.stringify(msg.from, null, 2));

      if (!this.isValidPhoneNumber(phoneNumber)) {
        console.log('Invalid phone number format');
        await this.bot.sendMessage(chatId, 
          '❌ Format nomor telepon tidak valid.\n\n' +
          'Gunakan format: /daftar 08123456789\n' +
          'atau: /daftar +628123456789'
        );
        return;
      }
      
      console.log('Phone number is valid, proceeding with registration...');

      try {
        await this.registerTechnician(chatId, phoneNumber, msg.from);
        console.log('Registration function completed successfully');
      } catch (error) {
        console.error('=== DAFTAR COMMAND ERROR ===');
        console.error('Registration error:', error);
        console.error('Error stack:', error.stack);
        await this.bot.sendMessage(chatId, 
          '❌ Gagal mendaftar. Silakan hubungi admin.\n\n' +
          `Error: ${error.message}`
        );
      }
      console.log('=== END DAFTAR COMMAND DEBUG ===');
    });

    // View available jobs (role-based)
    this.bot.onText(/\/jobs/, async (msg) => {
      const chatId = msg.chat.id;
      try {
        const userRole = await this.getUserRole(chatId);
        if (userRole === 'technician') {
          await this.showAvailableJobs(chatId);
        } else if (userRole && roleHasPermission(userRole, PERMISSIONS.JOBS_VIEW)) {
          await this.showJobsForAdmin(chatId, userRole);
        } else {
          await this.bot.sendMessage(chatId, '❌ Anda tidak memiliki akses untuk melihat jobs.');
        }
      } catch (error) {
        console.error('Jobs command error:', error);
        await this.bot.sendMessage(chatId, '❌ Gagal memuat daftar job.');
      }
    });

    // View my active jobs (technicians only)
    this.bot.onText(/\/myjobs/, async (msg) => {
      const chatId = msg.chat.id;
      try {
        const userRole = await this.getUserRole(chatId);
        if (userRole === 'technician') {
          await this.showMyJobs(chatId);
        } else {
          await this.bot.sendMessage(chatId, '❌ Perintah ini hanya untuk teknisi.');
        }
      } catch (error) {
        console.error('MyJobs command error:', error);
        await this.bot.sendMessage(chatId, '❌ Gagal memuat job Anda.');
      }
    });

    // Take a job (technicians only)
    this.bot.onText(/\/ambil (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const jobNumber = match[1].trim();
      
      try {
        const userRole = await this.getUserRole(chatId);
        if (userRole === 'technician') {
          await this.takeJob(chatId, jobNumber);
        } else {
          await this.bot.sendMessage(chatId, '❌ Perintah ini hanya untuk teknisi.');
        }
      } catch (error) {
        console.error('Take job error:', error);
        await this.bot.sendMessage(chatId, '❌ Gagal mengambil job.');
      }
    });

    // Start working on job
    this.bot.onText(/\/mulai (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const jobNumber = match[1].trim();
      
      try {
        await this.startJob(chatId, jobNumber);
      } catch (error) {
        console.error('Start job error:', error);
        await this.bot.sendMessage(chatId, '❌ Gagal memulai job.');
      }
    });

    // Complete job
    this.bot.onText(/\/selesai (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const jobNumber = match[1].trim();
      
      try {
        await this.completeJobRequest(chatId, jobNumber);
      } catch (error) {
        console.error('Complete job error:', error);
        await this.bot.sendMessage(chatId, '❌ Gagal menyelesaikan job.');
      }
    });

    // Send location
    this.bot.onText(/\/lokasi/, async (msg) => {
      const chatId = msg.chat.id;
      
      await this.bot.sendMessage(chatId, 
        '📍 Silakan kirim lokasi Anda dengan menekan tombol di bawah:', {
          reply_markup: {
            keyboard: [[{
              text: '📍 Kirim Lokasi Saya',
              request_location: true
            }]],
            one_time_keyboard: true,
            resize_keyboard: true
          }
        }
      );
    });

    // Status and statistics (role-based)
    this.bot.onText(/\/status/, async (msg) => {
      const chatId = msg.chat.id;
      try {
        const userRole = await this.getUserRole(chatId);
        if (userRole === 'technician') {
          await this.showTechnicianStatus(chatId);
        } else if (userRole && roleHasPermission(userRole, PERMISSIONS.REPORTS_VIEW)) {
          await this.showSystemStatus(chatId, userRole);
        } else {
          await this.bot.sendMessage(chatId, '❌ Anda tidak memiliki akses untuk melihat status.');
        }
      } catch (error) {
        console.error('Status command error:', error);
        await this.bot.sendMessage(chatId, '❌ Gagal memuat status.');
      }
    });

    // Help command (role-based)
    this.bot.onText(/\/help/, async (msg) => {
      const chatId = msg.chat.id;
      try {
        const userRole = await this.getUserRole(chatId);
        await this.sendRoleBasedHelpMessage(chatId, userRole);
      } catch (error) {
        console.error('Help command error:', error);
        await this.bot.sendMessage(chatId, '❌ Gagal memuat bantuan.');
      }
    });

    // Inventory command (for gudang role)
    this.bot.onText(/\/inventory/, async (msg) => {
      const chatId = msg.chat.id;
      try {
        const userRole = await this.getUserRole(chatId);
        if (userRole && roleHasPermission(userRole, PERMISSIONS.INVENTORY_VIEW)) {
          await this.showInventoryStatus(chatId, userRole);
        } else {
          await this.bot.sendMessage(chatId, '❌ Anda tidak memiliki akses untuk melihat inventory.');
        }
      } catch (error) {
        console.error('Inventory command error:', error);
        await this.bot.sendMessage(chatId, '❌ Gagal memuat inventory.');
      }
    });

    // Reports command (for admin roles)
    this.bot.onText(/\/reports/, async (msg) => {
      const chatId = msg.chat.id;
      try {
        const userRole = await this.getUserRole(chatId);
        if (userRole && roleHasPermission(userRole, PERMISSIONS.REPORTS_VIEW)) {
          await this.showReportsMenu(chatId, userRole);
        } else {
          await this.bot.sendMessage(chatId, '❌ Anda tidak memiliki akses untuk melihat reports.');
        }
      } catch (error) {
        console.error('Reports command error:', error);
        await this.bot.sendMessage(chatId, '❌ Gagal memuat reports.');
      }
    });

    // Menu command (show role-based menu)
    this.bot.onText(/\/menu/, async (msg) => {
      const chatId = msg.chat.id;
      try {
        const userRole = await this.getUserRole(chatId);
        await this.showRoleBasedMenu(chatId, userRole);
      } catch (error) {
        console.error('Menu command error:', error);
        await this.bot.sendMessage(chatId, '❌ Gagal memuat menu.');
      }
    });

    // Broadcast command (admin only)
    this.bot.onText(/\/broadcast (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const message = match[1].trim();
      
      try {
        const userRole = await this.getUserRole(chatId);
        if (userRole === 'superadmin' || userRole === 'admin') {
          await this.processBroadcastMessage(chatId, message);
        } else {
          await this.bot.sendMessage(chatId, '❌ Perintah ini hanya untuk admin.');
        }
      } catch (error) {
        console.error('Broadcast command error:', error);
        await this.bot.sendMessage(chatId, '❌ Gagal mengirim broadcast.');
      }
    });

    // Handle location sharing
    this.bot.on('location', async (msg) => {
      const chatId = msg.chat.id;
      const { latitude, longitude } = msg.location;
      
      try {
        await this.updateTechnicianLocation(chatId, latitude, longitude);
      } catch (error) {
        console.error('Location update error:', error);
        await this.bot.sendMessage(chatId, '❌ Gagal memperbarui lokasi.');
      }
    });

    // Handle photo uploads for job completion
    this.bot.on('photo', async (msg) => {
      const chatId = msg.chat.id;
      
      try {
        await this.handleJobCompletionPhoto(chatId, msg);
      } catch (error) {
        console.error('Photo handling error:', error);
        await this.bot.sendMessage(chatId, '❌ Gagal memproses foto.');
      }
    });

    // Handle contact sharing for technician registration
    this.bot.on('contact', async (msg) => {
      const chatId = msg.chat.id;
      const contact = msg.contact;
      
      try {
        const session = this.getUserSession(chatId);
        
        if (session && session.awaitingContact) {
          // Handle contact sharing for technician registration
          await this.handleContactRegistration(chatId, contact, session.userInfo);
          this.clearUserSession(chatId);
        }
      } catch (error) {
        console.error('Contact handling error:', error);
        await this.bot.sendMessage(chatId, '❌ Gagal memproses kontak. Silakan coba lagi.');
      }
    });

    // Handle text messages for session-based interactions
    this.bot.on('text', async (msg) => {
      const chatId = msg.chat.id;
      const text = msg.text;
      
      // Skip if it's a command (starts with /)
      if (text.startsWith('/')) return;
      
      try {
        const session = this.getUserSession(chatId);
        
        // Handle "Kembali ke Menu" button
        if (text === '🔙 Kembali ke Menu') {
          this.clearUserSession(chatId);
          await this.sendInitialRegistrationMessage(chatId, msg.from.first_name || 'User');
          return;
        }
        
        if (session && session.awaitingPhoneNumber) {
          // Handle phone number input for technician registration (fallback)
          await this.handlePhoneNumberInput(chatId, text, session.userInfo);
          this.clearUserSession(chatId);
        }
      } catch (error) {
        console.error('Text message handling error:', error);
      }
    });
  }

  setupCallbackHandlers() {
    // Handle callback queries for session-based interactions
    this.bot.on('callback_query', async (callbackQuery) => {
      const chatId = callbackQuery.message.chat.id;
      const data = callbackQuery.data;
      
      try {
        // Handle admin setup callbacks first
        if (data.startsWith('admin_setup_') || data === 'admin_status_refresh' || data === 'admin_list_refresh') {
          if (this.adminBotSetup) {
            await this.adminBotSetup.handleSetupCallback(chatId, data, callbackQuery.from);
            await this.bot.answerCallbackQuery(callbackQuery.id);
            return;
          }
        }

        if (data.startsWith('take_job_')) {
          const jobId = data.replace('take_job_', '');
          await this.handleJobTakeCallback(chatId, jobId, callbackQuery.id);
        } else if (data.startsWith('start_job_')) {
          const jobId = data.replace('start_job_', '');
          await this.handleJobStartCallback(chatId, jobId, callbackQuery.id);
        } else if (data.startsWith('complete_job_')) {
          const jobId = data.replace('complete_job_', '');
          await this.handleJobCompleteCallback(chatId, jobId, callbackQuery.id);
        } else if (data === 'technician_menu') {
          await this.showTechnicianMenu(chatId);
        } else if (data === 'dashboard') {
          const userRole = await this.getUserRole(chatId);
          await this.showSystemStatus(chatId, userRole);
        } else if (data.endsWith('_menu')) {
          const userRole = await this.getUserRole(chatId);
          await this.showRoleBasedMenu(chatId, userRole);
        } else if (data === 'admin_jobs') {
          const userRole = await this.getUserRole(chatId);
          await this.showJobsForAdmin(chatId, userRole);
        } else if (data === 'system_status') {
          const userRole = await this.getUserRole(chatId);
          await this.showSystemStatus(chatId, userRole);
        } else if (data === 'inventory_status') {
          const userRole = await this.getUserRole(chatId);
          await this.showInventoryStatus(chatId, userRole);
        } else if (data === 'reports_menu') {
          const userRole = await this.getUserRole(chatId);
          await this.showReportsMenu(chatId, userRole);
        } else if (data === 'help') {
          const userRole = await this.getUserRole(chatId);
          await this.sendRoleBasedHelpMessage(chatId, userRole);
        } else if (data === 'my_status') {
          await this.showTechnicianStatus(chatId);
        } else if (data === 'send_location') {
          await this.bot.sendMessage(chatId, 
            '📍 Silakan kirim lokasi Anda dengan menekan tombol di bawah:', {
              reply_markup: {
                keyboard: [[{
                  text: '📍 Kirim Lokasi Saya',
                  request_location: true
                }]],
                one_time_keyboard: true,
                resize_keyboard: true
              }
            }
          );
        } else if (data === 'view_jobs') {
          const userRole = await this.getUserRole(chatId);
          if (userRole === 'technician') {
            await this.showAvailableJobs(chatId);
          } else {
            await this.showJobsForAdmin(chatId, userRole);
          }
        } else if (data === 'my_jobs') {
          await this.showMyJobs(chatId);
        } else if (data === 'view_jobs_readonly') {
          const userRole = await this.getUserRole(chatId);
          await this.showJobsForAdmin(chatId, userRole);
        } else if (data === 'view_technicians') {
          await this.showTechniciansStatus(chatId);
        } else if (data === 'system_status_readonly') {
          const userRole = await this.getUserRole(chatId);
          await this.showSystemStatus(chatId, userRole);
        } else if (data === 'inventory_reports') {
          await this.showInventoryReports(chatId);
        } else if (data === 'stock_alerts') {
          await this.showStockAlerts(chatId);
        } else if (data === 'register_technician') {
          await this.handleTechnicianRegistrationButton(chatId, callbackQuery.from);
        } else if (data === 'help_registration') {
          await this.handleRegistrationHelp(chatId);
        } else if (data === 'back_to_main') {
          await this.sendInitialRegistrationMessage(chatId, callbackQuery.from.first_name || 'User');
        } else if (data === 'admin_create_job') {
          await this.handleAdminCreateJob(chatId);
        } else if (data === 'admin_job_status') {
          await this.handleAdminJobStatus(chatId);
        } else if (data === 'admin_view_technicians') {
          await this.handleAdminViewTechnicians(chatId);
        } else if (data === 'admin_broadcast_all') {
          await this.handleAdminBroadcastAll(chatId);
        }
      } catch (error) {
        console.error('Callback query error:', error);
        await this.bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Terjadi kesalahan' });
      }
    });
  }

  async sendTechnicianWelcome(chatId, technician) {
    const message = `👋 Selamat datang kembali, <b>${technician.name}</b>!

🔧 Status: ${technician.isActive ? '✅ Aktif' : '❌ Tidak Aktif'}
📱 Telepon: ${technician.phone}

Gunakan /jobs untuk melihat pekerjaan tersedia
Gunakan /myjobs untuk melihat pekerjaan Anda
Gunakan /menu untuk menu lengkap`;

    await this.bot.sendMessage(chatId, message, { 
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📋 Lihat Job Tersedia', callback_data: 'view_jobs' }],
          [{ text: '👤 Job Saya', callback_data: 'my_jobs' }],
          [{ text: '📱 Menu Teknisi', callback_data: 'technician_menu' }]
        ]
      }
    });
  }

  async sendSystemUserWelcome(chatId, user) {
    const roleNames = {
      superadmin: 'Super Admin',
      admin: 'Admin',
      gudang: 'Gudang Admin',
      user: 'User'
    };

    const message = `👋 Selamat datang, <b>${user.username}</b>!\n\n🎭 Role: ${roleNames[user.role] || user.role}`;

    await this.bot.sendMessage(chatId, message, { parse_mode: 'HTML' });

    // Langsung tampilkan menu sesuai role
    if (user.role === 'superadmin' || user.role === 'admin') {
      await this.showAdminMenu(chatId, user.role);
    } else if (user.role === 'gudang') {
      await this.showGudangMenu(chatId);
    } else if (user.role === 'user') {
      await this.showUserMenu(chatId);
    }
  }

  async sendAdminWelcome(chatId, adminUser) {
    const message = `🎛️ <b>Selamat datang, Admin Bot!</b>\n\n` +
      `👤 Username: ${adminUser.username}\n` +
      `🎭 Role: ${adminUser.role}\n` +
      `🆔 Chat ID: <code>${chatId}</code>\n\n` +
      `🚀 Admin bot siap digunakan!`;

    await this.bot.sendMessage(chatId, message, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📊 Dashboard Admin', callback_data: 'admin_dashboard' }],
          [{ text: '🔧 Buat Job', callback_data: 'admin_create_job' }],
          [{ text: '👨‍🔧 Lihat Teknisi', callback_data: 'admin_view_technicians' }],
          [{ text: '❓ Bantuan', callback_data: 'help' }]
        ]
      }
    });
  }

  async sendInitialRegistrationMessage(chatId, username) {
    const message = `🚀 <b>Selamat datang di UNNET Management Bot!</b>

Halo ${username}! Pilih jenis akun Anda:

👨‍🔧 <b>Teknisi:</b>
Daftar sebagai teknisi untuk menerima job

📱 <b>Cara manual:</b>
<code>/daftar [nomor_telepon]</code> - Daftar teknisi`;

    await this.bot.sendMessage(chatId, message, { 
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '👨‍🔧 Daftar Teknisi', callback_data: 'register_technician' }],
          [{ text: '❓ Bantuan', callback_data: 'help_registration' }]
        ]
      }
    });
  }


  async registerTechnician(chatId, phoneNumber, userInfo) {
    console.log('=== REGISTER TECHNICIAN DEBUG ===');
    console.log('ChatId:', chatId);
    console.log('PhoneNumber:', phoneNumber);
    console.log('UserInfo:', JSON.stringify(userInfo, null, 2));
    
    try {
      // Normalize phone number
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
      console.log('Normalized phone:', normalizedPhone);
      
      // Check if there's an existing technician with this phone (including deleted ones)
      console.log('Checking for existing technician...');
      const existingTechnician = await prisma.technician.findFirst({
        where: { phone: normalizedPhone }
      });
      console.log('Existing technician:', existingTechnician ? JSON.stringify(existingTechnician, null, 2) : 'None found');

      if (existingTechnician) {
        console.log('Found existing technician, checking telegram chat ID...');
        // If technician exists and has different telegram chat ID, update it
        if (existingTechnician.telegramChatId !== chatId.toString()) {
          console.log('Updating technician telegram chat ID...');
          await prisma.technician.update({
            where: { id: existingTechnician.id },
            data: {
              telegramChatId: chatId.toString(),
              isActive: true
            }
          });
          console.log('Technician updated successfully');
        } else {
          console.log('Technician already has correct chat ID, just activating...');
          await prisma.technician.update({
            where: { id: existingTechnician.id },
            data: {
              isActive: true
            }
          });
        }

        const message = `✅ <b>Pendaftaran Berhasil!</b>

👤 Nama: <b>${existingTechnician.name}</b>
📱 Telepon: <b>${existingTechnician.phone}</b>
🆔 Chat ID: <code>${chatId}</code>

🎉 Sekarang Anda akan menerima notifikasi pekerjaan baru!

Gunakan /help untuk melihat semua perintah yang tersedia.`;

        await this.bot.sendMessage(chatId, message, { 
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📋 Lihat Job Tersedia', callback_data: 'view_jobs' }],
              [{ text: '❓ Bantuan', callback_data: 'help' }]
            ]
          }
        });
        console.log('Success message sent for existing technician');
        return;
      }

      // Check for existing registrations by both chatId and phone number to prevent duplicates
      console.log('Checking for existing registration...');
      const [existingRegistrationByChatId, existingRegistrationByPhone] = await Promise.all([
        prisma.technicianRegistration.findFirst({
          where: { 
            telegramChatId: chatId.toString()
          },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.technicianRegistration.findFirst({
          where: { 
            phone: normalizedPhone,
            status: 'PENDING'
          },
          orderBy: { createdAt: 'desc' }
        })
      ]);
      
      console.log('Existing registration by chatId:', existingRegistrationByChatId ? JSON.stringify(existingRegistrationByChatId, null, 2) : 'None found');
      console.log('Existing registration by phone:', existingRegistrationByPhone ? JSON.stringify(existingRegistrationByPhone, null, 2) : 'None found');

      // Check if there's already a pending registration with the same phone number from different user
      if (existingRegistrationByPhone && existingRegistrationByPhone.telegramChatId !== chatId.toString()) {
        console.log('Found pending registration with same phone from different user, rejecting...');
        await this.bot.sendMessage(chatId, 
          '❌ <b>Nomor Telepon Sudah Terdaftar</b>\n\n' +
          `Nomor telepon ${normalizedPhone} sudah memiliki registrasi yang sedang diproses oleh pengguna lain.\n\n` +
          'Silakan gunakan nomor telepon yang berbeda atau hubungi admin jika ini adalah kesalahan.',
          { parse_mode: 'HTML' }
        );
        return;
      }

      // Handle existing registration by same chatId
      if (existingRegistrationByChatId) {
        if (existingRegistrationByChatId.status === 'PENDING') {
          console.log('Found pending registration, sending pending message...');
          await this.bot.sendMessage(chatId, 
            '⏳ <b>Registrasi Sedang Diproses</b>\n\n' +
            'Anda sudah memiliki registrasi yang sedang menunggu persetujuan admin.\n\n' +
            `📱 Nomor: ${existingRegistrationByChatId.phone || 'Belum diset'}\n\n` +
            'Silakan tunggu konfirmasi dari admin atau hubungi admin untuk informasi lebih lanjut.\n\n' +
            '💡 Jika ingin mengubah nomor telepon, hubungi admin terlebih dahulu.',
            { parse_mode: 'HTML' }
          );
          return;
        } else if (existingRegistrationByChatId.status === 'REJECTED') {
          console.log('Found rejected registration, updating for re-registration...');
          // Allow re-registration by updating the existing registration
          await prisma.technicianRegistration.update({
            where: { id: existingRegistrationByChatId.id },
            data: {
              firstName: userInfo.first_name,
              lastName: userInfo.last_name || null,
              phone: normalizedPhone,
              status: 'PENDING',
              approvedAt: null,
              approvedById: null,
              rejectedAt: null,
              rejectedById: null,
              rejectionReason: null,
              updatedAt: new Date()
            }
          });

          await this.bot.sendMessage(chatId, 
            '✅ <b>Registrasi Ulang Berhasil!</b>\n\n' +
            '📝 Registrasi Anda telah diperbarui dan dikirim ulang untuk review admin.\n\n' +
            `📱 Nomor: ${normalizedPhone}\n\n` +
            '⏳ Silakan tunggu konfirmasi dari admin.\n\n' +
            'Terima kasih atas kesabaran Anda!',
            { parse_mode: 'HTML' }
          );
          console.log('Re-registration success message sent');
          return;
        }
      }

      // Create new registration for new users
      console.log('Creating new registration...');
      const newRegistration = await prisma.technicianRegistration.create({
        data: {
          telegramChatId: chatId.toString(),
          telegramUsername: userInfo.username || null,
          firstName: userInfo.first_name,
          lastName: userInfo.last_name || null,
          phone: normalizedPhone,
          status: 'PENDING'
        }
      });
      console.log('New registration created:', JSON.stringify(newRegistration, null, 2));

      await this.bot.sendMessage(chatId, 
        '✅ <b>Registrasi Berhasil Dikirim!</b>\n\n' +
        '📝 Data registrasi Anda telah dikirim ke admin untuk review.\n\n' +
        '⏳ Silakan tunggu konfirmasi dari admin.\n\n' +
        'Anda akan mendapat notifikasi jika registrasi disetujui atau ditolak.',
        { parse_mode: 'HTML' }
      );
      console.log('New registration success message sent');
      
    } catch (error) {
      console.error('=== REGISTRATION ERROR ===');
      console.error('Error details:', error);
      console.error('Error stack:', error.stack);
      
      await this.bot.sendMessage(chatId, 
        '❌ Terjadi kesalahan saat memproses registrasi.\n\n' +
        `Error: ${error.message}\n\n` +
        'Silakan coba lagi atau hubungi admin.',
        { parse_mode: 'HTML' }
      );
    }
    console.log('=== END REGISTER TECHNICIAN DEBUG ===');
  }

  async showAvailableJobs(chatId) {
    const jobs = await prisma.job.findMany({
      where: {
        status: 'OPEN',
        approvalStatus: 'APPROVED' // Only show approved jobs
      },
      include: {
        customer: true,
        technicians: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    if (jobs.length === 0) {
      await this.bot.sendMessage(chatId, 
        '📋 <b>Tidak ada pekerjaan tersedia saat ini</b>\n\n' +
        'Semua pekerjaan sudah diambil atau belum ada pekerjaan baru.\n\n' +
        'Gunakan /myjobs untuk melihat pekerjaan Anda yang aktif.',
        { parse_mode: 'HTML' }
      );
      return;
    }

    let message = `📋 <b>Pekerjaan Tersedia (${jobs.length})</b>\n\n`;

    jobs.forEach((job, index) => {
      const assignedCount = job.technicians.length;
      const maxTechnicians = 2;
      const slotsLeft = maxTechnicians - assignedCount;

      message += `${index + 1}. <b>${job.jobNumber}</b>\n`;
      message += `   👤 ${job.customer.name}\n`;
      message += `   📍 ${job.address}\n`;
      message += `   🔧 ${job.type === 'INSTALLATION' ? 'Pemasangan' : 'Perbaikan'}\n`;
      message += `   👥 Slot: ${slotsLeft}/${maxTechnicians} tersisa\n`;
      message += `   📅 ${new Date(job.createdAt).toLocaleDateString('id-ID')}\n\n`;
    });

    message += `💡 <b>Cara mengambil job:</b>\n`;
    message += `Ketik: <code>/ambil [nomor_job]</code>\n`;
    message += `Contoh: <code>/ambil ${jobs[0].jobNumber}</code>`;

    await this.bot.sendMessage(chatId, message, { 
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: jobs.slice(0, 5).map(job => [{
          text: `✋ Ambil ${job.jobNumber}`,
          callback_data: `take_job_${job.id}`
        }])
      }
    });
  }

  // Get user role from database
  async getUserRole(chatId) {
    try {
      // Check predefined admin first
      if (this.adminBotSetup && this.adminBotSetup.adminConfig) {
        const adminUser = this.adminBotSetup.adminConfig.getAdminUser(chatId);
        if (adminUser) {
          return adminUser.role;
        }
      }

      const [technician, systemUser] = await Promise.all([
        prisma.technician.findUnique({
          where: { telegramChatId: chatId.toString() }
        }),
        prisma.user.findUnique({
          where: { telegramChatId: chatId.toString() }
        })
      ]);

      if (technician) return 'technician';
      if (systemUser) return systemUser.role;
      return null;
    } catch (error) {
      console.error('Get user role error:', error);
      return null;
    }
  }

  // Login system user
  async loginSystemUser(chatId, username, password, userInfo) {
    try {
      console.log('=== LOGIN SYSTEM USER DEBUG ===');
      console.log('ChatId:', chatId);
      console.log('Username:', username);
      console.log('UserInfo:', JSON.stringify(userInfo, null, 2));
      
      const bcrypt = require('bcrypt');
      
      // Find user by email (username is stored as email in User model)
      const user = await prisma.user.findUnique({
        where: { email: username }
      });

      console.log('User found:', user ? 'Yes' : 'No');
      if (user) {
        console.log('User role:', user.role);
        console.log('User telegramChatId:', user.telegramChatId);
      }

      if (!user) {
        await this.bot.sendMessage(chatId, '❌ Username tidak ditemukan.');
        return;
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      console.log('Password valid:', isValidPassword);
      
      if (!isValidPassword) {
        await this.bot.sendMessage(chatId, '❌ Password salah.');
        return;
      }

      // Check if already linked to another Telegram account
      if (user.telegramChatId && user.telegramChatId !== chatId.toString()) {
        console.log('Already linked to different Telegram account');
        await this.bot.sendMessage(chatId, 
          '❌ Akun ini sudah terhubung dengan Telegram lain.\n\n' +
          'Silakan hubungi admin untuk reset koneksi.'
        );
        return;
      }

      // Update user with Telegram info
      await prisma.user.update({
        where: { id: user.id },
        data: {
          telegramChatId: chatId.toString(),
          lastLogin: new Date()
        }
      });

      console.log('Login successful, sending welcome message');
      await this.sendSystemUserWelcome(chatId, user);
      
    } catch (error) {
      console.error('Login system user error:', error);
      await this.bot.sendMessage(chatId, '❌ Terjadi kesalahan saat login: ' + error.message);
    }
  }

  // Role-based help message
  async sendRoleBasedHelpMessage(chatId, userRole) {
    let message = `❓ <b>Bantuan UNNET Management Bot</b>\n\n`;

    if (userRole === 'technician') {
      message += `🔧 <b>Menu Teknisi:</b>\n`;
      message += `/start - Mulai menggunakan bot\n`;
      message += `/jobs - Lihat pekerjaan tersedia\n`;
      message += `/myjobs - Job saya yang aktif\n`;
      message += `/ambil [nomor] - Ambil pekerjaan\n`;
      message += `/mulai [nomor] - Mulai mengerjakan\n`;
      message += `/selesai [nomor] - Selesaikan job\n`;
      message += `/lokasi - Kirim lokasi\n`;
      message += `/status - Status dan statistik\n`;
      message += `/menu - Menu teknisi\n\n`;
      message += `💡 <b>Tips:</b>\n`;
      message += `• Selalu kirim foto saat selesai\n`;
      message += `• Update lokasi berkala\n`;
      message += `• Respon cepat untuk lebih banyak job`;
    } else if (userRole === 'superadmin' || userRole === 'admin') {
      message += `👨‍💼 <b>Menu Admin:</b>\n`;
      message += `/start - Mulai menggunakan bot\n`;
      message += `/jobs - Lihat semua jobs\n`;
      message += `/status - Status sistem\n`;
      message += `/reports - Laporan\n`;
      message += `/inventory - Status inventory\n`;
      message += `/menu - Menu admin\n\n`;
      message += `📊 <b>Fitur Admin:</b>\n`;
      message += `• Monitor semua jobs\n`;
      message += `• Lihat laporan real-time\n`;
      message += `• Kelola inventory\n`;
      message += `• Broadcast ke teknisi`;
    } else if (userRole === 'gudang') {
      message += `📦 <b>Menu Gudang:</b>\n`;
      message += `/start - Mulai menggunakan bot\n`;
      message += `/inventory - Status inventory\n`;
      message += `/reports - Laporan inventory\n`;
      message += `/status - Status gudang\n`;
      message += `/menu - Menu gudang\n\n`;
      message += `📊 <b>Fitur Gudang:</b>\n`;
      message += `• Monitor stock barang\n`;
      message += `• Laporan inventory\n`;
      message += `• Alert stock minimum`;
    } else if (userRole === 'user') {
      message += `👤 <b>Menu User:</b>\n`;
      message += `/start - Mulai menggunakan bot\n`;
      message += `/jobs - Lihat jobs (view only)\n`;
      message += `/status - Status sistem\n`;
      message += `/menu - Menu user\n\n`;
      message += `👁️ <b>Akses View-Only:</b>\n`;
      message += `• Lihat daftar jobs\n`;
      message += `• Monitor teknisi\n`;
      message += `• Laporan basic`;
    } else {
      message += `🚀 <b>Perintah Umum:</b>\n`;
      message += `/start - Mulai menggunakan bot\n`;
      message += `/daftar [nomor] - Daftar teknisi\n`;
      message += `/help - Bantuan ini\n\n`;
      message += `💡 Silakan daftar sebagai teknisi terlebih dahulu.`;
    }

    await this.bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
  }

  // Show role-based menu
  async showRoleBasedMenu(chatId, userRole) {
    if (userRole === 'technician') {
      await this.showTechnicianMenu(chatId);
    } else if (userRole === 'superadmin' || userRole === 'admin') {
      await this.showAdminMenu(chatId, userRole);
    } else if (userRole === 'gudang') {
      await this.showGudangMenu(chatId);
    } else if (userRole === 'user') {
      await this.showUserMenu(chatId);
    } else {
      await this.bot.sendMessage(chatId, 
        '❌ Anda belum terdaftar. Gunakan /daftar [nomor_telepon] untuk mendaftar sebagai teknisi'
      );
    }
  }

  async showTechnicianMenu(chatId) {
    const message = `🔧 <b>Menu Teknisi</b>\n\nPilih menu yang ingin Anda akses:`;
    
    await this.bot.sendMessage(chatId, message, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📋 Job Tersedia', callback_data: 'view_jobs' }],
          [{ text: '👤 Job Saya', callback_data: 'my_jobs' }],
          [{ text: '📍 Kirim Lokasi', callback_data: 'send_location' }],
          [{ text: '📊 Status Saya', callback_data: 'my_status' }],
          [{ text: '❓ Bantuan', callback_data: 'help' }]
        ]
      }
    });
  }

  async showAdminMenu(chatId, role) {
    const message = `👨‍💼 <b>Menu ${role === 'superadmin' ? 'Super Admin' : 'Admin'}</b>\n\nPilih menu yang ingin Anda akses:`;
    
    const keyboard = [
      [{ text: '➕ Buat Pekerjaan', callback_data: 'admin_create_job' }],
      [{ text: '📊 Lihat Status Pekerjaan', callback_data: 'admin_job_status' }],
      [{ text: '👥 Lihat Teknisi', callback_data: 'admin_view_technicians' }],
      [{ text: '📢 Broadcast ke Semua Teknisi', callback_data: 'admin_broadcast_all' }],
      [{ text: '❓ Bantuan', callback_data: 'help' }]
    ];

    await this.bot.sendMessage(chatId, message, {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard }
    });
  }

  async showGudangMenu(chatId) {
    const message = `📦 <b>Menu Gudang Admin</b>\n\nPilih menu yang ingin Anda akses:`;
    
    await this.bot.sendMessage(chatId, message, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📦 Status Inventory', callback_data: 'inventory_status' }],
          [{ text: '📊 Laporan Stock', callback_data: 'inventory_reports' }],
          [{ text: '⚠️ Alert Stock', callback_data: 'stock_alerts' }],
          [{ text: '❓ Bantuan', callback_data: 'help' }]
        ]
      }
    });
  }

  async showUserMenu(chatId) {
    const message = `👤 <b>Menu User</b>\n\nPilih menu yang ingin Anda akses:`;
    
    await this.bot.sendMessage(chatId, message, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📋 Lihat Jobs', callback_data: 'view_jobs_readonly' }],
          [{ text: '👥 Teknisi', callback_data: 'view_technicians' }],
          [{ text: '📊 Status Sistem', callback_data: 'system_status_readonly' }],
          [{ text: '❓ Bantuan', callback_data: 'help' }]
        ]
      }
    });
  }

  // Utility methods
  isValidPhoneNumber(phone) {
    const phoneRegex = /^(\+62|62|0)[0-9]{9,13}$/;
    return phoneRegex.test(phone.replace(/\s+/g, ''));
  }

  normalizePhoneNumber(phone) {
    let normalized = phone.replace(/\s+/g, '');
    if (normalized.startsWith('+62')) {
      normalized = '0' + normalized.substring(3);
    } else if (normalized.startsWith('62')) {
      normalized = '0' + normalized.substring(2);
    }
    return normalized;
  }

  // Show jobs for admin users
  async showJobsForAdmin(chatId, userRole) {
    try {
      const jobs = await prisma.job.findMany({
        where: {
          status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] }
        },
        include: {
          customer: true,
          technicians: {
            include: { technician: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      if (jobs.length === 0) {
        await this.bot.sendMessage(chatId, 
          '📋 <b>Tidak ada job aktif saat ini</b>',
          { parse_mode: 'HTML' }
        );
        return;
      }

      let message = `📋 <b>Semua Jobs Aktif (${jobs.length})</b>\n\n`;

      jobs.forEach((job, index) => {
        const assignedTechs = job.technicians.map(jt => jt.technician.name).join(', ') || 'Belum ada';
        const statusEmoji = {
          'OPEN': '🟡',
          'ASSIGNED': '🔵', 
          'IN_PROGRESS': '🟢'
        };

        message += `${index + 1}. ${statusEmoji[job.status]} <b>${job.jobNumber}</b>\n`;
        message += `   👤 ${job.customer.name}\n`;
        message += `   📍 ${job.address}\n`;
        message += `   🔧 ${job.type === 'INSTALLATION' ? 'Pemasangan' : 'Perbaikan'}\n`;
        message += `   👥 Teknisi: ${assignedTechs}\n`;
        message += `   📅 ${new Date(job.createdAt).toLocaleDateString('id-ID')}\n\n`;
      });

      await this.bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
    } catch (error) {
      console.error('Show jobs for admin error:', error);
      await this.bot.sendMessage(chatId, '❌ Gagal memuat jobs.');
    }
  }

  // Show system status for admin users
  async showSystemStatus(chatId, userRole) {
    try {
      const [totalJobs, openJobs, inProgressJobs, completedToday, activeTechnicians, totalCustomers] = await Promise.all([
        prisma.job.count(),
        prisma.job.count({ where: { status: 'OPEN' } }),
        prisma.job.count({ where: { status: 'IN_PROGRESS' } }),
        prisma.job.count({ 
          where: { 
            status: 'COMPLETED',
            completedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }
          } 
        }),
        prisma.technician.count({ where: { isActive: true } }),
        prisma.customer.count()
      ]);

      const message = `📊 <b>Status Sistem UNNET</b>\n\n` +
        `📋 <b>Jobs:</b>\n` +
        `• Total: ${totalJobs}\n` +
        `• Terbuka: ${openJobs}\n` +
        `• Sedang Dikerjakan: ${inProgressJobs}\n` +
        `• Selesai Hari Ini: ${completedToday}\n\n` +
        `👥 <b>Teknisi Aktif:</b> ${activeTechnicians}\n` +
        `👤 <b>Total Pelanggan:</b> ${totalCustomers}\n\n` +
        `⏰ Update: ${new Date().toLocaleString('id-ID')}`;

      await this.bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
    } catch (error) {
      console.error('Show system status error:', error);
      await this.bot.sendMessage(chatId, '❌ Gagal memuat status sistem.');
    }
  }

  // Show inventory status
  async showInventoryStatus(chatId, userRole) {
    try {
      const inventoryItems = await prisma.inventoryItem.findMany({
        orderBy: { name: 'asc' },
        take: 10
      });

      if (inventoryItems.length === 0) {
        await this.bot.sendMessage(chatId, 
          '📦 <b>Tidak ada item inventory</b>',
          { parse_mode: 'HTML' }
        );
        return;
      }

      let message = `📦 <b>Status Inventory</b>\n\n`;

      inventoryItems.forEach((item, index) => {
        const stockStatus = item.quantity <= item.minimumStock ? '⚠️' : '✅';
        message += `${index + 1}. ${stockStatus} <b>${item.name}</b>\n`;
        message += `   📊 Stock: ${item.quantity} ${item.unit}\n`;
        message += `   📉 Minimum: ${item.minimumStock}\n`;
        if (item.quantity <= item.minimumStock) {
          message += `   🚨 <b>PERLU RESTOCK!</b>\n`;
        }
        message += `\n`;
      });

      const lowStockCount = inventoryItems.filter(item => item.quantity <= item.minimumStock).length;
      message += `⚠️ <b>Item dengan stock rendah:</b> ${lowStockCount}`;

      await this.bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
    } catch (error) {
      console.error('Show inventory status error:', error);
      await this.bot.sendMessage(chatId, '❌ Gagal memuat status inventory.');
    }
  }

  // Show reports menu
  async showReportsMenu(chatId, userRole) {
    const message = `📈 <b>Menu Reports</b>\n\nPilih jenis laporan:`;
    
    const keyboard = [
      [{ text: '📊 Laporan Harian', callback_data: 'report_daily' }],
      [{ text: '📈 Laporan Mingguan', callback_data: 'report_weekly' }],
      [{ text: '📋 Laporan Jobs', callback_data: 'report_jobs' }]
    ];

    if (userRole && roleHasPermission(userRole, PERMISSIONS.INVENTORY_VIEW)) {
      keyboard.push([{ text: '📦 Laporan Inventory', callback_data: 'report_inventory' }]);
    }

    await this.bot.sendMessage(chatId, message, {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard }
    });
  }

  // Show technicians status for admin users
  async showTechniciansStatus(chatId) {
    try {
      const technicians = await prisma.technician.findMany({
        orderBy: { name: 'asc' },
        take: 10
      });

      if (technicians.length === 0) {
        await this.bot.sendMessage(chatId, 
          '👥 <b>Tidak ada teknisi terdaftar</b>',
          { parse_mode: 'HTML' }
        );
        return;
      }

      let message = `👥 <b>Status Teknisi (${technicians.length})</b>\n\n`;

      technicians.forEach((tech, index) => {
        const statusIcon = tech.isActive ? '✅' : '❌';
        const availableIcon = tech.isAvailable ? '🟢' : '🔴';
        const telegramStatus = tech.telegramChatId ? '📱' : '❌';
        
        message += `${index + 1}. ${statusIcon} <b>${tech.name}</b>\n`;
        message += `   📱 ${tech.phone}\n`;
        message += `   ${availableIcon} ${tech.isAvailable ? 'Tersedia' : 'Sibuk'}\n`;
        message += `   ${telegramStatus} ${tech.telegramChatId ? 'Telegram OK' : 'Belum terhubung'}\n`;
        if (tech.lastLocationUpdate) {
          message += `   📍 Update lokasi: ${new Date(tech.lastLocationUpdate).toLocaleString('id-ID')}\n`;
        }
        message += `\n`;
      });

      const activeCount = technicians.filter(t => t.isActive).length;
      const telegramCount = technicians.filter(t => t.telegramChatId).length;
      message += `📊 <b>Ringkasan:</b>\n`;
      message += `• Aktif: ${activeCount}/${technicians.length}\n`;
      message += `• Terhubung Telegram: ${telegramCount}/${technicians.length}`;

      await this.bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
    } catch (error) {
      console.error('Show technicians status error:', error);
      await this.bot.sendMessage(chatId, '❌ Gagal memuat status teknisi.');
    }
  }

  // Show inventory reports for gudang role
  async showInventoryReports(chatId) {
    try {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      
      const [totalItems, allItems, monthlyTransactions] = await Promise.all([
        prisma.item.count({ where: { isActive: true } }),
        prisma.item.findMany({
          where: { isActive: true },
          select: { currentStock: true, minStock: true }
        }),
        prisma.inventoryLog.count({
          where: {
            createdAt: { gte: startOfMonth }
          }
        })
      ]);

      // Count low stock items safely
      const lowStockItems = allItems.filter(item => item.currentStock <= item.minStock).length;

      const message = `📈 <b>Laporan Inventory</b>\n\n` +
        `📦 <b>Total Item:</b> ${totalItems}\n` +
        `⚠️ <b>Stock Rendah:</b> ${lowStockItems}\n` +
        `📄 <b>Transaksi Bulan Ini:</b> ${monthlyTransactions}\n\n` +
        `📅 <b>Periode:</b> ${startOfMonth.toLocaleDateString('id-ID')} - ${today.toLocaleDateString('id-ID')}`;

      await this.bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
    } catch (error) {
      console.error('Show inventory reports error:', error);
      await this.bot.sendMessage(chatId, '❌ Gagal memuat laporan inventory.');
    }
  }

  // Show stock alerts for gudang role
  async showStockAlerts(chatId) {
    try {
      const allItems = await prisma.item.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' }
      });

      // Filter low stock items safely
      const lowStockItems = allItems.filter(item => item.currentStock <= item.minStock);

      if (lowStockItems.length === 0) {
        await this.bot.sendMessage(chatId, 
          '✅ <b>Semua item memiliki stock yang cukup</b>',
          { parse_mode: 'HTML' }
        );
        return;
      }

      let message = `⚠️ <b>Alert Stock Rendah (${lowStockItems.length})</b>\n\n`;

      lowStockItems.forEach((item, index) => {
        const urgency = item.currentStock === 0 ? '🚨' : '⚠️';
        message += `${index + 1}. ${urgency} <b>${item.name}</b>\n`;
        message += `   📊 Stock: ${item.currentStock} ${item.unit}\n`;
        message += `   📉 Minimum: ${item.minStock}\n`;
        if (item.currentStock === 0) {
          message += `   🚨 <b>HABIS!</b>\n`;
        }
        message += `\n`;
      });

      message += `📝 <b>Tindakan:</b> Segera lakukan restock untuk item di atas.`;

      await this.bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
    } catch (error) {
      console.error('Show stock alerts error:', error);
      await this.bot.sendMessage(chatId, '❌ Gagal memuat alert stock.');
    }
  }

  // Show technician's active jobs
  async showMyJobs(chatId) {
    try {
      const technician = await prisma.technician.findFirst({
        where: { telegramChatId: chatId.toString() }
      });

      if (!technician) {
        await this.bot.sendMessage(chatId, '❌ Anda belum terdaftar sebagai teknisi.');
        return;
      }

      const activeJobs = await prisma.jobTechnician.findMany({
        where: {
          technicianId: technician.id,
          job: {
            status: {
              in: ['ASSIGNED', 'IN_PROGRESS']
            }
          }
        },
        include: {
          job: {
            include: {
              customer: true,
              technicians: {
                include: { technician: true }
              }
            }
          }
        },
        orderBy: { acceptedAt: 'desc' }
      });

      if (activeJobs.length === 0) {
        await this.bot.sendMessage(chatId, 
          '📋 <b>Tidak ada job aktif</b>\n\n' +
          'Gunakan /jobs untuk melihat job yang tersedia.',
          { parse_mode: 'HTML' }
        );
        return;
      }

      let message = `📋 <b>Job Aktif Anda (${activeJobs.length})</b>\n\n`;

      activeJobs.forEach((assignment, index) => {
        const job = assignment.job;
        const teamMembers = job.technicians.map(jt => jt.technician.name).join(', ');
        
        message += `${index + 1}. <b>${job.jobNumber}</b>\n`;
        message += `   👤 ${job.customer.name}\n`;
        message += `   📍 ${job.address}\n`;
        message += `   🔧 ${job.type === 'INSTALLATION' ? 'Pemasangan' : 'Perbaikan'}\n`;
        message += `   👥 Tim: ${teamMembers}\n`;
        message += `   📅 ${new Date(assignment.acceptedAt).toLocaleDateString('id-ID')}\n\n`;
      });

      message += `💡 <b>Cara menyelesaikan job:</b>\n`;
      message += `Ketik: <code>/selesai [nomor_job]</code>\n`;
      message += `Contoh: <code>/selesai ${activeJobs[0].job.jobNumber}</code>`;

      await this.bot.sendMessage(chatId, message, { 
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: activeJobs.slice(0, 3).map(assignment => [{
            text: `✅ Selesai ${assignment.job.jobNumber}`,
            callback_data: `complete_job_${assignment.job.id}`
          }])
        }
      });
    } catch (error) {
      console.error('Show my jobs error:', error);
      await this.bot.sendMessage(chatId, '❌ Gagal memuat job Anda.');
    }
  }

  // Take a job by job number
  async takeJob(chatId, jobNumber) {
    try {
      const technician = await prisma.technician.findFirst({
        where: { telegramChatId: chatId.toString() }
      });

      if (!technician) {
        await this.bot.sendMessage(chatId, '❌ Anda belum terdaftar sebagai teknisi.');
        return;
      }

      const job = await prisma.job.findFirst({
        where: { 
          jobNumber: jobNumber.toUpperCase(),
          status: { in: ['OPEN', 'ASSIGNED'] }
        },
        include: {
          customer: true,
          technicians: true
        }
      });

      if (!job) {
        await this.bot.sendMessage(chatId, `❌ Job ${jobNumber} tidak ditemukan atau sudah tidak tersedia.`);
        return;
      }

      // Check if already assigned
      const existingAssignment = job.technicians.find(jt => jt.technicianId === technician.id);
      if (existingAssignment) {
        await this.bot.sendMessage(chatId, `✅ Anda sudah mengambil job ${job.jobNumber}.`);
        return;
      }

      // Check technician limit
      if (job.technicians.length >= 2) {
        await this.bot.sendMessage(chatId, `❌ Job ${job.jobNumber} sudah diambil oleh 2 teknisi. Coba job lain.`);
        return;
      }

      // Assign technician
      await prisma.jobTechnician.create({
        data: {
          jobId: job.id,
          technicianId: technician.id,
          acceptedAt: new Date()
        }
      });

      // Update job status
      if (job.technicians.length === 0) {
        await prisma.job.update({
          where: { id: job.id },
          data: { status: 'ASSIGNED' }
        });
      }

      const confirmMessage = `✅ <b>Job ${job.jobNumber} berhasil diambil!</b>\n\n` +
        `👤 Pelanggan: <b>${job.customer.name}</b>\n` +
        `📞 Telepon: <code>${job.customer.phone}</code>\n` +
        `📍 Alamat: <b>${job.address}</b>\n` +
        `📝 Deskripsi: ${job.description || '-'}\n\n` +
        `📋 <b>Langkah selanjutnya:</b>\n` +
        `1. Hubungi pelanggan\n` +
        `2. Koordinasi dengan teknisi lain (jika ada)\n` +
        `3. Selesaikan job bersama tim`;

      await this.bot.sendMessage(chatId, confirmMessage, { parse_mode: 'HTML' });
    } catch (error) {
      console.error('Take job error:', error);
      await this.bot.sendMessage(chatId, '❌ Gagal mengambil job.');
    }
  }

  // Start working on a job
  async startJob(chatId, jobNumber) {
    try {
      const technician = await prisma.technician.findFirst({
        where: { telegramChatId: chatId.toString() }
      });

      if (!technician) {
        await this.bot.sendMessage(chatId, '❌ Anda belum terdaftar sebagai teknisi.');
        return;
      }

      const jobAssignment = await prisma.jobTechnician.findFirst({
        where: {
          technicianId: technician.id,
          job: {
            jobNumber: jobNumber.toUpperCase(),
            status: 'ASSIGNED'
          }
        },
        include: {
          job: {
            include: { customer: true }
          }
        }
      });

      if (!jobAssignment) {
        await this.bot.sendMessage(chatId, `❌ Job ${jobNumber} tidak ditemukan atau Anda tidak ditugaskan untuk job ini.`);
        return;
      }

      // Update job status to IN_PROGRESS
      await prisma.job.update({
        where: { id: jobAssignment.job.id },
        data: { status: 'IN_PROGRESS' }
      });

      // Update assignment start time
      await prisma.jobTechnician.update({
        where: { id: jobAssignment.id },
        data: { startedAt: new Date() }
      });

      const message = `▶️ <b>Job ${jobAssignment.job.jobNumber} dimulai!</b>\n\n` +
        `👤 Pelanggan: <b>${jobAssignment.job.customer.name}</b>\n` +
        `📍 Lokasi: <b>${jobAssignment.job.address}</b>\n\n` +
        `⏰ Mulai: ${new Date().toLocaleString('id-ID')}\n\n` +
        `📸 Jangan lupa kirim foto progress dan hasil akhir!`;

      await this.bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
    } catch (error) {
      console.error('Start job error:', error);
      await this.bot.sendMessage(chatId, '❌ Gagal memulai job.');
    }
  }

  // Request job completion (requires photo)
  async completeJobRequest(chatId, jobNumber) {
    try {
      const technician = await prisma.technician.findFirst({
        where: { telegramChatId: chatId.toString() }
      });

      if (!technician) {
        await this.bot.sendMessage(chatId, '❌ Anda belum terdaftar sebagai teknisi.');
        return;
      }

      const jobAssignment = await prisma.jobTechnician.findFirst({
        where: {
          technicianId: technician.id,
          job: {
            jobNumber: jobNumber.toUpperCase(),
            status: { in: ['ASSIGNED', 'IN_PROGRESS'] }
          }
        },
        include: {
          job: {
            include: {
              customer: true,
              technicians: {
                include: { technician: true }
              }
            }
          }
        }
      });

      if (!jobAssignment) {
        await this.bot.sendMessage(chatId, `❌ Job ${jobNumber} tidak ditemukan atau Anda tidak ditugaskan untuk job ini.`);
        return;
      }

      // Check if job has 2 technicians assigned
      const assignedTechnicians = jobAssignment.job.technicians.length;
      if (assignedTechnicians < 2) {
        const message = `⚠️ <b>Job belum bisa diselesaikan</b>\n\n` +
          `📋 Job: <b>${jobAssignment.job.jobNumber}</b>\n` +
          `👥 Teknisi saat ini: ${assignedTechnicians}/2\n` +
          `🔄 Menunggu ${2 - assignedTechnicians} teknisi lagi\n\n` +
          `💡 Job hanya bisa diselesaikan setelah 2 teknisi ditugaskan.`;
        
        await this.bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
        return;
      }

      const message = `📸 <b>Untuk menyelesaikan job ${jobAssignment.job.jobNumber}</b>\n\n` +
        `Silakan kirim foto hasil pekerjaan sebagai dokumentasi.\n\n` +
        `📋 <b>Yang perlu difoto:</b>\n` +
        `• Hasil instalasi/perbaikan\n` +
        `• Perangkat yang dipasang\n` +
        `• Area kerja yang rapi\n\n` +
        `⚡ Kirim foto sekarang untuk menyelesaikan job!`;

      await this.bot.sendMessage(chatId, message, { 
        parse_mode: 'HTML',
        reply_markup: {
          keyboard: [[{
            text: '📸 Kirim Foto Selesai',
            request_photo: true
          }]],
          one_time_keyboard: true,
          resize_keyboard: true
        }
      });
    } catch (error) {
      console.error('Complete job request error:', error);
      await this.bot.sendMessage(chatId, '❌ Gagal memproses permintaan penyelesaian job.');
    }
  }

  // Update technician location
  async updateTechnicianLocation(chatId, latitude, longitude) {
    try {
      const technician = await prisma.technician.findFirst({
        where: { telegramChatId: chatId.toString() }
      });

      if (!technician) {
        await this.bot.sendMessage(chatId, '❌ Anda belum terdaftar sebagai teknisi.');
        return;
      }

      // Update technician location
      await prisma.technician.update({
        where: { id: technician.id },
        data: {
          currentLatitude: latitude,
          currentLongitude: longitude,
          lastLocationUpdate: new Date()
        }
      });

      const message = `📍 <b>Lokasi berhasil diperbarui!</b>\n\n` +
        `🗺️ Koordinat: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}\n` +
        `⏰ Waktu: ${new Date().toLocaleString('id-ID')}\n\n` +
        `✅ Admin dapat melihat lokasi Anda untuk koordinasi job.`;

      await this.bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
    } catch (error) {
      console.error('Update location error:', error);
      await this.bot.sendMessage(chatId, '❌ Gagal memperbarui lokasi.');
    }
  }

  // Handle job completion photo
  async handleJobCompletionPhoto(chatId, msg) {
    try {
      const technician = await prisma.technician.findFirst({
        where: { telegramChatId: chatId.toString() }
      });

      if (!technician) {
        await this.bot.sendMessage(chatId, '❌ Anda belum terdaftar sebagai teknisi.');
        return;
      }

      // Get technician's active jobs
      const activeJobs = await prisma.jobTechnician.findMany({
        where: {
          technicianId: technician.id,
          job: {
            status: { in: ['ASSIGNED', 'IN_PROGRESS'] }
          }
        },
        include: {
          job: {
            include: { customer: true }
          }
        }
      });

      if (activeJobs.length === 0) {
        await this.bot.sendMessage(chatId, '❌ Anda tidak memiliki job aktif untuk diselesaikan.');
        return;
      }

      if (activeJobs.length === 1) {
        // Auto-complete the only active job
        await this.completeJobWithPhoto(chatId, activeJobs[0], msg);
      } else {
        // Ask which job to complete
        const keyboard = activeJobs.map(assignment => [{
          text: `✅ ${assignment.job.jobNumber} - ${assignment.job.customer.name}`,
          callback_data: `complete_job_${assignment.job.id}`
        }]);

        await this.bot.sendMessage(chatId, 
          '📸 <b>Foto diterima!</b>\n\n' +
          'Pilih job yang ingin diselesaikan:',
          {
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: keyboard }
          }
        );
      }
    } catch (error) {
      console.error('Handle completion photo error:', error);
      await this.bot.sendMessage(chatId, '❌ Gagal memproses foto.');
    }
  }

  // Complete job with photo
  async completeJobWithPhoto(chatId, jobAssignment, photoMsg) {
    try {
      // Complete the job
      await prisma.jobTechnician.updateMany({
        where: { jobId: jobAssignment.job.id },
        data: { completedAt: new Date() }
      });

      await prisma.job.update({
        where: { id: jobAssignment.job.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date()
        }
      });

      const message = `✅ <b>Job ${jobAssignment.job.jobNumber} berhasil diselesaikan!</b>\n\n` +
        `👤 Pelanggan: <b>${jobAssignment.job.customer.name}</b>\n` +
        `📍 Alamat: <b>${jobAssignment.job.address}</b>\n` +
        `📸 Foto dokumentasi: Tersimpan\n\n` +
        `🎉 Terima kasih atas kerja keras Anda!\n` +
        `📦 Jangan lupa kembalikan barang sisa ke gudang.`;

      await this.bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
    } catch (error) {
      console.error('Complete job with photo error:', error);
      await this.bot.sendMessage(chatId, '❌ Gagal menyelesaikan job.');
    }
  }

  // Show technician status and statistics
  async showTechnicianStatus(chatId) {
    try {
      const technician = await prisma.technician.findFirst({
        where: { telegramChatId: chatId.toString() }
      });

      if (!technician) {
        await this.bot.sendMessage(chatId, '❌ Anda belum terdaftar sebagai teknisi.');
        return;
      }

      // Get statistics
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);

      const [activeJobs, completedToday, completedThisMonth, totalCompleted] = await Promise.all([
        prisma.jobTechnician.count({
          where: {
            technicianId: technician.id,
            job: { status: { in: ['ASSIGNED', 'IN_PROGRESS'] } }
          }
        }),
        prisma.jobTechnician.count({
          where: {
            technicianId: technician.id,
            completedAt: { gte: today }
          }
        }),
        prisma.jobTechnician.count({
          where: {
            technicianId: technician.id,
            completedAt: { gte: thisMonth }
          }
        }),
        prisma.jobTechnician.count({
          where: {
            technicianId: technician.id,
            completedAt: { not: null }
          }
        })
      ]);

      const statusIcon = technician.isActive ? '✅' : '❌';
      const statusText = technician.isActive ? 'Aktif' : 'Tidak Aktif';

      const message = `📊 <b>Status Teknisi</b>\n\n` +
        `👤 <b>Nama:</b> ${technician.name}\n` +
        `📱 <b>Telepon:</b> ${technician.phone}\n` +
        `${statusIcon} <b>Status:</b> ${statusText}\n\n` +
        `📋 <b>Statistik:</b>\n` +
        `🔄 Job aktif: ${activeJobs}\n` +
        `✅ Selesai hari ini: ${completedToday}\n` +
        `📈 Selesai bulan ini: ${completedThisMonth}\n` +
        `🏆 Total diselesaikan: ${totalCompleted}\n\n` +
        `⏰ Update: ${new Date().toLocaleString('id-ID')}`;

      await this.bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
    } catch (error) {
      console.error('Show technician status error:', error);
      await this.bot.sendMessage(chatId, '❌ Gagal memuat status.');
    }
  }

  // Handle callback queries
  async handleJobTakeCallback(chatId, jobId, callbackQueryId) {
    try {
      const technician = await prisma.technician.findFirst({
        where: { telegramChatId: chatId.toString() }
      });

      if (!technician) {
        await this.bot.answerCallbackQuery(callbackQueryId, {
          text: '❌ Anda belum terdaftar sebagai teknisi.',
          show_alert: true
        });
        return;
      }

      const job = await prisma.job.findUnique({
        where: { id: parseInt(jobId) },
        include: {
          customer: true,
          technicians: true
        }
      });

      if (!job || job.status !== 'OPEN') {
        await this.bot.answerCallbackQuery(callbackQueryId, {
          text: '❌ Job tidak tersedia.',
          show_alert: true
        });
        return;
      }

      if (job.technicians.length >= 2) {
        await this.bot.answerCallbackQuery(callbackQueryId, {
          text: '❌ Job sudah penuh.',
          show_alert: true
        });
        return;
      }

      // Take the job
      await this.takeJob(chatId, job.jobNumber);
      
      await this.bot.answerCallbackQuery(callbackQueryId, {
        text: `✅ Job ${job.jobNumber} berhasil diambil!`
      });
    } catch (error) {
      console.error('Job take callback error:', error);
      await this.bot.answerCallbackQuery(callbackQueryId, {
        text: '❌ Terjadi kesalahan.',
        show_alert: true
      });
    }
  }

  async handleJobStartCallback(chatId, jobId, callbackQueryId) {
    try {
      const job = await prisma.job.findUnique({
        where: { id: parseInt(jobId) }
      });

      if (!job) {
        await this.bot.answerCallbackQuery(callbackQueryId, {
          text: '❌ Job tidak ditemukan.',
          show_alert: true
        });
        return;
      }

      await this.startJob(chatId, job.jobNumber);
      
      await this.bot.answerCallbackQuery(callbackQueryId, {
        text: `▶️ Job ${job.jobNumber} dimulai!`
      });
    } catch (error) {
      console.error('Job start callback error:', error);
      await this.bot.answerCallbackQuery(callbackQueryId, {
        text: '❌ Terjadi kesalahan.',
        show_alert: true
      });
    }
  }

  async handleJobCompleteCallback(chatId, jobId, callbackQueryId) {
    try {
      const job = await prisma.job.findUnique({
        where: { id: parseInt(jobId) }
      });

      if (!job) {
        await this.bot.answerCallbackQuery(callbackQueryId, {
          text: '❌ Job tidak ditemukan.',
          show_alert: true
        });
        return;
      }

      await this.completeJobRequest(chatId, job.jobNumber);
      
      await this.bot.answerCallbackQuery(callbackQueryId, {
        text: `📸 Kirim foto untuk menyelesaikan ${job.jobNumber}`
      });
    } catch (error) {
      console.error('Job complete callback error:', error);
      await this.bot.answerCallbackQuery(callbackQueryId, {
        text: '❌ Terjadi kesalahan.',
        show_alert: true
      });
    }
  }

  async handleTechnicianRegistrationButton(chatId, userInfo) {
    try {
      const message = `📝 <b>Registrasi Teknisi</b>

Untuk mendaftar sebagai teknisi, silakan bagikan nomor telepon Anda dengan menekan tombol di bawah ini.

✅ <b>Proses otomatis:</b>
• Tekan "📱 Bagikan Nomor Telepon"
• Nomor akan otomatis terkirim
• Registrasi langsung diproses

💡 Nomor telepon Anda harus sudah terdaftar di sistem.`;

      await this.bot.sendMessage(chatId, message, {
        parse_mode: 'HTML',
        reply_markup: {
          keyboard: [[
            {
              text: '📱 Bagikan Nomor Telepon',
              request_contact: true
            }
          ], [
            {
              text: '🔙 Kembali ke Menu'
            }
          ]],
          one_time_keyboard: true,
          resize_keyboard: true
        }
      });

      // Set session untuk menunggu contact sharing
      this.setUserSession(chatId, { 
        awaitingContact: true,
        userInfo: userInfo
      });

    } catch (error) {
      console.error('Technician registration button error:', error);
      await this.bot.sendMessage(chatId, '❌ Terjadi kesalahan. Silakan coba lagi.');
    }
  }

  async handleRegistrationHelp(chatId) {
    try {
      const message = `❓ <b>Bantuan Registrasi</b>

<b>👨‍🔧 Untuk Teknisi:</b>
• Klik "Daftar Teknisi" dan masukkan nomor telepon
• Nomor telepon harus sudah terdaftar di sistem
• Tunggu persetujuan admin setelah mendaftar

<b>🆘 Butuh Bantuan?</b>
Hubungi admin jika:
• Nomor telepon belum terdaftar
• Lupa username/password
• Registrasi ditolak

Gunakan /start untuk kembali ke menu utama.`;

      await this.bot.sendMessage(chatId, message, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔙 Kembali ke Menu', callback_data: 'back_to_main' }]
          ]
        }
      });

    } catch (error) {
      console.error('Registration help error:', error);
      await this.bot.sendMessage(chatId, '❌ Terjadi kesalahan. Silakan coba lagi.');
    }
  }

  setUserSession(chatId, data) {
    // Simple session storage - in production, use Redis or database
    if (!this.userSessions) {
      this.userSessions = new Map();
    }
    this.userSessions.set(chatId.toString(), data);
  }

  getUserSession(chatId) {
    if (!this.userSessions) {
      this.userSessions = new Map();
    }
    return this.userSessions.get(chatId.toString()) || {};
  }

  clearUserSession(chatId) {
    if (this.userSessions) {
      this.userSessions.delete(chatId.toString());
    }
  }

  async handleContactRegistration(chatId, contact, userInfo) {
    try {
      console.log('=== CONTACT REGISTRATION DEBUG ===');
      console.log('ChatId:', chatId);
      console.log('Contact:', JSON.stringify(contact, null, 2));
      console.log('UserInfo:', JSON.stringify(userInfo, null, 2));

      // Extract phone number from contact
      const phoneNumber = contact.phone_number;
      
      if (!phoneNumber) {
        await this.bot.sendMessage(chatId, 
          '❌ Nomor telepon tidak ditemukan dalam kontak. Silakan coba lagi.',
          {
            reply_markup: {
              remove_keyboard: true
            }
          }
        );
        return;
      }

      // Process registration with the phone number
      await this.registerTechnician(chatId, phoneNumber, userInfo);
      
      // Remove keyboard after processing
      await this.bot.sendMessage(chatId, 
        '✅ Kontak berhasil diterima dan diproses!',
        {
          reply_markup: {
            remove_keyboard: true
          }
        }
      );

      console.log('=== END CONTACT REGISTRATION DEBUG ===');
    } catch (error) {
      console.error('Contact registration error:', error);
      await this.bot.sendMessage(chatId, 
        '❌ Gagal memproses kontak. Silakan coba lagi.',
        {
          reply_markup: {
            remove_keyboard: true
          }
        }
      );
    }
  }

  async handlePhoneNumberInput(chatId, phoneNumber, userInfo) {
    try {
      // Validate phone number format
      const phoneRegex = /^(\+62|62|0)[0-9]{9,13}$/;
      if (!phoneRegex.test(phoneNumber.replace(/[-\s]/g, ''))) {
        await this.bot.sendMessage(chatId, 
          '❌ Format nomor telepon tidak valid. Silakan coba lagi dengan format yang benar (contoh: 08123456789).',
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: '🔙 Kembali ke Menu', callback_data: 'back_to_main' }]
              ]
            }
          }
        );
        return;
      }

      // Process technician registration
      await this.registerTechnician(chatId, phoneNumber, userInfo);

    } catch (error) {
      console.error('Phone number input error:', error);
      await this.bot.sendMessage(chatId, '❌ Terjadi kesalahan. Silakan coba lagi.');
    }
  }

  async handleLoginInput(chatId, credentials) {
    try {
      const parts = credentials.trim().split(' ');
      if (parts.length !== 2) {
        await this.bot.sendMessage(chatId, 
          '❌ Format login tidak valid. Gunakan format: username password',
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: '🔙 Kembali ke Menu', callback_data: 'back_to_main' }]
              ]
            }
          }
        );
        return;
      }

      const [username, password] = parts;
      
      // Process login using existing login logic
      await this.loginSystemUser(chatId, username, password, { username: username });

    } catch (error) {
      console.error('Login input error:', error);
      await this.bot.sendMessage(chatId, '❌ Terjadi kesalahan. Silakan coba lagi.');
    }
  }

  // Admin menu handlers
  async handleAdminCreateJob(chatId) {
    const message = `➕ <b>Buat Pekerjaan Baru</b>\n\n` +
      `Untuk membuat pekerjaan baru, silakan gunakan web dashboard untuk input yang lebih lengkap.\n\n` +
      `🌐 <b>Akses Dashboard:</b>\n` +
      `• Buka browser dan login ke sistem\n` +
      `• Pilih menu "Jobs" → "Buat Job Baru"\n` +
      `• Isi semua detail pekerjaan\n` +
      `• Job akan otomatis di-broadcast ke teknisi\n\n` +
      `💡 <b>Info:</b> Pembuatan job via Telegram akan segera tersedia.`;

    await this.bot.sendMessage(chatId, message, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔙 Kembali ke Menu Admin', callback_data: 'superadmin_menu' }]
        ]
      }
    });
  }

  async handleAdminJobStatus(chatId) {
    try {
      const jobs = await prisma.job.findMany({
        where: {
          status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] }
        },
        include: {
          customer: true,
          technicians: {
            include: { technician: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      if (jobs.length === 0) {
        await this.bot.sendMessage(chatId, 
          '📊 <b>Status Pekerjaan</b>\n\n✅ Tidak ada pekerjaan aktif saat ini.',
          { 
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [{ text: '🔙 Kembali ke Menu Admin', callback_data: 'superadmin_menu' }]
              ]
            }
          }
        );
        return;
      }

      let message = `📊 <b>Status Pekerjaan Aktif (${jobs.length})</b>\n\n`;

      jobs.forEach((job, index) => {
        const statusEmoji = {
          'OPEN': '🟡 Terbuka',
          'ASSIGNED': '🔵 Ditugaskan', 
          'IN_PROGRESS': '🟢 Sedang Dikerjakan'
        };

        const assignedTechs = job.technicians.length > 0 
          ? job.technicians.map(jt => jt.technician.name).join(', ')
          : 'Belum ada teknisi';

        message += `${index + 1}. <b>${job.jobNumber}</b>\n`;
        message += `   ${statusEmoji[job.status]}\n`;
        message += `   👤 ${job.customer.name}\n`;
        message += `   📍 ${job.address.length > 30 ? job.address.substring(0, 30) + '...' : job.address}\n`;
        message += `   🔧 ${job.type === 'INSTALLATION' ? 'Pemasangan' : 'Perbaikan'}\n`;
        message += `   👥 Teknisi: ${assignedTechs}\n`;
        message += `   📅 ${new Date(job.createdAt).toLocaleDateString('id-ID')}\n\n`;
      });

      await this.bot.sendMessage(chatId, message, { 
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔄 Refresh Status', callback_data: 'admin_job_status' }],
            [{ text: '🔙 Kembali ke Menu Admin', callback_data: 'superadmin_menu' }]
          ]
        }
      });
    } catch (error) {
      console.error('Admin job status error:', error);
      await this.bot.sendMessage(chatId, '❌ Gagal memuat status pekerjaan.');
    }
  }

  async handleAdminViewTechnicians(chatId) {
    try {
      // Simplified query - get all active technicians first
      const technicians = await prisma.technician.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' }
      });

      if (technicians.length === 0) {
        await this.bot.sendMessage(chatId, 
          '👥 <b>Status Teknisi</b>\n\n❌ Tidak ada teknisi aktif.',
          { 
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [{ text: '🔙 Kembali ke Menu Admin', callback_data: 'superadmin_menu' }]
              ]
            }
          }
        );
        return;
      }

      // Get active jobs separately to avoid complex joins
      const activeJobs = await prisma.jobTechnician.findMany({
        where: {
          job: {
            status: { in: ['ASSIGNED', 'IN_PROGRESS'] }
          }
        },
        include: {
          job: true,
          technician: true
        }
      });

      let message = `👥 <b>Status Teknisi (${technicians.length})</b>\n\n`;
      let idleCount = 0;
      let workingCount = 0;

      technicians.forEach((tech, index) => {
        // Check if technician has active jobs
        const techActiveJobs = activeJobs.filter(aj => aj.technicianId === tech.id);
        const isWorking = techActiveJobs.length > 0;
        const statusIcon = isWorking ? '🔧' : '💤';
        const statusText = isWorking ? 'Sedang Bekerja' : 'Menganggur';
        
        if (isWorking) {
          workingCount++;
        } else {
          idleCount++;
        }

        message += `${index + 1}. ${statusIcon} <b>${tech.name}</b>\n`;
        message += `   📱 ${tech.phone}\n`;
        message += `   📊 Status: ${statusText}\n`;
        
        if (isWorking) {
          const activeJobNumbers = techActiveJobs.map(aj => aj.job.jobNumber).join(', ');
          message += `   📋 Job: ${activeJobNumbers}\n`;
        }
        
        const telegramStatus = tech.telegramChatId ? '✅ Terhubung' : '❌ Belum terhubung';
        message += `   📱 Telegram: ${telegramStatus}\n`;
        
        if (tech.lastLocationUpdate) {
          const lastUpdate = new Date(tech.lastLocationUpdate);
          const timeDiff = Math.floor((Date.now() - lastUpdate.getTime()) / (1000 * 60));
          message += `   📍 Lokasi: ${timeDiff < 60 ? timeDiff + ' menit lalu' : 'Lebih dari 1 jam'}\n`;
        }
        message += `\n`;
      });

      message += `📊 <b>Ringkasan:</b>\n`;
      message += `• 💤 Menganggur: ${idleCount} teknisi\n`;
      message += `• 🔧 Sedang Bekerja: ${workingCount} teknisi\n`;
      message += `• 📱 Terhubung Telegram: ${technicians.filter(t => t.telegramChatId).length} teknisi`;

      await this.bot.sendMessage(chatId, message, { 
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔄 Refresh Status', callback_data: 'admin_view_technicians' }],
            [{ text: '🔙 Kembali ke Menu Admin', callback_data: 'superadmin_menu' }]
          ]
        }
      });
    } catch (error) {
      console.error('Admin view technicians error:', error);
      await this.bot.sendMessage(chatId, '❌ Gagal memuat status teknisi.');
    }
  }

  async handleAdminBroadcastAll(chatId) {
    const message = `📢 <b>Broadcast ke Semua Teknisi</b>\n\n` +
      `Ketik pesan yang ingin Anda kirim ke semua teknisi aktif.\n\n` +
      `💡 <b>Tips:</b>\n` +
      `• Pesan akan dikirim ke semua teknisi yang terhubung Telegram\n` +
      `• Gunakan pesan yang jelas dan informatif\n` +
      `• Contoh: "Reminder: Selalu update lokasi saat bekerja"\n\n` +
      `📝 <b>Cara menggunakan:</b>\n` +
      `Ketik: <code>/broadcast [pesan_anda]</code>`;

    await this.bot.sendMessage(chatId, message, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔙 Kembali ke Menu Admin', callback_data: 'superadmin_menu' }]
        ]
      }
    });

    // Set session untuk menunggu input broadcast message
    this.setUserSession(chatId, { awaitingBroadcastMessage: true });
  }

  // Session management helpers
  getUserSession(chatId) {
    return this.userSessions?.get(chatId) || {};
  }

  setUserSession(chatId, data) {
    if (!this.userSessions) {
      this.userSessions = new Map();
    }
    this.userSessions.set(chatId, { ...this.getUserSession(chatId), ...data });
  }

  clearUserSession(chatId) {
    if (this.userSessions) {
      this.userSessions.delete(chatId);
    }
  }

  async processBroadcastMessage(chatId, message) {
    try {
      // Get all active technicians with Telegram connection
      const technicians = await prisma.technician.findMany({
        where: {
          isActive: true,
          telegramChatId: { not: null }
        }
      });

      if (technicians.length === 0) {
        await this.bot.sendMessage(chatId, 
          '❌ <b>Tidak ada teknisi yang terhubung Telegram</b>\n\n' +
          'Pastikan teknisi sudah mendaftar dan terhubung dengan bot.',
          { parse_mode: 'HTML' }
        );
        return;
      }

      // Send broadcast message to all technicians
      const broadcastMessage = `📢 <b>PESAN DARI ADMIN</b>\n\n${message}\n\n` +
        `⏰ Dikirim: ${new Date().toLocaleString('id-ID')}`;

      let successCount = 0;
      let failedCount = 0;
      const results = [];

      for (const technician of technicians) {
        try {
          await this.bot.sendMessage(technician.telegramChatId, broadcastMessage, {
            parse_mode: 'HTML'
          });
          successCount++;
          results.push({ name: technician.name, success: true });
        } catch (error) {
          console.error(`Failed to send broadcast to ${technician.name}:`, error);
          failedCount++;
          results.push({ name: technician.name, success: false, error: error.message });
        }
      }

      // Send confirmation to admin
      const confirmMessage = `✅ <b>Broadcast Terkirim</b>\n\n` +
        `📊 <b>Statistik:</b>\n` +
        `• Berhasil: ${successCount} teknisi\n` +
        `• Gagal: ${failedCount} teknisi\n` +
        `• Total: ${technicians.length} teknisi\n\n` +
        `📝 <b>Pesan:</b> "${message}"`;

      await this.bot.sendMessage(chatId, confirmMessage, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔙 Kembali ke Menu Admin', callback_data: 'superadmin_menu' }]
          ]
        }
      });

    } catch (error) {
      console.error('Process broadcast message error:', error);
      await this.bot.sendMessage(chatId, 
        '❌ Gagal mengirim broadcast. Silakan coba lagi.',
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔙 Kembali ke Menu Admin', callback_data: 'superadmin_menu' }]
            ]
          }
        }
      );
    }
  }

  // Broadcast job to all technicians (automatic for regular jobs)
  async broadcastJobToTechnicians(job) {
    try {
      console.log(`=== BROADCASTING JOB ${job.jobNumber} TO ALL TECHNICIANS ===`);
      
      // Get all active technicians with Telegram connection
      const technicians = await prisma.technician.findMany({
        where: {
          isActive: true,
          telegramChatId: { not: null }
        }
      });

      if (technicians.length === 0) {
        console.log('No active technicians with Telegram found');
        return { success: false, error: 'No active technicians found' };
      }

      const jobTypeEmoji = job.type === 'INSTALLATION' ? '🔧' : '🛠️';
      const jobTypeText = job.type === 'INSTALLATION' ? 'Pemasangan' : 'Perbaikan';
      
      const message = `🚨 <b>JOB BARU TERSEDIA!</b>

📋 <b>Job:</b> ${job.jobNumber}
${jobTypeEmoji} <b>Jenis:</b> ${jobTypeText}
👤 <b>Customer:</b> ${job.customer.name}
📞 <b>Telepon:</b> ${job.customer.phone}
📍 <b>Alamat:</b> ${job.address}
📅 <b>Dibuat:</b> ${new Date(job.createdAt).toLocaleString('id-ID')}

💡 <b>Cara mengambil job:</b>
Ketik: <code>/ambil ${job.jobNumber}</code>

⚡ Job ini otomatis tersedia untuk semua teknisi!`;

      let successCount = 0;
      let failedCount = 0;
      const results = [];

      for (const technician of technicians) {
        try {
          await this.bot.sendMessage(technician.telegramChatId, message, {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [{ text: `✋ Ambil ${job.jobNumber}`, callback_data: `take_job_${job.id}` }],
                [{ text: '📋 Lihat Job Lain', callback_data: 'view_jobs' }]
              ]
            }
          });
          successCount++;
          results.push({ technicianId: technician.id, name: technician.name, success: true });
          console.log(`✅ Job broadcasted to ${technician.name}`);
        } catch (error) {
          console.error(`❌ Failed to broadcast to ${technician.name}:`, error);
          failedCount++;
          results.push({ 
            technicianId: technician.id, 
            name: technician.name, 
            success: false, 
            error: error.message 
          });
        }
      }

      console.log(`=== BROADCAST COMPLETE: ${successCount} success, ${failedCount} failed ===`);
      
      return {
        success: true,
        broadcastCount: successCount,
        totalTechnicians: technicians.length,
        failedCount,
        results
      };

    } catch (error) {
      console.error('Broadcast job to technicians error:', error);
      return { success: false, error: error.message };
    }
  }

  // Broadcast settings issues to admin bots only
  async broadcastJobToAdmins(job) {
    try {
      console.log(`=== BROADCASTING SETTINGS ISSUE ${job.jobNumber} TO ADMIN BOTS ONLY ===`);
      
      // Get admin bots (superadmin users with Telegram connection + technicians with admin role)
      const [systemAdmins, adminTechnicians] = await Promise.all([
        prisma.user.findMany({
          where: {
            role: { in: ['superadmin', 'admin'] },
            telegramChatId: { not: null }
          }
        }),
        prisma.technician.findMany({
          where: {
            isAdmin: true,
            isActive: true,
            telegramChatId: { not: null }
          }
        })
      ]);

      const allAdmins = [
        ...systemAdmins.map(u => ({ 
          id: u.id, 
          name: u.username, 
          telegramChatId: u.telegramChatId, 
          type: 'system_admin',
          role: u.role 
        })),
        ...adminTechnicians.map(t => ({ 
          id: t.id, 
          name: t.name, 
          telegramChatId: t.telegramChatId, 
          type: 'admin_technician' 
        }))
      ];

      if (allAdmins.length === 0) {
        console.log('No admin bots found');
        return { success: false, error: 'No admin bots found' };
      }

      const message = `🔧 <b>MASALAH SETTINGAN - ADMIN ONLY</b>

📋 <b>Job:</b> ${job.jobNumber}
🛠️ <b>Jenis:</b> Perbaikan (Masalah Settingan)
👤 <b>Customer:</b> ${job.customer.name}
📞 <b>Telepon:</b> ${job.customer.phone}
📍 <b>Alamat:</b> ${job.address}
📅 <b>Dibuat:</b> ${new Date(job.createdAt).toLocaleString('id-ID')}

⚠️ <b>KHUSUS ADMIN:</b>
Job ini memerlukan penanganan admin karena menyangkut masalah settingan sistem.

💡 <b>Cara mengambil job:</b>
Ketik: <code>/ambil ${job.jobNumber}</code>`;

      let successCount = 0;
      let failedCount = 0;
      const results = [];

      for (const admin of allAdmins) {
        try {
          await this.bot.sendMessage(admin.telegramChatId, message, {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [{ text: `✋ Ambil ${job.jobNumber}`, callback_data: `take_job_${job.id}` }],
                [{ text: '📊 Dashboard Admin', callback_data: 'admin_dashboard' }]
              ]
            }
          });
          successCount++;
          results.push({ 
            adminId: admin.id, 
            name: admin.name, 
            type: admin.type,
            success: true 
          });
          console.log(`✅ Settings job broadcasted to admin: ${admin.name} (${admin.type})`);
        } catch (error) {
          console.error(`❌ Failed to broadcast to admin ${admin.name}:`, error);
          failedCount++;
          results.push({ 
            adminId: admin.id, 
            name: admin.name, 
            type: admin.type,
            success: false, 
            error: error.message 
          });
        }
      }

      console.log(`=== ADMIN BROADCAST COMPLETE: ${successCount} success, ${failedCount} failed ===`);
      
      return {
        success: true,
        broadcastCount: successCount,
        totalAdmins: allAdmins.length,
        failedCount,
        results
      };

    } catch (error) {
      console.error('Broadcast job to admins error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get bot information
  async getBotInfo() {
    try {
      const botInfo = await this.bot.getMe();
      return botInfo;
    } catch (error) {
      console.error('Get bot info error:', error);
      throw error;
    }
  }

  // Method to restart bot if there's a conflict
  async restartBot(token) {
    try {
      if (this.bot) {
        await this.bot.stopPolling();
      }
      
      // Wait a bit before restarting
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Create new bot instance
      this.bot = new TelegramBot(token, { 
        polling: true,
        polling_options: {
          timeout: 10,
          limit: 100,
          retryTimeout: 5000,
          allowed_updates: ['message', 'callback_query', 'inline_query']
        }
      });
      
      // Re-setup everything
      this.setupCommands();
      this.setupCallbackHandlers();
      this.initializeAdminBot();
      
      console.log('✅ Telegram Bot restarted successfully');
    } catch (error) {
      console.error('Failed to restart Telegram Bot:', error);
    }
  }

  // Static method to get instance
  static getInstance(token) {
    if (!EnhancedTelegramBot.instance) {
      EnhancedTelegramBot.instance = new EnhancedTelegramBot(token);
    }
    return EnhancedTelegramBot.instance;
  }

  // Method to destroy instance (useful for testing)
  static destroyInstance() {
    if (EnhancedTelegramBot.instance && EnhancedTelegramBot.instance.bot) {
      EnhancedTelegramBot.instance.bot.stopPolling();
      EnhancedTelegramBot.instance = null;
    }
  }
}

module.exports = EnhancedTelegramBot;
