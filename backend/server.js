require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const os = require('os');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const transactionRoutes = require('./routes/transactions');
const fraudRoutes = require('./routes/fraud');
const adminRoutes = require('./routes/admin');
const deviceRoutes = require('./routes/devices');
const nfcCardRoutes = require('./routes/nfcCards');

// Middleware
const { authenticateToken, authenticateAdmin } = require('./middleware/auth');
const { errorHandler } = require('./middleware/errorHandler');
const { requestLogger } = require('./middleware/logger');

// Initialize
const app = express();
const server = http.createServer(app);
const prisma = new PrismaClient();

/* ------------------------- 🔧 CONFIGURATIONS ------------------------- */

const PORT = Number(process.env.PORT || 4000);
const HOST = process.env.HOST || '0.0.0.0';
const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
const MAX_REQS = Number(process.env.RATE_LIMIT_MAX_REQUESTS || 100);

// Socket.IO setup
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.set('trust proxy', 1);

/* ------------------------- 🧱 MIDDLEWARES ------------------------- */

app.use(helmet());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// CORS setup aman
app.use(
  cors({
    origin:'*'
  })
);

app.options('*', cors());

// Rate limiting
app.use(
  '/api',
  rateLimit({
    windowMs: WINDOW_MS,
    max: MAX_REQS,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
  })
);

// Attach IO & Prisma globally
app.use((req, res, next) => {
  req.io = io;
  req.prisma = prisma;
  next();
});

/* ------------------------- 🩺 HEALTH CHECK ------------------------- */
app.get(['/health', '/api/health'], async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    
    // Jika request dari Android app (okhttp), catat sebagai device
    const userAgent = req.headers['user-agent'] || '';
    if (userAgent.includes('okhttp')) {
      const now = new Date();
      const deviceId = req.ip.replace(/[.:]/g, '_'); // Convert IP to deviceId
      
      try {
        // Update atau buat device record berdasarkan IP
        await prisma.device.upsert({
          where: { deviceId: deviceId },
          update: {
            ipAddress: req.ip,
            lastSeen: now,
            isOnline: true,
            platform: 'android'
          },
          create: {
            deviceId: deviceId,
            deviceName: `Android Device (${req.ip})`,
            platform: 'android',
            ipAddress: req.ip,
            lastSeen: now,
            isOnline: true,
            totalUsers: 0,
            totalBalance: 0
          }
        });
        
        console.log(`📱 Device health check: ${deviceId} (${req.ip})`);
      } catch (deviceError) {
        console.error('Device record error:', deviceError);
      }
    }
    
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      database: 'connected',
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message,
    });
  }
});

/* ------------------------- 📋 API ROOT ENDPOINT ------------------------- */
app.get('/api', (req, res) => {
  res.json({
    status: 'OK',
    server: 'NFC Payment Backend API',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health atau /api/health',
      auth: {
        login: 'POST /api/auth/login',
        register: 'POST /api/auth/register'
      },
      users: {
        me: 'GET /api/users/me',
        all: 'GET /api/users/all',
        update: 'PUT /api/users/:id',
        delete: 'DELETE /api/users/:id'
      },
      admin: {
        dashboard: '/admin',
        updateBalance: 'POST /api/update-balance'
      },
      debug: {
        users: 'GET /api/debug/users',
        ping: 'GET /api/ping'
      }
    }
  });
});

/* ------------------------- 👤 PUBLIC USER ENDPOINTS (NO AUTH) ------------------------- */
// Get current user info (untuk sync balance)
app.get('/api/users/me', async (req, res) => {
  try {
    // Ambil userId dari header atau query (simple auth)
    const userId = req.headers['x-user-id'] || req.query.userId;
    
    if (!userId) {
      console.log('❌ No user ID provided in request');
      return res.status(400).json({ error: 'User ID required in x-user-id header or userId query' });
    }
    
    const userIdInt = parseInt(userId);
    if (isNaN(userIdInt)) {
      console.log(`❌ Invalid user ID format: ${userId}`);
      return res.status(400).json({ error: 'User ID must be a valid number' });
    }
    
    console.log(`👤 Looking for user ID: ${userIdInt}...`);
    
    // Cari user berdasarkan ID
    const user = await prisma.user.findUnique({
      where: { id: userIdInt },
      select: {
        id: true,
        name: true,
        username: true,
        balance: true,
        isActive: true,
        updatedAt: true,
        createdAt: true
      }
    });
    
    if (!user) {
      console.log(`❌ User not found in database: ID ${userIdInt}`);
      return res.status(404).json({ error: `User with ID ${userIdInt} not found` });
    }
    
    console.log(`✅ User found: ${user.username} (ID: ${user.id}), balance: ${user.balance}`);
    res.json({ success: true, user: user });
    
  } catch (error) {
    console.error('❌ Get user error:', error);
    res.status(500).json({ error: 'Failed to get user info', details: error.message });
  }
});

