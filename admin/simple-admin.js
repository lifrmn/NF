// ========================================
// SIMPLE ADMIN SERVER - NFC PAYMENT SYSTEM
// ========================================
// File ini adalah server admin untuk monitoring dan kontrol
// sistem NFC Payment dari HP Android

const express = require('express'); // Framework web server
const cors = require('cors'); // Izinkan akses dari domain berbeda (HP ke laptop)
const path = require('path'); // Manipulasi path file
const os = require('os'); // Info sistem operasi (untuk ambil IP)
const helmet = require('helmet'); // Security headers untuk proteksi
const http = require('http'); // HTTP client untuk fetch backend
const https = require('https'); // HTTPS client untuk fetch backend

// ==================== KONFIGURASI ====================
const PORT = 3001; // Port server (3001)
const APP_SECRET = 'NFC2025SecureApp'; // Secret key aplikasi (untuk validasi)
const ADMIN_PASSWORD = 'admin123'; // Password admin untuk top-up saldo

// NGROK CONFIGURATION - Ubah URL ini sesuai dengan ngrok tunnel Anda
const NGROK_URL = 'https://unbellicose-troublesomely-miley.ngrok-free.dev'; // URL ngrok backend
const BACKEND_URL = NGROK_URL; // Backend URL (gunakan ngrok)

// Helper function untuk parsing URL
function parseBackendUrl() {
  try {
    const url = new URL(BACKEND_URL);
    return {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      protocol: url.protocol.replace(':', '')
    };
  } catch (error) {
    // Fallback ke localhost jika URL tidak valid
    return {
      hostname: 'localhost',
      port: 4000,
      protocol: 'http'
    };
  }
}

// Helper function untuk HTTP/HTTPS requests
function makeHttpRequest(options) {
  return new Promise((resolve, reject) => {
    // Determine which client to use based on protocol
    const isHttps = options.protocol === 'https' || options.protocol === 'https:';
    const client = isHttps ? https : http;
    
    // Remove protocol and body from options untuk client.request()
    const requestOptions = { ...options };
    delete requestOptions.protocol;
    delete requestOptions.body;
    
    const req = client.request(requestOptions, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (parseError) {
          reject(parseError);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (options.body) {
      const bodyData = JSON.stringify(options.body);
      console.log(`📨 Writing body to request:`, bodyData);
      req.setHeader('Content-Length', Buffer.byteLength(bodyData));
      req.write(bodyData);
    }
    req.end();
  });
}

// Fungsi untuk mendapatkan IP address laptop (untuk koneksi dari HP)
function getLocalIPAddress() {
  const interfaces = os.networkInterfaces(); // Ambil semua network interface
  const ips = []; // Array untuk menyimpan IP
  
  // Loop semua network interface
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip localhost dan ambil hanya IPv4
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address); // Tambah IP ke array
      }
    }
  }
  
  return ips; // Return array IP address
}

// Validasi apakah request dari aplikasi resmi (keamanan sederhana)
function isValidAppRequest(req) {
  const appKey = req.headers['x-app-key']; // Ambil app key dari header
  const userAgent = req.headers['user-agent']; // Ambil user agent
  
  // Cek key aplikasi (harus sama dengan APP_SECRET)
  if (appKey !== APP_SECRET) {
    return false; // Tolak jika key salah
  }
  
  // Cek user agent (harus dari okhttp = Android app)
  if (!userAgent || !userAgent.includes('okhttp')) {
    return false; // Tolak jika bukan dari Android
  }
  
  return true; // Lolos validasi
}

// Middleware untuk proteksi API (hanya app resmi yang bisa akses)
function protectAPI(req, res, next) {
  // Skip proteksi untuk dashboard HTML (halaman utama)
  if (req.method === 'GET' && req.path === '/') {
    return next(); // Lanjut tanpa validasi
  }
  
  // Skip proteksi untuk file static (CSS, JS, images)
  if (req.method === 'GET' && !req.path.startsWith('/api/')) {
    return next(); // Lanjut tanpa validasi
  }
  
  // BYPASS PROTEKSI untuk admin endpoints dari localhost/dashboard
  // Allow all local network IPs (10.x.x.x, 192.168.x.x, 172.16.x.x, 169.254.x.x, localhost)
  const ipStr = req.ip || '';
  const isLocalNetwork = 
    ipStr.includes('127.0.0.1') || 
    ipStr.includes('::1') || 
    ipStr.includes('192.168.') || 
    ipStr.includes('10.') || 
    ipStr.includes('172.16.') ||
    ipStr.includes('172.17.') ||
    ipStr.includes('172.18.') ||
    ipStr.includes('172.19.') ||
    ipStr.includes('172.20.') ||
    ipStr.includes('172.21.') ||
    ipStr.includes('172.22.') ||
    ipStr.includes('172.23.') ||
    ipStr.includes('172.24.') ||
    ipStr.includes('172.25.') ||
    ipStr.includes('172.26.') ||
    ipStr.includes('172.27.') ||
    ipStr.includes('172.28.') ||
    ipStr.includes('172.29.') ||
    ipStr.includes('172.30.') ||
    ipStr.includes('172.31.') ||
    ipStr.includes('169.254.'); // Link-local address
    
  if (req.path.startsWith('/api/') && isLocalNetwork) {
    console.log(`✅ Admin dashboard access allowed from ${req.ip} to ${req.path}`);
    return next(); // Lanjut tanpa validasi untuk admin dashboard
  }
  
  // Validasi untuk semua API endpoints dari external sources (/api/*)
  if (req.path.startsWith('/api/')) {
    if (!isValidAppRequest(req)) { // Cek apakah request valid
      console.log(`🚫 Unauthorized access blocked from ${req.ip}`);
      return res.status(401).json({ error: 'Akses ditolak - Bukan aplikasi resmi' });
    }
  }
  
  console.log(`✅ Valid app request from ${req.ip}`);
  next(); // Lanjut ke endpoint
}

// Class utama untuk Admin Server NFC Payment
class SimpleNFCAdmin {
  constructor() {
    this.app = express(); // Inisialisasi Express server
    this.devices = new Map(); // Menyimpan data semua device (key: deviceId)
    this.pendingUpdates = new Map(); // Queue update balance yang belum terkirim
    this.deviceLastSeen = new Map(); // Track waktu terakhir device sync
    this.fraudAlerts = new Map(); // Menyimpan semua fraud alerts dari AI
    this.fraudStats = { // Statistik fraud detection
      totalAlerts: 0, // Total alert yang masuk
      blockedTransactions: 0, // Transaksi yang diblokir
      reviewTransactions: 0, // Transaksi yang perlu review
      lastAlert: null // Waktu alert terakhir
    };
    this.setupExpress(); // Setup routes dan middleware
    this.startCleanupTimer(); // Start timer untuk hapus device offline
  }

