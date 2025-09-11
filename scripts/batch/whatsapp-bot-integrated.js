/**
 * Integrated WhatsApp Bot with Persistent Session
 * Auto-connects with server and maintains session
 */

const { 
  default: makeWASocket, 
  DisconnectReason, 
  useMultiFileAuthState,
  makeCacheableSignalKeyStore
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const db = require('../server/whatsapp/consolidated/BotDatabaseService');
const { broadcastWhatsAppStatusUpdate } = require('../server/services/websocketService');

const sessionPath = path.join(__dirname, 'server', 'auth_info_baileys');
const statusFilePath = path.join(__dirname, 'whatsapp-status.json');
let commandCount = 0;
let sock = null;

// Function to update status file for server communication
function updateStatusFile() {
  try {
    const status = {
      connected: sock && sock.user ? true : false,
      user: sock && sock.user ? {
        id: sock.user.id,
        name: sock.user.name || 'Not set',
        phone: sock.user.id ? sock.user.id.split(':')[0] || sock.user.id.split('@')[0] : 'Unknown'
      } : null,
      status: sock && sock.user ? 'connected' : 'disconnected',
      lastUpdate: new Date().toISOString(),
      uptime: process.uptime(),
      commandCount: commandCount
    };
    
    fs.writeFileSync(statusFilePath, JSON.stringify(status, null, 2));
    
    // Broadcast status update via WebSocket
    try {
      broadcastWhatsAppStatusUpdate(status);
    } catch (wsError) {
      console.error('Error broadcasting status update:', wsError.message);
    }
  } catch (error) {
    console.error('Error updating status file:', error.message);
  }
}

// Function to send admin notifications
async function sendAdminNotification(message, type = 'info') {
  try {
    // Admin phone number - you can change this to your admin number
    const adminNumber = '6282229261247'; // Change this to your admin number
    const adminJid = adminNumber + '@s.whatsapp.net';
    
    if (sock && sock.user) {
      // Add emoji based on type
      const emojiMap = {
        'test': '🧪',
        'success': '✅',
        'error': '❌',
        'info': 'ℹ️',
        'warning': '⚠️'
      };
      
      const emoji = emojiMap[type] || 'ℹ️';
      const formattedMessage = `${emoji} *Admin Notification*\n\n${message}\n\n⏰ ${new Date().toLocaleString()}`;
      
      await sock.sendMessage(adminJid, { text: formattedMessage });
      console.log('📢 Admin notification sent:', type);
    }
  } catch (error) {
    console.error('Error sending admin notification:', error.message);
  }
}

// Monitor test messages from web interface
function monitorTestMessages() {
  const testFile = path.join(__dirname, 'test-message.json');
  
  setInterval(async () => {
    if (sock && sock.user && fs.existsSync(testFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(testFile, 'utf8'));
        
        // Check if message is not too old (within 30 seconds)
        if (Date.now() - data.timestamp < 30000) {
          console.log('📨 Processing test message from web interface...');
          
          // Format phone number to WhatsApp JID
          let phoneNumber = data.phone.replace(/\D/g, '');
          if (!phoneNumber.startsWith('62')) {
            phoneNumber = '62' + phoneNumber.replace(/^0+/, '');
          }
          const jid = phoneNumber + '@s.whatsapp.net';
          
          // Send the test message
          await sock.sendMessage(jid, { text: data.message });
          console.log(`✅ Test message sent to ${jid}`);
          

          // Send notification to admin bot (only if different from recipient)
          if (phoneNumber !== '6282229261247') {
            await sendAdminNotification(
              `*Test Message Sent*\n\n` +
              `📱 To: ${phoneNumber}\n` +
              `💬 Message: ${data.message}\n` +
              `✅ Status: Success`,
              'test'
            );
          }
          
          // Delete the file after processing
          fs.unlinkSync(testFile);
        }
      } catch (error) {
        console.error('Error processing test message:', error.message);
        // Delete corrupted file
        if (fs.existsSync(testFile)) {
          fs.unlinkSync(testFile);
        }
      }
    }
  }, 2000); // Check every 2 seconds
}

