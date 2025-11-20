const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Get dashboard statistics
router.get('/dashboard', async (req, res) => {
  try {
    const [
      totalUsers,
      totalDevices,
      onlineDevices,
      totalTransactions,
      totalBalance,
      fraudAlerts,
      recentTransactions,
      recentAlerts
    ] = await Promise.all([
      prisma.user.count({ where: { isActive: true } }),
      prisma.device.count(),
      prisma.device.count({
        where: {
          lastSeen: {
            gte: new Date(Date.now() - 300000) // Last 5 minutes
          }
        }
      }),
      prisma.transaction.count(),
      prisma.user.aggregate({
        _sum: { balance: true },
        where: { isActive: true }
      }),
      prisma.fraudAlert.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      }),
      prisma.transaction.findMany({
        include: {
          sender: { select: { id: true, name: true, username: true } },
          receiver: { select: { id: true, name: true, username: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),
      prisma.fraudAlert.findMany({
        include: {
          user: { select: { id: true, name: true, username: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      })
    ]);

    res.json({
      summary: {
        totalUsers,
        totalDevices,
        onlineDevices,
        offlineDevices: totalDevices - onlineDevices,
        totalTransactions,
        totalBalance: totalBalance._sum.balance || 0,
        fraudAlerts24h: fraudAlerts
      },
      recentTransactions,
      recentFraudAlerts: recentAlerts,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to get dashboard statistics' });
  }
});

// Update user balance (admin action)
router.post('/balance-update', [
  body('deviceId').notEmpty().withMessage('Device ID is required'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be positive'),
  body('adminPassword').notEmpty().withMessage('Admin password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { deviceId, amount, adminPassword, reason } = req.body;

    // Verify admin password
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid admin password' });
    }

    // Validate amount
    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be positive' });
    }

    if (amount > 10000000) { // 10 million max
      return res.status(400).json({ error: 'Amount exceeds maximum limit' });
    }

    // Find device and users
    const device = await prisma.device.findUnique({
      where: { deviceId }
    });

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Get all users for this device
    const users = await prisma.user.findMany({
      where: { deviceId, isActive: true }
    });

    if (users.length === 0) {
      return res.status(404).json({ error: 'No active users found for this device' });
    }

    // Update balance for all users on the device
    const updatedUsers = await Promise.all(
      users.map(async (user) => {
        const updatedUser = await prisma.user.update({
          where: { id: user.id },
          data: { balance: { increment: amount } }
        });

        return updatedUser;
      })
    );

    // Log admin action
    await prisma.adminLog.create({
      data: {
        action: 'BALANCE_UPDATE',
        details: JSON.stringify({
          deviceId,
          amount,
          usersAffected: users.length,
          userIds: users.map(u => u.id),
          reason: reason || 'Admin balance top-up'
        }),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    });

    // Update device total balance
    await prisma.device.update({
      where: { deviceId },
      data: {
        totalBalance: {
          increment: amount * users.length
        }
      }
    });

    console.log(`💰 Admin added Rp ${amount.toLocaleString('id-ID')} to device ${deviceId.substring(0, 8)}... for ${users.length} users`);

    // Emit real-time updates
    if (req.io) {
      req.io.to('admin-room').emit('balance-bulk-update', {
        deviceId,
        amount,
        usersAffected: users.length,
        updatedUsers
      });

      // Notify specific device
      req.io.to(`device-${deviceId}`).emit('balance-updated', {
        amount,
        users: updatedUsers.map(u => ({ id: u.id, balance: u.balance }))
      });
    }

    res.json({
      success: true,
      message: `Balance updated for ${users.length} users on device ${deviceId}`,
      details: {
        deviceId,
        amount,
        usersAffected: users.length,
        totalAdded: amount * users.length
      }
    });

  } catch (error) {
    console.error('Balance update error:', error);
    res.status(500).json({ error: 'Failed to update balance' });
  }
});

// Get admin logs
router.get('/logs', async (req, res) => {
  try {
    const { limit = 50, offset = 0, action } = req.query;
    
    const whereClause = {};
    if (action) whereClause.action = action;

    const logs = await prisma.adminLog.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset)
    });

    res.json(logs);
  } catch (error) {
    console.error('Get admin logs error:', error);
    res.status(500).json({ error: 'Failed to get admin logs' });
  }
});

// System settings management
router.get('/settings', async (req, res) => {
  try {
    const settings = await prisma.systemSettings.findMany();
    
    const settingsObject = settings.reduce((acc, setting) => {
      let value = setting.value;
      
      // Parse value based on type
      switch (setting.type) {
        case 'number':
          value = parseFloat(setting.value);
          break;
        case 'boolean':
          value = setting.value === 'true';
          break;
        case 'json':
          try {
            value = JSON.parse(setting.value);
          } catch (e) {
            value = setting.value;
          }
          break;
        default:
          value = setting.value;
      }
      
      acc[setting.key] = value;
      return acc;
    }, {});

    res.json(settingsObject);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

// Update system setting
router.put('/settings/:key', [
  body('value').notEmpty().withMessage('Value is required'),
  body('adminPassword').notEmpty().withMessage('Admin password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { key } = req.params;
    const { value, type = 'string', adminPassword } = req.body;

    // Verify admin password
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid admin password' });
    }

    const setting = await prisma.systemSettings.upsert({
      where: { key },
      update: { value: String(value), type },
      create: { key, value: String(value), type }
    });

    // Log admin action
    await prisma.adminLog.create({
      data: {
        action: 'SETTING_UPDATE',
        details: JSON.stringify({
          key,
          newValue: value,
          type
        }),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    });

    // Emit to admin dashboard
    if (req.io) {
      req.io.to('admin-room').emit('setting-updated', { key, value, type });
    }

    res.json({
      message: 'Setting updated successfully',
      setting
    });

  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

// Cleanup inactive devices
router.post('/cleanup-devices', async (req, res) => {
  try {
    const { adminPassword } = req.body;

    // Verify admin password
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid admin password' });
    }

    // Delete devices inactive for more than 24 hours
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const deletedDevices = await prisma.device.deleteMany({
      where: {
        lastSeen: {
          lt: cutoffTime
        }
      }
    });

    // Log admin action
    await prisma.adminLog.create({
      data: {
        action: 'DEVICES_CLEANUP',
        details: JSON.stringify({
          deletedCount: deletedDevices.count,
          cutoffTime
        }),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    });

    res.json({
      message: `Cleaned up ${deletedDevices.count} inactive devices`,
      deletedCount: deletedDevices.count
    });

  } catch (error) {
    console.error('Cleanup devices error:', error);
    res.status(500).json({ error: 'Failed to cleanup devices' });
  }
});

// Get all users for admin dashboard (BYPASS AUTH untuk debugging)
router.get('/users', async (req, res) => {
  try {
    console.log('📋 Admin request: Get all users (bypass auth)');
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        balance: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        deviceId: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`✅ Found ${users.length} users in database`);

    res.json({
      success: true,
      users: users,
      total: users.length
    });

  } catch (error) {
    console.error('❌ Get admin users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Bulk topup untuk semua users
router.post('/bulk-topup', async (req, res) => {
  try {
    const { amount } = req.body;
    
    console.log(`💰 Admin bulk topup request: ${amount} to all users`);
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount required' });
    }
    
    // Update balance semua users aktif
    const updateResult = await prisma.user.updateMany({
      where: {
        isActive: true
      },
      data: {
        balance: {
          increment: parseInt(amount)
        }
      }
    });
    
    console.log(`✅ Bulk topup success: ${updateResult.count} users updated with ${amount}`);
    
    // Hitung total amount yang ditambahkan
    const totalAmount = updateResult.count * amount;
    
    res.json({
      success: true,
      message: `Successfully topped up ${updateResult.count} users`,
      updatedUsers: updateResult.count,
      amount: amount,
      totalAmount: totalAmount
    });
    
  } catch (error) {
    console.error('❌ Bulk topup error:', error);
    res.status(500).json({ error: 'Failed to perform bulk topup' });
  }
});

// Reset balance user tertentu
router.post('/reset-balance', async (req, res) => {
  try {
    const { userId, newBalance, password } = req.body;
    
    if (password !== 'admin123') {
      return res.status(401).json({ error: 'Invalid admin password' });
    }
    
    const user = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: { balance: parseInt(newBalance) }
    });
    
    console.log(`💰 Reset balance: ${user.username} -> Rp ${parseInt(newBalance).toLocaleString('id-ID')}`);
    
    res.json({
      success: true,
      message: `Balance reset for ${user.username}`,
      user: user
    });
    
  } catch (error) {
    console.error('❌ Reset balance error:', error);
    res.status(500).json({ error: 'Failed to reset balance' });
  }
});

// Block user
router.post('/block-user', async (req, res) => {
  try {
    const { userId, password } = req.body;
    
    if (password !== 'admin123') {
      return res.status(401).json({ error: 'Invalid admin password' });
    }
    
    const user = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: { isActive: false }
    });
    
    console.log(`🚫 User blocked: ${userId} (${user.username})`);
    
    res.json({
      success: true,
      message: `User ${user.username} has been blocked`,
      user: user
    });
    
  } catch (error) {
    console.error('❌ Block user error:', error);
    res.status(500).json({ error: 'Failed to block user' });
  }
});

// Unblock user
router.post('/unblock-user', async (req, res) => {
  try {
    const { userId, password } = req.body;
    
    if (password !== 'admin123') {
      return res.status(401).json({ error: 'Invalid admin password' });
    }
    
    const user = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: { isActive: true }
    });
    
    console.log(`✅ User unblocked: ${userId} (${user.username})`);
    
    res.json({
      success: true,
      message: `User ${user.username} has been unblocked`,
      user: user
    });
    
  } catch (error) {
    console.error('❌ Unblock user error:', error);
    res.status(500).json({ error: 'Failed to unblock user' });
  }
});

// Clear fraud alerts
router.post('/clear-fraud-alerts', async (req, res) => {
  try {
    // Count alerts before deletion
    const alertCount = await prisma.fraudAlert.count();
    
    // Delete all fraud alerts
    await prisma.fraudAlert.deleteMany({});
    
    console.log(`🗑️ Cleared ${alertCount} fraud alerts`);
    
    res.json({
      success: true,
      message: `Cleared ${alertCount} fraud alerts`,
      clearedCount: alertCount
    });
    
  } catch (error) {
    console.error('❌ Clear fraud alerts error:', error);
    res.status(500).json({ error: 'Failed to clear fraud alerts' });
  }
});

module.exports = router;