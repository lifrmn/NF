const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Get all users (admin only)
router.get('/', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        balance: true,
        deviceId: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            sentTransactions: true,
            receivedTransactions: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        name: true,
        username: true,
        balance: true,
        deviceId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Get user by username
router.get('/username/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        name: true,
        username: true,
        balance: true,
        isActive: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user by username error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Update user balance (admin only)
router.put('/:id/balance', [
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('adminPassword').notEmpty().withMessage('Admin password required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { amount, adminPassword, reason } = req.body;

    // Verify admin password
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid admin password' });
    }

    // Validate amount
    if (amount < 0) {
      return res.status(400).json({ error: 'Amount cannot be negative' });
    }

    // Update user balance
    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: { balance: amount },
      select: {
        id: true,
        name: true,
        username: true,
        balance: true
      }
    });

    // Log admin action
    await prisma.adminLog.create({
      data: {
        action: 'BALANCE_UPDATE',
        details: JSON.stringify({
          userId: user.id,
          username: user.username,
          newBalance: amount,
          reason: reason || 'Admin balance update'
        }),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    });

    // Emit to admin dashboard and user device
    if (req.io) {
      req.io.to('admin-room').emit('balance-updated', { user });
      req.io.to(`device-${user.deviceId}`).emit('balance-updated', { 
        balance: user.balance 
      });
    }

    res.json({
      message: 'Balance updated successfully',
      user
    });

  } catch (error) {
    console.error('Update balance error:', error);
    res.status(500).json({ error: 'Failed to update balance' });
  }
});

// Get user transactions
router.get('/:id/transactions', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 10, offset = 0 } = req.query;

    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { senderId: parseInt(id) },
          { receiverId: parseInt(id) }
        ]
      },
      include: {
        sender: {
          select: { id: true, name: true, username: true }
        },
        receiver: {
          select: { id: true, name: true, username: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: parseInt(limit),
      skip: parseInt(offset)
    });

    res.json(transactions);
  } catch (error) {
    console.error('Get user transactions error:', error);
    res.status(500).json({ error: 'Failed to get transactions' });
  }
});

// Update user profile
router.put('/:id', [
  body('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name } = req.body;

    // Check if user can update this profile (only own profile or admin)
    if (req.user && req.user.id !== parseInt(id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: { name },
      select: {
        id: true,
        name: true,
        username: true,
        balance: true
      }
    });

    res.json({
      message: 'Profile updated successfully',
      user
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Deactivate user (admin only)
router.put('/:id/deactivate', async (req, res) => {
  try {
    const { id } = req.params;
    const { adminPassword } = req.body;

    // Verify admin password
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid admin password' });
    }

    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: { isActive: false },
      select: {
        id: true,
        name: true,
        username: true,
        isActive: true
      }
    });

    // Log admin action
    await prisma.adminLog.create({
      data: {
        action: 'USER_DEACTIVATE',
        details: JSON.stringify({
          userId: user.id,
          username: user.username
        }),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    });

    // Emit to admin dashboard
    if (req.io) {
      req.io.to('admin-room').emit('user-deactivated', { user });
    }

    res.json({
      message: 'User deactivated successfully',
      user
    });

  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
});

module.exports = router;