// List all users for debugging (NO AUTH)
app.get('/api/users/all', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        balance: true,
        isActive: true,
        createdAt: true
      },
      orderBy: {
        id: 'asc'
      }
    });
    
    console.log(`📊 All users in database: ${users.length} users`);
    users.forEach(user => {
      console.log(`  - ID: ${user.id}, Username: ${user.username}, Balance: ${user.balance}`);
    });
    
    res.json({ success: true, users: users, count: users.length });
    
  } catch (error) {
    console.error('❌ Get all users error:', error);
    res.status(500).json({ error: 'Failed to get all users' });
  }
});

// Update user (PUT /api/users/:id) - untuk edit balance dan name (NO AUTH)
app.put('/api/users/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { balance, name } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }
    
    // Build update data
    const updateData = {};
    if (balance !== undefined) updateData.balance = parseInt(balance);
    if (name !== undefined) updateData.name = name;
    
    // Update user in database
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData
    });
    
    console.log(`✏️ Updated user ${userId}: balance=${balance}, name=${name}`);
    res.json({ success: true, user: updatedUser });
    
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Get user by ID (PUBLIC - NO AUTH) - untuk Mobile App sync balance
app.get('/api/users/:id/public', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        username: true,
        balance: true,
        isActive: true,
        deviceId: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`📱 Public user fetch: ${user.username} (balance: ${user.balance})`);

    res.json({
      success: true,
      user: user
    });

  } catch (error) {
    console.error('Get user public error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

/* ------------------------- 🧭 ROUTES ------------------------- */
app.use('/admin', express.static(path.join(__dirname, '../admin')));
app.get('/admin', (req, res) =>
  res.sendFile(path.join(__dirname, '../admin/simple-dashboard.html'))
);

// Public endpoints (no auth required)
app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/nfc-cards', nfcCardRoutes); // NFC Card management

// Protected endpoints (require auth)
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/transactions', authenticateToken, transactionRoutes);
app.use('/api/fraud', authenticateToken, fraudRoutes);
app.use('/api/admin', authenticateAdmin, adminRoutes);

app.use((err, req, res, next) => {
  console.error('🔥 Uncaught error:', err);
  res.status(500).json({ error: 'Internal server error' });
});


app.get('/api/ping', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    server: 'NFC Payment Backend Server',
    version: '2.0.0',
    uptime: process.uptime(),
  });
});

