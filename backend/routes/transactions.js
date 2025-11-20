const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

/* -------------------------------------------------------------------------- */
/*                          FRAUD DETECTION SERVICE                           */
/*                      Z-SCORE BASED ANOMALY DETECTION                       */
/* -------------------------------------------------------------------------- */
/**
 * Academic-Grade Fraud Detection using Statistical Anomaly Detection
 * 
 * Algorithm: Z-Score Based Weighted Risk Scoring
 * References:
 * - Chandola, V., Banerjee, A., & Kumar, V. (2009). "Anomaly detection: A survey"
 * - Bolton, R. J., & Hand, D. J. (2002). "Statistical fraud detection: A review"
 * 
 * NO IF-ELSE LOGIC - Pure mathematical formulas with ternary operators for mapping only
 */
class FraudDetectionService {
  /**
   * Calculate Z-Score for anomaly detection
   * Z = (X - μ) / σ
   * where X = observed value, μ = mean, σ = standard deviation
   */
  static calculateZScore(value, mean, stdDev) {
    return stdDev === 0 ? 0 : (value - mean) / stdDev;
  }

  /**
   * Calculate standard deviation from array of values
   */
  static calculateStdDev(values, mean) {
    const n = values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / Math.max(n, 1);
    return Math.sqrt(variance);
  }

  /**
   * Normalize score to 0-1 range using sigmoid-like function
   */
  static normalizeScore(zScore) {
    return 1 / (1 + Math.exp(-zScore));
  }

  /**
   * Main fraud detection analysis using Z-Score algorithm
   */
  static async analyzeTransaction({ senderId, receiverId, amount, deviceId }) {
    const reasons = [];
    const riskFactors = {};

    // ========================================================================
    // FACTOR 1: VELOCITY SCORE (35% weight)
    // Measures transaction frequency anomaly using time-based Z-Score
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

    // Historical average calculation
    const allUserTxs = await prisma.transaction.findMany({
      where: { senderId },
      select: { createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    const avgTxPerHour = allUserTxs.length > 0 
      ? (allUserTxs.length / Math.max((Date.now() - new Date(allUserTxs[allUserTxs.length - 1].createdAt).getTime()) / (60 * 60 * 1000), 1))
      : 0;

    // Z-Score calculation for velocity
    const velocityZScore = this.calculateZScore(
      counts.lastHour,
      avgTxPerHour,
      Math.sqrt(avgTxPerHour) // Poisson distribution approximation
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

    // Generate reason using ternary (no if-else)
    velocityScore > 70 ? reasons.push(`High transaction velocity detected (Z-Score: ${Math.round(velocityZScore * 100) / 100})`) : null;

    // ========================================================================
    // FACTOR 2: AMOUNT Z-SCORE (40% weight)
    // Statistical anomaly in transaction amount
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

    normalizedAmountScore > 70 ? reasons.push(`Transaction amount is statistically anomalous (Z-Score: ${Math.round(amountZScore * 100) / 100})`) : null;

    // ========================================================================
    // FACTOR 3: FREQUENCY SCORE (15% weight)
    // Pattern deviation from user's typical behavior
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

    frequencyScore > 70 ? reasons.push(`Unusual transaction frequency pattern (Z-Score: ${Math.round(frequencyZScore * 100) / 100})`) : null;

    // ========================================================================
    // FACTOR 4: BEHAVIOR SCORE (10% weight)
    // Unusual behavior patterns (new receiver, unusual time, etc.)
    // ========================================================================
    const previousReceiverTxs = await prisma.transaction.count({
      where: {
        senderId,
        receiverId
      }
    });

    const isNewReceiver = previousReceiverTxs === 0 ? 1 : 0;
    
    // Time-based anomaly (unusual hour)
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

    // Behavior score calculation (no if-else, pure formula)
    const behaviorScore = (isNewReceiver * 50 + isUnusualTime * 50);

    riskFactors.behaviorScore = behaviorScore;
    riskFactors.behaviorDetails = {
      isNewReceiver: isNewReceiver === 1,
      previousTransactionsWithReceiver: previousReceiverTxs,
      isUnusualTime: isUnusualTime === 1,
      currentHour,
      avgTransactionsAtThisHour: Math.round(currentHourCount * 100) / 100
    };

    behaviorScore > 70 ? reasons.push(`Unusual behavioral pattern detected`) : null;
    isNewReceiver === 1 ? reasons.push('Transaction to new receiver') : null;

    // ========================================================================
    // WEIGHTED RISK CALCULATION (NO IF-ELSE)
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
    // RISK LEVEL MAPPING (Using ternary operators - academic threshold mapping)
    // ========================================================================
    const riskLevel = 
      overallRiskScore >= 80 ? 'CRITICAL' :
      overallRiskScore >= 60 ? 'HIGH' :
      overallRiskScore >= 40 ? 'MEDIUM' : 'LOW';

    const decision =
      overallRiskScore >= 80 ? 'BLOCK' :
      overallRiskScore >= 60 ? 'REVIEW' : 'ALLOW';

    // Confidence based on data availability (more data = higher confidence)
    const dataPoints = amounts.length + hourlyTxs.length + allUserTxs.length;
    const confidence = Math.min(0.95, 0.5 + (dataPoints / 300) * 0.45);

    reasons.length === 0 ? reasons.push('No significant risk factors detected') : null;

    return {
      riskScore: Math.round(overallRiskScore * 100) / 100,
      riskLevel,
      decision,
      reasons,
      confidence: Math.round(confidence * 100) / 100,
      riskFactors,
      timestamp: new Date().toISOString(),
      algorithm: 'Z-Score Anomaly Detection',
      weights
    };
  }
}

/* -------------------------------------------------------------------------- */
/*                             GET ALL TRANSACTIONS                           */
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
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to get transactions' });
  }
});

/* -------------------------------------------------------------------------- */
/*                    TRANSACTION STATS (PLACE BEFORE /:id)                   */
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
    console.error('Get transaction stats error:', error);
    res.status(500).json({ error: 'Failed to get transaction statistics' });
  }
});

/* -------------------------------------------------------------------------- */
/*                             CREATE NEW TRANSACTION                         */
/* -------------------------------------------------------------------------- */
router.post(
  '/',
  [
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
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
      if (!senderId) return res.status(401).json({ error: 'Sender not authenticated' });

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

      // Fraud detection
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
        message: 'Transaction completed successfully',
        transaction,
        fraudResult,
      });
    } catch (error) {
      console.error('Create transaction error:', error);
      res.status(500).json({ error: 'Failed to create transaction' });
    }
  }
);

/* -------------------------------------------------------------------------- */
/*                             GET TRANSACTION BY ID                          */
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
    console.error('Get transaction error:', error);
    res.status(500).json({ error: 'Failed to get transaction' });
  }
});

module.exports = router;
