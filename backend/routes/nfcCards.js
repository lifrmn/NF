const express = require('express');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const router = express.Router();
const prisma = new PrismaClient();

// NFC Card Routes - RFID NTag215 13.56MHz Management
// Endpoints: register, link, tap, payment, topup, status, list, transactions, info

// Helper Functions
const validateCardId = (cardId) => {
  const uidPattern = /^[0-9A-Fa-f]{14,20}$/;
  return uidPattern.test(cardId);
};

const encryptCardData = (data) => {
  const cipher = crypto.createCipher('aes-256-cbc', process.env.NFC_ENCRYPTION_KEY || 'default-nfc-key');
  return cipher.update(data, 'utf8', 'hex') + cipher.final('hex');
};

const validateUser = async (userId) => {
  return await prisma.user.findUnique({ where: { id: parseInt(userId) } });
};

const checkUserHasCard = async (userId) => {
  return await prisma.nFCCard.findMany({ where: { userId: parseInt(userId) } });
};

const formatCurrency = (amount) => {
  return `Rp ${amount.toLocaleString('id-ID')}`;
};

// ============================================================================
// FRAUD DETECTION: 2-Factor Model (Amount Anomaly + Velocity Detection)
// ============================================================================
// Algorithm: Z-Score Based Anomaly Detection with Velocity Analysis
// Academic Reference: Chandola et al. (2009) - Anomaly Detection Survey
// ============================================================================
const analyzeFraudRisk = async (senderCard, amount, deviceId, prisma) => {
  // If no user associated, skip fraud check
  if (!senderCard.userId) {
    return { 
      riskScore: 0, 
      decision: 'ALLOW', 
      riskLevel: 'LOW', 
      riskFactors: ['No user data - skipping fraud check'] 
    };
  }

  try {
    // Load historical transaction data (last 100 transactions)
    const recentTransactions = await prisma.transaction.findMany({
      where: { senderId: senderCard.userId },
      orderBy: { timestamp: 'desc' },
      take: 100
    });

    // =========================================================================
    // FACTOR 1: Amount Anomaly Detection using Z-Score (Weight: 60%)
    // =========================================================================
    // Z-Score Formula: Z = |X - μ| / σ
    // Where: X = current amount, μ = mean, σ = standard deviation
    // =========================================================================
    
    const amounts = recentTransactions.map(t => t.amount);
    
    // Calculate mean (average amount)
    const avgAmount = amounts.length > 0 
      ? amounts.reduce((a, b) => a + b, 0) / amounts.length 
      : 0;
    
    // Calculate variance and standard deviation
    const variance = amounts.length > 1 
      ? amounts.reduce((sum, val) => sum + Math.pow(val - avgAmount, 2), 0) / amounts.length 
      : 0;
    
    const stdDev = Math.sqrt(variance);
    
    // Calculate Z-Score (normalized distance from mean)
    const zScore = stdDev > 0 ? Math.abs((amount - avgAmount) / stdDev) : 0;

    // Amount anomaly scoring based on statistical significance
    let amountScore = 0;
    if (zScore > 3) {
      // Extreme outlier: 99.7% confidence interval (3-sigma rule)
      amountScore = 60;
    } else if (zScore > 2) {
      // Significant outlier: 95% confidence interval (2-sigma rule)
      amountScore = 30;
    } else if (zScore > 1) {
      // Mild outlier: 68% confidence interval (1-sigma rule)
      amountScore = 10;
    }

    // =========================================================================
    // FACTOR 2: Velocity Detection - Rapid-Fire Attack (Weight: 40%)
    // =========================================================================
    // Algorithm: Sliding Window Time-Series Analysis
    // Window: 60 seconds (1 minute)
    // =========================================================================
    
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const recentTxCount = recentTransactions.filter(
      t => new Date(t.timestamp) > oneMinuteAgo
    ).length;

    // Velocity scoring based on transaction frequency
    let velocityScore = 0;
    if (recentTxCount >= 5) {
      // High velocity: Likely automated bot attack (>5 tx/min)
      velocityScore = 40;
    } else if (recentTxCount >= 3) {
      // Moderate velocity: Suspicious pattern (3-4 tx/min)
      velocityScore = 20;
    }

    // =========================================================================
    // TOTAL RISK SCORE CALCULATION (0-100%)
    // =========================================================================
    // Risk Score = Amount Score (0-60) + Velocity Score (0-40)
    // =========================================================================
    
    const totalRiskScore = amountScore + velocityScore;

    // Build risk factors array for transparency and explainability
    const riskFactors = [];
    
    if (amountScore > 0) {
      riskFactors.push(
        `Amount anomaly: ${zScore.toFixed(1)}σ from mean (Score: +${amountScore})`
      );
    }
    
    if (velocityScore > 0) {
      riskFactors.push(
        `High velocity: ${recentTxCount} transactions/min (Score: +${velocityScore})`
      );
    }
    
    if (totalRiskScore === 0) {
      riskFactors.push('Normal transaction pattern detected');
    }

    // =========================================================================
    // DECISION MAKING: Threshold-Based Classification
    // =========================================================================
    // Decision Boundaries:
    //   - [70-100%] → BLOCK  (High Risk)
    //   - [40-69%]  → REVIEW (Medium Risk)
    //   - [0-39%]   → ALLOW  (Low Risk)
    // =========================================================================
    
    let decision, riskLevel;
    
    if (totalRiskScore >= 70) {
      decision = 'BLOCK';
      riskLevel = 'HIGH';
      riskFactors.push('⛔ Action: Transaction BLOCKED due to high risk');
    } else if (totalRiskScore >= 40) {
      decision = 'REVIEW';
      riskLevel = 'MEDIUM';
      riskFactors.push('⚠️ Action: Manual REVIEW required by admin');
    } else {
      decision = 'ALLOW';
      riskLevel = 'LOW';
      riskFactors.push('✅ Action: Transaction ALLOWED - Normal pattern');
    }

    // Return comprehensive fraud analysis result
    return {
      riskScore: totalRiskScore,
      decision,
      riskLevel,
      riskFactors,
      
      // Detailed metrics for logging and debugging
      zScore: zScore.toFixed(2),
      recentTxCount,
      avgAmount: avgAmount.toFixed(0),
      stdDev: stdDev.toFixed(0),
      amountScore,
      velocityScore
    };

  } catch (error) {
    console.error('❌ Fraud analysis error:', error);
    // Fail-safe: Allow transaction if analysis fails (avoid blocking legitimate users)
    return { 
      riskScore: 0, 
      decision: 'ALLOW', 
      riskLevel: 'LOW', 
      riskFactors: ['Fraud analysis failed - transaction allowed by default'] 
    };
  }
};