// Monitor notifications from database
function monitorNotifications() {
  setInterval(async () => {
    if (!sock || !sock.user) return;
    
    try {
      const notifications = await db.getPendingNotifications();
      if (notifications.length > 0) {
        console.log(`🕒 Pending notifications: ${notifications.length}`);
      }
      
      for (const notif of notifications) {
        try {
          if (!notif.recipient) {
            console.warn('Skipping notification without recipient:', notif.id);
            await db.markNotificationSent(notif.id);
            continue;
          }
          await sock.sendMessage(notif.recipient, { text: notif.message });
          console.log(`📤 Notification sent to ${notif.recipient}`);
          await db.markNotificationSent(notif.id);
        } catch (error) {
          console.error(`Failed to send notification ${notif.id}:`, error.message);
        }
      }
    } catch (error) {
      console.error('Error checking notifications:', error.message);
    }
  }, 5000); // Check every 5 seconds
}

async function startWhatsAppBot() {
  console.log('========================================');
  console.log('   WHATSAPP BOT - INTEGRATED MODE');
  console.log('========================================\n');

  try {
    // Create session directory
    if (!fs.existsSync(sessionPath)) {
      fs.mkdirSync(sessionPath, { recursive: true });
      console.log('✅ Created new session directory\n');
    }

    console.log('Loading authentication...');
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

    // Use hardcoded version
    const version = [2, 2413, 1];
    console.log(`Version: ${version.join('.')}\n`);

    console.log('Creating WhatsApp connection...');
    sock = makeWASocket({
      version,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
      },
      browser: ['Chrome (Windows)', 'Chrome', '120.0.0.0'],
      qrTimeout: 120000,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 120000,
      keepAliveIntervalMs: 30000,
      markOnlineOnConnect: true,
      syncFullHistory: false,
      getMessage: async () => undefined
    });

    console.log('✅ Connection created\n');

    // Handle credential updates - IMPORTANT for session persistence
    sock.ev.on('creds.update', saveCreds);

    // Handle connection updates
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.clear();
        console.log('========================================');
        console.log('   📱 SCAN QR CODE WITH WHATSAPP');
        console.log('========================================\n');
        console.log('IMPORTANT: After scanning, session will be saved');
        console.log('You won\'t need to scan again!\n');
        console.log('Instructions:');
        console.log('1. Open WhatsApp on your phone');
        console.log('2. Go to Settings > Linked Devices');
        console.log('3. Tap "Link a Device"');
        console.log('4. Scan this QR code:\n');
        
        qrcode.generate(qr, { small: true });
        
        console.log('\n⏰ You have 2 minutes to scan this QR code\n');
      }

      if (connection === 'connecting') {
        if (!qr) {
          console.log('🔄 Reconnecting using saved session...');
        }
      } else if (connection === 'open') {
        console.clear();
        console.log('========================================');
        console.log('   ✅ WHATSAPP BOT CONNECTED!');
        console.log('========================================\n');
        
        const user = sock.user;
        if (user) {
          const phoneNumber = user.id.split(':')[0] || user.id.split('@')[0];
          console.log(`📱 Bot Number: ${phoneNumber}`);
          console.log(`👤 Bot Name: ${user.name || 'Not set'}\n`);
          
          // Send connection notification to admin
          await sendAdminNotification(
            `*WhatsApp Bot Connected*\n\n` +
            `📱 Bot Number: ${phoneNumber}\n` +
            `👤 Bot Name: ${user.name || 'Not set'}\n` +
            `🌐 Dashboard: http://localhost:3000\n` +
            `✅ Status: Online and Ready`,
            'success'
          );
        }
        
        console.log('✅ Session saved! No need to scan again.');
        console.log('✅ Bot integrated with web dashboard.');
        console.log('✅ Test messages from web enabled.');
        console.log('✅ Admin notifications enabled.');
        console.log('');
        console.log('Available Commands:');
        console.log('  /help - Show all commands');
        console.log('  /daftar - Register technician');
        console.log('  /jobs - View available jobs');
        console.log('  /myjobs - View assigned jobs');
        console.log('  /stats - View statistics');
        console.log('');
        console.log('Access Web Dashboard:');
        console.log('  Frontend: http://localhost:3000');
        console.log('  Backend API: http://localhost:3001');
        console.log('');
        console.log('✅ System running! Bot will auto-reconnect if disconnected.');
        console.log('\n');
      
      // Export socket globally for API access
      global.whatsappSocket = sock;
      console.log('✅ WhatsApp socket exported for direct API integration');
      
      // Update status file
      updateStatusFile();
      } else if (connection === 'close') {
        const reason = lastDisconnect?.error;
        const statusCode = reason instanceof Boom ? reason.output?.statusCode : null;
        
        console.log('\n⚠️ Connection interrupted');
        
        // Send disconnection notification to admin
        await sendAdminNotification(
          `*WhatsApp Bot Disconnected*\n\n` +
          `⚠️ Reason: ${reason?.message || 'Unknown'}\n` +
          `🔄 Status: Attempting to reconnect...\n` +
          `⏰ Time: ${new Date().toLocaleString()}`,
          'warning'
        );
        
        // Update status file to show disconnected
        updateStatusFile();
        
        if (statusCode === DisconnectReason.loggedOut) {
          console.log('❌ Bot logged out. Cleaning session...');
          // Clean session if logged out
          if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true });
          }
          console.log('Session cleaned. Restarting...');
          setTimeout(() => startWhatsAppBot(), 3000);
        } else if (statusCode !== DisconnectReason.loggedOut) {
          console.log('🔄 Auto-reconnecting in 5 seconds...');
          setTimeout(() => startWhatsAppBot(), 5000);
        }
      }
    });

    // Handle messages
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      console.log('\n=== NEW MESSAGE EVENT ===');
      console.log('Update type:', type);
      console.log('Messages received:', messages.length);
      
      if (type !== 'notify' && type !== 'append') {
        console.log('Skipping non-notify/append message type:', type);
        return;
      }
      
      const msg = messages[0];
      console.log('Message object keys:', Object.keys(msg || {}));
      console.log('Message key:', msg?.key);
      console.log('From me?:', msg?.key?.fromMe);
      
      // Skip if no message content
      if (!msg.message) {
        console.log('Skipping: No message content');
        return;
      }
      
      // For fromMe messages, only process if it's a command
      if (msg.key.fromMe) {
        const tempText = msg.message.conversation || 
                        msg.message.extendedTextMessage?.text || '';
        if (!tempText.startsWith('/')) {
          console.log('Skipping: Message from self is not a command');
          return;
        }
        console.log('Processing admin command from bot account');
      }

      console.log('Message content keys:', Object.keys(msg.message));
      console.log('Full message object:', JSON.stringify(msg.message, null, 2));
      
      // Extract text from various message types
      let text = '';
      if (msg.message.conversation) {
        text = msg.message.conversation;
        console.log('Text from conversation:', text);
      } else if (msg.message.extendedTextMessage?.text) {
        text = msg.message.extendedTextMessage.text;
        console.log('Text from extendedTextMessage:', text);
      } else if (msg.message.imageMessage?.caption) {
        text = msg.message.imageMessage.caption;
        console.log('Text from imageMessage caption:', text);
      } else if (msg.message.videoMessage?.caption) {
        text = msg.message.videoMessage.caption;
        console.log('Text from videoMessage caption:', text);
      } else if (msg.message.documentMessage?.caption) {
        text = msg.message.documentMessage.caption;
        console.log('Text from documentMessage caption:', text);
      }
      
      const from = msg.key.remoteJid;
      const pushName = msg.pushName || 'User';

      console.log('Extracted text:', text);
      console.log('From:', from);
      console.log('Push name:', pushName);
      
      if (!text) {
        console.log('No text content found');
        return;
      }

      // Only log and process commands, not regular messages
      if (text.startsWith('/')) {
        console.log(`📩 Command detected from ${pushName}: ${text}`);
        const command = text.split(' ')[0].toLowerCase();
        const args = text.split(' ').slice(1);
        console.log('Parsed command:', command);
        console.log('Arguments:', args);
        
        try {
          console.log('Entering command switch for:', command);
          
          switch(command) {
            case '/ping':
              console.log('Processing /ping command...');
              await sock.sendMessage(from, { text: '🏓 Pong! Bot is active.' });
              console.log('✅ /ping response sent');
              break;
              
            case '/help':
              const helpText = `📋 *Available Commands:*

*Basic Commands:*
/ping - Test bot response
/help - Show this help message
/status - Check bot status
/info - System information

*Technician Commands:*
/daftar - Register as technician
/jobs - View available jobs
/myjobs - View your assigned jobs
/ambil [job_id] - Take a job
/mulai [job_id] - Start a job
/selesai [job_id] - Complete a job
/stats - View your statistics`;
              await sock.sendMessage(from, { text: helpText });
              break;
              
            case '/status':
              const uptime = process.uptime();
              const minutes = Math.floor(uptime / 60);
              const seconds = Math.floor(uptime % 60);
              const statusText = `🤖 *Bot Status:*
✅ Online
⏱ Uptime: ${minutes}m ${seconds}s
📱 Connected to: ${sock.user?.id || 'Unknown'}
💬 Commands processed: ${commandCount || 0}
🗄️ Database: Connected`;
              await sock.sendMessage(from, { text: statusText });
              break;
              
            case '/info':
              const infoText = `📱 *ISP Management Bot*
Version: 1.0.0 (Integrated)
Node: ${process.version}
Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB
Mode: Persistent Session

Type /help for available commands`;
              await sock.sendMessage(from, { text: infoText });
              break;
              
            case '/daftar':
              const phoneNumber = from.split('@')[0];
              const regName = (args.join(' ').trim() || pushName || 'Teknisi').trim();
              try {
                const existingTech = await db.checkExistingTechnician(phoneNumber);
                if (existingTech) {
                  await sock.sendMessage(from, { text: '❌ Anda sudah terdaftar sebagai teknisi!' });
                  break;
                }

                const pendingReg = await db.getTechnicianRegistrationStatus(phoneNumber);
                if (pendingReg) {
                  await sock.sendMessage(from, { text: '⏳ Pendaftaran Anda masih dalam proses review admin.' });
                  break;
                }

                await db.createTechnicianRegistration({ name: regName, phone: phoneNumber, whatsappJid: from });

                const daftarText = `📝 *Pendaftaran Teknisi*

👤 Nama: ${regName}
📱 WhatsApp: ${phoneNumber}

✅ Pendaftaran berhasil dikirim!
⏳ Menunggu approval admin...

Anda akan menerima notifikasi WhatsApp setelah pendaftaran disetujui.`;
                await sock.sendMessage(from, { text: daftarText });
              } catch (error) {
                console.error('Error in /daftar:', error);
                const msg = `❌ Gagal mendaftar.
${error?.message ? 'Alasan: ' + error.message : 'Silakan coba lagi.'}`;
                await sock.sendMessage(from, { text: msg });
              }
              break;
              
            case '/jobs':
              try {
                const jobs = await db.getAvailableJobs();
                
                if (jobs.length === 0) {
                  await sock.sendMessage(from, { 
                    text: '📋 Tidak ada pekerjaan tersedia saat ini.' 
                  });
                  break;
                }
                
                let jobsText = `📋 *PEKERJAAN TERSEDIA*\n\n`;
                
                jobs.forEach((job, index) => {
                  jobsText += `${index + 1}️⃣ *${job.jobNumber}* - ${job.type}\n`;
                  jobsText += `   📍 ${job.address}\n`;
                  jobsText += `   👤 ${job.customer?.name || 'N/A'}\n`;
                  jobsText += `   📞 ${job.customer?.phone || 'N/A'}\n`;
                  jobsText += `   ⏰ ${job.scheduledDate ? new Date(job.scheduledDate).toLocaleString('id-ID') : 'Secepatnya'}\n`;
                  jobsText += `   🔧 Status: ${job.status}\n\n`;
                });
                
                jobsText += 'Ketik /ambil [job_number] untuk mengambil pekerjaan';
                await sock.sendMessage(from, { text: jobsText });
              } catch (error) {
                console.error('Error in /jobs:', error);
                await sock.sendMessage(from, { 
                  text: '❌ Gagal mengambil daftar pekerjaan.' 
                });
              }
              break;
              
            case '/myjobs':
              try {
                const phoneNum = from.split('@')[0];
                const jobs = await db.getTechnicianJobs(phoneNum);
                
                if (jobs.length === 0) {
                  await sock.sendMessage(from, { 
                    text: '📋 Anda belum memiliki pekerjaan yang ditugaskan.' 
                  });
                  break;
                }
                
                let myJobsText = `📋 *PEKERJAAN ANDA*\n\n`;
                myJobsText += `👤 ${pushName}\n\n`;
                
                jobs.forEach(job => {
                  const status = job.status === 'ASSIGNED' ? '⏳ Ditugaskan' : '🔧 Sedang dikerjakan';
                  myJobsText += `${status} *${job.jobNumber}* - ${job.type}\n`;
                  myJobsText += `   📍 ${job.address}\n`;
                  myJobsText += `   👤 ${job.customer?.name || 'N/A'}\n`;
                  myJobsText += `   📞 ${job.customer?.phone || 'N/A'}\n\n`;
                });
                
                myJobsText += 'Ketik /mulai [job_number] untuk memulai pekerjaan\n';
                myJobsText += 'Ketik /selesai [job_number] untuk menyelesaikan pekerjaan';
                await sock.sendMessage(from, { text: myJobsText });
              } catch (error) {
                console.error('Error in /myjobs:', error);
                await sock.sendMessage(from, { 
                  text: '❌ Gagal mengambil daftar pekerjaan Anda.' 
                });
              }
              break;
              
            case '/ambil':
              if (!args[0]) {
                await sock.sendMessage(from, { 
                  text: '❌ Format: /ambil [job_number]\nContoh: /ambil JOB001' 
                });
              } else {
                try {
                  const jobNumber = args[0].toUpperCase();
                  const phoneNum = from.split('@')[0];
                  const result = await db.assignJobToTechnician(jobNumber, phoneNum);
                  
                  await sock.sendMessage(from, { 
                    text: result.success ? 
                      `✅ ${result.message}\n\nPekerjaan *${jobNumber}* telah ditambahkan ke daftar Anda.\nKetik /myjobs untuk melihat detail.` :
                      `❌ ${result.message}`
                  });
                } catch (error) {
                  console.error('Error in /ambil:', error);
                  await sock.sendMessage(from, { 
                    text: '❌ Gagal mengambil pekerjaan.' 
                  });
                }
              }
              break;
              
            case '/mulai':
              if (!args[0]) {
                await sock.sendMessage(from, { 
                  text: '❌ Format: /mulai [job_number]\nContoh: /mulai JOB001' 
                });
              } else {
                try {
                  const jobNumber = args[0].toUpperCase();
                  const phoneNum = from.split('@')[0];
                  const result = await db.startJob(jobNumber, phoneNum);
                  
                  await sock.sendMessage(from, { 
                    text: result.success ? 
                      `🚀 ${result.message}!\n\nPekerjaan *${jobNumber}* telah dimulai.\n⏱️ Timer berjalan...\nKetik /selesai ${jobNumber} saat selesai.` :
                      `❌ ${result.message}`
                  });
                } catch (error) {
                  console.error('Error in /mulai:', error);
                  await sock.sendMessage(from, { 
                    text: '❌ Gagal memulai pekerjaan.' 
                  });
                }
              }
              break;
              
            case '/selesai':
              if (!args[0]) {
                await sock.sendMessage(from, { 
                  text: '❌ Format: /selesai [job_number] [catatan]\nContoh: /selesai JOB001 Instalasi selesai dengan baik' 
                });
              } else {
                try {
                  const jobNumber = args[0].toUpperCase();
                  const notes = args.slice(1).join(' ') || '';
                  const phoneNum = from.split('@')[0];
                  const result = await db.completeJob(jobNumber, phoneNum, notes);
                  
                  await sock.sendMessage(from, { 
                    text: result.success ? 
                      `✅ ${result.message}!\n\nPekerjaan *${jobNumber}* telah diselesaikan.\n\nTerima kasih atas kerja keras Anda! 👏` :
                      `❌ ${result.message}`
                  });
                } catch (error) {
                  console.error('Error in /selesai:', error);
                  await sock.sendMessage(from, { 
                    text: '❌ Gagal menyelesaikan pekerjaan.' 
                  });
                }
              }
              break;
              
            case '/stats':
              try {
                const phoneNum = from.split('@')[0];
                const stats = await db.getTechnicianStats(phoneNum);
                
                if (!stats) {
                  await sock.sendMessage(from, { 
                    text: '❌ Anda belum terdaftar sebagai teknisi. Ketik /daftar untuk mendaftar.' 
                  });
                  break;
                }
                
                const statsText = `📊 *STATISTIK ANDA*

👤 ${pushName}

📋 Total Pekerjaan: ${stats.totalJobs}
✅ Selesai: ${stats.completedJobs}
⏳ Aktif: ${stats.activeJobs}
⭐ Rating: ${stats.avgRating ? stats.avgRating.toFixed(1) : '0'}/5

Tetap semangat! 💪`;
                await sock.sendMessage(from, { text: statsText });
              } catch (error) {
                console.error('Error in /stats:', error);
                await sock.sendMessage(from, { 
                  text: '❌ Gagal mengambil statistik.' 
                });
              }
              break;
              
            default:
              console.log('Unknown command:', command);
              await sock.sendMessage(from, { 
                text: '❓ Command tidak dikenal. Ketik /help untuk melihat daftar command.' 
              });
              console.log('✅ Unknown command response sent');
          }
          
          commandCount++;
          console.log(`✅ Command processed successfully: ${command}`);
          console.log('Total commands processed:', commandCount);
        } catch (error) {
          console.error('❌ ERROR in command processing:');
          console.error('Error name:', error.name);
          console.error('Error message:', error.message);
          console.error('Error stack:', error.stack);
          
          await sock.sendMessage(from, { 
            text: `❌ Error: ${error.message}\n\nSilakan coba lagi atau hubungi admin.` 
          });
        }
      } else {
        // Just log regular messages without responding
        console.log(`💬 Regular message from ${pushName}: ${text}`);
      }
    });

    // Handle errors
    sock.ev.on('error', (error) => {
      console.error('Socket error:', error);
    });

    // Export the socket instance for API integration
    global.whatsappSocket = sock;
    console.log('✅ WhatsApp socket exported globally for API integration');
    
    // Write status to file for server to read
    updateStatusFile();
    
    // Start monitoring functions
    monitorTestMessages();
    monitorNotifications();
    
    // Start periodic status updates
    setInterval(() => {
      updateStatusFile();
    }, 5000); // Update every 5 seconds

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    
    if (error.message.includes('ENOENT')) {
      console.log('\nCleaning corrupted session...');
      if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, { recursive: true, force: true });
      }
      console.log('Session cleaned. Restarting...');
      setTimeout(() => startWhatsAppBot(), 3000);
    } else {
      console.log('\nRestarting in 10 seconds...');
      setTimeout(() => startWhatsAppBot(), 10000);
    }
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n\nShutting down WhatsApp bot...');
  if (sock) {
    sock.ws.close();
  }
  process.exit(0);
});

// Start the bot
startWhatsAppBot();
