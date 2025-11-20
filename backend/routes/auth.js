const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// =============================================================
// REGISTER USER
// =============================================================
router.post(
  '/register',
  [
    body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  async (req, res) => {
    try {
      console.log("Helo")
      console.log('🔥 REGISTER REQUEST from mobile app');
      console.log('👤 Name:', req.body.name);
      console.log('📱 Username:', req.body.username);
      console.log('🌐 IP:', req.ip);
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('❌ Validation errors:', errors.array());
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, username, password, deviceId } = req.body;

      // Cek apakah username sudah ada
      const existingUser = await prisma.user.findUnique({ where: { username } });
      if (existingUser) {
        return res.status(400).json({ error: 'Username sudah digunakan' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Buat user baru
      const user = await prisma.user.create({
        data: {
          name,
          username,
          password: hashedPassword,
          deviceId: deviceId || null,
          balance: 0,
          isActive: true,
        },
      });

      // Buat token JWT
      const jwtSecret = process.env.JWT_SECRET || 'nfc-payment-jwt-secret-2025-ultra-secure-key';
      const token = jwt.sign(
        { userId: user.id, username: user.username },
        jwtSecret,
        { expiresIn: '7d' }
      );

      // Simpan session user
      await prisma.userSession.create({
        data: {
          userId: user.id,
          deviceId: deviceId || 'unknown',
          token,
          isActive: true,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          ipAddress: req.ip || '0.0.0.0',
          userAgent: req.headers['user-agent'] || 'unknown',
        },
      });

      // Emit ke admin (jika Socket.IO aktif)
      if (req.io) {
        req.io.to('admin-room').emit('user-registered', {
          user: {
            id: user.id,
            name: user.name,
            username: user.username,
            balance: user.balance,
          },
        });
      }

      return res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          balance: user.balance,
        },
        token,
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ error: 'Failed to register user' });
    }
  }
);

// =============================================================
// LOGIN USER
// =============================================================
router.post(
  '/login',
  [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    try {
      console.log('🔥 LOGIN REQUEST from mobile app');
      console.log('📱 Username:', req.body.username);
      console.log('🌐 IP:', req.ip);
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('❌ Validation errors:', errors.array());
        return res.status(400).json({ errors: errors.array() });
      }

      const { username, password, deviceId } = req.body;

      // Cari user
      const user = await prisma.user.findUnique({ where: { username } });
      if (!user) {
        console.log('❌ User not found:', username);
        return res.status(401).json({ error: 'Username atau password salah' });
      }

      console.log('✅ User found:', { id: user.id, username: user.username, hasPassword: !!user.password });

      // Cek password
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        console.log('❌ Invalid password for user:', username);
        return res.status(401).json({ error: 'Username atau password salah' });
      }

      console.log('🎉 LOGIN SUCCESS for user:', username);

      // Buat token JWT
      const jwtSecret = process.env.JWT_SECRET || 'nfc-payment-jwt-secret-2025-ultra-secure-key';
      const token = jwt.sign(
        { userId: user.id, username: user.username },
        jwtSecret,
        { expiresIn: '7d' }
      );

      // Buat atau update session
      await prisma.userSession.upsert({
        where: { token },
        update: {
          isActive: true,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          ipAddress: req.ip || '0.0.0.0',
          userAgent: req.headers['user-agent'] || 'unknown',
        },
        create: {
          userId: user.id,
          deviceId: deviceId || 'unknown',
          token,
          isActive: true,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          ipAddress: req.ip || '0.0.0.0',
          userAgent: req.headers['user-agent'] || 'unknown',
        },
      });

      // Emit login ke admin
      if (req.io) {
        req.io.to('admin-room').emit('user-login', {
          user: {
            id: user.id,
            name: user.name,
            username: user.username,
            balance: user.balance,
          },
        });
      }

      return res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          balance: user.balance,
        },
        token,
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Failed to login' });
    }
  }
);

// =============================================================
// LOGOUT
// =============================================================
router.post('/logout', async (req, res) => {
  try {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(400).json({ error: 'No token provided' });

    await prisma.userSession.updateMany({
      where: { token },
      data: { isActive: false },
    });

    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Failed to logout' });
  }
});

// =============================================================
// VERIFY TOKEN
// =============================================================
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, name: true, username: true, balance: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid token or inactive user' });
    }

    res.json({ valid: true, user });
  } catch (error) {
    res.status(500).json({ valid: false, error: 'Server error' });
  }
});

module.exports = router;