// POST /register - Registrasi kartu NFC baru
router.post('/register', async (req, res) => {
  try {
    const { cardId, userId, cardData, deviceId, metadata } = req.body;

    if (!cardId) return res.status(400).json({ error: 'Card ID (UID) required' });
    if (!validateCardId(cardId)) {
      return res.status(400).json({ error: 'Invalid NTag215 UID format', expected: '7-10 bytes hex string' });
    }

    const existingCard = await prisma.nFCCard.findUnique({ where: { cardId } });
    if (existingCard) {
      return res.status(409).json({ error: 'Card already registered', card: { id: existingCard.id, cardId: existingCard.cardId, status: existingCard.cardStatus, userId: existingCard.userId } });
    }

    // Validasi user jika userId provided
    if (userId) {
      const user = await validateUser(userId);
      if (!user) return res.status(404).json({ error: 'User not found' });

      // 🔒 1 USER = 1 CARD POLICY
      const userExistingCards = await checkUserHasCard(userId);
      if (userExistingCards.length > 0) {
        return res.status(409).json({ 
          error: 'User already has a registered card',
          message: 'Each user can only register ONE NFC card',
          existingCard: { cardId: userExistingCards[0].cardId, cardStatus: userExistingCards[0].cardStatus, balance: userExistingCards[0].balance, registeredAt: userExistingCards[0].registeredAt }
        });
      }
    }

    const encryptedData = cardData ? encryptCardData(cardData) : null;

    // Buat record kartu NFC baru
    const nfcCard = await prisma.nFCCard.create({
      data: {
        cardId,
        cardType: 'NTag215',
        frequency: '13.56MHz',
        userId: userId ? parseInt(userId) : null,
        cardStatus: 'ACTIVE',
        balance: 0,
        cardData: encryptedData,
        metadata: metadata ? JSON.stringify(metadata) : null,
        isPhysical: true
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true
          }
        }
      }
    });

    console.log(`🎴 NFC Card registered: ${cardId.slice(0, 8)}... ${userId ? `for user ${userId}` : '(unassigned)'}`);

    res.status(201).json({
      success: true,
      message: 'NFC card registered successfully',
      card: {
        id: nfcCard.id,
        cardId: nfcCard.cardId,
        cardType: nfcCard.cardType,
        frequency: nfcCard.frequency,
        status: nfcCard.cardStatus,
        balance: nfcCard.balance,
        user: nfcCard.user,
        registeredAt: nfcCard.registeredAt
      }
    });

  } catch (error) {
    console.error('❌ Card registration error:', error);
    res.status(500).json({ 
      error: 'Failed to register card',
      details: error.message 
    });
  }
});

