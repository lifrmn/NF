// ============================================================
// AUTH.JS - ROUTES UNTUK AUTENTIKASI USER
// ============================================================
// File ini berisi semua endpoint untuk autentikasi:
// - POST /register -> Registrasi user baru
// - POST /login -> Login user (return JWT token)
// - POST /logout -> Logout user (invalidate session)
// - GET /verify -> Verify JWT token masih valid
//
// Semua endpoint di file ini PUBLIC (tidak perlu auth)
// karena user belum punya token saat register/login

const express = require('express'); // Express framework untuk routing
const bcrypt = require('bcryptjs'); // Library untuk hash password (security)
const jwt = require('jsonwebtoken'); // Library untuk generate & verify JWT token
const { body, validationResult } = require('express-validator'); // Untuk validasi input request
const { PrismaClient } = require('@prisma/client'); // Prisma ORM untuk database access

const router = express.Router(); // Buat instance Express Router
const prisma = new PrismaClient(); // Buat instance Prisma client

// =============================================================
// ENDPOINT 1: POST /register - REGISTER USER BARU
// =============================================================
// Endpoint untuk registrasi user baru ke sistem
// User akan mendapat JWT token setelah register sukses (auto-login)
//
// Request body:
// - name: string (min 2 chars)
// - username: string (min 3 chars, unique)
// - password: string (min 6 chars)
// - deviceId: string (optional, untuk tracking device)
//
// Response:
// - user: object (id, name, username, balance)
// - token: string (JWT token untuk autentikasi)
router.post(
  '/register',
  [
    // STEP 1: Validasi input menggunakan express-validator
    body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'), // Nama min 2 karakter
    body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'), // Username min 3 karakter
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'), // Password min 6 karakter
  ],
  async (req, res) => {
    try {
      console.log("Helo") // Debug log
      console.log('🔥 REGISTER REQUEST from mobile app');
      console.log('👤 Name:', req.body.name);
      console.log('📱 Username:', req.body.username);
      console.log('🌐 IP:', req.ip);
      
      // STEP 2: Cek hasil validasi
      const errors = validationResult(req); // Ambil errors dari validasi
      if (!errors.isEmpty()) { // Jika ada error validasi
        console.log('❌ Validation errors:', errors.array());
        return res.status(400).json({ errors: errors.array() }); // Return 400 Bad Request dengan detail errors
      }

      // STEP 3: Extract data dari request body
      const { name, username, password, deviceId } = req.body;

      // STEP 4: Cek apakah username sudah ada di database (unique constraint)
      const existingUser = await prisma.user.findUnique({ where: { username } });
      if (existingUser) { // Jika username sudah dipakai
        return res.status(400).json({ error: 'Username sudah digunakan' }); // Return error
      }

      // STEP 5: Hash password menggunakan bcrypt (untuk security)
      // JANGAN PERNAH simpan password plain text di database!
      const hashedPassword = await bcrypt.hash(password, 10); // Salt rounds = 10 (recommended)

      // STEP 6: Buat user baru di database
      const user = await prisma.user.create({
        data: {
          name, // Nama lengkap
          username, // Username (unique)
          password: hashedPassword, // Password yang sudah di-hash
          deviceId: deviceId || null, // Device ID (optional)
          balance: 0, // Balance awal = 0 (bisa diubah di .env atau config)
          isActive: true, // User aktif (belum diblokir)
        },
      });

      // STEP 7: Buat token JWT untuk user
      const jwtSecret = process.env.JWT_SECRET || 'nfc-payment-jwt-secret-2025-ultra-secure-key'; // JWT secret dari .env
      const token = jwt.sign(
        { userId: user.id, username: user.username }, // Payload (data yang di-encode di token)
        jwtSecret, // Secret key untuk signing
        { expiresIn: '7d' } // Token valid selama 7 hari
      );

      // STEP 8: Simpan session user di database (untuk tracking & logout)
      await prisma.userSession.create({
        data: {
          userId: user.id, // User ID
          deviceId: deviceId || 'unknown', // Device ID
          token, // JWT token
          isActive: true, // Session aktif
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expire 7 hari dari sekarang
          ipAddress: req.ip || '0.0.0.0', // IP address user
          userAgent: req.headers['user-agent'] || 'unknown', // User agent (browser/app info)
        },
      });

      // STEP 9: Emit event 'user-registered' ke admin dashboard (via Socket.IO)
      if (req.io) { // Jika Socket.IO tersedia
        req.io.to('admin-room').emit('user-registered', {
          user: {
            id: user.id,
            name: user.name,
            username: user.username,
            balance: user.balance,
          },
        });
      }

      // STEP 10: Return response sukses dengan user data & token
      return res.status(201).json({ // 201 Created
        message: 'User registered successfully',
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          balance: user.balance,
        },
        token, // JWT token (client simpan ini untuk request berikutnya)
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ error: 'Failed to register user' });
    }
  }
);

