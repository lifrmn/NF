# 🚀 NFC Payment Backend - Express + Prisma

Backend server modern untuk aplikasi NFC Payment dengan Express.js dan Prisma ORM.

## ⚡ Quick Start

```bash
# 1. Install dependencies dan setup database
node setup.js

# 2. Start development server
npm run dev

# 3. Server akan berjalan di:
# http://localhost:3000 - API
# http://localhost:3000/admin - Admin Dashboard
# http://localhost:3000/health - Health Check
```

## 🏗️ Architecture

```
Backend/
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── seed.js          # Sample data
├── routes/
│   ├── auth.js          # Authentication
│   ├── users.js         # User management
│   ├── transactions.js  # Transactions & Fraud Detection
│   ├── fraud.js         # Fraud alerts
│   ├── devices.js       # Device sync
│   └── admin.js         # Admin operations
├── middleware/
│   ├── auth.js          # JWT & Admin auth
│   ├── errorHandler.js  # Error handling
│   └── logger.js        # Request logging
└── server.js            # Main server file
```

## 📊 Database Schema

### **Users**
- `id` - Auto-increment primary key
- `name` - Full name
- `username` - Unique username
- `password` - Hashed password (bcrypt)
- `balance` - Current balance
- `deviceId` - Associated device
- `isActive` - Account status

### **Transactions**
- `id` - Auto-increment primary key
- `senderId` - Sender user ID
- `receiverId` - Receiver user ID
- `amount` - Transaction amount
- `type` - Transaction type (transfer, topup, etc)
- `status` - completed/pending/failed
- `fraudRiskScore` - AI fraud detection score
- `fraudRiskLevel` - LOW/MEDIUM/HIGH/CRITICAL

### **Fraud Alerts**
- `id` - Auto-increment primary key
- `userId` - Associated user
- `transactionId` - Associated transaction
- `riskScore` - Risk percentage (0-1)
- `riskLevel` - Risk category
- `decision` - ALLOW/REVIEW/BLOCK
- `reasons` - JSON array of reasons
- `riskFactors` - Detailed risk analysis

### **Devices**
- `id` - Auto-increment primary key
- `deviceId` - Unique device identifier
- `deviceName` - Device display name
- `platform` - android/ios
- `isOnline` - Current online status
- `lastSeen` - Last sync timestamp

## 🔐 API Authentication

### **Mobile App Authentication**
```http
Headers:
x-app-key: NFC2025SecureApp
user-agent: okhttp/4.9.1
```

### **JWT Authentication**
```http
Headers:
Authorization: Bearer <jwt_token>
```

### **Admin Authentication**
```http
Headers:
x-app-key: NFC2025SecureApp
x-admin-password: admin123
```

## 🌐 API Endpoints

### **Authentication**
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/verify` - Verify JWT token

### **Users**
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `GET /api/users/username/:username` - Get user by username
- `PUT /api/users/:id/balance` - Update balance (admin)
- `GET /api/users/:id/transactions` - Get user transactions

### **Transactions**
- `GET /api/transactions` - Get all transactions
- `POST /api/transactions` - Create new transaction
- `GET /api/transactions/:id` - Get transaction by ID
- `GET /api/transactions/stats/summary` - Transaction statistics

### **Fraud Detection**
- `GET /api/fraud/alerts` - Get fraud alerts
- `POST /api/fraud/alert` - Create fraud alert
- `PUT /api/fraud/alerts/:id/status` - Update alert status
- `GET /api/fraud/stats` - Fraud statistics
- `POST /api/fraud/analyze` - Analyze transaction risk

### **Devices**
- `POST /api/devices/sync-device` - Sync device data
- `GET /api/devices` - Get all devices
- `GET /api/devices/:deviceId` - Get device by ID
- `GET /api/devices/stats/summary` - Device statistics

### **Admin**
- `GET /api/admin/dashboard` - Dashboard statistics
- `POST /api/admin/balance-update` - Bulk balance update
- `GET /api/admin/logs` - Admin action logs
- `GET /api/admin/settings` - System settings
- `PUT /api/admin/settings/:key` - Update setting
- `GET /api/admin/backup` - Export database backup

## 🤖 Fraud Detection AI

### **Algorithm Features**
1. **Velocity Detection (70% weight)**
   - Tracks transaction frequency
   - Detects rapid-fire transactions
   - Threshold: 5 transactions in 5 minutes

2. **Amount Analysis (30% weight)**
   - Balance ratio analysis
   - User behavior patterns
   - Large amount detection (>1M IDR)

### **Risk Levels**
- **LOW** (0-30%) - Auto allow
- **MEDIUM** (30-50%) - Auto allow with monitoring
- **HIGH** (50-80%) - Require review
- **CRITICAL** (80-100%) - Auto block

### **Decision Logic**
```javascript
if (riskScore < 0.3) return 'ALLOW';
if (riskScore < 0.5) return 'ALLOW'; // with monitoring
if (riskScore < 0.8) return 'REVIEW';
return 'BLOCK';
```

## 📱 Mobile App Integration

### **Update Mobile App Config**
```typescript
// src/utils/database.ts
const API_BASE_URL = 'http://YOUR_IP:3000/api';

