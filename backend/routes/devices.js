// ============================================================
// DEVICES.JS - ROUTES UNTUK MANAJEMEN PERANGKAT (DEVICES)
// ============================================================
// File ini berisi endpoint untuk manajemen perangkat mobile (Android/iOS)
// yang terhubung ke sistem pembayaran NFC
//
// ENDPOINT:
// - POST /register -> Daftarkan perangkat baru (first-time setup)
// - POST /sync-device -> Sinkronisasi data perangkat dengan server
// - GET / -> Ambil semua perangkat (admin dashboard)
// - GET /:deviceId -> Detail perangkat tertentu
// - PUT /:deviceId/status -> Update status online/offline perangkat
// - DELETE /:deviceId -> Hapus perangkat (admin only)
// - GET /stats/summary -> Statistik perangkat (total, online, offline)
//
// KONSEP PENTING:
// 1. DEVICE TRACKING: Setiap perangkat Android yang install app harus register
// 2. SYNC MECHANISM: Perangkat sync data (users, transactions) ke server
// 3. ONLINE STATUS: Server track perangkat mana yang online (lastSeen < 5 menit)
// 4. REAL-TIME: Perubahan status dikirim via Socket.IO ke admin dashboard
//
// FLOW REGISTRASI PERANGKAT:
// Mobile App (Android) -> POST /api/devices/register -> Server
// Server save device info -> Return success -> App siap digunakan
// ============================================================

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateDevice } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// ============================================================
// ENDPOINT 1: POST /register - DAFTARKAN PERANGKAT BARU
// ============================================================
// Endpoint ini dipanggil saat user pertama kali install & buka app
//
// REQUEST BODY:
// {
//   "deviceId": "ABC123XYZ789",      // Unique ID perangkat (dari Android)
//   "deviceName": "Samsung Galaxy",   // Nama perangkat (optional)
//   "platform": "android",            // Platform (android/ios)
//   "appVersion": "1.0.0"             // Versi aplikasi (optional)
// }
//
// CARA KERJA:
// 1. Validasi deviceId (wajib ada)
// 2. UPSERT: Update jika sudah ada, Create jika belum ada
//    - Ini mencegah error jika user re-install app
// 3. Set isOnline = true (perangkat baru dianggap online)
// 4. Update lastSeen dengan waktu sekarang
// 5. Return data perangkat
//
// RESPONSE:
// {
//   "success": true,
//   "message": "Perangkat berhasil didaftarkan",
//   "device": { ... }
// }
// ============================================================
router.post('/register', async (req, res) => {
  try {
    const { deviceId, deviceName, platform, appVersion } = req.body;
    
    if (!deviceId) {
      return res.status(400).json({ error: 'ID Perangkat diperlukan' });
    }

    const now = new Date();
    
    // Daftarkan atau perbarui catatan perangkat
    const deviceRecord = await prisma.device.upsert({
      where: { deviceId: deviceId },
      update: {
        deviceName: deviceName || `Perangkat ${platform} ${deviceId.slice(-6)}`,
        platform: platform || 'unknown',
        ipAddress: req.ip,
        isOnline: true,
        lastSeen: now,
        // Simpan data pengguna/saldo yang ada saat update
      },
      create: {
        deviceId: deviceId,
        deviceName: deviceName || `Perangkat ${platform} ${deviceId.slice(-6)}`,
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
      message: 'Perangkat berhasil didaftarkan',
      device: deviceRecord
    });

  } catch (error) {
    console.error('❌ Kesalahan pendaftaran perangkat:', error);
    res.status(500).json({ 
      error: 'Gagal mendaftarkan perangkat',
      details: error.message 
    });
  }
});

// Sinkronkan data perangkat (kompatibel dengan aplikasi mobile yang ada)
router.post('/sync-device', authenticateDevice, async (req, res) => {
  try {
    const { device, users, recentTransactions, stats } = req.body;
    
    if (!device || !device.deviceId) {
      return res.status(400).json({ error: 'ID Perangkat diperlukan' });
    }

    const now = new Date();
    
    // Perbarui atau buat catatan perangkat
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

    // Sinkronkan pengguna jika disediakan
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

    // Sinkronkan transaksi jika disediakan
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

    // Periksa pembaruan saldo yang tertunda
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

    // Kirim ke dashboard admin
    if (req.io) {
      req.io.to('admin-room').emit('device-sync', {
        device: deviceRecord,
        stats: stats || {}
      });
    }

    res.json({
      success: true,
      message: 'Perangkat berhasil disinkronkan',
      balanceUpdates: pendingUpdates.map(update => JSON.parse(update.details)),
      deviceId: device.deviceId,
      timestamp: now.toISOString()
    });

  } catch (error) {
    console.error('❌ Kesalahan sinkronisasi perangkat:', error);
    res.status(500).json({ error: 'Gagal menyinkronkan perangkat' });
  }
});

// Dapatkan semua perangkat
router.get('/', async (req, res) => {
  try {
    const devices = await prisma.device.findMany({
      orderBy: {
        lastSeen: 'desc'
      }
    });

    // Perbarui status online berdasarkan terakhir terlihat
    const now = new Date();
    const devicesWithStatus = devices.map(device => ({
      ...device,
      isOnline: (now - new Date(device.lastSeen)) < 300000 // 5 menit
    }));

    res.json(devicesWithStatus);
  } catch (error) {
    console.error('❌ Kesalahan mendapatkan perangkat:', error);
    res.status(500).json({ error: 'Gagal mendapatkan perangkat' });
  }
});

// Dapatkan perangkat berdasarkan ID
router.get('/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    const device = await prisma.device.findUnique({
      where: { deviceId }
    });

    if (!device) {
      return res.status(404).json({ error: 'Perangkat tidak ditemukan' });
    }

    // Dapatkan pengguna untuk perangkat ini
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

    // Dapatkan transaksi terbaru untuk perangkat ini
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
    console.error('❌ Kesalahan mendapatkan perangkat:', error);
    res.status(500).json({ error: 'Gagal mendapatkan perangkat' });
  }
});