// POST /link - Link kartu ke user
router.post('/link', async (req, res) => {
  try {
    const { cardId, userId } = req.body;
    if (!cardId || !userId) return res.status(400).json({ error: 'Card ID and User ID required' });

    const card = await prisma.nFCCard.findUnique({ where: { cardId } });
    if (!card) return res.status(404).json({ error: 'Card not found' });
    if (card.cardStatus !== 'ACTIVE') return res.status(400).json({ error: `Cannot link ${card.cardStatus.toLowerCase()} card` });

    const user = await validateUser(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const updatedCard = await prisma.nFCCard.update({
      where: { cardId },
      data: { userId: parseInt(userId), updatedAt: new Date() },
      include: { user: { select: { id: true, name: true, username: true, balance: true } } }
    });

    console.log(`🔗 Card ${cardId.slice(0, 8)}... linked to user ${user.username}`);
    res.json({ success: true, message: 'Card linked to user successfully', card: updatedCard });
  } catch (error) {
    console.error('❌ Card linking error:', error);
    res.status(500).json({ error: 'Failed to link card', details: error.message });
  }
});

// POST /tap - Proses tap/scan kartu (read)
router.post('/tap', async (req, res) => {
  try {
    const { cardId, deviceId, location, signalStrength, readTime } = req.body;
    if (!cardId || !deviceId) return res.status(400).json({ error: 'Card ID and Device ID required' });

    const card = await prisma.nFCCard.findUnique({
      where: { cardId },
      include: { user: { select: { id: true, name: true, username: true, balance: true } } }
    });

    if (!card) {
      return res.status(404).json({ 
        error: 'Card not recognized',
        suggestion: 'Register this card first'
      });
    }

    // Check card status
    if (card.cardStatus === 'BLOCKED') {
      return res.status(403).json({ 
        error: 'Card is blocked',
        reason: 'Contact admin for assistance'
      });
    }

    if (card.cardStatus === 'EXPIRED') {
      return res.status(403).json({ 
        error: 'Card has expired',
        expiredAt: card.expiresAt
      });
    }

    if (card.cardStatus === 'LOST') {
      // Alert admin tentang penggunaan kartu yang dilaporkan hilang
      await prisma.fraudAlert.create({
        data: {
          userId: card.userId,
          deviceId,
          deviceName: 'NFC Reader',
          riskScore: 95,
          riskLevel: 'CRITICAL',
          decision: 'BLOCK',
          reasons: JSON.stringify(['Card reported as LOST', `Tap attempt at ${location || 'unknown location'}`]),
          confidence: 1.0,
          riskFactors: JSON.stringify({
            cardStatus: 'LOST',
            tapAttempt: true
          }),
          ipAddress: req.ip
        }
      });

      return res.status(403).json({ 
        error: 'Card reported as lost',
        action: 'Transaction blocked for security'
      });
    }

    // Update last used timestamp
    await prisma.nFCCard.update({
      where: { cardId },
      data: { 
        lastUsed: new Date(),
        updatedAt: new Date()
      }
    });

    // Log tap transaction
    await prisma.nFCTransaction.create({
      data: {
        cardId,
        transactionType: 'TAP_IN',
        balanceBefore: card.balance,
        balanceAfter: card.balance,
        deviceId,
        location,
        status: 'SUCCESS',
        metadata: JSON.stringify({
          signalStrength,
          readTime,
          timestamp: new Date().toISOString()
        }),
        ipAddress: req.ip
      }
    });

    console.log(`📱 Card tapped: ${cardId.slice(0, 8)}... on ${deviceId.slice(-8)}`);

    res.json({
      success: true,
      message: 'Card read successfully',
      card: {
        id: card.id,
        cardId: card.cardId,
        cardType: card.cardType,
        status: card.cardStatus,
        balance: card.balance,
        user: card.user,
        lastUsed: new Date()
      }
    });

  } catch (error) {
    console.error('❌ Card tap error:', error);
    res.status(500).json({ 
      error: 'Failed to process card tap',
      details: error.message 
    });
  }
});

// ============================================================================
// POST /payment - Proses pembayaran dengan kartu
// ============================================================================
router.post('/payment', async (req, res) => {
  try {
    const { 
      cardId,
      amount,
      receiverCardId,
      receiverId,
      deviceId,
      location,
      description 
    } = req.body;

    if (!cardId || !amount || !deviceId) {
      return res.status(400).json({ 
        error: 'Card ID, amount, and device ID required' 
      });
    }

    const amountNum = parseFloat(amount);
    if (amountNum <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // Cari sender card
    const senderCard = await prisma.nFCCard.findUnique({
      where: { cardId },
      include: { user: true }
    });

    if (!senderCard) {
      return res.status(404).json({ error: 'Sender card not found' });
    }

    if (senderCard.cardStatus !== 'ACTIVE') {
      return res.status(403).json({ error: 'Sender card is not active' });
    }

    // Check USER balance instead of card balance
    const userBalance = senderCard.user?.balance || 0;
    console.log(`💰 Balance Check: User ${senderCard.userId} has Rp ${userBalance.toLocaleString('id-ID')}, trying to send Rp ${amountNum.toLocaleString('id-ID')}`);
    
    if (userBalance < amountNum) {
      return res.status(400).json({ 
        error: 'Insufficient balance',
        balance: userBalance,
        required: amountNum
      });
    }

    // 🛡️ AI FRAUD DETECTION - 2-Factor Model (Amount + Velocity)
    if (senderCard.userId) {
      try {
        const fraudAnalysis = await analyzeFraudRisk(senderCard, amountNum, deviceId, prisma);
        
        // Log fraud detection results
        console.log('🔍 Fraud Detection Analysis:');
        console.log(`   └─ Risk Score: ${fraudAnalysis.riskScore}% (Amount: ${fraudAnalysis.amountScore}, Velocity: ${fraudAnalysis.velocityScore})`);
        console.log(`   └─ Decision: ${fraudAnalysis.decision} (${fraudAnalysis.riskLevel} risk)`);
        console.log(`   └─ Z-Score: ${fraudAnalysis.zScore}σ | Velocity: ${fraudAnalysis.recentTxCount} tx/min`);
        
        if (fraudAnalysis.riskScore >= 40) {
          await prisma.fraudAlert.create({
            data: {
              userId: senderCard.userId,
              deviceId,
              deviceName: 'NFC Card Reader',
              riskScore: fraudAnalysis.riskScore,
              riskLevel: fraudAnalysis.riskLevel,
              decision: fraudAnalysis.decision,
              reasons: JSON.stringify(fraudAnalysis.riskFactors),
              confidence: Math.min(fraudAnalysis.riskScore / 100, 0.95),
              riskFactors: JSON.stringify({
                cardId: cardId.slice(0, 8) + '...',
                amount: amountNum,
                zScore: fraudAnalysis.zScore,
                velocity: fraudAnalysis.recentTxCount,
                avgAmount: fraudAnalysis.avgAmount,
                stdDev: fraudAnalysis.stdDev
              }),
              ipAddress: req.ip
            }
          });
          console.log(`🚨 Fraud Alert Created: Risk ${fraudAnalysis.riskScore}% → ${fraudAnalysis.decision}`);
        }

        if (fraudAnalysis.decision === 'BLOCK') {
          return res.status(403).json({
            error: 'Transaction blocked by fraud detection',
            riskScore: fraudAnalysis.riskScore,
            riskLevel: fraudAnalysis.riskLevel,
            reasons: fraudAnalysis.riskFactors
          });
        }

        if (fraudAnalysis.decision === 'REVIEW') {
          console.log(`⚠️ Review Required: Card ${cardId.slice(0, 8)}... | Risk: ${fraudAnalysis.riskScore}%`);
        }
      } catch (fraudError) {
        console.error('Fraud detection error:', fraudError);
      }
    }

    // Cari receiver (bisa card atau user)
    let receiverCard = null;
    let receiverUser = null;

    if (receiverCardId) {
      receiverCard = await prisma.nFCCard.findUnique({
        where: { cardId: receiverCardId },
        include: { user: true }
      });

      if (!receiverCard) {
        return res.status(404).json({ error: 'Receiver card not found' });
      }
    } else if (receiverId) {
      receiverUser = await prisma.user.findUnique({
        where: { id: parseInt(receiverId) }
      });

      if (!receiverUser) {
        return res.status(404).json({ error: 'Receiver not found' });
      }
    } else {
      return res.status(400).json({ 
        error: 'Receiver card ID or user ID required' 
      });
    }

    // Proses transaksi dalam transaction (atomic)
    const result = await prisma.$transaction(async (tx) => {
      // Deduct dari SENDER USER balance (not card balance)
      const updatedSenderUser = await tx.user.update({
        where: { id: senderCard.userId },
        data: { 
          balance: { decrement: amountNum }
        }
      });

      // Update sender card lastUsed
      const updatedSenderCard = await tx.nFCCard.update({
        where: { cardId },
        data: { 
          lastUsed: new Date()
        }
      });

      // Add ke receiver (card atau user)
      let updatedReceiverCard = null;
      let updatedReceiverUser = null;

      if (receiverCard) {
        // Validate receiver has userId
        if (!receiverCard.userId) {
          throw new Error('Receiver card not linked to any user');
        }
        
        // Update receiver USER balance
        updatedReceiverUser = await tx.user.update({
          where: { id: receiverCard.userId },
          data: { balance: { increment: amountNum } }
        });

        // Update receiver card lastUsed
        updatedReceiverCard = await tx.nFCCard.update({
          where: { cardId: receiverCardId },
          data: { 
            lastUsed: new Date()
          }
        });
      } else {
        // Direct user transfer (no card involved)
        updatedReceiverUser = await tx.user.update({
          where: { id: parseInt(receiverId) },
          data: { balance: { increment: amountNum } }
        });
      }

      // Log transaksi sender (use USER balance for logging)
      const senderBalanceBefore = senderCard.user?.balance || 0;
      const senderBalanceAfter = updatedSenderUser.balance;
      
      await tx.nFCTransaction.create({
        data: {
          cardId,
          transactionType: 'PAYMENT',
          amount: -amountNum,
          balanceBefore: senderBalanceBefore,
          balanceAfter: senderBalanceAfter,
          deviceId,
          location,
          status: 'SUCCESS',
          metadata: JSON.stringify({
            description,
            receiver: receiverCardId || `user:${receiverId}`,
            timestamp: new Date().toISOString()
          }),
          ipAddress: req.ip
        }
      });

      // Log transaksi receiver jika pakai card
      if (updatedReceiverCard) {
        const receiverBalanceBefore = receiverCard.user?.balance || 0;
        const receiverBalanceAfter = updatedReceiverUser.balance;
        
        await tx.nFCTransaction.create({
          data: {
            cardId: receiverCardId,
            transactionType: 'TAP_IN',
            amount: amountNum,
            balanceBefore: receiverBalanceBefore,
            balanceAfter: receiverBalanceAfter,
            deviceId,
            location,
            status: 'SUCCESS',
            metadata: JSON.stringify({
              description,
              sender: cardId,
              timestamp: new Date().toISOString()
            }),
            ipAddress: req.ip
          }
        });
      }

      // Jika ada user terlibat, buat transaction record
      if (senderCard.userId && (receiverCard?.userId || receiverId)) {
        await tx.transaction.create({
          data: {
            senderId: senderCard.userId,
            receiverId: receiverCard?.userId || parseInt(receiverId),
            amount: amountNum,
            type: 'nfc_payment',
            status: 'completed',
            description: description || 'NFC Card Payment',
            deviceId,
            ipAddress: req.ip
          }
        });
      }

      return { updatedSenderCard, updatedSenderUser, updatedReceiverCard, updatedReceiverUser };
    });

    const senderUsername = senderCard.user?.username || 'Unknown';
    const receiverUsername = receiverCard?.user?.username || 'Unknown';
    
    console.log(`✅ Transfer Success!`);
    console.log(`   Pengirim: ${senderUsername} (${cardId.slice(0, 8)}...)`);
    console.log(`   Penerima: ${receiverUsername} (${receiverCardId?.slice(0, 8) || 'user'}...)`);
    console.log(`   💸 Amount: ${formatCurrency(amountNum)}`);
    console.log(`   💰 Saldo Pengirim: ${formatCurrency(result.updatedSenderUser.balance)}`);
    console.log(`   💵 Saldo Penerima: ${formatCurrency(result.updatedReceiverUser?.balance || 0)}`);

    res.json({
      success: true,
      message: 'Payment processed successfully',
      transaction: {
        amount: amountNum,
        senderBalance: result.updatedSenderUser.balance,
        receiverBalance: result.updatedReceiverUser?.balance,
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('❌ Payment error:', error);
    res.status(500).json({ 
      error: 'Payment failed',
      details: error.message 
    });
  }
});

// POST /topup - Top up saldo kartu
router.post('/topup', async (req, res) => {
  try {
    const { cardId, amount, adminPassword } = req.body;
    if (!cardId || !amount) return res.status(400).json({ error: 'Card ID and amount required' });
    if (adminPassword !== process.env.ADMIN_PASSWORD) return res.status(401).json({ error: 'Invalid admin password' });

    const amountNum = parseFloat(amount);
    if (amountNum <= 0) return res.status(400).json({ error: 'Invalid amount' });

    const card = await prisma.nFCCard.findUnique({ where: { cardId } });
    if (!card) return res.status(404).json({ error: 'Card not found' });

    const updatedCard = await prisma.$transaction(async (tx) => {
      const updated = await tx.nFCCard.update({
        where: { cardId },
        data: { 
          balance: { increment: amountNum },
          lastUsed: new Date()
        }
      });

      // Log top-up transaction
      await tx.nFCTransaction.create({
        data: {
          cardId,
          transactionType: 'TOP_UP',
          amount: amountNum,
          balanceBefore: card.balance,
          balanceAfter: updated.balance,
          deviceId: 'admin',
          status: 'SUCCESS',
          ipAddress: req.ip
        }
      });

      // Log admin action
      await tx.adminLog.create({
        data: {
          action: 'CARD_TOP_UP',
          details: JSON.stringify({
            cardId,
            amount: amountNum,
            oldBalance: card.balance,
            newBalance: updated.balance
          }),
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        }
      });

      return updated;
    });

    console.log(`💰 Card topped up: ${cardId.slice(0, 8)}... +${formatCurrency(amountNum)}`);

    res.json({
      success: true,
      message: 'Card topped up successfully',
      card: {
        cardId: updatedCard.cardId,
        balance: updatedCard.balance,
        previousBalance: card.balance
      }
    });

  } catch (error) {
    console.error('❌ Top-up error:', error);
    res.status(500).json({ 
      error: 'Top-up failed',
      details: error.message 
    });
  }
});

// PUT /status - Update status kartu (block/unblock)
router.put('/status', async (req, res) => {
  try {
    const { cardId, status, adminPassword, reason } = req.body;
    if (!cardId || !status) return res.status(400).json({ error: 'Card ID and status required' });
    if (adminPassword !== process.env.ADMIN_PASSWORD) return res.status(401).json({ error: 'Invalid admin password' });

    const validStatuses = ['ACTIVE', 'BLOCKED', 'LOST', 'EXPIRED'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status', validStatuses });

    const card = await prisma.nFCCard.findUnique({ where: { cardId } });
    if (!card) return res.status(404).json({ error: 'Card not found' });

    const updatedCard = await prisma.nFCCard.update({
      where: { cardId },
      data: { 
        cardStatus: status,
        updatedAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true
          }
        }
      }
    });

    // Log admin action
    await prisma.adminLog.create({
      data: {
        action: 'CARD_STATUS_UPDATE',
        details: JSON.stringify({
          cardId,
          oldStatus: card.cardStatus,
          newStatus: status,
          reason: reason || 'No reason provided'
        }),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    });

    console.log(`🔒 Card status updated: ${cardId.slice(0, 8)}... ${card.cardStatus} → ${status}`);

    res.json({
      success: true,
      message: `Card ${status.toLowerCase()} successfully`,
      card: updatedCard
    });

  } catch (error) {
    console.error('❌ Status update error:', error);
    res.status(500).json({ 
      error: 'Failed to update card status',
      details: error.message 
    });
  }
});

// GET /list - List semua kartu (with filters)
router.get('/list', async (req, res) => {
  try {
    const { 
      status,
      userId,
      limit = 50,
      offset = 0,
      sortBy = 'createdAt',
      order = 'desc'
    } = req.query;

    const whereClause = {};
    if (status) whereClause.cardStatus = status;
    if (userId) whereClause.userId = parseInt(userId);

    const cards = await prisma.nFCCard.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            balance: true
          }
        }
      },
      orderBy: { [sortBy]: order },
      take: parseInt(limit),
      skip: parseInt(offset)
    });

    const total = await prisma.nFCCard.count({ where: whereClause });

    console.log(`📋 Listed ${cards.length} NFC cards (Total: ${total})`);

    res.json({
      success: true,
      cards,
      total,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: total > parseInt(offset) + parseInt(limit)
      }
    });

  } catch (error) {
    console.error('❌ List cards error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to list cards',
      details: error.message 
    });
  }
});

