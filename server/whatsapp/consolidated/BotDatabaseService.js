/**
 * Bot Database Service
 * Handles database operations for WhatsApp bot
 */

const prisma = require('../../utils/database');

class BotDatabaseService {
  // Helper: normalize phone to 62 format
  normalizePhone(phone) {
    if (!phone) return null;
    let p = phone.toString().replace(/\D/g, '');
    if (p.startsWith('0')) p = '62' + p.substring(1);
    if (!p.startsWith('62')) p = '62' + p;
    return p;
  }

  // Check existing technician by phone/jid
  async checkExistingTechnician(phone) {
    try {
      const normalized = this.normalizePhone(phone);
      const technician = await prisma.technician.findFirst({
        where: {
          OR: [
            { phone: normalized },
            { whatsappJid: normalized ? normalized + '@s.whatsapp.net' : undefined }
          ]
        }
      });
      return !!technician;
    } catch (error) {
      console.error('Error checking existing technician:', error);
      return false;
    }
  }

  // Check TechnicianRegistration status by phone
  async getTechnicianRegistrationStatus(phone) {
    try {
      const normalized = this.normalizePhone(phone);
      const reg = await prisma.technicianRegistration.findFirst({
        where: { phone: normalized, status: 'PENDING' }
      });
      return reg;
    } catch (error) {
      console.error('Error getting technician registration status:', error);
      return null;
    }
  }

  // Create TechnicianRegistration entry
  async createTechnicianRegistration({ name, phone, whatsappJid }) {
    try {
      const normalized = this.normalizePhone(phone);
      const [firstName, ...rest] = (name || '').trim().split(' ').filter(Boolean);
      const lastName = rest.join(' ') || null;

      const reg = await prisma.technicianRegistration.create({
        data: {
          telegramChatId: whatsappJid || (normalized ? normalized + '@s.whatsapp.net' : null),
          telegramUsername: null,
          firstName: firstName || (name || 'Teknisi'),
          lastName,
          phone: normalized,
          status: 'PENDING'
        }
      });
      return reg;
    } catch (error) {
      console.error('Error creating technician registration:', error);
      throw error;
    }
  }
  // Get technician by WhatsApp JID
  async getTechnicianByJid(jid) {
    try {
      return await prisma.technician.findUnique({
        where: { whatsappJid: jid }
      });
    } catch (error) {
      console.error('Error getting technician by JID:', error);
      return null;
    }
  }

  // Register new technician
  async registerTechnician(phoneNumber, name) {
    try {
      const normalized = this.normalizePhone(phoneNumber);
      const whatsappJid = normalized + '@s.whatsapp.net';
      
      // Check if already registered
      const existing = await prisma.technician.findFirst({
        where: {
          OR: [
            { whatsappJid },
            { phone: normalized }
          ]
        }
      });

      if (existing) {
        return { success: false, message: 'Nomor ini sudah terdaftar!' };
      }

      await prisma.technician.create({
        data: {
          name: name,
          phone: normalized,
          whatsappJid: whatsappJid,
          isActive: true,
          isAvailable: true
        }
      });

      return { success: true, message: 'Berhasil mendaftar sebagai teknisi!' };
    } catch (error) {
      console.error('Error registering technician:', error);
      return { success: false, message: 'Gagal mendaftar: ' + error.message };
    }
  }