// Perbarui status perangkat
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

    // Kirim ke dashboard admin
    if (req.io) {
      req.io.to('admin-room').emit('device-status-updated', { device });
    }

    res.json({
      message: 'Status perangkat berhasil diperbarui',
      device
    });

  } catch (error) {
    console.error('❌ Kesalahan memperbarui status perangkat:', error);
    res.status(500).json({ error: 'Gagal memperbarui status perangkat' });
  }
});

// Hapus perangkat (khusus admin)
router.delete('/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { adminPassword } = req.body;

    // Verifikasi password admin
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Password admin tidak valid' });
    }

    await prisma.device.delete({
      where: { deviceId }
    });

    // Catat aksi admin
    await prisma.adminLog.create({
      data: {
        action: 'DEVICE_DELETE',
        details: JSON.stringify({ deviceId }),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    });

    // Kirim ke dashboard admin
    if (req.io) {
      req.io.to('admin-room').emit('device-deleted', { deviceId });
    }

    res.json({
      message: 'Perangkat berhasil dihapus'
    });

  } catch (error) {
    console.error('❌ Kesalahan menghapus perangkat:', error);
    res.status(500).json({ error: 'Gagal menghapus perangkat' });
  }
});

// Dapatkan statistik perangkat
router.get('/stats/summary', async (req, res) => {
  try {
    const [totalDevices, onlineDevices, totalUsers, totalBalance] = await Promise.all([
      prisma.device.count(),
      prisma.device.count({
        where: {
          lastSeen: {
            gte: new Date(Date.now() - 300000) // 5 menit terakhir
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
    console.error('❌ Kesalahan mendapatkan statistik perangkat:', error);
    res.status(500).json({ error: 'Gagal mendapatkan statistik perangkat' });
  }
});

module.exports = router;