const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Authenticate JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    // Check for app secret (for mobile app compatibility)
    const appKey = req.headers['x-app-key'];
    const appSecret = process.env.APP_SECRET || 'NFC2025SecureApp';
    if (appKey === appSecret) {
      // Mobile app access - skip JWT for now (legacy compatibility)
      return next();
    }

    console.log(token)

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const jwtSecret = process.env.JWT_SECRET || 'nfc-payment-jwt-secret-2025-ultra-secure-key';
    const decoded = jwt.verify(token, jwtSecret);
    
    // Check if user exists and session is valid
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        userSessions: {
          where: {
            token: token,
            isActive: true,
            expiresAt: {
              gt: new Date()
            }
          }
        }
      }
    });

    if (!user || user.userSessions.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Authenticate admin (simple password check)
const authenticateAdmin = (req, res, next) => {
  const adminPassword = req.headers['x-admin-password'] || req.body.adminPassword;
  const appKey = req.headers['x-app-key'];
  
  const appSecret = process.env.APP_SECRET || 'NFC2025SecureApp';
  const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
  
  // Check app key first
  if (appKey !== appSecret) {
    return res.status(401).json({ error: 'Invalid app key' });
  }
  
  // Check admin password
  if (adminPassword !== adminPass) {
    return res.status(401).json({ error: 'Invalid admin password' });
  }
  
  next();
};

// Authenticate device (for device sync)
const authenticateDevice = (req, res, next) => {
  const appKey = req.headers['x-app-key'];
  const userAgent = req.headers['user-agent'];
  
  const appSecret = process.env.APP_SECRET || 'NFC2025SecureApp';
  
  if (appKey !== appSecret) {
    return res.status(401).json({ error: 'Invalid app key' });
  }
  
  if (!userAgent || !userAgent.includes('okhttp')) {
    return res.status(401).json({ error: 'Invalid user agent' });
  }
  
  next();
};

module.exports = {
  authenticateToken,
  authenticateAdmin,
  authenticateDevice
};