  // Setup Express server (routes, middleware, security)
  setupExpress() {
    // Security headers dengan Helmet (proteksi dari serangan web)
    this.app.use(helmet({
      contentSecurityPolicy: false, // Dimatikan agar dashboard jalan
      crossOriginEmbedderPolicy: false
    }));
    
    // CORS: Izinkan akses dari semua origin (HP bisa akses)
    this.app.use(cors({
      origin: '*', // Semua origin boleh (diperlukan untuk mobile app)
      methods: ['GET', 'POST'], // Method yang diizinkan
      allowedHeaders: ['Content-Type', 'x-app-key', 'user-agent'] // Header yang diizinkan
    }));
    
    this.app.use(express.json({ limit: '1mb' })); // Parse JSON body (max 1MB)
    
    // Middleware keamanan: Validasi app key untuk API
    this.app.use(protectAPI);
    
    // Middleware logging: Catat semua request yang masuk
    this.app.use((req, res, next) => {
      console.log(`📞 ${req.method} ${req.path} from ${req.ip}`);
      next(); // Lanjut ke route handler
    });
    
    // Serve file static (HTML, CSS, JS dashboard)
    this.app.use(express.static(__dirname));
    
    // ==================== ROUTES ====================
    // Route utama: Tampilkan dashboard HTML
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'simple-dashboard.html'));
    });
    
    // ==================== API ENDPOINTS ====================
    // (Sudah diproteksi oleh middleware protectAPI)
    
    // Device endpoints
    this.app.get('/api/devices', this.getDevices.bind(this)); // Get semua device
    this.app.post('/api/sync-device', this.syncDevice.bind(this)); // Sync data dari HP
    this.app.post('/api/update-balance', this.updateBalanceSecure.bind(this)); // Top-up saldo
    
    // Fraud detection endpoints
    this.app.post('/api/fraud-alert', this.handleFraudAlert.bind(this)); // Terima fraud alert dari AI
    this.app.get('/api/fraud-alerts', this.getFraudAlerts.bind(this)); // Get fraud alerts
    this.app.get('/api/transactions', this.getAllTransactions.bind(this)); // Get semua transaksi
    
    // User management endpoints
    this.app.get('/api/users', this.getUsersEndpoint.bind(this)); // Get semua user
    this.app.post('/api/users', this.createUserEndpoint.bind(this)); // Create user baru
    this.app.put('/api/users/:id', this.updateUserEndpoint.bind(this)); // Update user
    this.app.delete('/api/users/:id', this.deleteUserEndpoint.bind(this)); // Delete user
    
    // Admin action endpoints
    this.app.post('/api/block-user', this.blockUserEndpoint.bind(this)); // Block user
    this.app.post('/api/unblock-user', this.unblockUserEndpoint.bind(this)); // Unblock user
    this.app.post('/api/bulk-topup', this.bulkTopupEndpoint.bind(this)); // Bulk top-up
    this.app.post('/api/reset-balance', this.resetBalanceEndpoint.bind(this)); // Reset user balance
    this.app.post('/api/clear-fraud-alerts', this.clearFraudAlertsEndpoint.bind(this)); // Clear alerts
    
    // NFC Card management endpoints
    this.app.get('/api/nfc-cards', this.getNFCCards.bind(this)); // Get all NFC cards
    this.app.post('/api/nfc-cards/register', this.registerNFCCard.bind(this)); // Register new card
    this.app.post('/api/nfc-cards/link', this.linkNFCCard.bind(this)); // Link card to user
    this.app.post('/api/nfc-cards/block', this.blockNFCCard.bind(this)); // Block card
    this.app.post('/api/nfc-cards/topup', this.topupNFCCard.bind(this)); // Topup card balance
    this.app.delete('/api/nfc-cards/:cardId', this.deleteNFCCard.bind(this)); // Delete card
    
    // Ping endpoint (penting untuk APK agar bisa deteksi server)
    this.app.get('/api/ping', (req, res) => {
      res.json({ 
        status: 'ok', // Status server
        timestamp: new Date().toISOString(), // Waktu sekarang
        server: 'NFC Payment Admin Server', // Nama server
        version: '1.0.0', // Versi server
        uptime: process.uptime() // Lama server sudah jalan (dalam detik)
      });
    });
    
    // Health check endpoint (untuk cek kesehatan server)
    this.app.get('/api/health', (req, res) => {
      res.json({ 
        status: 'OK', // Status server
        timestamp: new Date().toISOString(), // Waktu sekarang
        devices: this.devices.size, // Jumlah device terkoneksi
        pendingUpdates: this.pendingUpdates.size, // Jumlah update balance pending
        fraudAlerts: this.fraudAlerts.size, // Jumlah fraud alerts
        fraudStats: this.fraudStats // Statistik fraud detection
      });
    });
  }

  // Terima data sync dari HP Android (endpoint: POST /api/sync-device)
  async syncDevice(req, res) {
    try {
      const { device, users, recentTransactions, stats } = req.body; // Ambil data dari request
      
      // Validasi: deviceId wajib ada
      if (!device || !device.deviceId) {
        return res.status(400).json({ error: 'Device ID is required' });
      }

      const now = new Date(); // Waktu sekarang
      
      // Simpan data device ke Map (deviceId sebagai key)
      this.devices.set(device.deviceId, {
        deviceId: device.deviceId, // ID unik device (dari HP)
        deviceName: device.deviceName || `Android Device ${device.deviceId.slice(-6)}`, // Nama device
        platform: device.platform || 'android', // Platform (android/ios)
        users: users || [], // Array semua user di device ini
        recentTransactions: recentTransactions || [], // Transaksi terbaru
        stats: stats || {}, // Statistik (total user, balance, dll)
        totalUsers: stats?.totalUsers || 0, // Total user
        totalBalance: stats?.totalBalance || 0, // Total saldo semua user
        totalTransactions: recentTransactions?.length || 0, // Total transaksi
        lastSync: now.toISOString(), // Waktu sync terakhir (string)
        lastSyncAt: now, // Waktu sync terakhir (Date object)
        isOnline: true, // Status online
        ipAddress: req.ip || req.connection.remoteAddress // IP address HP
      });

      // Update waktu terakhir device terlihat
      this.deviceLastSeen.set(device.deviceId, now);

      console.log(`📱 Device sync: ${device.deviceId.slice(-8)} | Users: ${stats?.totalUsers || 0} | Balance: Rp ${(stats?.totalBalance || 0).toLocaleString('id-ID')} | IP: ${req.ip}`);

      // Cek apakah ada update balance yang menunggu (pending)
      const pendingUpdates = this.getPendingUpdates(device.deviceId);
      
      // Kirim response ke HP dengan info sync berhasil
      res.json({
        success: true, // Status berhasil
        message: 'Device synced successfully', // Pesan sukses
        balanceUpdates: pendingUpdates, // Kirim update balance (jika ada)
        deviceId: device.deviceId, // Echo deviceId
        timestamp: now.toISOString() // Timestamp sync
      });

      // Hapus pending updates setelah dikirim ke HP
      this.clearPendingUpdates(device.deviceId);
      
    } catch (error) {
      console.error('❌ Sync error:', error); // Log error
      res.status(500).json({ error: error.message }); // Kirim error response
    }
  }

  // Kirim list semua users (bukan device) ke dashboard (endpoint: GET /api/devices)
  async getDevices(req, res) {
    try {
      // AMBIL DATA USER DARI BACKEND (hitung user unik saja)
      try {
        const backendConfig = parseBackendUrl();
        const options = {
          hostname: backendConfig.hostname,
          port: backendConfig.port,
          path: '/api/debug/users', // Endpoint user backend
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-app-key': 'NFC2025SecureApp',
            'ngrok-skip-browser-warning': 'true',
            'ngrok-skip-browser-warning': 'true'
          }
        };

        const backendData = await new Promise((resolve, reject) => {
          // Select correct client based on protocol
          const client = backendConfig.protocol === 'https' ? https : http;
          const req = client.request(options, (response) => {
            let data = '';
            
            response.on('data', (chunk) => {
              data += chunk;
            });
            
            response.on('end', () => {
              try {
                const jsonData = JSON.parse(data);
                resolve(jsonData);
              } catch (parseError) {
                reject(parseError);
              }
            });
          });
          
          req.on('error', (error) => {
            reject(error);
          });
          
          req.setTimeout(10000, () => {
            req.abort();
            reject(new Error('Timeout'));
          });
          
          req.end();
        });
        
        if (backendData && backendData.users) {
          // Transform user data to dashboard format (user = device)
          const uniqueUsers = new Map();
          
          backendData.users.forEach(user => {
            const userKey = user.username || user.name || `user_${user.id}`;
            if (!uniqueUsers.has(userKey)) {
              uniqueUsers.set(userKey, {
                deviceId: user.deviceId || `user_${user.id}`,
                deviceName: userKey,
                isOnline: true,
                lastSeen: user.updatedAt || user.createdAt,
                totalUsers: 1, // Setiap user = 1 user
                totalBalance: user.balance || 0,
                totalTransactions: 0, // Reset karena tidak ada data transaksi
                ipAddress: '192.168.137.51',
                platform: 'android'
              });
            }
          });
          
          const devices = Array.from(uniqueUsers.values());
          console.log(`🔍 API call: /api/devices - Returning ${devices.length} unique users from backend`);
          res.json(devices);
          return;
        }
        
      } catch (backendError) {
        console.error('❌ Backend users error:', backendError.message);
      }
      
      // FALLBACK: Use local device cache
      const now = new Date(); // Waktu sekarang
      // Convert Map ke Array dan tambah status online
      const devices = Array.from(this.devices.values()).map(device => {
        // Device online jika sync dalam 5 menit terakhir
        const isOnline = (now - new Date(device.lastSyncAt)) < 300000; // 5 menit = 300000 ms
        
        // Return object device dengan semua info
        return {
          deviceId: device.deviceId, // ID device
          deviceName: device.deviceName, // Nama device
          platform: device.platform, // Platform (android)
          totalUsers: device.totalUsers || 0, // Total user
          totalBalance: device.totalBalance || 0, // Total saldo
          totalTransactions: device.totalTransactions || 0, // Total transaksi
          lastSync: device.lastSync, // Waktu sync (string)
          lastSyncAt: device.lastSyncAt, // Waktu sync (Date)
          isOnline: isOnline, // Status online/offline
          ipAddress: device.ipAddress, // IP address HP
          users: device.users || [] // Array user di device
        };
      });

      console.log(`🔍 API call: /api/devices (fallback) - Returning ${devices.length} devices from cache`);
      res.json(devices); // Kirim array devices ke dashboard
    } catch (error) {
      console.error('❌ Get devices error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Update balance user dari admin (POST /api/update-balance) - AMAN
  async updateBalanceSecure(req, res) {
    try {
      const { deviceId, amount, adminPassword } = req.body; // Ambil data dari request
      const clientIP = req.ip || req.connection.remoteAddress; // IP address admin
      
      // Validasi password admin (keamanan sederhana)
      if (adminPassword !== ADMIN_PASSWORD) {
        console.log(`🚫 Wrong admin password from ${clientIP}`);
        return res.status(401).json({ error: 'Password admin salah!' });
      }
      
      // Validasi deviceId dan amount harus ada dan valid
      if (!deviceId || !amount || amount <= 0) {
        return res.status(400).json({ error: 'Device ID dan jumlah saldo harus diisi!' });
      }

      // Batasi maksimal top-up per transaksi (Rp 500.000)
      if (amount > 500000) {
        return res.status(400).json({ error: 'Maksimal top-up Rp 500,000' });
      }

      // Cari device berdasarkan deviceId
      const device = this.devices.get(deviceId);
      if (!device || !device.users) { // Jika device tidak ditemukan
        return res.status(404).json({ error: 'Device tidak ditemukan' });
      }

      // Queue balance update untuk setiap user di device ini
      device.users.forEach(user => {
        const updateKey = `${deviceId}_${user.id}`; // Key unik: deviceId_userId
        this.pendingUpdates.set(updateKey, { // Simpan ke pending updates
          deviceId, // ID device target
          userId: user.id, // ID user target
          newBalance: user.balance + amount, // Balance baru (balance lama + amount)
          reason: `Admin top-up: +${amount}`, // Alasan update
          timestamp: new Date().toISOString() // Waktu update
        });
      });

      console.log(`💰 Admin added Rp ${amount.toLocaleString('id-ID')} to device ${deviceId.substring(0, 8)}... for ${device.users.length} users`);

      res.json({
        success: true,
        message: `Berhasil menambah saldo Rp ${amount.toLocaleString('id-ID')} untuk ${device.users.length} users`,
        usersUpdated: device.users.length
      });

    } catch (error) {
      console.error('❌ Update balance error:', error);
      res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
  }

  // Update balance user dari admin - LEGACY (akan dihapus)
  async updateBalance(req, res) {
    try {
      const { deviceId, amount } = req.body;
      
      if (!deviceId || !amount) {
        return res.status(400).json({ error: 'Missing deviceId or amount' });
      }

      // Simpan update untuk semua user di device ini
      const device = this.devices.get(deviceId);
      if (!device || !device.users) {
        return res.status(404).json({ error: 'Device not found or no users' });
      }

      // Queue balance update untuk setiap user di device
      device.users.forEach(user => {
        const updateKey = `${deviceId}_${user.id}`;
        this.pendingUpdates.set(updateKey, {
          deviceId,
          userId: user.id,
          newBalance: user.balance + amount, // Tambahkan ke balance saat ini
          reason: `Admin top-up: +${amount}`,
          timestamp: new Date().toISOString()
        });
      });

      console.log(`💰 Balance update queued for device ${deviceId.substring(0, 8)}... | Amount: +${amount} for ${device.users.length} users`);

      res.json({
        success: true,
        message: `Balance update queued for ${device.users.length} users`,
        usersUpdated: device.users.length
      });

    } catch (error) {
      console.error('❌ Update balance error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // ==================== HELPER FUNCTIONS ====================
  
  // Ambil pending updates untuk device tertentu
  getPendingUpdates(deviceId) {
    const updates = []; // Array untuk menyimpan updates
    // Loop semua pending updates
    for (const [key, update] of this.pendingUpdates.entries()) {
      if (update.deviceId === deviceId) { // Jika deviceId cocok
        updates.push(update); // Tambahkan ke array
      }
    }
    return updates; // Return array updates
  }

  // Hapus pending updates setelah dikirim ke HP
  clearPendingUpdates(deviceId) {
    // Loop semua pending updates
    for (const [key, update] of this.pendingUpdates.entries()) {
      if (update.deviceId === deviceId) { // Jika deviceId cocok
        this.pendingUpdates.delete(key); // Hapus dari Map
      }
    }
  }

  // Cleanup otomatis: Hapus device yang sudah lama offline
  startCleanupTimer() {
    setInterval(() => { // Jalankan tiap 5 menit
      const now = new Date(); // Waktu sekarang
      for (const [deviceId, device] of this.devices.entries()) {
        // Hapus device yang offline lebih dari 10 menit
        if ((now - device.lastSyncAt) > 600000) { // 10 menit = 600000 ms
          this.devices.delete(deviceId); // Hapus dari Map
          console.log(`🗑️ Removed inactive device: ${deviceId.substring(0, 8)}...`);
        }
      }
    }, 300000); // Check tiap 5 menit = 300000 ms
  }

  // Handle fraud alert dari AI mobile app (POST /api/fraud-alert)
  async handleFraudAlert(req, res) {
    try {
      const { device, fraudDetection } = req.body; // Ambil data fraud dari HP
      
      // Validasi: fraud data wajib ada
      if (!fraudDetection) {
        return res.status(400).json({ error: 'Fraud detection data required' });
      }

      const alertId = `fraud_${Date.now()}_${device.deviceId}`; // Generate ID unik
      const fraudAlert = { // Buat object fraud alert
        id: alertId, // ID alert
        deviceId: device.deviceId, // ID device yang kirim alert
        deviceName: device.deviceName, // Nama device
        riskScore: fraudDetection.riskScore, // Score risiko (0-100)
        riskLevel: fraudDetection.riskLevel, // Level risiko (LOW/MEDIUM/HIGH/CRITICAL)
        decision: fraudDetection.decision, // Keputusan AI (ALLOW/REVIEW/BLOCK)
        reasons: fraudDetection.reasons, // Alasan-alasan fraud (array)
        confidence: fraudDetection.confidence, // Confidence AI (0-1)
        riskFactors: fraudDetection.riskFactors, // Faktor risiko detail
        transactionId: fraudDetection.transactionId, // ID transaksi
        timestamp: fraudDetection.timestamp, // Waktu fraud terdeteksi
        ipAddress: req.ip, // IP address HP
        status: 'NEW' // Status alert (NEW/REVIEWED/RESOLVED)
      };

      // Simpan fraud alert ke Map
      this.fraudAlerts.set(alertId, fraudAlert);

      // Update statistik fraud
      this.fraudStats.totalAlerts++; // Tambah total alerts
      this.fraudStats.lastAlert = new Date().toISOString(); // Update waktu alert terakhir
      
      // Update counter berdasarkan decision AI
      if (fraudDetection.decision === 'BLOCK') {
        this.fraudStats.blockedTransactions++; // Tambah blocked transactions
      } else if (fraudDetection.decision === 'REVIEW') {
        this.fraudStats.reviewTransactions++; // Tambah review transactions
      }

      console.log(`🚨 FRAUD ALERT: ${fraudDetection.riskLevel} risk (${fraudDetection.riskScore}%) from device ${device.deviceId.slice(-8)}`);
      console.log(`   Decision: ${fraudDetection.decision}`);
      console.log(`   Reasons: ${fraudDetection.reasons.join(', ')}`);
      console.log(`   Confidence: ${Math.round(fraudDetection.confidence * 100)}%`);

      res.json({
        success: true,
        message: 'Fraud alert received and stored',
        alertId: alertId
      });

    } catch (error) {
      console.error('❌ Fraud alert error:', error);
      res.status(500).json({ error: 'Failed to process fraud alert' });
    }
  }

  // Get fraud alerts untuk dashboard (GET /api/fraud-alerts)
  async getFraudAlerts(req, res) {
    try {
      // Ambil semua alerts, sort terbaru di atas, ambil 50 teratas
      const alerts = Array.from(this.fraudAlerts.values())
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)) // Sort descending
        .slice(0, 50); // Max 50 alerts

      res.json({
        success: true,
        alerts: alerts,
        stats: this.fraudStats,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Get fraud alerts error:', error);
      res.status(500).json({ error: 'Failed to get fraud alerts' });
    }
  }

  // Get semua transaksi dari semua device (GET /api/transactions)
  async getAllTransactions(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 50; // Limit hasil (default 50)
      const riskLevel = req.query.riskLevel; // Filter by risk level (optional)
      
      // Kumpulkan transaksi dari semua device
      let allTransactions = [];
      
      // Loop semua device dan ambil transactionnya
      for (const [deviceId, deviceData] of this.devices.entries()) {
        // Jika device punya transaksi
        if (deviceData.recentTransactions && deviceData.recentTransactions.length > 0) {
          // Tambah info device ke setiap transaksi
          const txsWithDevice = deviceData.recentTransactions.map(tx => ({
            ...tx, // Copy semua property transaksi
            deviceId: deviceId, // Tambah deviceId
            deviceName: deviceData.deviceName // Tambah deviceName
          }));
          allTransactions = allTransactions.concat(txsWithDevice); // Gabungkan
        }
      }

      // Sort transaksi berdasarkan waktu (terbaru di atas)
      allTransactions.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0); // Parse tanggal A
        const dateB = new Date(b.createdAt || 0); // Parse tanggal B
        return dateB - dateA; // Sort descending (terbaru dulu)
      });

      // Filter berdasarkan risk level jika ada parameter
      if (riskLevel && riskLevel !== 'ALL') {
        allTransactions = allTransactions.filter(tx => tx.fraudRiskLevel === riskLevel);
      }

      // Batasi jumlah hasil sesuai limit
      const limitedTransactions = allTransactions.slice(0, limit);

      // Calculate statistics
      const stats = {
        total: allTransactions.length,
        critical: allTransactions.filter(tx => tx.fraudRiskLevel === 'CRITICAL').length,
        high: allTransactions.filter(tx => tx.fraudRiskLevel === 'HIGH').length,
        medium: allTransactions.filter(tx => tx.fraudRiskLevel === 'MEDIUM').length,
        low: allTransactions.filter(tx => tx.fraudRiskLevel === 'LOW').length,
        averageRiskScore: allTransactions.length > 0 
          ? allTransactions.reduce((sum, tx) => sum + (tx.fraudRiskScore || 0), 0) / allTransactions.length 
          : 0
      };

      console.log(`📊 Transactions requested: ${limitedTransactions.length} of ${allTransactions.length} total`);

      res.json({
        success: true,
        transactions: limitedTransactions,
        stats: stats,
        total: allTransactions.length,
        showing: limitedTransactions.length
      });

    } catch (error) {
      console.error('❌ Get transactions error:', error);
      res.status(500).json({ error: 'Failed to get transactions' });
    }
  }

  // ==================== USER MANAGEMENT ENDPOINTS ====================

  // Get semua user dari semua device (GET /api/users)
  async getUsersEndpoint(req, res) {
    try {
      // GUNAKAN HTTP MODULE BAWAAN NODE.JS (bukan fetch)
      const backendUrl = `${BACKEND_URL}/api/debug/users`;
      
      try {
        // HTTP request menggunakan module bawaan Node.js
        const backendData = await new Promise((resolve, reject) => {
          // Select correct client based on protocol
          const backendConfig = parseBackendUrl();
          const client = backendConfig.protocol === 'https' ? https : http;
          
          const request = client.get(backendUrl, (response) => {
            let data = '';
            
            response.on('data', (chunk) => {
              data += chunk;
            });
            
            response.on('end', () => {
              try {
                const jsonData = JSON.parse(data);
                resolve(jsonData);
              } catch (parseError) {
                reject(parseError);
              }
            });
          });
          
          request.on('error', (error) => {
            reject(error);
          });
          
          request.setTimeout(5000, () => {
            request.abort();
            reject(new Error('Timeout'));
          });
        });
        
        console.log(`✅ Loaded ${backendData.users?.length || 0} users from backend database`);
        
        // Format untuk dashboard display
        const formattedData = {
          success: true,
          users: backendData.users.map(user => ({
            ...user,
            balance: parseInt(user.balance), // Convert BigInt ke number
            lastSeen: user.updatedAt, // Gunakan updatedAt sebagai lastSeen
            status: user.isActive ? 'Active' : 'Inactive'
          })),
          total: backendData.total
        };
        
        return res.json(formattedData);
        
      } catch (backendError) {
        console.log('⚠️ Backend tidak tersedia, gunakan cache device:', backendError.message);
      }
      
      // FALLBACK: Ambil dari device cache jika backend error
      const allUsers = []; // Array untuk menyimpan semua user
      
      // Extract users dari semua device
      this.devices.forEach((deviceData, deviceId) => {
        if (deviceData.users) { // Jika device punya users
          deviceData.users.forEach(user => {
            // Cek duplikat berdasarkan ID (hindari user duplikat)
            if (!allUsers.find(u => u.id === user.id)) {
              allUsers.push({ // Tambahkan user ke array
                ...user, // Copy semua property user
                deviceId: deviceId, // Tambah info deviceId
                deviceName: deviceData.deviceName, // Tambah info deviceName
                status: user.isActive ? 'Active' : 'Inactive'
              });
            }
          });
        }
      });

      // Kirim response dengan array users
      res.json({
        success: true,
        users: allUsers, // Array semua user
        total: allUsers.length // Total user
      });

    } catch (error) {
      console.error('❌ Get users error:', error);
      res.status(500).json({ error: 'Failed to get users' });
    }
  }

  // Create user baru (POST /api/users) - Belum diimplementasi
  async createUserEndpoint(req, res) {
    try {
      const { username, name, password, balance = 1000000 } = req.body; // Ambil data user
      
      // Validasi input wajib
      if (!username || !name || !password) {
        return res.status(400).json({ error: 'Username, name, and password required' });
      }

      // TODO: Implementasi logic create user
      // Ini harus terintegrasi dengan backend database (Prisma)
      console.log('⚠️ Create user requested:', { username, name, balance });
      
      res.json({
        success: true,
        message: 'User creation endpoint ready - needs backend integration',
        data: { username, name, balance }
      });

    } catch (error) {
      console.error('❌ Create user error:', error);
      res.status(500).json({ error: 'Failed to create user' });
    }
  }

  // Update user (PUT /api/users/:id) - Integrasi dengan backend
  async updateUserEndpoint(req, res) {
    try {
      const userId = parseInt(req.params.id); // Ambil user ID dari URL
      const { balance, name } = req.body; // Ambil data update
      
      // Validasi userId wajib ada
      if (!userId) {
        return res.status(400).json({ error: 'User ID required' });
      }

      // Kirim update ke backend
      const backendUrl = `${BACKEND_URL}/api/users/${userId}`;
      
      try {
        const backendData = await new Promise((resolve, reject) => {
          const postData = JSON.stringify({ balance, name });
          
          const backendConfig = parseBackendUrl();
          const options = {
            hostname: backendConfig.hostname,
            port: backendConfig.port,
            path: `/api/users/${userId}`,
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(postData),
              'ngrok-skip-browser-warning': 'true'
            }
          };
          
          // Select correct client based on protocol
          const client = backendConfig.protocol === 'https' ? https : http;
          const request = client.request(options, (response) => {
            let data = '';
            
            response.on('data', (chunk) => {
              data += chunk;
            });
            
            response.on('end', () => {
              try {
                const jsonData = JSON.parse(data);
                resolve(jsonData);
              } catch (parseError) {
                reject(parseError);
              }
            });
          });
          
          request.on('error', (error) => {
            reject(error);
          });
          
          request.setTimeout(5000, () => {
            request.abort();
            reject(new Error('Timeout'));
          });
          
          request.write(postData);
          request.end();
        });
        
        console.log(`✅ Updated user ${userId} in backend`);
        res.json(backendData);
        
      } catch (backendError) {
        console.error('Backend update error:', backendError.message);
        res.status(500).json({ error: 'Failed to update user in backend' });
      }

    } catch (error) {
      console.error('❌ Update user error:', error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  }

  // Delete user (DELETE /api/users/:id) - Integrasi dengan backend
  async deleteUserEndpoint(req, res) {
    try {
      const userId = parseInt(req.params.id); // Ambil user ID dari URL
      
      // Validasi userId wajib ada
      if (!userId) {
        return res.status(400).json({ error: 'User ID required' });
      }

      // Kirim delete ke backend
      try {
        const backendData = await new Promise((resolve, reject) => {
          const options = {
            hostname: backendConfig.hostname,
            port: backendConfig.port,
            path: `/api/users/${userId}`,
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json'
            }
          };
          
          // Select correct client based on protocol
          const client = backendConfig.protocol === 'https' ? https : http;
          const request = client.request(options, (response) => {
            let data = '';
            
            response.on('data', (chunk) => {
              data += chunk;
            });
            
            response.on('end', () => {
              try {
                const jsonData = JSON.parse(data);
                resolve(jsonData);
              } catch (parseError) {
                reject(parseError);
              }
            });
          });
          
          request.on('error', (error) => {
            reject(error);
          });
          
          request.setTimeout(5000, () => {
            request.abort();
            reject(new Error('Timeout'));
          });
          
          request.end();
        });
        
        console.log(`✅ Deleted user ${userId} from backend`);
        res.json(backendData);
        
      } catch (backendError) {
        console.error('Backend delete error:', backendError.message);
        res.status(500).json({ error: 'Failed to delete user from backend' });
      }

    } catch (error) {
      console.error('❌ Delete user error:', error);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  }

  // Block user (POST /api/block-user) - Integrasi dengan backend
  async blockUserEndpoint(req, res) {
    try {
      const { userId, password } = req.body; // Ambil data dari request
      
      // Validasi: userId wajib ada
      if (!userId) {
        return res.status(400).json({ error: 'User ID required' });
      }

      // Validasi password admin
      if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Invalid admin password' });
      }

      // IMPLEMENTASI BLOCK USER LANGSUNG KE BACKEND
      try {
        const postData = JSON.stringify({ userId: parseInt(userId), password });
        
        const options = {
          hostname: backendConfig.hostname,
          port: backendConfig.port,
          path: '/api/admin/block-user',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-app-key': 'NFC2025SecureApp',
            'ngrok-skip-browser-warning': 'true',
            'x-admin-password': 'admin123',
            'Content-Length': Buffer.byteLength(postData)
          }
        };

        const backendData = await new Promise((resolve, reject) => {
          // Select correct client based on protocol
          const client = backendConfig.protocol === 'https' ? https : http;
          const req = client.request(options, (response) => {
            let data = '';
            
            response.on('data', (chunk) => {
              data += chunk;
            });
            
            response.on('end', () => {
              try {
                const jsonData = JSON.parse(data);
                resolve(jsonData);
              } catch (parseError) {
                reject(parseError);
              }
            });
          });
          
          req.on('error', (error) => {
            reject(error);
          });
          
          req.setTimeout(10000, () => {
            req.abort();
            reject(new Error('Timeout'));
          });
          
          req.write(postData);
          req.end();
        });
        
        if (backendData.success) {
          console.log(`🚫 User blocked: ${userId} (${backendData.user.username})`);
          
          res.json({
            success: true,
            message: `User ${backendData.user.username} has been blocked`,
            user: backendData.user
          });
        } else {
          throw new Error(backendData.error || 'Backend block user failed');
        }
        
      } catch (backendError) {
        console.error('❌ Backend block user error:', backendError.message);
        
        res.json({
          success: false,
          error: `Failed to block user: ${backendError.message}`
        });
      }

    } catch (error) {
      console.error('❌ Block user error:', error);
      res.status(500).json({ error: 'Failed to block user' });
    }
  }

  // Unblock user (POST /api/unblock-user) - Integrasi dengan backend
  async unblockUserEndpoint(req, res) {
    try {
      const { userId, password } = req.body; // Ambil data dari request
      
      // Validasi: userId wajib ada
      if (!userId) {
        return res.status(400).json({ error: 'User ID required' });
      }

      // Validasi password admin
      if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Invalid admin password' });
      }

      // IMPLEMENTASI UNBLOCK USER LANGSUNG KE BACKEND
      try {
        const postData = JSON.stringify({ userId: parseInt(userId), password });
        
        const options = {
          hostname: backendConfig.hostname,
          port: backendConfig.port,
          path: '/api/admin/unblock-user',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-app-key': 'NFC2025SecureApp',
            'ngrok-skip-browser-warning': 'true',
            'x-admin-password': 'admin123',
            'Content-Length': Buffer.byteLength(postData)
          }
        };

        const backendData = await new Promise((resolve, reject) => {
          // Select correct client based on protocol
          const client = backendConfig.protocol === 'https' ? https : http;
          const req = client.request(options, (response) => {
            let data = '';
            
            response.on('data', (chunk) => {
              data += chunk;
            });
            
            response.on('end', () => {
              try {
                const jsonData = JSON.parse(data);
                resolve(jsonData);
              } catch (parseError) {
                reject(parseError);
              }
            });
          });
          
          req.on('error', (error) => {
            reject(error);
          });
          
          req.setTimeout(10000, () => {
            req.abort();
            reject(new Error('Timeout'));
          });
          
          req.write(postData);
          req.end();
        });
        
        if (backendData.success) {
          console.log(`✅ User unblocked: ${userId} (${backendData.user.username})`);
          
          res.json({
            success: true,
            message: `User ${backendData.user.username} has been unblocked`,
            user: backendData.user
          });
        } else {
          throw new Error(backendData.error || 'Backend unblock user failed');
        }
        
      } catch (backendError) {
        console.error('❌ Backend unblock user error:', backendError.message);
        
        res.json({
          success: false,
          error: `Failed to unblock user: ${backendError.message}`
        });
      }

    } catch (error) {
      console.error('❌ Unblock user error:', error);
      res.status(500).json({ error: 'Failed to unblock user' });
    }
  }

  // Bulk top-up ke semua user (POST /api/bulk-topup) - Belum diimplementasi
  async bulkTopupEndpoint(req, res) {
    try {
      const { amount, password } = req.body; // Ambil amount dan password
      
      // Validasi amount wajib ada
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Valid amount required' });
      }

      // Validasi password admin
      if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Invalid admin password' });
      }

      // IMPLEMENTASI BULK TOPUP LANGSUNG KE BACKEND
      try {
        const backendUrl = `${BACKEND_URL}/api/admin/bulk-topup`;
        
        // HTTP request ke backend untuk bulk topup
        const backendData = await new Promise((resolve, reject) => {
          const postData = JSON.stringify({ amount: parseInt(amount) });
          
          const options = {
            hostname: backendConfig.hostname,
            port: backendConfig.port,
            path: '/api/admin/bulk-topup',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-app-key': 'NFC2025SecureApp',
            'ngrok-skip-browser-warning': 'true',
              'x-admin-password': 'admin123',
              'Content-Length': Buffer.byteLength(postData)
            }
          };

          // Select correct client based on protocol
          const client = backendConfig.protocol === 'https' ? https : http;
          const req = client.request(options, (response) => {
            let data = '';
            
            response.on('data', (chunk) => {
              data += chunk;
            });
            
            response.on('end', () => {
              try {
                const jsonData = JSON.parse(data);
                resolve(jsonData);
              } catch (parseError) {
                reject(parseError);
              }
            });
          });
          
          req.on('error', (error) => {
            reject(error);
          });
          
          req.setTimeout(10000, () => {
            req.abort();
            reject(new Error('Timeout'));
          });
          
          req.write(postData);
          req.end();
        });
        
        if (backendData.success) {
          console.log(`✅ Bulk topup berhasil: ${backendData.updatedUsers} users, amount: ${amount}`);
          
          res.json({
            success: true,
            message: `Bulk topup berhasil untuk ${backendData.updatedUsers} users`,
            data: {
              amount: amount,
              updatedUsers: backendData.updatedUsers,
              totalAmount: backendData.totalAmount
            }
          });
        } else {
          throw new Error(backendData.error || 'Backend bulk topup failed');
        }
        
      } catch (backendError) {
        console.error('❌ Backend bulk topup error:', backendError.message);
        
        // FALLBACK: Update di device cache (temporary)
        let updatedCount = 0;
        this.devices.forEach((deviceData, deviceId) => {
          if (deviceData.users) {
            deviceData.users.forEach(user => {
              user.balance = (parseInt(user.balance) || 0) + parseInt(amount);
              updatedCount++;
            });
            deviceData.totalBalance = deviceData.users.reduce((sum, user) => sum + (parseInt(user.balance) || 0), 0);
          }
        });
        
        console.log(`⚠️ Fallback bulk topup: ${updatedCount} users in cache, amount: ${amount}`);
        
        res.json({
          success: true,
          message: `Bulk topup applied to ${updatedCount} users (cache only - backend unavailable)`,
          data: {
            amount: amount,
            updatedUsers: updatedCount,
            warning: 'Applied to local cache only, may not persist'
          }
        });
      }

    } catch (error) {
      console.error('❌ Bulk topup error:', error);
      res.status(500).json({ error: 'Failed to perform bulk topup' });
    }
  }

  // Reset balance user tertentu (POST /api/reset-balance)
  async resetBalanceEndpoint(req, res) {
    try {
      const { userId, newBalance, password } = req.body;
      
      // Validasi password admin
      if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Invalid admin password' });
      }

      // Validasi userId dan newBalance
      if (!userId) {
        return res.status(400).json({ error: 'User ID required' });
      }
      
      if (newBalance === undefined || newBalance === null) {
        return res.status(400).json({ error: 'New balance required' });
      }

      // IMPLEMENTASI RESET BALANCE LANGSUNG KE BACKEND
      try {
        const postData = JSON.stringify({ userId: parseInt(userId), newBalance: parseInt(newBalance), password });
        
        const options = {
          hostname: backendConfig.hostname,
          port: backendConfig.port,
          path: '/api/admin/reset-balance',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-app-key': 'NFC2025SecureApp',
            'ngrok-skip-browser-warning': 'true',
            'x-admin-password': 'admin123',
            'Content-Length': Buffer.byteLength(postData)
          }
        };

        const backendData = await new Promise((resolve, reject) => {
          // Select correct client based on protocol
          const client = backendConfig.protocol === 'https' ? https : http;
          const req = client.request(options, (response) => {
            let data = '';
            
            response.on('data', (chunk) => {
              data += chunk;
            });
            
            response.on('end', () => {
              try {
                const jsonData = JSON.parse(data);
                resolve(jsonData);
              } catch (parseError) {
                reject(parseError);
              }
            });
          });
          
          req.on('error', (error) => {
            reject(error);
          });
          
          req.setTimeout(10000, () => {
            req.abort();
            reject(new Error('Timeout'));
          });
          
          req.write(postData);
          req.end();
        });

        if (backendData.success || backendData.user) {
          console.log(`✅ Reset balance success for user ${userId}`);
          
          res.json({
            success: true,
            message: `Balance reset untuk user ${userId}`,
            user: backendData.user
          });
        } else {
          throw new Error(backendData.error || 'Backend reset balance failed');
        }

      } catch (backendError) {
        console.error('❌ Backend reset balance error:', backendError.message);
        
        // FALLBACK: Update di device cache (temporary)
        let userFound = false;
        this.devices.forEach((deviceData, deviceId) => {
          if (deviceData.users) {
            const user = deviceData.users.find(u => u.id === parseInt(userId));
            if (user) {
              user.balance = 0;
              userFound = true;
              deviceData.totalBalance = deviceData.users.reduce((sum, u) => sum + (parseInt(u.balance) || 0), 0);
            }
          }
        });
        
        if (userFound) {
          console.log(`⚠️ Fallback reset balance for user ${userId} (cache only)`);
          res.json({
            success: true,
            message: `Reset balance untuk user ${userId} (cache only - backend unavailable)`,
            warning: 'Applied to local cache only, may not persist'
          });
        } else {
          res.status(500).json({ error: 'User tidak ditemukan dan backend tidak tersedia' });
        }
      }

    } catch (error) {
      console.error('❌ Reset balance error:', error);
      res.status(500).json({ error: 'Failed to reset balance' });
    }
  }

  // Clear semua fraud alerts (POST /api/clear-fraud-alerts)
  async clearFraudAlertsEndpoint(req, res) {
    try {
      // IMPLEMENTASI CLEAR FRAUD ALERTS LANGSUNG KE BACKEND
      try {
        const postData = JSON.stringify({});
        
        const options = {
          hostname: backendConfig.hostname,
          port: backendConfig.port,
          path: '/api/admin/clear-fraud-alerts',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-app-key': 'NFC2025SecureApp',
            'ngrok-skip-browser-warning': 'true',
            'x-admin-password': 'admin123',
            'Content-Length': Buffer.byteLength(postData)
          }
        };

        const backendData = await new Promise((resolve, reject) => {
          // Select correct client based on protocol
          const client = backendConfig.protocol === 'https' ? https : http;
          const req = client.request(options, (response) => {
            let data = '';
            
            response.on('data', (chunk) => {
              data += chunk;
            });
            
            response.on('end', () => {
              try {
                const jsonData = JSON.parse(data);
                resolve(jsonData);
              } catch (parseError) {
                reject(parseError);
              }
            });
          });
          
          req.on('error', (error) => {
            reject(error);
          });
          
          req.setTimeout(10000, () => {
            req.abort();
            reject(new Error('Timeout'));
          });
          
          req.write(postData);
          req.end();
        });
        
        if (backendData.success) {
          console.log(`✅ Backend cleared ${backendData.clearedCount} fraud alerts`);
          
          // Also clear local cache
          const localClearedCount = this.fraudAlerts.size;
          this.fraudAlerts.clear();
          this.fraudStats = {
            totalAlerts: 0,
            blockedTransactions: 0,
            reviewTransactions: 0,
            lastAlert: null
          };
          
          res.json({
            success: true,
            message: `Cleared ${backendData.clearedCount} fraud alerts from backend, ${localClearedCount} from local cache`,
            clearedCount: backendData.clearedCount
          });
        } else {
          throw new Error(backendData.error || 'Backend clear fraud alerts failed');
        }
        
      } catch (backendError) {
        console.error('❌ Backend clear fraud alerts error:', backendError.message);
        
        // FALLBACK: Clear local cache only
        const clearedCount = this.fraudAlerts.size;
        this.fraudAlerts.clear();
        this.fraudStats = {
          totalAlerts: 0,
          blockedTransactions: 0,
          reviewTransactions: 0,
          lastAlert: null
        };

        console.log(`⚠️ Fallback clear fraud alerts: ${clearedCount} alerts from local cache`);
        
        res.json({
          success: true,
          message: `Cleared ${clearedCount} fraud alerts (local cache only - backend unavailable)`,
          clearedCount: clearedCount,
          warning: 'Cleared from local cache only, may not persist'
        });
      }

    } catch (error) {
      console.error('❌ Clear fraud alerts error:', error);
      res.status(500).json({ error: 'Failed to clear fraud alerts' });
    }
  }

  // ==================== NFC CARD MANAGEMENT ENDPOINTS ====================

  // Get all NFC cards (GET /api/nfc-cards)
  async getNFCCards(req, res) {
    try {
      const backendConfig = parseBackendUrl();
      const backendUrl = `${BACKEND_URL}/api/nfc-cards/list`;
      
      try {
        const options = {
          hostname: backendConfig.hostname,
          port: backendConfig.port,
          path: '/api/nfc-cards/list?limit=1000', // Get ALL cards
          method: 'GET',
          protocol: backendConfig.protocol,
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true'
          }
        };

        console.log(`📡 Fetching ALL NFC cards from: ${BACKEND_URL}/api/nfc-cards/list`);
        const backendData = await makeHttpRequest(options);
        
        if (backendData.success) {
          console.log(`✅ Loaded ${backendData.cards?.length || 0} NFC cards from backend (Total in DB: ${backendData.total})`);
          res.json({
            success: true,
            cards: backendData.cards || [],
            total: backendData.total || (backendData.cards?.length || 0)
          });
        } else {
          throw new Error(backendData.error || 'Failed to load cards');
        }
      } catch (backendError) {
        console.error('❌ Backend get NFC cards error:', backendError.message);
        res.json({
          success: false,
          cards: [],
          error: `Backend error: ${backendError.message}`,
          total: 0
        });
      }
    } catch (error) {
      console.error('❌ Get NFC cards error:', error);
      res.status(500).json({ 
        success: false,
        error: `Server error: ${error.message}`,
        cards: [],
        total: 0
      });
    }
  }

  // Register new NFC card (POST /api/nfc-cards/register)
  async registerNFCCard(req, res) {
    try {
      const { cardId, userId, cardType } = req.body;
      
      if (!cardId || !userId) {
        return res.status(400).json({ error: 'cardId and userId are required' });
      }

      const backendConfig = parseBackendUrl();
      const postData = JSON.stringify({ cardId, userId, cardType: cardType || 'NTag215' });
      
      const options = {
        hostname: backendConfig.hostname,
        port: backendConfig.port,
        path: '/api/nfc-cards/register',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const backendData = await makeHttpRequest({ ...options, body: { cardId, userId, cardType: cardType || 'NTag215' } });
      
      if (backendData.success) {
        console.log(`✅ Registered NFC card: ${cardId} for user ${userId}`);
        res.json(backendData);
      } else {
        res.status(400).json(backendData);
      }
    } catch (error) {
      console.error('❌ Register NFC card error:', error);
      res.status(500).json({ error: 'Failed to register NFC card' });
    }
  }

  // Link NFC card to user (POST /api/nfc-cards/link)
  async linkNFCCard(req, res) {
    try {
      const { cardId, userId } = req.body;
      
      if (!cardId || !userId) {
        return res.status(400).json({ error: 'cardId and userId are required' });
      }

      const backendConfig = parseBackendUrl();
      const options = {
        hostname: backendConfig.hostname,
        port: backendConfig.port,
        path: '/api/nfc-cards/link',
        method: 'POST',
        body: { cardId, userId }
      };

      const backendData = await makeHttpRequest(options);
      
      if (backendData.success) {
        console.log(`✅ Linked NFC card: ${cardId} to user ${userId}`);
        res.json(backendData);
      } else {
        res.status(400).json(backendData);
      }
    } catch (error) {
      console.error('❌ Link NFC card error:', error);
      res.status(500).json({ error: 'Failed to link NFC card' });
    }
  }

  // Block NFC card (POST /api/nfc-cards/block)
  async blockNFCCard(req, res) {
    try {
      const { cardId, reason } = req.body;
      
      if (!cardId) {
        return res.status(400).json({ error: 'cardId is required' });
      }

      const backendConfig = parseBackendUrl();
      const options = {
        hostname: backendConfig.hostname,
        port: backendConfig.port,
        path: '/api/nfc-cards/status',
        method: 'PUT',
        body: { cardId, status: 'BLOCKED', reason: reason || 'Blocked by admin' }
      };

      const backendData = await makeHttpRequest(options);
      
      if (backendData.success) {
        console.log(`✅ Blocked NFC card: ${cardId}`);
        res.json(backendData);
      } else {
        res.status(400).json(backendData);
      }
    } catch (error) {
      console.error('❌ Block NFC card error:', error);
      res.status(500).json({ error: 'Failed to block NFC card' });
    }
  }

  // Top-up NFC card balance (POST /api/nfc-cards/topup)
  async topupNFCCard(req, res) {
    try {
      const { cardId, amount, adminPassword } = req.body;
      
      if (!cardId || !amount) {
        return res.status(400).json({ error: 'cardId and amount are required' });
      }

      if (adminPassword !== ADMIN_PASSWORD) {
        return res.status(403).json({ error: 'Invalid admin password' });
      }

      const backendConfig = parseBackendUrl();
      const options = {
        hostname: backendConfig.hostname,
        port: backendConfig.port,
        path: '/api/nfc-cards/topup',
        method: 'POST',
        body: { cardId, amount, adminPassword }
      };

      const backendData = await makeHttpRequest(options);
      
      if (backendData.success) {
        console.log(`✅ Topped up NFC card: ${cardId} with ${amount}`);
        res.json(backendData);
      } else {
        res.status(400).json(backendData);
      }
    } catch (error) {
      console.error('❌ Top-up NFC card error:', error);
      res.status(500).json({ error: 'Failed to top-up NFC card' });
    }
  }

  // Delete NFC card (DELETE /api/nfc-cards/:cardId)
  async deleteNFCCard(req, res) {
    try {
      const { cardId } = req.params;
      const { adminPassword } = req.body;
      
      if (!cardId) {
        return res.status(400).json({ error: 'cardId is required' });
      }

      if (adminPassword !== ADMIN_PASSWORD) {
        return res.status(403).json({ error: 'Invalid admin password' });
      }

      const backendConfig = parseBackendUrl();
      const bodyData = JSON.stringify({ adminPassword });
      const options = {
        hostname: backendConfig.hostname,
        port: backendConfig.port,
        path: `/api/nfc-cards/delete/${cardId}`,
        method: 'DELETE',
        protocol: backendConfig.protocol,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(bodyData),
          'ngrok-skip-browser-warning': 'true'
        },
        body: { adminPassword } // Include body for DELETE request
      };

      console.log(`🗑️ Attempting to delete card ${cardId} from backend...`);
      console.log(`🔐 Admin password check: ${adminPassword === ADMIN_PASSWORD ? 'VALID' : 'INVALID'}`);
      console.log(`📤 Sending to: ${backendConfig.hostname}${options.path}`);
      console.log(`📦 Body:`, options.body);
      const backendData = await makeHttpRequest(options);
      
      if (backendData.success) {
        console.log(`🗑️ Deleted NFC card: ${cardId}`);
        res.json(backendData);
      } else {
        res.status(400).json(backendData);
      }
    } catch (error) {
      console.error('❌ Delete NFC card error:', error);
      res.status(500).json({ error: 'Failed to delete NFC card' });
    }
  }

  // Start server dan tampilkan info koneksi
  start() {
    this.app.listen(PORT, () => { // Listen di port 3001
      console.log('🚀 Simple NFC Payment Admin started!');
      console.log(`📊 Dashboard: http://localhost:${PORT}`);
      console.log('');
      console.log('🌐 Backend Connection:');
      console.log(`   📡 Ngrok URL: ${NGROK_URL}`);
      console.log('');
      console.log('📋 Cara menggunakan:');
      console.log('   1. Pastikan ngrok tunnel aktif di terminal lain');
      console.log('   2. Aplikasi Android connect ke ngrok URL');
      console.log('   3. Monitor pengguna dan transaksi dari dashboard ini');
      console.log('');
      console.log('🔧 Setup:');
      console.log('   - Backend: node server.js (port 4000)');
      console.log('   - Ngrok: ngrok http 4000');
      console.log('   - Admin: node simple-admin.js (port 3001)');
    });

    // Start cleanup timer untuk hapus device offline
    this.startCleanupTimer();
  }
}

// ==================== START SERVER ====================
// Buat instance admin server dan jalankan
const admin = new SimpleNFCAdmin();
admin.start();
