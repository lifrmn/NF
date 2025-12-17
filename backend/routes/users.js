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

// Get user's NFC cards
router.get('/:id/cards', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) }
    });

    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    // Get all cards for this user
    const cards = await prisma.nFCCard.findMany({
      where: { userId: parseInt(id) },
      select: {
        cardId: true,
        cardStatus: true,
        balance: true,
        registeredAt: true,
        lastUsed: true
      },
      orderBy: {
        registeredAt: 'desc'
      }
    });

    res.json({ 
      success: true,
      cards: cards 
    });
  } catch (error) {
    console.error('Get user cards error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get user cards' 
    });
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

// Delete user permanently (admin only)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);

    console.log(`🗑️ [Backend] Delete user request for ID: ${userId}`);

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        username: true
      }
    });

    if (!user) {
      console.log(`❌ [Backend] User ${userId} not found`);
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }

    console.log(`✅ [Backend] User found: ${user.username}`);

    // CASCADE DELETE: Delete all related records first
    // URUTAN PENTING: Delete dari child table ke parent table
    
    // 1. Delete NFC transactions (child of NFCCard)
    console.log(`🗑️ [Backend] Deleting NFC transactions for user ${userId}...`);
    const userCards = await prisma.nFCCard.findMany({
      where: { userId: userId },
      select: { cardId: true }
    });
    
    if (userCards.length > 0) {
      const cardIds = userCards.map(card => card.cardId);
      await prisma.nFCTransaction.deleteMany({
        where: { cardId: { in: cardIds } }
      });
      console.log(`✅ [Backend] Deleted ${cardIds.length} card transactions`);
    }
    
    // 2. Delete user's NFC cards
    console.log(`🗑️ [Backend] Deleting NFC cards for user ${userId}...`);
    await prisma.nFCCard.deleteMany({
      where: { userId: userId }
    });

    // 3. Delete user's transactions (both sent and received)
    console.log(`🗑️ [Backend] Deleting transactions for user ${userId}...`);
    await prisma.transaction.deleteMany({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId }
        ]
      }
    });

    // 4. Delete user's fraud alerts
    console.log(`🗑️ [Backend] Deleting fraud alerts for user ${userId}...`);
    await prisma.fraudAlert.deleteMany({
      where: { userId: userId }
    });

    // 5. Delete user's sessions
    console.log(`🗑️ [Backend] Deleting sessions for user ${userId}...`);
    await prisma.userSession.deleteMany({
      where: { userId: userId }
    });

    // 6. Delete the user
    console.log(`🗑️ [Backend] Deleting user ${userId}...`);
    await prisma.user.delete({
      where: { id: userId }
    });

    // 7. Log admin action
    console.log(`📝 [Backend] Logging admin action...`);
    await prisma.adminLog.create({
      data: {
        action: 'USER_DELETE',
        details: JSON.stringify({
          userId: user.id,
          username: user.username,
          name: user.name
        }),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    });

    // Emit to admin dashboard
    if (req.io) {
      req.io.to('admin-room').emit('user-deleted', { userId: user.id });
    }

    console.log(`✅ [Backend] User ${user.username} (ID: ${user.id}) berhasil dihapus (cascade complete)`);

    res.json({
      success: true,
      message: 'User berhasil dihapus',
      user: {
        id: user.id,
        name: user.name,
        username: user.username
      }
    });

  } catch (error) {
    console.error('❌ [Backend] Delete user error:', error);
    console.error('❌ [Backend] Error details:', error.message);
    console.error('❌ [Backend] Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Gagal menghapus user',
      details: error.message 
    });
  }
});

module.exports = router;