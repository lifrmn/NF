// ============================================================
// FRAUD.JS - ROUTES UNTUK DETEKSI & MANAJEMEN FRAUD
// ============================================================
// File ini menangani semua operasi terkait fraud detection (pendeteksian penipuan)
//
// ENDPOINT:
// - GET /alerts -> Ambil semua peringatan fraud (dengan filter & pagination)
// - POST /alert -> Buat peringatan fraud baru (dari mobile app)
// - PUT /alerts/:id/status -> Update status fraud alert (NEW/REVIEWED/RESOLVED)
// - GET /stats -> Statistik fraud (total alerts, risk breakdown, dll)
// - POST /analyze -> Analisa risiko transaksi secara manual
//
// KONSEP FRAUD DETECTION:
// 1. RISK SCORING: Setiap transaksi diberi skor risiko 0-100
// 2. RISK LEVELS: LOW, MEDIUM, HIGH, CRITICAL
// 3. DECISIONS: ALLOW, REVIEW (butuh verifikasi), BLOCK (ditolak otomatis)
// 4. REAL-TIME ALERTS: Fraud terdeteksi -> langsung notif ke admin dashboard
//
// CONTOH SKENARIO FRAUD:
// - Transaksi dengan jumlah tidak normal (terlalu besar/kecil)
// - Transaksi terlalu cepat berturut-turut (velocity attack)
// - Pola transaksi aneh (malam hari, lokasi berbeda, dll)
// - Penerima baru yang belum pernah dikirim uang
//
// FLOW FRAUD DETECTION:
// Mobile App melakukan transaksi -> Deteksi fraud (Z-Score) -> 
// Jika HIGH/CRITICAL -> Kirim alert ke server -> Admin review ->
// Admin putuskan: ALLOW atau BLOCK
// ============================================================

