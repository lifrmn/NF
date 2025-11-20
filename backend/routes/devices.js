const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateDevice } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Register new device (for mobile app initialization)
router.post('/register', async (req, res) => {
  try {
    const { deviceId, deviceName, platform, appVersion } = req.body;
    
    if (!deviceId) {
      return res.status(400).json({ error: 'Device ID is required' });
    }

    const now = new Date();
    
    // Register or update device record
    const deviceRecord = await prisma.device.upsert({
      where: { deviceId: deviceId },
      update: {
        deviceName: deviceName || `${platform} Device ${deviceId.slice(-6)}`,
        platform: platform || 'unknown',
        ipAddress: req.ip,
        isOnline: true,
        lastSeen: now,
        // Keep existing user/balance data on update
      },
      create: {
        deviceId: deviceId,
        deviceName: deviceName || `${platform} Device ${deviceId.slice(-6)}`,
        platform: platform || 'unknown',
        ipAddress: req.ip,
        isOnline: true,
        lastSeen: now,
        totalUsers: 0,
        totalBalance: 0
      }
    });

    console.log(`📱 Device registered: ${deviceId} (${platform})`);
    
    res.json({
      success: true,
      message: 'Device registered successfully',
      device: deviceRecord
    });

  } catch (error) {
    console.error('❌ Device registration error:', error);
    res.status(500).json({ 
      error: 'Failed to register device',
      details: error.message 
    });
  }
});

