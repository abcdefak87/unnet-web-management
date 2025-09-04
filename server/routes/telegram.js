const express = require('express');
const router = express.Router();
// Lazy load to avoid circular dependency
let enhancedTelegramBot;
let telegramJobIntegration;
let telegramFileService;
const { authenticateToken } = require('../middleware/auth');

// Middleware to ensure bot is initialized
const ensureBot = async (req, res, next) => {
  try {
    // Lazy load enhancedTelegramBot
    if (!enhancedTelegramBot) {
      const EnhancedTelegramBot = require('../services/telegram/enhancedTelegramBot');
      enhancedTelegramBot = EnhancedTelegramBot.getInstance(process.env.TELEGRAM_BOT_TOKEN);
    }
    next();
  } catch (error) {
    console.error('Failed to initialize Telegram bot:', error);
    res.status(500).json({ error: 'Telegram bot not available' });
  }
};

// Webhook endpoint for Telegram Bot
router.post('/webhook', ensureBot, async (req, res) => {
  try {
    const { update } = req.body;
    
    // Process the webhook update
    const result = await enhancedTelegramBot.processTelegramWebhook(update);
    
    res.json(result);
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Admin endpoint to broadcast job to technicians
router.post('/broadcast-job/:jobId', authenticateToken, async (req, res) => {
  try {
    const { jobId } = req.params;
    
    // Get job with customer info
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const job = await prisma.job.findUnique({
      where: { id: parseInt(jobId) },
      include: { customer: true }
    });
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    // Lazy load enhancedTelegramBot
    if (!enhancedTelegramBot) {
      const EnhancedTelegramBot = require('../services/telegram/enhancedTelegramBot');
      enhancedTelegramBot = EnhancedTelegramBot.getInstance(process.env.TELEGRAM_BOT_TOKEN);
    }
    
    // Check if this is a settings issue - use appropriate broadcast method
    let result;
    if (job.type === 'REPAIR' && job.problemType === 'Masalah Settingan') {
      console.log(`🔧 MANUAL BROADCAST: Settings problem ${job.jobNumber} → ADMIN BOTS ONLY`);
      result = await enhancedTelegramBot.broadcastJobToAdmins(job);
    } else {
      console.log(`🚨 MANUAL BROADCAST: Regular job ${job.jobNumber} → ALL TECHNICIANS`);
      result = await enhancedTelegramBot.broadcastJobToTechnicians(job);
    }
    
    res.json({
      success: true,
      message: 'Job broadcasted to technicians',
      broadcastCount: result.broadcastCount,
      results: result.results
    });
  } catch (error) {
    console.error('Broadcast job error:', error);
    res.status(500).json({ error: 'Failed to broadcast job' });
  }
});

// Admin endpoint to send message to specific technician
router.post('/send-message', authenticateToken, async (req, res) => {
  try {
    const { technicianId, message } = req.body;
    
    if (!technicianId || !message) {
      return res.status(400).json({ error: 'Technician ID and message are required' });
    }
    
    // Get technician's Telegram chat ID
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const technician = await prisma.technician.findUnique({
      where: { id: parseInt(technicianId) }
    });
    
    if (!technician || !technician.telegramChatId) {
      return res.status(404).json({ error: 'Technician not found or no Telegram chat ID' });
    }
    
    // Lazy load enhancedTelegramBot
    if (!enhancedTelegramBot) {
      const EnhancedTelegramBot = require('../services/telegram/enhancedTelegramBot');
      enhancedTelegramBot = EnhancedTelegramBot.getInstance(process.env.TELEGRAM_BOT_TOKEN);
    }
    
    await enhancedTelegramBot.sendMessage(technician.telegramChatId, message);
    
    res.json({
      success: true,
      message: 'Message sent successfully'
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Admin endpoint to get bot info
router.get('/bot-info', authenticateToken, async (req, res) => {
  try {
    // Lazy load enhancedTelegramBot
    if (!enhancedTelegramBot) {
      const EnhancedTelegramBot = require('../services/telegram/enhancedTelegramBot');
      enhancedTelegramBot = EnhancedTelegramBot.getInstance(process.env.TELEGRAM_BOT_TOKEN);
    }
    
    const botInfo = await enhancedTelegramBot.getBotInfo();
    
    res.json({
      success: true,
      bot: {
        id: botInfo.id,
        username: botInfo.username,
        first_name: botInfo.first_name,
        can_join_groups: botInfo.can_join_groups,
        can_read_all_group_messages: botInfo.can_read_all_group_messages,
        supports_inline_queries: botInfo.supports_inline_queries
      }
    });
  } catch (error) {
    console.error('Get bot info error:', error);
    res.status(500).json({ error: 'Failed to get bot info' });
  }
});

// Admin endpoint to set webhook URL
router.post('/set-webhook', authenticateToken, async (req, res) => {
  try {
    const { webhookUrl } = req.body;
    
    if (!webhookUrl) {
      return res.status(400).json({ error: 'Webhook URL is required' });
    }
    
    // Lazy load enhancedTelegramBot
    if (!enhancedTelegramBot) {
      const EnhancedTelegramBot = require('../services/telegram/enhancedTelegramBot');
      enhancedTelegramBot = EnhancedTelegramBot.getInstance(process.env.TELEGRAM_BOT_TOKEN);
    }
    
    const result = await enhancedTelegramBot.bot.setWebHook(webhookUrl);
    
    res.json({
      success: true,
      message: 'Webhook set successfully',
      result
    });
  } catch (error) {
    console.error('Set webhook error:', error);
    res.status(500).json({ error: 'Failed to set webhook' });
  }
});

// Admin endpoint to get webhook info
router.get('/webhook-info', authenticateToken, async (req, res) => {
  try {
    // Lazy load enhancedTelegramBot
    if (!enhancedTelegramBot) {
      const EnhancedTelegramBot = require('../services/telegram/enhancedTelegramBot');
      enhancedTelegramBot = EnhancedTelegramBot.getInstance(process.env.TELEGRAM_BOT_TOKEN);
    }
    
    const webhookInfo = await enhancedTelegramBot.bot.getWebHookInfo();
    
    res.json({
      success: true,
      webhook: webhookInfo
    });
  } catch (error) {
    console.error('Get webhook info error:', error);
    res.status(500).json({ error: 'Failed to get webhook info' });
  }
});

// Admin endpoint to delete webhook (for development)
router.delete('/webhook', authenticateToken, async (req, res) => {
  try {
    // Lazy load enhancedTelegramBot
    if (!enhancedTelegramBot) {
      const EnhancedTelegramBot = require('../services/telegram/enhancedTelegramBot');
      enhancedTelegramBot = EnhancedTelegramBot.getInstance(process.env.TELEGRAM_BOT_TOKEN);
    }
    
    const result = await enhancedTelegramBot.bot.deleteWebHook();
    
    res.json({
      success: true,
      message: 'Webhook deleted successfully',
      result
    });
  } catch (error) {
    console.error('Delete webhook error:', error);
    res.status(500).json({ error: 'Failed to delete webhook' });
  }
});

// Admin endpoint to send job reminders
router.post('/send-reminders', authenticateToken, async (req, res) => {
  try {
    // Lazy load telegramJobIntegration
    if (!telegramJobIntegration) {
      telegramJobIntegration = require('../utils/telegramJobIntegration');
    }
    
    const result = await telegramJobIntegration.sendJobReminders();
    
    res.json({
      success: true,
      message: `Sent ${result.remindersSent} reminders`,
      ...result
    });
  } catch (error) {
    console.error('Send reminders error:', error);
    res.status(500).json({ error: 'Failed to send reminders' });
  }
});

// Admin endpoint to send daily summary
router.post('/send-daily-summary', authenticateToken, async (req, res) => {
  try {
    // Lazy load telegramJobIntegration
    if (!telegramJobIntegration) {
      telegramJobIntegration = require('../utils/telegramJobIntegration');
    }
    
    const result = await telegramJobIntegration.sendDailySummary();
    
    res.json({
      success: true,
      message: `Sent ${result.summariesSent} daily summaries`,
      ...result
    });
  } catch (error) {
    console.error('Send daily summary error:', error);
    res.status(500).json({ error: 'Failed to send daily summary' });
  }
});

// Admin endpoint to get technician stats
router.get('/technician-stats/:technicianId', authenticateToken, async (req, res) => {
  try {
    const { technicianId } = req.params;
    const { days = 30 } = req.query;
    
    // Lazy load telegramJobIntegration
    if (!telegramJobIntegration) {
      telegramJobIntegration = require('../utils/telegramJobIntegration');
    }
    
    const stats = await telegramJobIntegration.getTechnicianStats(technicianId, parseInt(days));
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Get technician stats error:', error);
    res.status(500).json({ error: 'Failed to get technician stats' });
  }
});

// Admin endpoint to cleanup old files
router.post('/cleanup-files', authenticateToken, async (req, res) => {
  try {
    const { daysOld = 30 } = req.body;
    
    // Lazy load telegramFileService
    if (!telegramFileService) {
      telegramFileService = require('../services/telegramFileService');
    }
    
    const result = await telegramFileService.cleanupOldFiles(daysOld);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Cleanup files error:', error);
    res.status(500).json({ error: 'Failed to cleanup files' });
  }
});

// Bot status endpoint
router.get('/status', authenticateToken, async (req, res) => {
  try {
    // Lazy load enhancedTelegramBot
    if (!enhancedTelegramBot) {
      const EnhancedTelegramBot = require('../services/telegram/enhancedTelegramBot');
      enhancedTelegramBot = EnhancedTelegramBot.getInstance(process.env.TELEGRAM_BOT_TOKEN);
    }
    
    const botInfo = await enhancedTelegramBot.getBotInfo();
    
    res.json({
      status: botInfo ? 'active' : 'offline',
      message: botInfo ? `Bot active: ${botInfo.username}` : 'Bot is not responding',
      botInfo
    });
  } catch (error) {
    console.error('Bot status error:', error);
    res.json({
      status: 'error',
      message: 'Failed to get bot status'
    });
  }
});

// Bot statistics endpoint
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const totalTechnicians = await prisma.technician.count();
    const activeTechnicians = await prisma.technician.count({ 
      where: { isActive: true } 
    });
    const activeJobs = await prisma.job.count({ 
      where: { 
        status: { 
          in: ['OPEN', 'ASSIGNED'] 
        } 
      } 
    });
    
    // Count admin bots (only superadmin users with Telegram connection)
    const systemAdminBots = await prisma.user.count({
      where: {
        role: 'superadmin',
        telegramChatId: { not: null }
      }
    });
    const totalAdminBots = systemAdminBots;
    
    // Mock total messages for now - could be tracked in database
    const totalMessages = await prisma.job.count() * 3; // Estimate 3 messages per job
    
    await prisma.$disconnect();
    
    res.json({
      totalTechnicians,
      activeTechnicians,
      totalMessages,
      activeJobs,
      totalAdminBots
    });
  } catch (error) {
    console.error('Bot stats error:', error);
    res.status(500).json({ error: 'Failed to get bot statistics' });
  }
});

// Test bot endpoint
router.post('/test', authenticateToken, async (req, res) => {
  try {
    // Lazy load enhancedTelegramBot
    if (!enhancedTelegramBot) {
      const EnhancedTelegramBot = require('../services/telegram/enhancedTelegramBot');
      enhancedTelegramBot = EnhancedTelegramBot.getInstance(process.env.TELEGRAM_BOT_TOKEN);
    }
    
    const botInfo = await enhancedTelegramBot.getBotInfo();
    
    if (botInfo) {
      res.json({
        success: true,
        message: 'Bot test successful',
        botInfo
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Bot test failed - no response'
      });
    }
  } catch (error) {
    console.error('Bot test error:', error);
    res.status(500).json({
      success: false,
      message: 'Bot test failed',
      error: error.message
    });
  }
});

module.exports = router;