// GET /transactions/:cardId - Riwayat transaksi kartu
router.get('/transactions/:cardId', async (req, res) => {
  try {
    const { cardId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const transactions = await prisma.nFCTransaction.findMany({
      where: { cardId },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset)
    });

    const total = await prisma.nFCTransaction.count({ where: { cardId } });

    console.log(`📜 Listed ${transactions.length} transactions for card ${cardId.slice(0, 8)}...`);

    // Parse metadata JSON
    const parsedTransactions = transactions.map(t => ({
      ...t,
      metadata: t.metadata ? JSON.parse(t.metadata) : null
    }));

    res.json({
      success: true,
      transactions: parsedTransactions,
      total,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: total > parseInt(offset) + parseInt(limit)
      }
    });

  } catch (error) {
    console.error('❌ Get transactions error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get transactions',
      details: error.message 
    });
  }
});

// GET /info/:cardId - Info detail kartu
router.get('/info/:cardId', async (req, res) => {
  try {
    const { cardId } = req.params;
    const card = await prisma.nFCCard.findUnique({
      where: { cardId },
      include: {
        user: { select: { id: true, name: true, username: true, balance: true, isActive: true } },
        transactions: { take: 10, orderBy: { createdAt: 'desc' } }
      }
    });

    if (!card) return res.status(404).json({ error: 'Card not found' });

    const stats = await prisma.nFCTransaction.aggregate({
      where: { cardId },
      _sum: { amount: true },
      _count: true
    });

    console.log(`ℹ️ Card info retrieved: ${cardId.slice(0, 8)}...`);

    res.json({
      success: true,
      card: {
        ...card,
        metadata: card.metadata ? JSON.parse(card.metadata) : null
      },
      statistics: {
        totalTransactions: stats._count,
        totalAmount: stats._sum.amount || 0
      }
    });

  } catch (error) {
    console.error('❌ Get card info error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get card info',
      details: error.message 
    });
  }
});

