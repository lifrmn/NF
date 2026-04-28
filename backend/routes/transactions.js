const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

/* -------------------------------------------------------------------------- */
/*                         LAYANAN DETEKSI FRAUD                              */
/*                  DETEKSI ANOMALI BERBASIS Z-SCORE                         */
/* -------------------------------------------------------------------------- */
/**
 * Deteksi Fraud Tingkat Akademis menggunakan Deteksi Anomali Statistik
 * 
 * Algoritma: Weighted Risk Scoring Berbasis Z-Score
 * Referensi:
 * - Chandola, V., Banerjee, A., & Kumar, V. (2009). "Anomaly detection: A survey"
 * - Bolton, R. J., & Hand, D. J. (2002). "Statistical fraud detection: A review"
 * 
 * TANPA LOGIKA IF-ELSE - Formula matematika murni dengan operator ternary hanya untuk mapping
 */
class FraudDetectionService {
  /**
   * Hitung Z-Score untuk deteksi anomali
   * Z = (X - μ) / σ
   * di mana X = nilai observasi, μ = rata-rata, σ = deviasi standar
   */
  static calculateZScore(value, mean, stdDev) {
    return stdDev === 0 ? 0 : (value - mean) / stdDev;
  }

  /**
   * Hitung deviasi standar dari array nilai
   */
  static calculateStdDev(values, mean) {
    const n = values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / Math.max(n, 1);
    return Math.sqrt(variance);
  }

  /**
   * Normalisasi skor ke rentang 0-1 menggunakan fungsi sigmoid
   */
  static normalizeScore(zScore) {
    return 1 / (1 + Math.exp(-zScore));
  }

