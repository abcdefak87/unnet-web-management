const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requirePermission } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Get all pending registrations
router.get('/', authenticateToken, requirePermission('technicians:view'), async (req, res) => {
  try {
    const registrations = await prisma.technicianRegistration.findMany({
      include: {
        approvedBy: { select: { name: true } },
        rejectedBy: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: registrations
    });
  } catch (error) {
    console.error('Get registrations error:', error);
    res.status(500).json({ error: 'Failed to fetch registrations' });
  }
});

// Approve registration
router.post('/:id/approve', authenticateToken, requirePermission('technicians:create'), [
  body('name').isLength({ min: 2 }).trim(),
  body('phone').isMobilePhone('id-ID').trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, phone } = req.body;
    
    // Auto-detect admin bot status based on approver's role
    const approver = await prisma.user.findUnique({
      where: { id: req.user.id }
    });
    const isAdmin = approver && (approver.role === 'superadmin' || approver.role === 'admin');
    const registrationId = req.params.id;

    // Get registration
    const registration = await prisma.technicianRegistration.findUnique({
      where: { id: registrationId }
    });

    if (!registration) {
      return res.status(404).json({ error: 'Registration not found' });
    }

    if (registration.status !== 'PENDING') {
      return res.status(400).json({ error: 'Registration already processed' });
    }

    // Check if phone already exists as an active technician
    const existingTechnician = await prisma.technician.findFirst({
      where: { 
        phone,
        isActive: true
      }
    });

    if (existingTechnician) {
      return res.status(400).json({ error: 'Phone number already registered as active technician' });
    }

    // Check if there's a deleted technician with this phone that can be reactivated
    const deletedTechnician = await prisma.technician.findFirst({
      where: { phone }
    });

    let technician;
    if (deletedTechnician) {
      // Reactivate existing technician
      technician = await prisma.technician.update({
        where: { id: deletedTechnician.id },
        data: {
          name,
          telegramChatId: registration.telegramChatId,
          isActive: true,
          isAvailable: true,
          isAdmin: false  // Regular technicians are not admin bots
        }
      });
    } else {
      // Create new technician
      technician = await prisma.technician.create({
        data: {
          name,
          phone,
          telegramChatId: registration.telegramChatId,
          isActive: true,
          isAvailable: true,
          isAdmin: false  // Regular technicians are not admin bots
        }
      });
    }


    // Update registration status
    await prisma.technicianRegistration.update({
      where: { id: registrationId },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedById: req.user.id
      }
    });

    // Notify technician via Telegram
    try {
      const EnhancedTelegramBot = require('../services/enhancedTelegramBot');
      const bot = EnhancedTelegramBot.getInstance(process.env.TELEGRAM_BOT_TOKEN);
      const message = `🎉 <b>Registrasi Disetujui!</b>

✅ Selamat! Anda telah disetujui sebagai teknisi UNNET.

📋 <b>Detail Akun:</b>
👤 Nama: <b>${name}</b>
📞 HP: <b>${phone}</b>
🤖 Role: <b>Teknisi</b>

🔧 <b>Sebagai Teknisi:</b>
✅ Menerima notifikasi job baru
✅ Dapat mengambil dan menyelesaikan job

🚀 <b>Mulai menggunakan bot:</b>
/help - Lihat semua perintah
/jobs - Lihat job tersedia
/status - Status job Anda

Selamat bergabung dengan tim UNNET! 🎉`;

      await bot.sendMessage(registration.telegramChatId, message);
    } catch (notifyError) {
      console.error('Failed to notify technician:', notifyError);
    }

    res.json({
      success: true,
      message: 'Registration approved successfully',
      data: { technician }
    });
  } catch (error) {
    console.error('Approve registration error:', error);
    res.status(500).json({ error: 'Failed to approve registration' });
  }
});

// Reject registration
router.post('/:id/reject', authenticateToken, requirePermission('technicians:edit'), [
  body('reason').isLength({ min: 3 }).trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { reason } = req.body;
    const registrationId = req.params.id;

    // Get registration
    const registration = await prisma.technicianRegistration.findUnique({
      where: { id: registrationId }
    });

    if (!registration) {
      return res.status(404).json({ error: 'Registration not found' });
    }

    if (registration.status !== 'PENDING') {
      return res.status(400).json({ error: 'Registration already processed' });
    }

    // Update registration status
    await prisma.technicianRegistration.update({
      where: { id: registrationId },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectedById: req.user.id,
        rejectionReason: reason
      }
    });

    // Notify technician via Telegram
    try {
      const EnhancedTelegramBot = require('../services/enhancedTelegramBot');
      const bot = EnhancedTelegramBot.getInstance(process.env.TELEGRAM_BOT_TOKEN);
      const message = `❌ <b>Registrasi Ditolak</b>

Maaf, registrasi Anda sebagai teknisi UNNET tidak dapat disetujui.

📝 <b>Alasan:</b> ${reason}

💡 <b>Langkah selanjutnya:</b>
- Anda dapat mendaftar ulang dengan /start
- Pastikan informasi yang diberikan sudah benar
- Hubungi admin jika ada pertanyaan

Terima kasih atas minat Anda bergabung dengan UNNET.`;

      await bot.sendMessage(registration.telegramChatId, message);
    } catch (notifyError) {
      console.error('Failed to notify technician:', notifyError);
    }

    res.json({
      success: true,
      message: 'Registration rejected successfully'
    });
  } catch (error) {
    console.error('Reject registration error:', error);
    res.status(500).json({ error: 'Failed to reject registration' });
  }
});

// Delete registration
router.delete('/:id', authenticateToken, requirePermission('technicians:delete'), async (req, res) => {
  try {
    await prisma.technicianRegistration.delete({
      where: { id: req.params.id }
    });

    res.json({ 
      success: true,
      message: 'Registration deleted successfully' 
    });
  } catch (error) {
    console.error('Delete registration error:', error);
    res.status(500).json({ error: 'Failed to delete registration' });
  }
});

module.exports = router;
