const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');

const prisma = new PrismaClient();

// Get dashboard statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const [
      totalCustomers,
      totalJobs,
      pendingJobs,
      completedJobs,
      totalTechnicians,
      activeTechnicians,
      totalInventoryItems,
      lowStockItems
    ] = await Promise.all([
      prisma.customer.count(),
      prisma.job.count(),
      prisma.job.count({ where: { status: { in: ['pending', 'in_progress'] } } }),
      prisma.job.count({ where: { status: 'completed' } }),
      prisma.technician.count(),
      prisma.technician.count({ where: { status: 'active' } }),
      prisma.inventoryItem.count(),
      prisma.inventoryItem.count({ where: { quantity: { lte: 10 } } })
    ]);

    res.json({
      customers: {
        total: totalCustomers
      },
      jobs: {
        total: totalJobs,
        pending: pendingJobs,
        completed: completedJobs
      },
      technicians: {
        total: totalTechnicians,
        active: activeTechnicians
      },
      inventory: {
        total: totalInventoryItems,
        lowStock: lowStockItems
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

// Get recent activities
router.get('/activities', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const recentJobs = await prisma.job.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          select: { name: true }
        },
        technician: {
          select: { name: true }
        }
      }
    });

    const activities = recentJobs.map(job => ({
      id: job.id,
      type: 'job',
      title: `Job ${job.type} - ${job.customer?.name}`,
      description: job.description,
      status: job.status,
      technician: job.technician?.name,
      createdAt: job.createdAt
    }));

    res.json(activities);
  } catch (error) {
    console.error('Dashboard activities error:', error);
    res.status(500).json({ error: 'Failed to fetch recent activities' });
  }
});

// Get revenue data (if applicable)
router.get('/revenue', authenticateToken, async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    // Calculate date range based on period
    const now = new Date();
    let startDate;
    
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const completedJobs = await prisma.job.findMany({
      where: {
        status: 'completed',
        completedAt: {
          gte: startDate,
          lte: now
        }
      },
      select: {
        cost: true,
        completedAt: true
      }
    });

    const totalRevenue = completedJobs.reduce((sum, job) => sum + (job.cost || 0), 0);
    const jobCount = completedJobs.length;

    res.json({
      period,
      totalRevenue,
      jobCount,
      averageJobValue: jobCount > 0 ? totalRevenue / jobCount : 0
    });
  } catch (error) {
    console.error('Dashboard revenue error:', error);
    res.status(500).json({ error: 'Failed to fetch revenue data' });
  }
});

module.exports = router;