// =============================================================
// ENDPOINT 2: POST /login - LOGIN USER
// =============================================================
// Endpoint untuk login user ke sistem
// User kirim username & password, server verify dan return JWT token
//
// Request body:
// - username: string (required)
// - password: string (required) 
// - deviceId: string (optional, untuk tracking)
//
// Response:
// - user: object (id, name, username, balance)
// - token: string (JWT token untuk autentikasi)
router.post(
  '/login',
  [
    // STEP 1: Validasi input
    body('username').trim().notEmpty().withMessage('Username is required'), // Username wajib ada
    body('password').notEmpty().withMessage('Password is required'), // Password wajib ada
  ],
  async (req, res) => {
    try {
      console.log('🔥 LOGIN REQUEST from mobile app');
      console.log('📱 Username:', req.body.username);
      console.log('🌐 IP:', req.ip);
      
      // STEP 2: Cek hasil validasi
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('❌ Validation errors:', errors.array());
        return res.status(400).json({ errors: errors.array() });
      }

      // STEP 3: Extract data dari request body
      const { username, password, deviceId } = req.body;

      // STEP 4: Cari user berdasarkan username
      const user = await prisma.user.findUnique({ where: { username } });
      if (!user) { // Jika user tidak ditemukan
        console.log('❌ User not found:', username);
        return res.status(401).json({ error: 'Username atau password salah' }); // 401 Unauthorized
      }

      console.log('✅ User found:', { id: user.id, username: user.username, hasPassword: !!user.password });

      // STEP 5: Cek password menggunakan bcrypt.compare()
      // bcrypt.compare() akan hash password input dan compare dengan hash di database
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) { // Jika password salah
        console.log('❌ Invalid password for user:', username);
        return res.status(401).json({ error: 'Username atau password salah' }); // 401 Unauthorized
      }

      console.log('🎉 LOGIN SUCCESS for user:', username);

      // STEP 6: Buat token JWT
      const jwtSecret = process.env.JWT_SECRET || 'nfc-payment-jwt-secret-2025-ultra-secure-key';
      const token = jwt.sign(
        { userId: user.id, username: user.username }, // Payload
        jwtSecret, // Secret key
        { expiresIn: '7d' } // Expire 7 hari
      );

      // STEP 7: Buat atau update session (upsert = update if exists, create if not)
      await prisma.userSession.upsert({
        where: { token }, // WHERE token = token (cari session dengan token ini)
        update: { // Jika sudah ada, update:
          isActive: true, // Set aktif
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Perpanjang expire time
          ipAddress: req.ip || '0.0.0.0', // Update IP
          userAgent: req.headers['user-agent'] || 'unknown', // Update user agent
        },
        create: { // Jika belum ada, create:
          userId: user.id, // User ID
          deviceId: deviceId || 'unknown', // Device ID
          token, // JWT token
          isActive: true, // Session aktif
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expire 7 hari
          ipAddress: req.ip || '0.0.0.0', // IP address
          userAgent: req.headers['user-agent'] || 'unknown', // User agent
        },
      });

      // STEP 8: Emit login event ke admin dashboard (via Socket.IO)
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

      // STEP 9: Return response sukses dengan user data & token
      return res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          balance: user.balance,
        },
        token, // JWT token (client simpan untuk request berikutnya)
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Failed to login' });
    }
  }
);

// =============================================================
// ENDPOINT 3: POST /logout - LOGOUT USER
// =============================================================
// Endpoint untuk logout user dari sistem
// Session akan di-invalidate (set isActive = false)
//
// Request headers:
// - Authorization: Bearer <token>
//
// Response:
// - message: string (logout status)
router.post('/logout', async (req, res) => {
  try {
    // STEP 1: Ambil token dari Authorization header
    // Format: "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    const token = req.headers['authorization']?.split(' ')[1]; // Split "Bearer TOKEN" -> ambil TOKEN
    
    // STEP 2: Validasi token ada
    if (!token) return res.status(400).json({ error: 'No token provided' });

    // STEP 3: Update semua session dengan token ini - set isActive = false
    // updateMany karena bisa ada multiple session dengan token yang sama
    await prisma.userSession.updateMany({
      where: { token }, // WHERE token = token
      data: { isActive: false }, // SET isActive = false (session di-invalidate)
    });

    // STEP 4: Return response sukses
    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Failed to logout' });
  }
});

// =============================================================
// ENDPOINT 4: GET /verify - VERIFY TOKEN
// =============================================================
// Endpoint untuk verify apakah JWT token masih valid
// Client bisa pakai endpoint ini saat app start untuk cek token tersimpan
//
// Request headers:
// - Authorization: Bearer <token>
//
// Response:
// - valid: boolean (true/false)
// - user: object (jika valid)
router.get('/verify', async (req, res) => {
  try {
    // STEP 1: Ambil token dari Authorization header
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' }); // 401 Unauthorized

    // STEP 2: Verify token menggunakan jwt.verify()
    let decoded; // Variable untuk menyimpan decoded payload
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET); // Verify & decode token
      // decoded = { userId: 123, username: 'john', iat: 1234567890, exp: 1234571490 }
    } catch (err) {
      // Token invalid (signature salah, expired, dll)
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // STEP 3: Cari user dari database berdasarkan userId di token payload
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }, // WHERE id = decoded.userId
      select: { // SELECT field yang diperlukan (tanpa password!)
        id: true, // User ID
        name: true, // Nama lengkap
        username: true, // Username
        balance: true, // Saldo
        isActive: true // Status aktif/blokir
      },
    });

    // STEP 4: Validasi user exists dan aktif
    if (!user || !user.isActive) { // Jika user tidak ada atau diblokir
      return res.status(401).json({ error: 'Invalid token or inactive user' });
    }

    // STEP 5: Token valid! Return user data
    res.json({ valid: true, user });
  } catch (error) {
    res.status(500).json({ valid: false, error: 'Server error' });
  }
});

// STEP 6: Export router agar bisa diimport di server.js
module.exports = router;
