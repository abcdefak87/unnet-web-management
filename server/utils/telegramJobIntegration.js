// Lazy load telegramService to avoid circular dependency
let telegramService;
const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');
const prisma = new PrismaClient();

// Auto-broadcast ALL jobs to Telegram immediately when created (no approval needed)
const broadcastNewJob = async (job) => {
  try {
    // Get job with customer info
    const jobWithCustomer = await prisma.job.findUnique({
      where: { id: job.id },
      include: { 
        customer: true,
        approvedBy: { select: { name: true } }
      }
    });

    if (!jobWithCustomer) {
      logger.error('Job not found for broadcast:', { jobId: job.id });
      return { success: false, error: 'Job not found' };
    }

    // Lazy load enhancedTelegramBot instead of telegramService
    if (!telegramService) {
      const EnhancedTelegramBot = require('../services/enhancedTelegramBot');
      telegramService = EnhancedTelegramBot.getInstance(process.env.TELEGRAM_BOT_TOKEN);
    }

    // Debug logging for problem type detection
    logger.debug('Job broadcast debug', {
      jobNumber: jobWithCustomer.jobNumber,
      jobType: jobWithCustomer.type,
      problemType: jobWithCustomer.problemType,
      isSettingsIssue: jobWithCustomer.type === 'REPAIR' && jobWithCustomer.problemType === 'Masalah Settingan',
      fullJob: jobWithCustomer
    });

    // Check if this is a settings problem - broadcast to admins only
    // Match exact value from dropdown: "Masalah Settingan"
    const isSettingsIssue = jobWithCustomer.type === 'REPAIR' && 
      jobWithCustomer.problemType === 'Masalah Settingan';

    if (isSettingsIssue) {
      logger.info(`Settings problem broadcast to admins only`, { jobNumber: jobWithCustomer.jobNumber });
      const telegramResult = await telegramService.broadcastJobToAdmins(jobWithCustomer);
      
      return {
        success: true,
        telegram: telegramResult,
        jobNumber: jobWithCustomer.jobNumber,
        broadcastType: 'admin_only',
        automatic: true
      };
    } else {
      logger.info(`Regular job broadcast to all technicians`, { jobNumber: jobWithCustomer.jobNumber });
      // Broadcast to ALL technicians automatically
      const telegramResult = await telegramService.broadcastJobToTechnicians(jobWithCustomer);
      
      return {
        success: true,
        telegram: telegramResult,
        jobNumber: jobWithCustomer.jobNumber,
        broadcastType: 'all_technicians',
        automatic: true
      };
    }
  } catch (error) {
    logger.error('Job broadcast error:', { error: error.message, stack: error.stack });
    return { success: false, error: error.message };
  }
};

// Send job status updates to assigned technicians
const notifyJobStatusChange = async (jobId, newStatus, additionalMessage = '') => {
  try {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        customer: true,
        technicians: {
          include: {
            technician: true
          }
        }
      }
    });

    if (!job || job.technicians.length === 0) {
      return { success: false, error: 'Job or technicians not found' };
    }

    const statusMessages = {
      'ASSIGNED': '✅ Job telah ditugaskan kepada Anda',
      'IN_PROGRESS': '🔄 Job sedang dalam proses',
      'COMPLETED': '✅ Job telah selesai',
      'CANCELLED': '❌ Job telah dibatalkan',
      'ON_HOLD': '⏸️ Job ditunda sementara'
    };

    const statusMessage = statusMessages[newStatus] || `📋 Status job berubah: ${newStatus}`;
    
    const message = `🔔 <b>Update Status Job</b>

📋 Job: <b>${job.jobNumber}</b>
👤 Pelanggan: <b>${job.customer.name}</b>
📍 Alamat: <b>${job.address}</b>
📊 Status: <b>${statusMessage}</b>

${additionalMessage ? `📝 Catatan: ${additionalMessage}` : ''}`;

    const results = [];
    for (const assignment of job.technicians) {
      const technician = assignment.technician;
      
      if (technician.telegramChatId) {
        try {
          // Lazy load telegramService to avoid circular dependency
          if (!telegramService) {
            telegramService = require('../services/telegramService');
          }
          await telegramService.sendTelegramMessage(technician.telegramChatId, message);
          results.push({ technicianId: technician.id, platform: 'telegram', success: true });
        } catch (error) {
          logger.error(`Telegram notification failed for technician`, { technicianId: technician.id, error: error.message });
          results.push({ technicianId: technician.id, platform: 'telegram', success: false, error: error.message });
        }
      } else {
        logger.warn(`Technician has no Telegram chat ID configured`, { technicianId: technician.id });
        results.push({ technicianId: technician.id, platform: 'telegram', success: false, error: 'No Telegram chat ID' });
      }
    }

    return {
      success: true,
      jobNumber: job.jobNumber,
      notificationsSent: results.filter(r => r.success).length,
      results
    };
  } catch (error) {
    logger.error('Job status notification error:', { error: error.message, stack: error.stack });
    return { success: false, error: error.message };
  }
};