  // Get available jobs
  async getAvailableJobs() {
    try {
      return await prisma.job.findMany({
        where: {
          status: 'OPEN'
        },
        include: {
          customer: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    } catch (error) {
      console.error('Error getting available jobs:', error);
      return [];
    }
  }

  // Get technician's assigned jobs
  async getTechnicianJobs(technicianId) {
    try {
      return await prisma.job.findMany({
        where: {
          technicianId: technicianId,
          status: {
            in: ['ASSIGNED', 'IN_PROGRESS']
          }
        },
        include: {
          customer: true
        }
      });
    } catch (error) {
      console.error('Error getting technician jobs:', error);
      return [];
    }
  }

  // Assign job to technician
  async assignJob(jobId, technicianId) {
    try {
      return await prisma.job.update({
        where: { id: jobId },
        data: {
          technicianId: technicianId,
          status: 'ASSIGNED'
        }
      });
    } catch (error) {
      console.error('Error assigning job:', error);
      throw error;
    }
  }

  // Update job status
  async updateJobStatus(jobId, status) {
    try {
      return await prisma.job.update({
        where: { id: jobId },
        data: { status }
      });
    } catch (error) {
      console.error('Error updating job status:', error);
      throw error;
    }
  }

  // Get technician statistics
  async getTechnicianStats(technicianId) {
    try {
      const technician = await prisma.technician.findUnique({
        where: { 
          OR: [
            { whatsappJid: technicianId + '@s.whatsapp.net' },
            { phone: technicianId }
          ]
        }
      });

      if (!technician) {
        return null;
      }

      const completedJobs = await prisma.job.count({
        where: {
          technicianId: technician.id,
          status: 'COMPLETED'
        }
      });

      const activeJobs = await prisma.job.count({
        where: {
          technicianId: technician.id,
          status: {
            in: ['ASSIGNED', 'IN_PROGRESS']
          }
        }
      });

      const totalJobs = completedJobs + activeJobs;

      return {
        totalJobs,
        completedJobs,
        activeJobs,
        avgRating: 4.5 // Placeholder for now
      };
    } catch (error) {
      console.error('Error getting technician stats:', error);
      return null;
    }
  }

  // Assign job to technician with phone number
  async assignJobToTechnician(jobNumber, phoneNum) {
    try {
      // Find technician by phone
      const technician = await prisma.technician.findFirst({
        where: { 
          OR: [
            { whatsappJid: phoneNum + '@s.whatsapp.net' },
            { phone: phoneNum }
          ]
        }
      });

      if (!technician) {
        return { success: false, message: 'Anda belum terdaftar sebagai teknisi. Silakan /daftar terlebih dahulu.' };
      }

      // Find job by number
      const job = await prisma.job.findFirst({
        where: { jobNumber }
      });

      if (!job) {
        return { success: false, message: 'Pekerjaan tidak ditemukan.' };
      }

      if (job.status !== 'OPEN') {
        return { success: false, message: 'Pekerjaan ini sudah diambil atau selesai.' };
      }

      // Assign job
      await prisma.job.update({
        where: { id: job.id },
        data: {
          technicianId: technician.id,
          status: 'ASSIGNED',
          assignedAt: new Date()
        }
      });

      return { success: true, message: 'Pekerjaan berhasil diambil' };
    } catch (error) {
      console.error('Error assigning job:', error);
      return { success: false, message: 'Gagal mengambil pekerjaan: ' + error.message };
    }
  }

  // Start job
  async startJob(jobNumber, phoneNum) {
    try {
      // Find technician
      const technician = await prisma.technician.findFirst({
        where: { 
          OR: [
            { whatsappJid: phoneNum + '@s.whatsapp.net' },
            { phone: phoneNum }
          ]
        }
      });

      if (!technician) {
        return { success: false, message: 'Anda belum terdaftar sebagai teknisi.' };
      }

      // Find job
      const job = await prisma.job.findFirst({
        where: { 
          jobNumber,
          technicianId: technician.id
        }
      });

      if (!job) {
        return { success: false, message: 'Pekerjaan tidak ditemukan atau bukan milik Anda.' };
      }

      if (job.status !== 'ASSIGNED') {
        return { success: false, message: 'Pekerjaan sudah dimulai atau selesai.' };
      }

      // Update job status
      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: 'IN_PROGRESS',
          startedAt: new Date()
        }
      });

      return { success: true, message: 'Pekerjaan dimulai' };
    } catch (error) {
      console.error('Error starting job:', error);
      return { success: false, message: 'Gagal memulai pekerjaan: ' + error.message };
    }
  }

  // Complete job
  async completeJob(jobNumber, phoneNum, notes = '') {
    try {
      // Find technician
      const technician = await prisma.technician.findFirst({
        where: { 
          OR: [
            { whatsappJid: phoneNum + '@s.whatsapp.net' },
            { phone: phoneNum }
          ]
        }
      });

      if (!technician) {
        return { success: false, message: 'Anda belum terdaftar sebagai teknisi.' };
      }

      // Find job
      const job = await prisma.job.findFirst({
        where: { 
          jobNumber,
          technicianId: technician.id
        }
      });

      if (!job) {
        return { success: false, message: 'Pekerjaan tidak ditemukan atau bukan milik Anda.' };
      }

      if (job.status === 'COMPLETED') {
        return { success: false, message: 'Pekerjaan sudah selesai.' };
      }

      // Update job status
      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          notes: notes || job.notes
        }
      });

      return { success: true, message: 'Pekerjaan selesai' };
    } catch (error) {
      console.error('Error completing job:', error);
      return { success: false, message: 'Gagal menyelesaikan pekerjaan: ' + error.message };
    }
  }

  // Get pending notifications
  async getPendingNotifications() {
    try {
      const notifs = await prisma.notification.findMany({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
        take: 20
      });
      return notifs;
    } catch (error) {
      console.error('Error getting notifications:', error);
      return [];
    }
  }

  // Mark notification as sent
  async markNotificationSent(notificationId) {
    try {
      await prisma.notification.update({
        where: { id: notificationId },
        data: { status: 'SENT', sentAt: new Date() }
      });
      return true;
    } catch (error) {
      console.error('Error marking notification:', error);
      return false;
    }
  }
}

module.exports = new BotDatabaseService();