// Sync device data (compatible with existing mobile app)
router.post('/sync-device', authenticateDevice, async (req, res) => {
  try {
    const { device, users, recentTransactions, stats } = req.body;
    
    if (!device || !device.deviceId) {
      return res.status(400).json({ error: 'Device ID is required' });
    }

    const now = new Date();
    
    // Update or create device record
    const deviceRecord = await prisma.device.upsert({
      where: { deviceId: device.deviceId },
      update: {
        deviceName: device.deviceName || `Android Device ${device.deviceId.slice(-6)}`,
        platform: device.platform || 'android',
        ipAddress: req.ip,
        isOnline: true,
        lastSeen: now,
        totalUsers: stats?.totalUsers || 0,
        totalBalance: stats?.totalBalance || 0
      },
      create: {
        deviceId: device.deviceId,
        deviceName: device.deviceName || `Android Device ${device.deviceId.slice(-6)}`,
        platform: device.platform || 'android',
        ipAddress: req.ip,
        isOnline: true,
        lastSeen: now,
        totalUsers: stats?.totalUsers || 0,
        totalBalance: stats?.totalBalance || 0
      }
    });

    // Sync users if provided
    if (users && Array.isArray(users)) {
      for (const userData of users) {
        await prisma.user.upsert({
          where: { id: userData.id },
          update: {
            name: userData.name,
            balance: userData.balance,
            deviceId: device.deviceId
          },
          create: {
            id: userData.id,
            name: userData.name,
            username: userData.username,
            password: userData.password || 'synced-user',
            balance: userData.balance,
            deviceId: device.deviceId
          }
        });
      }
    }

    // Sync transactions if provided
    if (recentTransactions && Array.isArray(recentTransactions)) {
      for (const txData of recentTransactions) {
        await prisma.transaction.upsert({
          where: { id: txData.id },
          update: {
            amount: txData.amount,
            type: txData.type,
            deviceId: device.deviceId
          },
          create: {
            id: txData.id,
            senderId: txData.senderId,
            receiverId: txData.receiverId,
            amount: txData.amount,
            type: txData.type || 'transfer',
            deviceId: device.deviceId,
            createdAt: new Date(txData.createdAt)
          }
        });
      }
    }

    console.log(`📱 Device sync: ${device.deviceId.slice(-8)} | Users: ${stats?.totalUsers || 0} | Balance: Rp ${(stats?.totalBalance || 0).toLocaleString('id-ID')} | IP: ${req.ip}`);

    // Check for pending balance updates
    const pendingUpdates = await prisma.adminLog.findMany({
      where: {
        action: 'BALANCE_UPDATE_PENDING',
        details: {
          contains: device.deviceId
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Emit to admin dashboard
    if (req.io) {
      req.io.to('admin-room').emit('device-sync', {
        device: deviceRecord,
        stats: stats || {}
      });
    }

    res.json({
      success: true,
      message: 'Device synced successfully',
      balanceUpdates: pendingUpdates.map(update => JSON.parse(update.details)),
      deviceId: device.deviceId,
      timestamp: now.toISOString()
    });

  } catch (error) {
    console.error('Device sync error:', error);
    res.status(500).json({ error: 'Failed to sync device' });
  }
});

// Get all devices
router.get('/', async (req, res) => {
  try {
    const devices = await prisma.device.findMany({
      orderBy: {
        lastSeen: 'desc'
      }
    });

    // Update online status based on last seen
    const now = new Date();
    const devicesWithStatus = devices.map(device => ({
      ...device,
      isOnline: (now - new Date(device.lastSeen)) < 300000 // 5 minutes
    }));

    res.json(devicesWithStatus);
  } catch (error) {
    console.error('Get devices error:', error);
    res.status(500).json({ error: 'Failed to get devices' });
  }
});

// Get device by ID
router.get('/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    const device = await prisma.device.findUnique({
      where: { deviceId }
    });

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Get users for this device
    const users = await prisma.user.findMany({
      where: { deviceId },
      select: {
        id: true,
        name: true,
        username: true,
        balance: true,
        isActive: true,
        createdAt: true
      }
    });

    // Get recent transactions for this device
    const transactions = await prisma.transaction.findMany({
      where: { deviceId },
      include: {
        sender: {
          select: { id: true, name: true, username: true }
        },
        receiver: {
          select: { id: true, name: true, username: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    const now = new Date();
    const isOnline = (now - new Date(device.lastSeen)) < 300000; // 5 minutes

    res.json({
      ...device,
      isOnline,
      users,
      recentTransactions: transactions
    });

  } catch (error) {
    console.error('Get device error:', error);
    res.status(500).json({ error: 'Failed to get device' });
  }
});

// Update device status
router.put('/:deviceId/status', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { isOnline } = req.body;

    const device = await prisma.device.update({
      where: { deviceId },
      data: { 
        isOnline: Boolean(isOnline),
        lastSeen: new Date()
      }
    });

    // Emit to admin dashboard
    if (req.io) {
      req.io.to('admin-room').emit('device-status-updated', { device });
    }

    res.json({
      message: 'Device status updated',
      device
    });

  } catch (error) {
    console.error('Update device status error:', error);
    res.status(500).json({ error: 'Failed to update device status' });
  }
});

// Delete device (admin only)
router.delete('/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { adminPassword } = req.body;

    // Verify admin password
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid admin password' });
    }

    await prisma.device.delete({
      where: { deviceId }
    });

    // Log admin action
    await prisma.adminLog.create({
      data: {
        action: 'DEVICE_DELETE',
        details: JSON.stringify({ deviceId }),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    });

    // Emit to admin dashboard
    if (req.io) {
      req.io.to('admin-room').emit('device-deleted', { deviceId });
    }

    res.json({
      message: 'Device deleted successfully'
    });

  } catch (error) {
    console.error('Delete device error:', error);
    res.status(500).json({ error: 'Failed to delete device' });
  }
});

// Get device statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const [totalDevices, onlineDevices, totalUsers, totalBalance] = await Promise.all([
      prisma.device.count(),
      prisma.device.count({
        where: {
          lastSeen: {
            gte: new Date(Date.now() - 300000) // Last 5 minutes
          }
        }
      }),
      prisma.user.count({
        where: { isActive: true }
      }),
      prisma.user.aggregate({
        _sum: { balance: true },
        where: { isActive: true }
      })
    ]);

    res.json({
      totalDevices,
      onlineDevices,
      offlineDevices: totalDevices - onlineDevices,
      totalUsers,
      totalBalance: totalBalance._sum.balance || 0
    });

  } catch (error) {
    console.error('Get device stats error:', error);
    res.status(500).json({ error: 'Failed to get device statistics' });
  }
});

module.exports = router;