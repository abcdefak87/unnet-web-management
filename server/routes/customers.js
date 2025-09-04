const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireRole, requirePermission } = require('../middleware/auth');
const { PERMISSIONS } = require('../utils/permissions');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const prisma = new PrismaClient();

// Configure multer for customer registration uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/customers/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Get all customers
router.get('/', authenticateToken, requirePermission('customers:view'), [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('search').optional()
], async (req, res) => {
  try {
    console.log('=== CUSTOMERS API REQUEST ===');
    console.log('User:', req.user?.email, 'Role:', req.user?.role, 'Permissions:', req.user?.permissions);
    console.log('Query params:', req.query);
    console.log('Headers:', req.headers.authorization ? 'Token present' : 'No token');
    
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Customer query validation errors:', errors.array());
      return res.status(400).json({ 
        error: 'Invalid query parameters',
        details: errors.array()
      });
    }

    const { page = 1, limit = 20, search } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (search && search.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { phone: { contains: search.trim() } },
        { address: { contains: search.trim(), mode: 'insensitive' } }
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          _count: {
            select: { jobs: true }
          }
        },
        orderBy: { name: 'asc' },
        skip: parseInt(skip),
        take: parseInt(limit)
      }),
      prisma.customer.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        customers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get customers error:', error);
    
    // Handle specific Prisma errors
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'No customers found' });
    }
    
    // Handle search query errors
    if (error.message.includes('Invalid') || error.message.includes('contains')) {
      return res.status(400).json({ error: 'Invalid search query' });
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch customers',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get single customer with jobs
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: {
        jobs: {
          include: {
            technicians: {
              include: {
                technician: {
                  select: { id: true, name: true }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({ customer });
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

// Create new customer
router.post('/', authenticateToken, requirePermission('customers:create'), [
  body('name').isLength({ min: 2 }).trim(),
  body('phone').notEmpty().trim(),
  body('address').isLength({ min: 5 }).trim(),
  body('email').optional().custom((value) => {
    if (value && value.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        throw new Error('Format email tidak valid');
      }
    }
    return true;
  }),
  // KTP validation for new installations
  body('ktpName').optional().isLength({ min: 2 }).trim(),
  body('ktpNumber').optional().isLength({ min: 14, max: 16 }).trim(),
  body('ktpAddress').optional().isLength({ min: 5 }).trim(),
  body('ktpPhotoUrl').optional().trim(),
  body('shareLocation').optional().trim(),
  body('installationType').optional().isIn(['NEW_INSTALLATION', 'RELOCATION', 'UPGRADE'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Customer validation errors:', errors.array());
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array(),
        message: errors.array().map(e => `${e.path}: ${e.msg}`).join(', ')
      });
    }

    const { 
      name, 
      phone, 
      address, 
      email,
      latitude,
      longitude,
      ktpName,
      ktpNumber,
      ktpAddress,
      ktpPhotoUrl,
      shareLocation,
      installationType
    } = req.body;

    // Validate KTP requirements for new installations
    if (installationType === 'NEW_INSTALLATION') {
      if (!ktpName || !ktpNumber || !shareLocation || !ktpPhotoUrl) {
        return res.status(400).json({ 
          error: 'Data KTP lengkap wajib untuk pemasangan baru',
          required: ['ktpName', 'ktpNumber', 'shareLocation', 'ktpPhotoUrl']
        });
      }
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        phone,
        address,
        email: email && email.trim() !== '' ? email.trim() : null,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        ktpName: ktpName || null,
        ktpNumber: ktpNumber || null,
        ktpAddress: ktpAddress || null,
        ktpPhotoUrl: ktpPhotoUrl || null,
        shareLocation: shareLocation || null,
        installationType: installationType || null,
        isVerified: false
      },
      include: {
        _count: {
          select: {
            jobs: true
          }
        }
      }
    });

    try {
      const broadcastCustomerUpdate = require('../services/websocketService').broadcastCustomerUpdate;
      broadcastCustomerUpdate(customer, 'created');
    } catch (wsError) {
      console.error('WebSocket broadcast error:', wsError);
    }

    res.status(201).json(customer);
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

// Update customer
router.put('/:id', authenticateToken, requirePermission('customers:edit'), [
  body('name').isLength({ min: 2 }).trim().optional(),
  body('phone').notEmpty().trim().optional(),
  body('address').isLength({ min: 5 }).trim().optional(),
  body('email').optional().custom((value) => {
    if (value && value.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        throw new Error('Format email tidak valid');
      }
    }
    return true;
  })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, phone, address, email } = req.body;
    const updateData = {};

    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (address) updateData.address = address;
    if (email !== undefined) updateData.email = email && email.trim() !== '' ? email.trim() : null;

    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: updateData
    });

    try {
      const broadcastCustomerUpdate = require('../services/websocketService').broadcastCustomerUpdate;
      broadcastCustomerUpdate(customer, 'updated');
    } catch (wsError) {
      console.error('WebSocket broadcast error:', wsError);
    }

    res.json({ 
      success: true,
      message: 'Customer updated successfully', 
      data: { customer }
    });
  } catch (error) {
    console.error('Update customer error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

// Delete customer
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    // Check if customer has jobs
    const jobCount = await prisma.job.count({
      where: { customerId: req.params.id }
    });

    if (jobCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete customer with existing jobs',
        details: `Customer has ${jobCount} job(s). Please complete or reassign jobs first.`
      });
    }

    const customer = await prisma.customer.delete({
      where: { id: req.params.id }
    });

    try {
      const broadcastCustomerUpdate = require('../services/websocketService').broadcastCustomerUpdate;
      broadcastCustomerUpdate(customer, 'deleted');
    } catch (wsError) {
      console.error('WebSocket broadcast error:', wsError);
    }

    res.json({ 
      success: true,
      message: 'Customer deleted successfully' 
    });
  } catch (error) {
    console.error('Delete customer error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

// Customer registration endpoint (public - no auth required)
router.post('/register', upload.fields([
  { name: 'ktpPhoto', maxCount: 1 },
  { name: 'housePhoto', maxCount: 1 }
]), [
  body('name').isLength({ min: 1 }).trim().withMessage('Nama wajib diisi'),
  body('phone').isMobilePhone('id-ID').withMessage('Nomor HP tidak valid'),
  body('address').isLength({ min: 10 }).trim().withMessage('Alamat minimal 10 karakter'),
  body('ktpNumber').isLength({ min: 14, max: 16 }).isNumeric().withMessage('Nomor KTP harus 14-16 digit angka'),
  body('ktpName').isLength({ min: 1 }).trim().withMessage('Nama sesuai KTP wajib diisi'),
  body('ktpAddress').isLength({ min: 10 }).trim().withMessage('Alamat KTP minimal 10 karakter'),
  body('packageType').isIn(['10MBPS', '20MBPS', '50MBPS', '100MBPS']).withMessage('Paket tidak valid')
], async (req, res) => {
  try {
    console.log('=== CUSTOMER REGISTRATION ===');
    console.log('Request body:', req.body);
    console.log('Files:', req.files);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ 
        error: 'Data tidak valid', 
        details: errors.array() 
      });
    }

    const {
      name, phone, address, ktpNumber, ktpName, 
      ktpAddress, shareLocation, packageType, installationType
    } = req.body;

    // Check if customer already exists
    const existingCustomer = await prisma.customer.findFirst({
      where: {
        OR: [
          { phone: phone },
          { ktpNumber: ktpNumber }
        ]
      }
    });

    if (existingCustomer) {
      return res.status(400).json({
        error: 'Pelanggan sudah terdaftar',
        details: 'Nomor HP atau KTP sudah digunakan'
      });
    }

    // Prepare customer data
    const customerData = {
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      ktpNumber: ktpNumber.trim(),
      ktpName: ktpName.trim(),
      ktpAddress: ktpAddress.trim(),
      shareLocation: shareLocation?.trim() || null,
      installationType: installationType || 'NEW_INSTALLATION',
      isVerified: false, // Will be verified by admin
      registrationStatus: 'PENDING', // PENDING, APPROVED, REJECTED
      packageType: packageType,
      registeredAt: new Date()
    };

    // Add photo URLs if uploaded
    if (req.files?.ktpPhoto) {
      customerData.ktpPhotoUrl = `/uploads/customers/${req.files.ktpPhoto[0].filename}`;
    }
    if (req.files?.housePhoto) {
      customerData.housePhotoUrl = `/uploads/customers/${req.files.housePhoto[0].filename}`;
    }

    console.log('Creating customer with data:', customerData);

    // Create customer record
    const customer = await prisma.customer.create({
      data: customerData
    });

    // Auto-create installation job
    const jobCount = await prisma.job.count();
    const jobNumber = `REG-${Date.now()}-${String(jobCount + 1).padStart(4, '0')}`;

    const job = await prisma.job.create({
      data: {
        jobNumber,
        type: 'INSTALLATION',
        title: `Instalasi ${packageType} - ${name}`,
        description: `Instalasi paket ${packageType} untuk pelanggan baru`,
        address: address,
        customerId: customer.id,
        status: 'OPEN',
        priority: 'MEDIUM',
        housePhotoUrl: customerData.housePhotoUrl,
        idCardPhotoUrl: customerData.ktpPhotoUrl,
        createdById: null // System created
      }
    });

    // Send notification to admin via Telegram (if available)
    try {
      const EnhancedTelegramBot = require('../services/enhancedTelegramBot');
      const bot = EnhancedTelegramBot.getInstance(process.env.TELEGRAM_BOT_TOKEN);
      const adminMessage = `🆕 <b>PENDAFTARAN PELANGGAN BARU</b>

👤 <b>Nama:</b> ${name}
📞 <b>HP:</b> ${phone}
📍 <b>Alamat:</b> ${address}
📦 <b>Paket:</b> ${packageType}
🆔 <b>KTP:</b> ${ktpNumber}

📋 <b>Job:</b> ${jobNumber}
✅ <b>Status:</b> Menunggu persetujuan admin

Silakan review dan approve pendaftaran ini.`;

      // Send to admin users (you can modify this to send to specific admin chat IDs)
      console.log('Admin notification:', adminMessage);
    } catch (telegramError) {
      console.error('Telegram notification error:', telegramError);
    }

    res.status(201).json({
      success: true,
      message: 'Pendaftaran berhasil! Kami akan menghubungi Anda dalam 1x24 jam.',
      data: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        registrationStatus: customer.registrationStatus,
        jobNumber: job.jobNumber
      }
    });

  } catch (error) {
    console.error('Customer registration error:', error);
    res.status(500).json({ 
      error: 'Terjadi kesalahan saat mendaftar',
      details: error.message 
    });
  }
});

