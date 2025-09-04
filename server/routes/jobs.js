const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireRole, requirePermission } = require('../middleware/auth');
const { PERMISSIONS } = require('../utils/permissions');
const { broadcastNewJob, notifyJobStatusChange } = require('../utils/telegramJobIntegration');
const { broadcastJobUpdate } = require('../services/websocketService');
const { uploadJobPhotos } = require('../middleware/upload');

const router = express.Router();
const prisma = new PrismaClient();

// Get all jobs with filters
router.get('/', authenticateToken, requirePermission('jobs:view'), [
  query('status').isIn(['pending', 'assigned', 'in_progress', 'completed', 'cancelled', 'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  query('type').isIn(['installation', 'repair', 'INSTALLATION', 'REPAIR']).optional(),
  query('approvalStatus').isIn(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  query('page').isInt({ min: 1 }).optional(),
  query('limit').isInt({ min: 1, max: 100 }).optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status, type, approvalStatus, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (approvalStatus) where.approvalStatus = approvalStatus;

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        include: {
          customer: true,
          createdBy: {
            select: { id: true, name: true }
          },
          approvedBy: {
            select: { id: true, name: true }
          },
          rejectedBy: {
            select: { id: true, name: true }
          },
          technicians: {
            include: {
              technician: {
                select: { id: true, name: true, phone: true }
              }
            }
          },
          inventoryUsage: {
            include: {
              item: {
                select: { id: true, name: true, unit: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit)
      }),
      prisma.job.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        jobs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// Get pending jobs for approval (Admin/Super Admin only) - MUST BE BEFORE /:id route
router.get('/pending-approval', authenticateToken, requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const pendingJobs = await prisma.job.findMany({
      where: { approvalStatus: 'PENDING' },
      include: {
        customer: true,
        createdBy: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: pendingJobs,
      count: pendingJobs.length
    });
  } catch (error) {
    console.error('Get pending jobs error:', error);
    res.status(500).json({ error: 'Failed to fetch pending jobs' });
  }
});

// Get single job by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    console.log('Fetching job with ID:', req.params.id);
    
    const job = await prisma.job.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        createdBy: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!job) {
      console.log('Job not found:', req.params.id);
      return res.status(404).json({ error: 'Job not found' });
    }

    console.log('Job found successfully:', job.jobNumber);
    res.json({ job });
  } catch (error) {
    console.error('Get job error details:', error);
    res.status(500).json({ error: 'Failed to fetch job', details: error.message });
  }
});

// Create new job - SIMPLIFIED VALIDATION
router.post('/', authenticateToken, requirePermission('jobs:create'), uploadJobPhotos, [
  body('type').isIn(['installation', 'repair', 'INSTALLATION', 'REPAIR']),
  body('address').isLength({ min: 1 }).trim(),
  body('description').optional().trim(),
  body('problemType').optional().trim(),
  body('customerId').optional().isString(),
  body('scheduledDate').optional().isISO8601()
], async (req, res) => {
  try {
    console.log('=== JOB CREATION DEBUG ===');
    console.log('Request body:', req.body);
    console.log('Request files:', req.files);
    console.log('Content-Type:', req.headers['content-type']);
    console.log('User from token:', req.user);
    
    const errors = validationResult(req);
    console.log('Validation check - isEmpty:', errors.isEmpty());
    console.log('Validation errors array:', errors.array());
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      console.log('Request body for validation:', req.body);
      return res.status(400).json({ errors: errors.array() });
    }

    const { type, title, description, problemType, address, customerId, customer, scheduledDate, items = [] } = req.body;

    // Simplified validation - no strict KTP requirements
    console.log('=== SIMPLIFIED JOB CREATION ===');
    console.log('Job type:', type);
    console.log('Customer ID:', customerId);
    console.log('Has customer data:', !!customer);
    
    // Just ensure we have either customerId or customer data
    if (!customerId && !customer) {
      return res.status(400).json({ 
        error: 'Data pelanggan diperlukan untuk membuat job'
      });
    }

    // Generate job number
    const jobCount = await prisma.job.count();
    const jobNumber = `JOB-${Date.now()}-${String(jobCount + 1).padStart(4, '0')}`;

    // Create or find customer
    let customerRecord;
    
    if (customerId) {
      // Use existing customer
      console.log('Looking up customer with ID:', customerId);
      customerRecord = await prisma.customer.findUnique({
        where: { id: customerId }
      });
      
      if (!customerRecord) {
        console.log('Customer not found with ID:', customerId);
        return res.status(400).json({ error: `Customer not found with ID: ${customerId}` });
      }
      console.log('Found customer:', customerRecord.name);
    } else if (customer && customer.phone) {
      // Create or find customer by phone
      console.log('Looking up customer by phone:', customer.phone);
      customerRecord = await prisma.customer.findFirst({
        where: { phone: customer.phone }
      });
    } else {
      console.log('Missing customer data - customerId:', customerId, 'customer:', !!customer);
      return res.status(400).json({ error: 'Either customerId or customer data is required' });
    }

    if (!customerRecord) {
      // Create new customer - simplified data requirements
      const customerData = {
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
        email: customer.email || null,
        // Optional KTP data - can be filled freely
        ktpName: customer.ktpName || null,
        ktpNumber: customer.ktpNumber || null,
        ktpAddress: customer.ktpAddress || null,
        shareLocation: customer.shareLocation || null,
        installationType: type === 'INSTALLATION' ? 'NEW_INSTALLATION' : null,
        isVerified: false
      };
      
      console.log('Creating new customer with data:', customerData);
      
      customerRecord = await prisma.customer.create({
        data: customerData
      });
    }

    // Prepare job data
    const jobData = {
      jobNumber,
      type,
      title,
      description: type === 'INSTALLATION' ? description : null,
      problemType: type === 'REPAIR' ? problemType : null,
      address,
      customerId: customerRecord.id,
      createdById: req.user.id,
      scheduledDate: scheduledDate ? new Date(scheduledDate) : null
    };

    // Add photo URLs if uploaded (handle files array from upload.any()) - ALL OPTIONAL
    if (req.files && req.files.length > 0) {
      console.log('Processing uploaded files:', req.files.length);
      req.files.forEach(file => {
        console.log('File field:', file.fieldname, 'filename:', file.filename);
        if (file.fieldname === 'housePhoto') {
          jobData.housePhotoUrl = `/uploads/jobs/${file.filename}`;
        } else if (file.fieldname === 'idCardPhoto') {
          jobData.idCardPhotoUrl = `/uploads/jobs/${file.filename}`;
        } else if (file.fieldname === 'customerIdPhoto') {
          jobData.idCardPhotoUrl = `/uploads/jobs/${file.filename}`;
        }
      });
    } else {
      console.log('No files uploaded - proceeding without photos');
    }
    
    // Photos are now completely optional for all job types
    console.log('Job data prepared:', {
      jobNumber: jobData.jobNumber,
      type: jobData.type,
      customerId: jobData.customerId,
      hasPhotos: !!(jobData.housePhotoUrl || jobData.idCardPhotoUrl)
    });

    // Create job with inventory usage
    const job = await prisma.$transaction(async (tx) => {
      const newJob = await tx.job.create({
        data: {
          ...jobData,
          approvalStatus: 'APPROVED', // Auto-approve jobs created through system
          approvedAt: new Date(),
          approvedById: req.user.id,
          status: 'OPEN' // Make immediately available to technicians
        },
        include: {
          customer: true,
          createdBy: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      // Create inventory usage records
      if (items.length > 0) {
        const inventoryUsageData = items.map(item => ({
          jobId: newJob.id,
          itemId: item.itemId,
          quantityUsed: parseInt(item.quantity)
        }));

        await tx.inventoryUsage.createMany({
          data: inventoryUsageData
        });

        // Update item stock (decrease)
        for (const item of items) {
          await tx.item.update({
            where: { id: item.itemId },
            data: {
              currentStock: {
                decrement: parseInt(item.quantity)
              }
            }
          });

          // Log inventory movement
          await tx.inventoryLog.create({
            data: {
              itemId: item.itemId,
              type: 'OUT',
              quantity: parseInt(item.quantity),
              notes: `Used for job ${newJob.jobNumber}`,
              jobId: newJob.id
            }
          });
        }
      }

      return newJob;
    });

    // NOW broadcast to technicians immediately since job is auto-approved
    try {
      console.log(`🚀 CALLING broadcastNewJob for job ${job.jobNumber}`);
      const broadcastResult = await broadcastNewJob(job);
      console.log(`✅ Job ${job.jobNumber} broadcast result:`, broadcastResult);
    } catch (telegramError) {
      console.error('❌ Telegram broadcast error:', telegramError);
      // Don't fail job creation if Telegram fails
    }

    // Broadcast real-time update to dashboard
    try {
      broadcastJobUpdate(job, 'CREATED');
    } catch (wsError) {
      console.error('WebSocket broadcast error:', wsError);
    }

    res.status(201).json({ 
      success: true,
      message: 'Job created successfully', 
      data: job 
    });
  } catch (error) {
    console.error('=== JOB CREATION ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error details:', error);
    res.status(500).json({ 
      error: 'Failed to create job',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Update job status
router.put('/:id/status', authenticateToken, [
  body('status').isIn(['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status, notes } = req.body;
    const jobId = req.params.id;

    const job = await prisma.job.update({
      where: { id: jobId },
      data: {
        status,
        ...(status === 'COMPLETED' && { completedAt: new Date() }),
        ...(notes && { completionNotes: notes })
      },
      include: {
        customer: true,
        technicians: {
          include: {
            technician: true
          }
        }
      }
    });

    res.json({ message: 'Job status updated successfully', job });
  } catch (error) {
    console.error('Update job status error:', error);
    res.status(500).json({ error: 'Failed to update job status' });
  }
});

// Assign technicians to job
router.post('/:id/assign', authenticateToken, requireRole(['admin', 'user']), [
  body('technicianIds').isArray({ min: 1, max: 2 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { technicianIds } = req.body;
    const jobId = req.params.id;

    // Check if job exists and is assignable
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { technicians: true }
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.status !== 'OPEN') {
      return res.status(400).json({ error: 'Job is not available for assignment' });
    }

    // Remove existing assignments
    await prisma.jobTechnician.deleteMany({
      where: { jobId }
    });

    // Create new assignments
    const assignments = technicianIds.map(technicianId => ({
      jobId,
      technicianId
    }));

    await prisma.jobTechnician.createMany({
      data: assignments
    });

    // Update job status
    await prisma.job.update({
      where: { id: jobId },
      data: { status: 'ASSIGNED' }
    });

    const updatedJob = await prisma.job.findUnique({
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

    // Broadcast real-time update
    try {
      broadcastJobUpdate(updatedJob, 'ASSIGNED');
    } catch (wsError) {
      console.error('WebSocket broadcast error:', wsError);
    }

    res.json({ message: 'Technicians assigned successfully', job: updatedJob });
  } catch (error) {
    console.error('Assign technicians error:', error);
    res.status(500).json({ error: 'Failed to assign technicians' });
  }
});

// Complete job with photo
router.put('/:id/complete', authenticateToken, uploadJobPhotos, [
  body('notes').optional().trim(),
  body('technicianLocation').optional().trim()
], async (req, res) => {
  try {
    const { notes, technicianLocation } = req.body;
    const jobId = req.params.id;

    const updateData = {
      status: 'COMPLETED',
      completedAt: new Date(),
      completionNotes: notes,
      technicianLocation
    };

    if (req.files?.completionPhoto) {
      updateData.completionPhotoUrl = `/uploads/jobs/${req.files.completionPhoto[0].filename}`;
    }

    const job = await prisma.job.update({
      where: { id: jobId },
      data: updateData,
      include: {
        customer: true,
        technicians: {
          include: {
            technician: true
          }
        }
      }
    });

    res.json({ message: 'Job completed successfully', job });
  } catch (error) {
    console.error('Complete job error:', error);
    res.status(500).json({ error: 'Failed to complete job' });
  }
});

// Approve job (Admin/Super Admin only)
router.put('/:id/approve', authenticateToken, requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const jobId = req.params.id;
    const { notes } = req.body;

    // Check if job exists and is pending
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        customer: true,
        createdBy: { select: { id: true, name: true } }
      }
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.approvalStatus !== 'PENDING') {
      return res.status(400).json({ error: 'Job is not pending approval' });
    }

    // Update job approval status
    const updatedJob = await prisma.job.update({
      where: { id: jobId },
      data: {
        approvalStatus: 'APPROVED',
        approvedAt: new Date(),
        approvedById: req.user.id,
        status: 'OPEN' // Make it available for technicians
      },
      include: {
        customer: true,
        createdBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } }
      }
    });

    // NOW broadcast to technicians via Telegram
    try {
      await broadcastNewJob(updatedJob);
      console.log(`Job ${updatedJob.jobNumber} approved and broadcasted to technicians`);
    } catch (telegramError) {
      console.error('Telegram broadcast error:', telegramError);
      // Don't fail the approval if Telegram fails
    }

    // Broadcast real-time update to dashboard
    try {
      broadcastJobUpdate(updatedJob, 'APPROVED');
    } catch (wsError) {
      console.error('WebSocket broadcast error:', wsError);
    }

    res.json({ 
      success: true,
      message: 'Job approved and broadcasted to technicians', 
      data: updatedJob 
    });
  } catch (error) {
    console.error('Approve job error:', error);
    res.status(500).json({ error: 'Failed to approve job' });
  }
});

// Reject job (Admin/Super Admin only)
router.put('/:id/reject', authenticateToken, requireRole(['admin', 'superadmin']), [
  body('reason').isLength({ min: 1 }).trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const jobId = req.params.id;
    const { reason } = req.body;

    // Check if job exists and is pending
    const job = await prisma.job.findUnique({
      where: { id: jobId }
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.approvalStatus !== 'PENDING') {
      return res.status(400).json({ error: 'Job is not pending approval' });
    }

    // Update job rejection status
    const updatedJob = await prisma.job.update({
      where: { id: jobId },
      data: {
        approvalStatus: 'REJECTED',
        rejectedAt: new Date(),
        rejectedById: req.user.id,
        rejectionReason: reason,
        status: 'CANCELLED'
      },
      include: {
        customer: true,
        createdBy: { select: { id: true, name: true } },
        rejectedBy: { select: { id: true, name: true } }
      }
    });

    // Broadcast real-time update to dashboard
    try {
      broadcastJobUpdate(updatedJob, 'REJECTED');
    } catch (wsError) {
      console.error('WebSocket broadcast error:', wsError);
    }

    res.json({ 
      success: true,
      message: 'Job rejected', 
      data: updatedJob 
    });
  } catch (error) {
    console.error('Reject job error:', error);
    res.status(500).json({ error: 'Failed to reject job' });
  }
});

// Delete job
router.delete('/:id', authenticateToken, requirePermission('jobs:delete'), async (req, res) => {
  try {
    const jobId = req.params.id;

    // Get job data before deletion for WebSocket broadcast
    const jobToDelete = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        customer: true,
        technicians: { include: { technician: true } }
      }
    });

    if (!jobToDelete) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Delete related records first
    await prisma.jobTechnician.deleteMany({
      where: { jobId: jobId }
    });

    // Delete the job
    await prisma.job.delete({
      where: { id: jobId }
    });

    // Broadcast real-time update to dashboard
    try {
      const { broadcastJobUpdate } = require('../services/websocketService');
      broadcastJobUpdate(jobToDelete, 'DELETED');
    } catch (wsError) {
      console.error('WebSocket broadcast error for job deletion:', wsError);
    }

    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

// Update job
router.put('/:id', authenticateToken, requirePermission('jobs:edit'), uploadJobPhotos, [
  body('type').isIn(['INSTALLATION', 'REPAIR']).optional(),
  body('customerId').isString().optional(),
  body('address').isLength({ min: 5 }).trim().optional(),
  body('description').optional().trim(),
  body('priority').isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  body('status').isIn(['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const jobId = req.params.id;
    const { type, customerId, address, description, priority, status } = req.body;

    // Check if job exists
    const existingJob = await prisma.job.findUnique({
      where: { id: jobId }
    });

    if (!existingJob) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Update job
    const updatedJob = await prisma.job.update({
      where: { id: jobId },
      data: {
        ...(type && { type }),
        ...(customerId && { customerId }),
        ...(address && { address }),
        ...(description !== undefined && { description }),
        ...(priority && { priority }),
        ...(status && { status })
      },
      include: {
        customer: true,
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        technicians: {
          include: {
            technician: true
          }
        }
      }
    });

    // Broadcast real-time update
    try {
      broadcastJobUpdate(updatedJob, 'UPDATED');
    } catch (wsError) {
      console.error('WebSocket broadcast error:', wsError);
    }

    res.json({ 
      success: true,
      message: 'Job updated successfully', 
      data: updatedJob 
    });
  } catch (error) {
    console.error('Update job error:', error);
    res.status(500).json({ error: 'Failed to update job' });
  }
});

module.exports = router;