// Replace old admin URLs with new backend
const SERVER_URLS = [
  'http://192.168.1.100:3000',
  'http://10.0.0.50:3000',
  // ... other possible IPs
];
```

### **Sync Compatibility**
Backend tetap compatible dengan existing mobile app:
- `/api/devices/sync-device` - Legacy device sync
- `/api/ping` - Health check endpoint
- Same authentication headers

## 🔧 Development

### **Start Development Server**
```bash
npm run dev        # Start with nodemon (auto-reload)
npm start          # Start production server
npm run db:studio  # Open Prisma Studio
npm run db:migrate # Create migration
npm run db:seed    # Seed database
```

### **Environment Variables**
```bash
NODE_ENV=development
PORT=3000
DATABASE_URL="file:./dev.db"
JWT_SECRET=your-jwt-secret-key
APP_SECRET=NFC2025SecureApp
ADMIN_PASSWORD=admin123
```

## 🚀 Production Deployment

### **1. Setup Production Environment**
```bash
# Install dependencies
npm install --production

# Generate Prisma client
npx prisma generate

# Push database schema
npx prisma db push

# Seed with production data
npm run db:seed
```

### **2. Environment Configuration**
```bash
NODE_ENV=production
PORT=3000
DATABASE_URL="file:./production.db"
JWT_SECRET=ultra-secure-production-jwt-secret
ADMIN_PASSWORD=secure-admin-password
ALLOWED_ORIGINS=http://your-domain.com,http://localhost:3001
```

### **3. Start Production Server**
```bash
npm start
# atau dengan PM2:
pm2 start server.js --name nfc-payment-backend
```

## 📊 Monitoring

### **Real-time Features**
- **Socket.IO** for real-time updates
- **Admin Dashboard** live monitoring
- **Device Status** tracking
- **Fraud Alerts** instant notifications

### **Logging**
- Request/response logging
- Admin action logging
- Error tracking
- Performance monitoring

## 🔒 Security Features

- **JWT Authentication** with session management
- **Rate Limiting** (100 requests/15 minutes)
- **CORS Protection** with configurable origins
- **Helmet.js** security headers
- **Password Hashing** with bcryptjs
- **Input Validation** with express-validator
- **SQL Injection Protection** via Prisma ORM

## 🎯 Integration Benefits

### **Compared to Simple Admin**
✅ **Proper Database** - Prisma ORM dengan migrations
✅ **Authentication** - JWT + session management  
✅ **Real-time Updates** - Socket.IO integration
✅ **Advanced Fraud Detection** - AI algorithms
✅ **API Documentation** - Structured endpoints
✅ **Production Ready** - Error handling, logging, security
✅ **Scalable Architecture** - Modular design

### **Mobile App Benefits**
✅ **Better Performance** - Optimized database queries
✅ **Real-time Sync** - Instant balance updates
✅ **Enhanced Security** - JWT authentication
✅ **Fraud Protection** - Advanced AI detection
✅ **Offline Support** - Better error handling

## 🆙 Migration from Simple Admin

1. **Keep existing admin dashboard** (compatibility mode)
2. **Update mobile app** to use new API endpoints
3. **Gradual migration** - both systems can run together
4. **Data migration** - automatic sync from old system

---

**🎉 Your NFC Payment App now has a production-grade backend!**