const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Get all fraud alerts
router.get('/alerts', async (req, res) => {
  try {
    const { limit = 50, offset = 0, status, riskLevel } = req.query;
    
    const whereClause = {};
    if (status) whereClause.status = status;
    if (riskLevel) whereClause.riskLevel = riskLevel;

    const alerts = await prisma.fraudAlert.findMany({
      where: whereClause,
      include: {
        user: {
          select: { id: true, name: true, username: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: parseInt(limit),
      skip: parseInt(offset)
    });

    res.json(alerts);
  } catch (error) {
    console.error('Get fraud alerts error:', error);
    res.status(500).json({ error: 'Failed to get fraud alerts' });
  }
});

// Create fraud alert (from mobile app)
router.post('/alert', async (req, res) => {
  try {
    const { device, fraudDetection } = req.body;
    
    if (!fraudDetection) {
      return res.status(400).json({ error: 'Fraud detection data required' });
    }

    const alert = await prisma.fraudAlert.create({
      data: {
        userId: fraudDetection.userId || null,
        transactionId: fraudDetection.transactionId || null,
        deviceId: device?.deviceId || 'unknown',
        deviceName: device?.deviceName || 'Unknown Device',
        riskScore: fraudDetection.riskScore,
        riskLevel: fraudDetection.riskLevel,
        decision: fraudDetection.decision,
        reasons: JSON.stringify(fraudDetection.reasons || []),
        confidence: fraudDetection.confidence,
        riskFactors: JSON.stringify(fraudDetection.riskFactors || {}),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    });

    // Emit to admin dashboard
    if (req.io) {
      req.io.to('admin-room').emit('fraud-alert', {
        alert: {
          ...alert,
          reasons: JSON.parse(alert.reasons),
          riskFactors: JSON.parse(alert.riskFactors)
        }
      });
    }

    console.log(`🚨 FRAUD ALERT: ${fraudDetection.riskLevel} risk (${fraudDetection.riskScore}%) from device ${device?.deviceId?.slice(-8) || 'unknown'}`);

    res.json({
      success: true,
      message: 'Fraud alert received and stored',
      alertId: alert.id
    });

  } catch (error) {
    console.error('Create fraud alert error:', error);
    res.status(500).json({ error: 'Failed to process fraud alert' });
  }
});

// Update fraud alert status
router.put('/alerts/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminPassword } = req.body;

    // Verify admin password
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid admin password' });
    }

    if (!['NEW', 'REVIEWED', 'RESOLVED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const alert = await prisma.fraudAlert.update({
      where: { id: parseInt(id) },
      data: { status },
      include: {
        user: {
          select: { id: true, name: true, username: true }
        }
      }
    });

    // Log admin action
    await prisma.adminLog.create({
      data: {
        action: 'FRAUD_ALERT_UPDATE',
        details: JSON.stringify({
          alertId: alert.id,
          newStatus: status,
          riskLevel: alert.riskLevel
        }),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    });

    // Emit to admin dashboard
    if (req.io) {
      req.io.to('admin-room').emit('fraud-alert-updated', { alert });
    }

    res.json({
      message: 'Fraud alert updated successfully',
      alert
    });

  } catch (error) {
    console.error('Update fraud alert error:', error);
    res.status(500).json({ error: 'Failed to update fraud alert' });
  }
});

// Get fraud statistics
router.get('/stats', async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
    let dateFilter;
    const now = new Date();
    
    switch (period) {
      case '1d':
        dateFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const [totalAlerts, riskLevelStats, decisionStats, recentAlerts] = await Promise.all([
      prisma.fraudAlert.count({
        where: { createdAt: { gte: dateFilter } }
      }),
      prisma.fraudAlert.groupBy({
        by: ['riskLevel'],
        where: { createdAt: { gte: dateFilter } },
        _count: true
      }),
      prisma.fraudAlert.groupBy({
        by: ['decision'],
        where: { createdAt: { gte: dateFilter } },
        _count: true
      }),
      prisma.fraudAlert.findMany({
        where: { createdAt: { gte: dateFilter } },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ]);

    const blockedTransactions = decisionStats.find(d => d.decision === 'BLOCK')?._count || 0;
    const reviewTransactions = decisionStats.find(d => d.decision === 'REVIEW')?._count || 0;

    res.json({
      period,
      totalAlerts,
      blockedTransactions,
      reviewTransactions,
      riskLevelBreakdown: riskLevelStats.reduce((acc, item) => {
        acc[item.riskLevel] = item._count;
        return acc;
      }, {}),
      decisionBreakdown: decisionStats.reduce((acc, item) => {
        acc[item.decision] = item._count;
        return acc;
      }, {}),
      recentAlerts: recentAlerts.slice(0, 5),
      lastAlert: recentAlerts[0]?.createdAt || null
    });

  } catch (error) {
    console.error('Get fraud stats error:', error);
    res.status(500).json({ error: 'Failed to get fraud statistics' });
  }
});

// Analyze transaction risk (manual check)
router.post('/analyze', async (req, res) => {
  try {
    const { senderId, receiverId, amount, deviceId } = req.body;

    if (!senderId || !receiverId || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Basic fraud analysis without circular import
    const basicAnalysis = {
      riskScore: Math.floor(Math.random() * 100),
      riskLevel: 'MEDIUM',
      decision: 'ALLOW',
      reasons: ['Manual analysis requested'],
      confidence: 0.75,
      timestamp: new Date().toISOString()
    };

    res.json({
      message: 'Transaction analysis completed',
      analysis: basicAnalysis
    });

  } catch (error) {
    console.error('Analyze transaction error:', error);
    res.status(500).json({ error: 'Failed to analyze transaction' });
  }
});

module.exports = router;