// DEBUG ENDPOINT - Direct access to users (bypass auth) - Count unique users only
app.get('/api/debug/users', async (req, res) => {
  try {
    console.log('🔧 DEBUG: Direct user access (count unique users only)');
    
    // Hitung total user unik (tanpa duplikasi device)
    const totalUniqueUsers = await prisma.user.count();
    
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

    console.log(`🔧 DEBUG: Found ${totalUniqueUsers} unique users`);

    res.json({
      success: true,
      users: users,
      totalUniqueUsers: totalUniqueUsers,
      total: users.length,
      debug: true
    });

  } catch (error) {
    console.error('❌ DEBUG users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});


/* ------------------------- ⚖️ ADMIN ENDPOINTS ------------------------- */
// Update balance (top-up saldo) untuk user berdasarkan deviceId/userId
app.post('/api/update-balance', async (req, res) => {
  try {
    const { deviceId, amount, adminPassword } = req.body;
    
    // Validasi admin password
    const ADMIN_PASSWORD = 'admin123'; // Bisa dipindah ke .env
    if (adminPassword !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid admin password' });
    }
    
    // Validasi input
    if (!deviceId || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid input data' });
    }
    
    // Cari user berdasarkan deviceId atau userId
    let targetUser;
    if (deviceId.startsWith('user_')) {
      const userId = parseInt(deviceId.replace('user_', ''));
      targetUser = await prisma.user.findUnique({
        where: { id: userId }
      });
    } else {
      targetUser = await prisma.user.findFirst({
        where: { deviceId: deviceId }
      });
    }
    
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update balance user
    const updatedUser = await prisma.user.update({
      where: { id: targetUser.id },
      data: {
        balance: {
          increment: amount
        }
      }
    });
    
    console.log(`💰 Admin top-up: ${amount} to user ${targetUser.username} (ID: ${targetUser.id})`);
    res.json({ success: true, newBalance: updatedUser.balance });
    
  } catch (error) {
    console.error('Update balance error:', error);
    res.status(500).json({ error: 'Failed to update balance' });
  }
});

// Delete user endpoint (bukan device)
app.delete('/api/delete-device/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { adminPassword } = req.body;
    
    // Validasi admin password
    const ADMIN_PASSWORD = 'admin123';
    if (adminPassword !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid admin password' });
    }
    
    // Cari user berdasarkan deviceId atau userId
    let targetUser;
    if (deviceId.startsWith('user_')) {
      const userId = parseInt(deviceId.replace('user_', ''));
      targetUser = await prisma.user.findUnique({
        where: { id: userId }
      });
    } else {
      targetUser = await prisma.user.findFirst({
        where: { deviceId: deviceId }
      });
    }
    
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Hapus user dari database
    await prisma.user.delete({
      where: { id: targetUser.id }
    });
    
    console.log(`🗑️ Admin deleted user: ${targetUser.username} (ID: ${targetUser.id})`);
    res.json({ success: true, message: 'User deleted successfully' });
    
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

/* ------------------------- ⚡ SOCKET.IO ------------------------- */
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  socket.on('join-admin', () => {
    socket.join('admin-room');
    console.log('👤 Admin joined room');
  });

  socket.on('join-device', (deviceId) => {
    socket.join(`device-${deviceId}`);
    console.log(`📱 Device ${deviceId} joined room`);
  });

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

/* ------------------------- ⚙️ ERROR HANDLING ------------------------- */
app.use(errorHandler);

/* ------------------------- 🌐 NETWORK INFO ------------------------- */
function getLanIPs() {
  const ifaces = os.networkInterfaces();
  const list = [];
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        list.push(iface.address);
      }
    }
  }
  return list;
}

/* ------------------------- 🚀 SERVER START ------------------------- */
(async () => {
  try {
    await prisma.$connect();
    console.log('🗄️ Prisma connected successfully.');

    server.listen(PORT, HOST, () => {
      const ips = getLanIPs();

      console.log('\n🚀 NFC Payment Backend Server started!');
      console.log(`📊 Server bind : http://${HOST}:${PORT}`);
      console.log(`🔍 Health Check: http://${HOST}:${PORT}/health`);
      console.log(`🖥️  Admin Dash : http://${HOST}:${PORT}/admin`);
      console.log(`📡 Socket.IO   : Enabled`);
      if (ips.length) {
        console.log('\n🌐 Test from phone (same Wi-Fi / hotspot):');
        ips.forEach((ip) =>
          console.log(`   • http://${ip}:${PORT}/api/health`)
        );
      }
      console.log('\n📋 Available APIs:');
      console.log('   🔐 Auth         : /api/auth/login, /api/auth/register');
      console.log('   👤 Users        : /api/users');
      console.log('   💳 Transactions : /api/transactions');
      console.log('   🚨 Fraud        : /api/fraud');
      console.log('   📱 Devices      : /api/devices');
      console.log('   🛠️  Admin       : /api/admin\n');
    });
  } catch (err) {
    console.error('❌ Failed to connect Prisma:', err);
    process.exit(1);
  }
})();

/* ------------------------- 🧹 GRACEFUL SHUTDOWN ------------------------- */
const gracefulExit = async (signal) => {
  console.log(`🛑 ${signal} received... Shutting down gracefully.`);
  try {
    await prisma.$disconnect();
  } catch {}
  server.close(() => {
    console.log('✅ Server shut down successfully');
    process.exit(0);
  });
};

process.on('SIGINT', () => gracefulExit('SIGINT'));
process.on('SIGTERM', () => gracefulExit('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  console.error('⚠️  Unhandled Rejection:', reason);
});

module.exports = { app, io, prisma };