// Get pending registrations (admin only)
router.get('/registrations/pending', authenticateToken, requirePermission('customers:view'), async (req, res) => {
  try {
    const pendingCustomers = await prisma.customer.findMany({
      where: {
        registrationStatus: 'PENDING'
      },
      orderBy: {
        registeredAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: pendingCustomers
    });
  } catch (error) {
    console.error('Get pending registrations error:', error);
    res.status(500).json({ error: 'Failed to fetch pending registrations' });
  }
});

// Approve customer registration
router.put('/registrations/:id/approve', authenticateToken, requirePermission('customers:edit'), async (req, res) => {
  try {
    const customerId = req.params.id;
    
    const customer = await prisma.customer.update({
      where: { id: customerId },
      data: {
        registrationStatus: 'APPROVED',
        isVerified: true,
        approvedAt: new Date(),
        approvedById: req.user.id
      }
    });

    // Find and activate the installation job
    const job = await prisma.job.findFirst({
      where: {
        customerId: customerId,
        type: 'INSTALLATION',
        status: 'OPEN'
      }
    });

    if (job) {
      // Broadcast job to technicians
      try {
        const { broadcastNewJob } = require('../utils/telegramJobIntegration');
        await broadcastNewJob(job);
      } catch (broadcastError) {
        console.error('Job broadcast error:', broadcastError);
      }
    }

    res.json({
      success: true,
      message: 'Pendaftaran pelanggan disetujui',
      data: customer
    });
  } catch (error) {
    console.error('Approve registration error:', error);
    res.status(500).json({ error: 'Failed to approve registration' });
  }
});

// Reject customer registration
router.put('/registrations/:id/reject', authenticateToken, requirePermission('customers:edit'), [
  body('reason').isLength({ min: 1 }).trim().withMessage('Alasan penolakan wajib diisi')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const customerId = req.params.id;
    const { reason } = req.body;
    
    const customer = await prisma.customer.update({
      where: { id: customerId },
      data: {
        registrationStatus: 'REJECTED',
        rejectionReason: reason,
        rejectedAt: new Date(),
        rejectedById: req.user.id
      }
    });

    // Cancel related installation job
    await prisma.job.updateMany({
      where: {
        customerId: customerId,
        type: 'INSTALLATION',
        status: 'OPEN'
      },
      data: {
        status: 'CANCELLED',
        completionNotes: `Pendaftaran ditolak: ${reason}`
      }
    });

    res.json({
      success: true,
      message: 'Pendaftaran pelanggan ditolak',
      data: customer
    });
  } catch (error) {
    console.error('Reject registration error:', error);
    res.status(500).json({ error: 'Failed to reject registration' });
  }
});

module.exports = router;