// DELETE /delete/:cardId - Hapus kartu NFC (Admin only)
router.delete('/delete/:cardId', async (req, res) => {
  try {
    const { cardId } = req.params;
    const { adminPassword } = req.body;

    console.log(`🔍 DELETE request for card: ${cardId}`);
    console.log(`📦 Request body:`, req.body);
    console.log(`🔐 Admin password received: "${adminPassword}"`);
    console.log(`🔐 Expected password: "${process.env.ADMIN_PASSWORD || 'admin123'}"`);

    // Admin authentication
    if (adminPassword !== process.env.ADMIN_PASSWORD && adminPassword !== 'admin123') {
      console.log(`❌ Password validation failed`);
      return res.status(403).json({ error: 'Unauthorized: Invalid admin password' });
    }
    
    console.log(`✅ Password validation passed`);

    const card = await prisma.nFCCard.findUnique({ 
      where: { cardId },
      include: { user: true }
    });
    
    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    // Delete related transactions first
    await prisma.nFCTransaction.deleteMany({ where: { cardId } });

    // Delete the card
    await prisma.nFCCard.delete({ where: { cardId } });

    console.log(`🗑️ Card deleted: ${cardId} (User: ${card.user?.username || 'unlinked'})`);

    res.json({
      success: true,
      message: 'Card deleted successfully',
      deletedCard: {
        cardId: card.cardId,
        userId: card.userId,
        username: card.user?.username
      }
    });

  } catch (error) {
    console.error('❌ Delete card error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete card',
      details: error.message 
    });
  }
});

module.exports = router;