// Send reminder to technicians about pending jobs
const sendJobReminders = async () => {
  try {
    const pendingJobs = await prisma.jobTechnician.findMany({
      where: {
        acceptedAt: {
          not: null
        },
        completedAt: null,
        job: {
          status: {
            in: ['ASSIGNED', 'IN_PROGRESS']
          },
          createdAt: {
            lt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
          }
        }
      },
      include: {
        job: {
          include: {
            customer: true
          }
        },
        technician: true
      }
    });

    const results = [];
    for (const assignment of pendingJobs) {
      const { job, technician } = assignment;
      const hoursAgo = Math.floor((Date.now() - new Date(job.createdAt).getTime()) / (1000 * 60 * 60));

      const reminderMessage = `⏰ <b>Pengingat Job</b>

📋 Job: <b>${job.jobNumber}</b>
👤 Pelanggan: <b>${job.customer.name}</b>
📞 Telepon: <code>${job.customer.phone}</code>
📍 Alamat: <b>${job.address}</b>
⏱️ Dibuat: ${hoursAgo} jam yang lalu

Jangan lupa untuk menyelesaikan job ini dan kirim foto dokumentasi.

Gunakan /selesai ${job.jobNumber} setelah pekerjaan selesai.`;

      if (technician.telegramChatId) {
        try {
          // Lazy load telegramService to avoid circular dependency
          if (!telegramService) {
            telegramService = require('../services/telegramService');
          }
          await telegramService.sendTelegramMessage(technician.telegramChatId, reminderMessage);
          results.push({ jobId: job.id, technicianId: technician.id, success: true });
        } catch (error) {
          logger.error(`Reminder failed for technician`, { technicianId: technician.id, error: error.message });
          results.push({ jobId: job.id, technicianId: technician.id, success: false, error: error.message });
        }
      }
    }

    return {
      success: true,
      remindersSent: results.filter(r => r.success).length,
      totalPendingJobs: pendingJobs.length,
      results
    };
  } catch (error) {
    logger.error('Job reminders error:', { error: error.message, stack: error.stack });
    return { success: false, error: error.message };
  }
};

// Send daily summary to technicians
const sendDailySummary = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const technicians = await prisma.technician.findMany({
      where: {
        isActive: true,
        telegramChatId: {
          not: null
        }
      }
    });

    const results = [];
    for (const technician of technicians) {
      // Get today's completed jobs
      const completedToday = await prisma.jobTechnician.findMany({
        where: {
          technicianId: technician.id,
          completedAt: {
            gte: today,
            lt: tomorrow
          }
        },
        include: {
          job: {
            include: {
              customer: true
            }
          }
        }
      });

      // Get active jobs
      const activeJobs = await prisma.jobTechnician.findMany({
        where: {
          technicianId: technician.id,
          completedAt: null,
          job: {
            status: {
              in: ['ASSIGNED', 'IN_PROGRESS']
            }
          }
        },
        include: {
          job: {
            include: {
              customer: true
            }
          }
        }
      });

      let summaryMessage = `📊 <b>Ringkasan Harian</b>
📅 ${today.toLocaleDateString('id-ID')}

✅ <b>Job Selesai Hari Ini:</b> ${completedToday.length}
🔄 <b>Job Aktif:</b> ${activeJobs.length}

`;

      if (completedToday.length > 0) {
        summaryMessage += `<b>Job yang diselesaikan:</b>\n`;
        completedToday.forEach((assignment, index) => {
          summaryMessage += `${index + 1}. ${assignment.job.jobNumber} - ${assignment.job.customer.name}\n`;
        });
        summaryMessage += '\n';
      }

      if (activeJobs.length > 0) {
        summaryMessage += `<b>Job yang masih aktif:</b>\n`;
        activeJobs.forEach((assignment, index) => {
          summaryMessage += `${index + 1}. ${assignment.job.jobNumber} - ${assignment.job.customer.name}\n`;
        });
      }

      summaryMessage += `\nTerima kasih atas kerja keras Anda! 💪`;

      try {
        // Lazy load telegramService to avoid circular dependency
        if (!telegramService) {
          telegramService = require('../services/telegramService');
        }
        await telegramService.sendTelegramMessage(technician.telegramChatId, summaryMessage);
        results.push({ technicianId: technician.id, success: true });
      } catch (error) {
        logger.error(`Daily summary failed for technician`, { technicianId: technician.id, error: error.message });
        results.push({ technicianId: technician.id, success: false, error: error.message });
      }
    }

    return {
      success: true,
      summariesSent: results.filter(r => r.success).length,
      totalTechnicians: technicians.length,
      results
    };
  } catch (error) {
    logger.error('Daily summary error:', { error: error.message, stack: error.stack });
    return { success: false, error: error.message };
  }
};

// Get technician performance stats
const getTechnicianStats = async (technicianId, days = 30) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await prisma.jobTechnician.findMany({
      where: {
        technicianId,
        acceptedAt: {
          gte: startDate
        }
      },
      include: {
        job: true
      }
    });

    const completed = stats.filter(s => s.completedAt).length;
    const pending = stats.filter(s => !s.completedAt).length;
    const avgCompletionTime = stats
      .filter(s => s.completedAt && s.acceptedAt)
      .reduce((acc, s) => {
        const hours = (new Date(s.completedAt) - new Date(s.acceptedAt)) / (1000 * 60 * 60);
        return acc + hours;
      }, 0) / completed || 0;

    return {
      totalJobs: stats.length,
      completed,
      pending,
      completionRate: stats.length > 0 ? (completed / stats.length * 100).toFixed(1) : 0,
      avgCompletionTimeHours: avgCompletionTime.toFixed(1),
      period: `${days} hari terakhir`
    };
  } catch (error) {
    logger.error('Technician stats error:', { error: error.message, stack: error.stack });
    throw error;
  }
};

module.exports = {
  broadcastNewJob,
  notifyJobStatusChange,
  sendJobReminders,
  sendDailySummary,
  getTechnicianStats
};