  /**
   * Analisis deteksi fraud utama menggunakan algoritma Z-Score
   */
  static async analyzeTransaction({ senderId, receiverId, amount, deviceId }) {
    const reasons = [];
    const riskFactors = {};

    // ========================================================================
    // FAKTOR 1: SKOR KECEPATAN (bobot 35%)
    // Mengukur anomali frekuensi transaksi menggunakan Z-Score berbasis waktu
    // ========================================================================
    const timeWindows = {
      '5min': 5 * 60 * 1000,
      '1hour': 60 * 60 * 1000,
      '24hour': 24 * 60 * 60 * 1000
    };

    const recentTransactions = await Promise.all([
      prisma.transaction.findMany({
        where: {
          senderId,
          createdAt: { gte: new Date(Date.now() - timeWindows['5min']) }
        }
      }),
      prisma.transaction.findMany({
        where: {
          senderId,
          createdAt: { gte: new Date(Date.now() - timeWindows['1hour']) }
        }
      }),
      prisma.transaction.findMany({
        where: {
          senderId,
          createdAt: { gte: new Date(Date.now() - timeWindows['24hour']) }
        }
      })
    ]);

    const counts = {
      last5min: recentTransactions[0].length,
      lastHour: recentTransactions[1].length,
      last24h: recentTransactions[2].length
    };

    // Perhitungan rata-rata historis
    const allUserTxs = await prisma.transaction.findMany({
      where: { senderId },
      select: { createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    const avgTxPerHour = allUserTxs.length > 0 
      ? (allUserTxs.length / Math.max((Date.now() - new Date(allUserTxs[allUserTxs.length - 1].createdAt).getTime()) / (60 * 60 * 1000), 1))
      : 0;

    // Perhitungan Z-Score untuk kecepatan
    const velocityZScore = this.calculateZScore(
      counts.lastHour,
      avgTxPerHour,
      Math.sqrt(avgTxPerHour) // Aproksimasi distribusi Poisson
    );

    const velocityScore = this.normalizeScore(velocityZScore) * 100;

    riskFactors.velocityScore = velocityScore;
    riskFactors.velocityDetails = {
      last5min: counts.last5min,
      lastHour: counts.lastHour,
      last24h: counts.last24h,
      historicalAvgPerHour: Math.round(avgTxPerHour * 100) / 100,
      zScore: Math.round(velocityZScore * 100) / 100
    };

    // Buat alasan menggunakan ternary (tanpa if-else)
    velocityScore > 70 ? reasons.push(`Kecepatan transaksi tinggi terdeteksi (Z-Score: ${Math.round(velocityZScore * 100) / 100})`) : null;

    // ========================================================================
    // FAKTOR 2: Z-SCORE JUMLAH (bobot 40%)
    // Anomali statistik pada jumlah transaksi
    // ========================================================================
    const userStats = await prisma.transaction.aggregate({
      where: { senderId },
      _avg: { amount: true },
      _count: true
    });

    const historicalAmounts = await prisma.transaction.findMany({
      where: { senderId },
      select: { amount: true },
      take: 50
    });

    const amounts = historicalAmounts.map(t => t.amount);
    const meanAmount = amounts.length > 0 ? amounts.reduce((a, b) => a + b, 0) / amounts.length : 0;
    const stdDevAmount = this.calculateStdDev(amounts, meanAmount);

    const amountZScore = this.calculateZScore(amount, meanAmount, stdDevAmount);
    const normalizedAmountScore = this.normalizeScore(amountZScore) * 100;

    riskFactors.amountZScore = normalizedAmountScore;
    riskFactors.amountDetails = {
      currentAmount: amount,
      historicalMean: Math.round(meanAmount * 100) / 100,
      standardDeviation: Math.round(stdDevAmount * 100) / 100,
      zScore: Math.round(amountZScore * 100) / 100
    };

    normalizedAmountScore > 70 ? reasons.push(`Jumlah transaksi secara statistik anomali (Z-Score: ${Math.round(amountZScore * 100) / 100})`) : null;

    // ========================================================================
    // FAKTOR 3: SKOR FREKUENSI (bobot 15%)
    // Deviasi pola dari perilaku khas pengguna
    // ========================================================================
    const last7Days = await prisma.transaction.findMany({
      where: {
        senderId,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      }
    });

    const dailyTxCounts = [];
    for (let i = 0; i < 7; i++) {
      const dayStart = new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000);
      const dayEnd = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const count = last7Days.filter(tx => 
        new Date(tx.createdAt) >= dayStart && new Date(tx.createdAt) < dayEnd
      ).length;
      dailyTxCounts.push(count);
    }

    const avgDailyTx = dailyTxCounts.reduce((a, b) => a + b, 0) / 7;
    const todayTxCount = last7Days.filter(tx => 
      new Date(tx.createdAt) >= new Date(Date.now() - 24 * 60 * 60 * 1000)
    ).length;

    const frequencyZScore = this.calculateZScore(
      todayTxCount,
      avgDailyTx,
      this.calculateStdDev(dailyTxCounts, avgDailyTx)
    );

    const frequencyScore = this.normalizeScore(frequencyZScore) * 100;

    riskFactors.frequencyScore = frequencyScore;
    riskFactors.frequencyDetails = {
      todayCount: todayTxCount,
      last7DaysAvg: Math.round(avgDailyTx * 100) / 100,
      zScore: Math.round(frequencyZScore * 100) / 100
    };

    frequencyScore > 70 ? reasons.push(`Pola frekuensi transaksi tidak biasa (Z-Score: ${Math.round(frequencyZScore * 100) / 100})`) : null;

    // ========================================================================
    // FAKTOR 4: SKOR PERILAKU (bobot 10%)
    // Pola perilaku tidak biasa (penerima baru, waktu tidak biasa, dll.)
    // ========================================================================
    const previousReceiverTxs = await prisma.transaction.count({
      where: {
        senderId,
        receiverId
      }
    });

    const isNewReceiver = previousReceiverTxs === 0 ? 1 : 0;
    
    // Anomali berbasis waktu (jam tidak biasa)
    const currentHour = new Date().getHours();
    const hourlyTxs = await prisma.transaction.findMany({
      where: { senderId },
      select: { createdAt: true },
      take: 100
    });

    const hourCounts = new Array(24).fill(0);
    hourlyTxs.forEach(tx => {
      const hour = new Date(tx.createdAt).getHours();
      hourCounts[hour]++;
    });

    const avgHourlyTxCount = hourCounts.reduce((a, b) => a + b, 0) / 24;
    const currentHourCount = hourCounts[currentHour];
    const isUnusualTime = currentHourCount < avgHourlyTxCount * 0.5 ? 1 : 0;

    // Perhitungan skor perilaku (tanpa if-else, formula murni)
    const behaviorScore = (isNewReceiver * 50 + isUnusualTime * 50);

    riskFactors.behaviorScore = behaviorScore;
    riskFactors.behaviorDetails = {
      isNewReceiver: isNewReceiver === 1,
      previousTransactionsWithReceiver: previousReceiverTxs,
      isUnusualTime: isUnusualTime === 1,
      currentHour,
      avgTransactionsAtThisHour: Math.round(currentHourCount * 100) / 100
    };

    behaviorScore > 70 ? reasons.push(`Pola perilaku tidak biasa terdeteksi`) : null;
    isNewReceiver === 1 ? reasons.push('Transaksi ke penerima baru') : null;

    // ========================================================================
    // PERHITUNGAN RISIKO TERTIMBANG (TANPA IF-ELSE)
    // ========================================================================
    const weights = {
      velocity: 0.35,
      amount: 0.40,
      frequency: 0.15,
      behavior: 0.10
    };

    const overallRiskScore = (
      velocityScore * weights.velocity +
      normalizedAmountScore * weights.amount +
      frequencyScore * weights.frequency +
      behaviorScore * weights.behavior
    );

    // ========================================================================
    // PEMETAAN TINGKAT RISIKO (Menggunakan operator ternary - pemetaan ambang akademis)
    // ========================================================================
    const riskLevel = 
      overallRiskScore >= 80 ? 'CRITICAL' :
      overallRiskScore >= 60 ? 'HIGH' :
      overallRiskScore >= 40 ? 'MEDIUM' : 'LOW';

    const decision =
      overallRiskScore >= 80 ? 'BLOCK' :
      overallRiskScore >= 60 ? 'REVIEW' : 'ALLOW';

    // Keyakinan berdasarkan ketersediaan data (lebih banyak data = keyakinan lebih tinggi)
    const dataPoints = amounts.length + hourlyTxs.length + allUserTxs.length;
    const confidence = Math.min(0.95, 0.5 + (dataPoints / 300) * 0.45);

    reasons.length === 0 ? reasons.push('Tidak ada faktor risiko signifikan terdeteksi') : null;

    return {
      riskScore: Math.round(overallRiskScore * 100) / 100,
      riskLevel,
      decision,
      reasons,
      confidence: Math.round(confidence * 100) / 100,
      riskFactors,
      timestamp: new Date().toISOString(),
      algorithm: 'Deteksi Anomali Z-Score',
      weights
    };
  }
}

/* -------------------------------------------------------------------------- */
/*                          DAPATKAN SEMUA TRANSAKSI                          */
/* -------------------------------------------------------------------------- */
router.get('/', async (req, res) => {
  try {
    const { limit = 20, offset = 0, userId, status } = req.query;

    const where = {};
    if (userId) {
      const uid = parseInt(String(userId), 10);
      if (!Number.isNaN(uid)) {
        where.OR = [{ senderId: uid }, { receiverId: uid }];
      }
    }
    if (status) where.status = status;

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        sender: { select: { id: true, name: true, username: true } },
        receiver: { select: { id: true, name: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(String(limit), 10),
      skip: parseInt(String(offset), 10),
    });

    res.json(transactions);
  } catch (error) {
    console.error('❌ Kesalahan mendapatkan transaksi:', error);
    res.status(500).json({ error: 'Gagal mendapatkan transaksi' });
  }
});

/* -------------------------------------------------------------------------- */
/*                   DAPATKAN TRANSAKSI BERDASARKAN ID PENGGUNA               */
/* -------------------------------------------------------------------------- */
router.get('/user/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'ID pengguna tidak valid' });
    }

    const { limit = 20, offset = 0, status } = req.query;

    const where = {
      OR: [
        { senderId: userId },
        { receiverId: userId }
      ]
    };
    
    if (status) where.status = status;

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        sender: {
          select: { id: true, name: true, username: true }
        },
        receiver: {
          select: { id: true, name: true, username: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(String(limit), 10),
      skip: parseInt(String(offset), 10),
    });

    // Tambahkan info tipe transaksi (terkirim/diterima) untuk pengguna yang meminta
    const transactionsWithType = transactions.map(transaction => ({
      ...transaction,
      transactionType: transaction.senderId === userId ? 'sent' : 'received'
    }));

    res.json(transactionsWithType);
  } catch (error) {
    console.error('❌ Kesalahan mendapatkan transaksi pengguna:', error);
    res.status(500).json({ error: 'Gagal mendapatkan transaksi pengguna' });
  }
});