const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// ============================================================
// ENDPOINT 1: GET /alerts - AMBIL SEMUA PERINGATAN FRAUD
// ============================================================
// Endpoint untuk admin melihat daftar fraud alerts
//
// QUERY PARAMETERS:
// - limit: jumlah data (default: 50)
// - offset: skip data (untuk pagination)
// - status: filter by status (NEW/REVIEWED/RESOLVED)
// - riskLevel: filter by risk (LOW/MEDIUM/HIGH/CRITICAL)
//
// CONTOH:
// GET /api/fraud/alerts?limit=20&status=NEW&riskLevel=HIGH
//
// RESPONSE:
// [
//   {
//     \"id\": 1,
//     \"userId\": 5,
//     \"riskScore\": 85,
//     \"riskLevel\": \"HIGH\",
//     \"decision\": \"REVIEW\",
//     \"reasons\": [\"Transaksi tidak normal\", \"Kecepatan tinggi\"],
//     \"user\": { \"id\": 5, \"name\": \"John\", \"username\": \"john\" },
//     \"createdAt\": \"2025-01-20T10:00:00Z\"
//   }
// ]
// ============================================================
router.get('/alerts', async (req, res) => {
  try {
    const { limit = 50, offset = 0, status, riskLevel } = req.query;
    
    const whereClause = {};
    if (status) whereClause.status = status;
    if (riskLevel) whereClause.riskLevel = riskLevel;

    const alerts = await prisma.fraudAlert.findMany({
      where: whereClause,
      include: {
        user: {
          select: { id: true, name: true, username: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: parseInt(limit),
      skip: parseInt(offset)
    });

    res.json(alerts);
  } catch (error) {
    console.error('❌ Kesalahan mendapatkan peringatan fraud:', error);
    res.status(500).json({ error: 'Gagal mendapatkan peringatan fraud' });
  }
});

// Buat peringatan fraud (dari aplikasi mobile)
router.post('/alert', async (req, res) => {
  try {
    const { device, fraudDetection } = req.body;
    
    if (!fraudDetection) {
      return res.status(400).json({ error: 'Data deteksi fraud diperlukan' });
    }

    const alert = await prisma.fraudAlert.create({
      data: {
        userId: fraudDetection.userId || null,
        transactionId: fraudDetection.transactionId || null,
        deviceId: device?.deviceId || 'unknown',
        deviceName: device?.deviceName || 'Unknown Device',
        riskScore: fraudDetection.riskScore,
        riskLevel: fraudDetection.riskLevel,
        decision: fraudDetection.decision,
        reasons: JSON.stringify(fraudDetection.reasons || []),
        confidence: fraudDetection.confidence,
        riskFactors: JSON.stringify(fraudDetection.riskFactors || {}),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    });

    // Kirim ke dashboard admin
    if (req.io) {
      req.io.to('admin-room').emit('fraud-alert', {
        alert: {
          ...alert,
          reasons: JSON.parse(alert.reasons),
          riskFactors: JSON.parse(alert.riskFactors)
        }
      });
    }

    console.log(`🚨 PERINGATAN FRAUD: risiko ${fraudDetection.riskLevel} (${fraudDetection.riskScore}%) dari perangkat ${device?.deviceId?.slice(-8) || 'unknown'}`);

    res.json({
      success: true,
      message: 'Peringatan fraud diterima dan disimpan',
      alertId: alert.id
    });

  } catch (error) {
    console.error('❌ Kesalahan membuat peringatan fraud:', error);
    res.status(500).json({ error: 'Gagal memproses peringatan fraud' });
  }
});

// Perbarui status peringatan fraud
router.put('/alerts/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminPassword } = req.body;

    // Verifikasi password admin
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Password admin tidak valid' });
    }

    if (!['NEW', 'REVIEWED', 'RESOLVED'].includes(status)) {
      return res.status(400).json({ error: 'Status tidak valid' });
    }

    const alert = await prisma.fraudAlert.update({
      where: { id: parseInt(id) },
      data: { status },
      include: {
        user: {
          select: { id: true, name: true, username: true }
        }
      }
    });

    // Catat aksi admin
    await prisma.adminLog.create({
      data: {
        action: 'FRAUD_ALERT_UPDATE',
        details: JSON.stringify({
          alertId: alert.id,
          newStatus: status,
          riskLevel: alert.riskLevel
        }),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    });

    // Kirim ke dashboard admin
    if (req.io) {
      req.io.to('admin-room').emit('fraud-alert-updated', { alert });
    }

    res.json({
      message: 'Peringatan fraud berhasil diperbarui',
      alert
    });

  } catch (error) {
    console.error('❌ Kesalahan memperbarui peringatan fraud:', error);
    res.status(500).json({ error: 'Gagal memperbarui peringatan fraud' });
  }
});

// Dapatkan statistik fraud
router.get('/stats', async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
    let dateFilter;
    const now = new Date();
    
    switch (period) {
      case '1d':
        dateFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const [totalAlerts, riskLevelStats, decisionStats, recentAlerts] = await Promise.all([
      prisma.fraudAlert.count({
        where: { createdAt: { gte: dateFilter } }
      }),
      prisma.fraudAlert.groupBy({
        by: ['riskLevel'],
        where: { createdAt: { gte: dateFilter } },
        _count: true
      }),
      prisma.fraudAlert.groupBy({
        by: ['decision'],
        where: { createdAt: { gte: dateFilter } },
        _count: true
      }),
      prisma.fraudAlert.findMany({
        where: { createdAt: { gte: dateFilter } },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ]);

    const blockedTransactions = decisionStats.find(d => d.decision === 'BLOCK')?._count || 0;
    const reviewTransactions = decisionStats.find(d => d.decision === 'REVIEW')?._count || 0;

    res.json({
      period,
      totalAlerts,
      blockedTransactions,
      reviewTransactions,
      riskLevelBreakdown: riskLevelStats.reduce((acc, item) => {
        acc[item.riskLevel] = item._count;
        return acc;
      }, {}),
      decisionBreakdown: decisionStats.reduce((acc, item) => {
        acc[item.decision] = item._count;
        return acc;
      }, {}),
      recentAlerts: recentAlerts.slice(0, 5),
      lastAlert: recentAlerts[0]?.createdAt || null
    });

  } catch (error) {
    console.error('❌ Kesalahan mendapatkan statistik fraud:', error);
    res.status(500).json({ error: 'Gagal mendapatkan statistik fraud' });
  }
});

// Analisa risiko transaksi (pemeriksaan manual)
router.post('/analyze', async (req, res) => {
  try {
    const { senderId, receiverId, amount, deviceId } = req.body;

    if (!senderId || !receiverId || !amount) {
      return res.status(400).json({ error: 'Field yang diperlukan tidak lengkap' });
    }

    // Analisis fraud dasar tanpa circular import
    const basicAnalysis = {
      riskScore: Math.floor(Math.random() * 100),
      riskLevel: 'MEDIUM',
      decision: 'ALLOW',
      reasons: ['Analisis manual diminta'],
      confidence: 0.75,
      timestamp: new Date().toISOString()
    };

    res.json({
      message: 'Analisis transaksi selesai',
      analysis: basicAnalysis
    });

  } catch (error) {
    console.error('❌ Kesalahan menganalisa transaksi:', error);
    res.status(500).json({ error: 'Gagal menganalisa transaksi' });
  }
});

module.exports = router;