/* -------------------------------------------------------------------------- */
/*           STATISTIK TRANSAKSI (TEMPATKAN SEBELUM /:id)                    */
/* -------------------------------------------------------------------------- */
router.get('/stats/summary', async (req, res) => {
  try {
    const { userId, period = '7d' } = req.query;
    const now = new Date();
    let from;

    if (period === '1d') from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    else if (period === '30d') from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    else from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const where = { createdAt: { gte: from } };

    if (userId) {
      const uid = parseInt(String(userId), 10);
      if (!Number.isNaN(uid)) where.OR = [{ senderId: uid }, { receiverId: uid }];
    }

    const [count, sum, avg] = await Promise.all([
      prisma.transaction.count({ where }),
      prisma.transaction.aggregate({ where, _sum: { amount: true } }),
      prisma.transaction.aggregate({ where, _avg: { amount: true } }),
    ]);

    res.json({
      period,
      totalTransactions: count,
      totalAmount: sum._sum.amount || 0,
      averageAmount: avg._avg.amount || 0,
    });
  } catch (error) {
    console.error('❌ Kesalahan mendapatkan statistik transaksi:', error);
    res.status(500).json({ error: 'Gagal mendapatkan statistik transaksi' });
  }
});

/* -------------------------------------------------------------------------- */
/*                          BUAT TRANSAKSI BARU                               */
/* -------------------------------------------------------------------------- */
router.post(
  '/',
  [
    body('amount').isFloat({ min: 0.01 }).withMessage('Jumlah harus lebih dari 0'),
    body('receiverUsername').optional().isString(),
    body('receiverId').optional().isInt(),
    // catatan: senderId dari body tidak dipercaya, hanya fallback
    body('senderId').optional().isInt(),
    body('description').optional().isString(),
    body('deviceId').optional().isString(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const {
        receiverUsername,
        receiverId,
        senderId: senderIdFromBody,
        amount,
        description,
        deviceId,
      } = req.body;

      // Ambil sender dari token (authenticateToken), kalau tidak ada baru fallback body
      const senderId = req.user?.id ?? senderIdFromBody;
      if (!senderId) return res.status(401).json({ error: 'Pengirim tidak terautentikasi' });

      const amountNum = Number(amount);
      if (!Number.isFinite(amountNum) || amountNum <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
      }

      // Cari receiver (username lebih diutamakan)
      let receiver = null;
      if (receiverUsername) {
        receiver = await prisma.user.findUnique({ where: { username: receiverUsername } });
      } else if (receiverId) {
        receiver = await prisma.user.findUnique({ where: { id: Number(receiverId) } });
      }
      if (!receiver) return res.status(404).json({ error: 'Receiver not found' });
      if (receiver.id === Number(senderId)) return res.status(400).json({ error: 'Cannot send money to yourself' });

      // Cek saldo sender
      const sender = await prisma.user.findUnique({ where: { id: Number(senderId) } });
      if (!sender || sender.balance < amountNum) {
        return res.status(400).json({ error: 'Insufficient balance' });
      }

      // Deteksi fraud
      const fraudResult = await FraudDetectionService.analyzeTransaction({
        senderId: Number(senderId),
        receiverId: receiver.id,
        amount: amountNum,
        deviceId,
      });

      if (fraudResult.decision === 'BLOCK') {
        await prisma.fraudAlert.create({
          data: {
            userId: Number(senderId),
            deviceId: deviceId || 'unknown',
            riskScore: fraudResult.riskScore,
            riskLevel: fraudResult.riskLevel,
            decision: fraudResult.decision,
            reasons: JSON.stringify(fraudResult.reasons),
            confidence: fraudResult.confidence,
            riskFactors: JSON.stringify(fraudResult.riskFactors),
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
          },
        });
        return res.status(403).json({ error: 'Transaction blocked due to fraud risk', fraudResult });
      }

      // Transaksi atomic
      const transaction = await prisma.$transaction(async (tx) => {
        // update saldo
        const updatedSender = await tx.user.update({
          where: { id: Number(senderId) },
          data: { balance: { decrement: amountNum } },
        });

        const updatedReceiver = await tx.user.update({
          where: { id: receiver.id },
          data: { balance: { increment: amountNum } },
        });

        // create trx
        const created = await tx.transaction.create({
          data: {
            senderId: Number(senderId),
            receiverId: receiver.id,
            amount: amountNum,
            description,
            deviceId,
            fraudRiskScore: fraudResult.riskScore,
            fraudRiskLevel: fraudResult.riskLevel,
            fraudReasons: JSON.stringify(fraudResult.reasons),
            ipAddress: req.ip,
          },
          include: {
            sender: {
              select: { id: true, name: true, username: true, balance: true, deviceId: true },
            },
            receiver: {
              select: { id: true, name: true, username: true, balance: true, deviceId: true },
            },
          },
        });

        return created;
      });

      // Log fraud HIGH
      if (fraudResult.riskLevel === 'HIGH') {
        await prisma.fraudAlert.create({
          data: {
            userId: Number(senderId),
            transactionId: transaction.id,
            deviceId: deviceId || 'unknown',
            riskScore: fraudResult.riskScore,
            riskLevel: fraudResult.riskLevel,
            decision: fraudResult.decision,
            reasons: JSON.stringify(fraudResult.reasons),
            confidence: fraudResult.confidence,
            riskFactors: JSON.stringify(fraudResult.riskFactors),
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
          },
        });
      }

      // Emit realtime (cek deviceId dulu)
      if (req.io) {
        req.io.to('admin-room').emit('new-transaction', { transaction, fraudResult });
        if (transaction.sender?.deviceId) {
          req.io.to(`device-${transaction.sender.deviceId}`).emit('balance-updated', {
            balance: transaction.sender.balance,
          });
        }
        if (transaction.receiver?.deviceId) {
          req.io.to(`device-${transaction.receiver.deviceId}`).emit('balance-updated', {
            balance: transaction.receiver.balance,
          });
        }
      }

      res.status(201).json({
        success: true,
        message: 'Transaksi berhasil diselesaikan',
        transaction,
        fraudResult,
      });
    } catch (error) {
      console.error('❌ Kesalahan membuat transaksi:', error);
      res.status(500).json({ error: 'Gagal membuat transaksi' });
    }
  }
);

/* -------------------------------------------------------------------------- */
/*                      DAPATKAN TRANSAKSI BERDASARKAN ID                     */
/* -------------------------------------------------------------------------- */
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        sender: { select: { id: true, name: true, username: true } },
        receiver: { select: { id: true, name: true, username: true } },
      },
    });

    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
    res.json(transaction);
  } catch (error) {
    console.error('❌ Kesalahan mendapatkan transaksi:', error);
    res.status(500).json({ error: 'Gagal mendapatkan transaksi' });
  }
});

module.exports = router;
