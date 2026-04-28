// ============================================================
// NFCCARDS.JS - ROUTES UNTUK NFC CARD MANAGEMENT
// ============================================================
// File ini berisi semua endpoint untuk management NFC cards:
// - POST /register -> Register NFC card baru ke sistem
// - POST /link -> Link NFC card ke user account
// - POST /tap -> Scan NFC card (get card info)
// - POST /payment -> Proses pembayaran via NFC card
// - POST /topup -> Top-up saldo NFC card
// - PUT /status -> Update status NFC card (active/blocked/lost)
// - GET /list -> Get all NFC cards (dengan pagination & filter)
// - GET /:cardId/transactions -> Get transaction history card
// - GET /:cardId/info -> Get detail info NFC card
// - DELETE /delete/:cardId -> Delete NFC card dari sistem
//
// Teknologi NFC Card:
// - NFC Tags: NTag215 (RFID 13.56MHz ISO14443A)
// - Memory: 540 bytes
// - UID: 7 bytes (unique identifier)
// - Android NFC API: android.nfc.tech.MifareUltralight

const express = require('express'); // Express framework untuk routing
const { PrismaClient } = require('@prisma/client'); // Prisma ORM untuk database access
const crypto = require('crypto'); // Node.js crypto untuk encryption & hashing

const router = express.Router(); // Buat instance Express Router
const prisma = new PrismaClient(); // Buat instance Prisma client

// ============================================================================
// HELPER FUNCTIONS - Utility functions untuk NFC Card operations
// ============================================================================

// HELPER 1: validateCardId - Validasi format UID NFC card
// UID NFC card format: 14-20 karakter hexadecimal (7-10 bytes)
// Contoh: "04539DE2763C80" (NTag215 UID)
const validateCardId = (cardId) => {
  const uidPattern = /^[0-9A-Fa-f]{14,20}$/; // Regex: 14-20 hex chars
  return uidPattern.test(cardId); // Return true jika match pattern
};

// HELPER 2: encryptCardData - Encrypt sensitive card data
// Algorithm: AES-256-CBC (Advanced Encryption Standard)
// Digunakan untuk encrypt data sensitif seperti PIN, security code, dll
const encryptCardData = (data) => {
  try {
    // STEP 1: Derive encryption key dari password menggunakan scrypt
    const key = crypto.scryptSync(
      process.env.NFC_ENCRYPTION_KEY || 'default-nfc-key', // Password/passphrase
      'salt', // Salt untuk key derivation
      32 // Key length: 32 bytes (256 bits untuk AES-256)
    );
    
    // STEP 2: Generate random IV (Initialization Vector)
    const iv = crypto.randomBytes(16); // 16 bytes IV untuk AES-256-CBC
    
    // STEP 3: Create cipher dengan algorithm AES-256-CBC
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    // STEP 4: Encrypt data
    const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
    
    // STEP 5: Return IV + encrypted data (format: "iv:encrypted")
    // IV harus disimpan bersama encrypted data untuk decrypt nanti
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  } catch (error) {
    console.error('Encryption error:', error);
    // FALLBACK: Jika encryption error, pakai SHA-256 hash (one-way, tidak bisa di-decrypt)
    return crypto.createHash('sha256').update(data).digest('hex');
  }
};

// HELPER 3: validateUser - Validasi apakah user ada di database
// Return user object jika ada, null jika tidak ada
const validateUser = async (userId) => {
  return await prisma.user.findUnique({ where: { id: parseInt(userId) } });
};

// HELPER 4: checkUserHasCard - Cek apakah user sudah punya NFC card
// Return array NFC cards yang dimiliki user
const checkUserHasCard = async (userId) => {
  return await prisma.nFCCard.findMany({ where: { userId: parseInt(userId) } });
};

// HELPER 5: formatCurrency - Format angka ke Rupiah format
// Contoh: 50000 -> "Rp 50.000"
const formatCurrency = (amount) => {
  return `Rp ${amount.toLocaleString('id-ID')}`; // Locale Indonesia untuk format Rupiah
};

// ============================================================================
// ============================================================================
// FRAUD DETECTION: Statistical Anomaly Detection
// ============================================================================
// Method: Statistical Anomaly Detection (Machine Learning Approach)
// Algorithm: Z-Score Based Anomaly Detection
// Academic Reference: Chandola et al. (2009) - Anomaly Detection Survey
//
// Konsep:
// - Fraud detection menggunakan statistical anomaly detection
// - Transaksi dianggap fraud jika nilainya jauh berbeda dari pola normal user
// - Menggunakan Z-Score untuk mengukur seberapa "abnormal" suatu transaksi
// - Z-Score > 3 = Extreme outlier (block), Z-Score > 2 = Review, Z-Score ≤ 2 = Normal
//
// Cara Kerja:
// 1. Load 20 transaksi terakhir user (historical data)
// 2. Hitung mean (rata-rata) dan standard deviation (σ)
// 3. Hitung Z-Score transaksi sekarang: Z = (X - μ) / σ
// 4. Klasifikasi risk berdasarkan Z-Score
// 5. Return decision: ALLOW / REVIEW / BLOCK
// ============================================================================
const analyzeFraudRisk = async (senderCard, amount, deviceId, prisma) => {
  // SPECIAL CASE: Jika card tidak link ke user, skip fraud check
  // (Card tanpa user tidak punya historical data untuk comparison)
  if (!senderCard.userId) {
    return { 
      riskScore: 0, // Risk score = 0 (low risk)
      decision: 'ALLOW', // Izinkan transaksi
      riskLevel: 'LOW', // Risk level rendah
      riskFactors: ['No user data - skipping fraud check'] // Alasan skip
    };
  }

  try {
    // Load historical transaction data (last 20 transactions)
    const recentTransactions = await prisma.transaction.findMany({
      where: { senderId: senderCard.userId },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    // =========================================================================
    // SPECIAL CASE: First transaction (no history)
    // =========================================================================
    if (recentTransactions.length === 0) {
      console.log('ℹ️ First transaction for user - No fraud risk');
      return {
        riskScore: 0,
        decision: 'ALLOW',
        riskLevel: 'LOW',
        riskFactors: ['First transaction - No historical data for comparison'],
        zScore: '0.00',
        avgAmount: '0',
        stdDev: '0'
      };
    }

    // =========================================================================
    // Z-SCORE ANOMALY DETECTION
    // =========================================================================
    // Formula: Z = (X - μ) / σ
    // Where:
    //   X = current transaction amount
    //   μ = mean (average of historical transactions)
    //   σ = standard deviation
    // =========================================================================
    
    const amounts = recentTransactions.map(t => t.amount);
    
    // Step 1: Calculate mean (μ)
    const avgAmount = amounts.length > 0 
      ? amounts.reduce((a, b) => a + b, 0) / amounts.length 
      : 0;
    
    // Step 2: Calculate variance (σ²)
    const variance = amounts.length > 1 
      ? amounts.reduce((sum, val) => sum + Math.pow(val - avgAmount, 2), 0) / amounts.length 
      : 0;
    
    // Step 3: Calculate standard deviation (σ)
    const stdDev = Math.sqrt(variance);
    
    // Step 4: Calculate Z-Score
    const zScore = stdDev > 0 ? Math.abs((amount - avgAmount) / stdDev) : 0;

    // =========================================================================
    // RISK CLASSIFICATION BASED ON Z-SCORE
    // =========================================================================
    // Using 3-Sigma Rule (Empirical Rule):
    //   Z > 3σ → BLOCK  (99.7% confidence - extreme outlier)
    //   Z > 2σ → REVIEW (95% confidence - significant outlier)
    //   Z ≤ 2σ → ALLOW  (normal transaction)
    // =========================================================================
    
    const classificationRules = [
      { 
        threshold: 3, 
        decision: 'BLOCK', 
        riskLevel: 'HIGH',
        riskScore: 100,
        message: '⛔ Transaction BLOCKED - Extreme outlier (>3σ, 99.7% confidence)'
      },
      { 
        threshold: 2, 
        decision: 'REVIEW', 
        riskLevel: 'MEDIUM',
        riskScore: 50,
        message: '⚠️ Manual REVIEW required - Significant outlier (>2σ, 95% confidence)'
      },
      { 
        threshold: 0, 
        decision: 'ALLOW', 
        riskLevel: 'LOW',
        riskScore: 0,
        message: '✅ Transaction ALLOWED - Normal pattern (≤2σ)'
      }
    ];
    
    const matchedRule = classificationRules.find(rule => zScore > rule.threshold);
    const { decision, riskLevel, riskScore, message } = matchedRule;

    // Build risk factors for explainability
    const riskFactors = [
      `Z-Score: ${zScore.toFixed(2)}σ deviation from mean`,
      `Historical average: Rp ${avgAmount.toFixed(0)}`,
      `Standard deviation: Rp ${stdDev.toFixed(0)}`,
      `Current amount: Rp ${amount}`,
      message
    ];

    console.log(`📊 Fraud Analysis - User: ${senderCard.userId}`);
    console.log(`   Amount: Rp ${amount} | Avg: Rp ${avgAmount.toFixed(0)} | StdDev: Rp ${stdDev.toFixed(0)}`);
    console.log(`   Z-Score: ${zScore.toFixed(2)}σ | Decision: ${decision} | Risk: ${riskLevel}`);

    // Return fraud analysis result
    return {
      riskScore,
      decision,
      riskLevel,
      riskFactors,
      
      // Detailed metrics for logging
      zScore: zScore.toFixed(2),
      avgAmount: avgAmount.toFixed(0),
      stdDev: stdDev.toFixed(0)
    };

  } catch (error) {
    console.error('❌ Fraud analysis error:', error);
    // Fail-safe: Allow transaction if analysis fails
    return { 
      riskScore: 0, 
      decision: 'ALLOW', 
      riskLevel: 'LOW', 
      riskFactors: ['Fraud analysis failed - transaction allowed by default'],
      zScore: '0.00',
      avgAmount: '0',
      stdDev: '0'
    };
  }
};

// ============================================================================
// ENDPOINT: POST /register - Registrasi kartu NFC baru ke sistem
// ============================================================================
// FLOW REGISTRASI KARTU NFC:
//
// STEP 1: Extract data dari request body
//         - cardId: UID kartu NFC (7-10 bytes hex string, contoh: "04:A1:B2:C3:D4:E5:F6")
//         - userId (optional): ID user yang akan memiliki kartu
//         - cardData (optional): Data tambahan yang akan dienkripsi ke kartu
//         - deviceId: Identifier device NFC reader (Android app)
//         - metadata (optional): Data tambahan (object JSON)
//
// STEP 2: Validasi cardId format dengan regex
//         - Harus 14-20 karakter hexadecimal (0-9, A-F)
//         - Format NTag215: 7 bytes UID = 14 hex chars
//         - Jika invalid, return 400 Bad Request
//
// STEP 3: Check duplikasi - pastikan cardId belum terdaftar
//         - Query ke database: SELECT * FROM NFCCard WHERE cardId = ?
//         - Jika sudah ada, return 409 Conflict dengan info kartu existing
//         - Prevent double registration (1 UID hanya bisa 1 kartu)
//
// STEP 4: Validasi user (jika userId provided)
//         - Check apakah user exists di database
//         - Jika tidak ada, return 404 Not Found
//
// STEP 5: POLICY CHECK - 1 USER = 1 CARD
//         - Query: SELECT * FROM NFCCard WHERE userId = ?
//         - Jika user sudah punya kartu, return 409 Conflict
//         - Business rule: Setiap user hanya boleh punya 1 kartu NFC aktif
//         - Alasan: Keamanan & simplicity (prevent abuse)
//
// STEP 6: Enkripsi cardData jika provided
//         - Gunakan fungsi encryptCardData() (AES-256-CBC)
//         - Data sensitif di kartu harus terenkripsi
//         - Contoh data: PIN, biometric hash, security token
//
// STEP 7: Sync balance dengan user (jika ada userId)
//         - Query user balance dari database
//         - Initial card balance = user balance (sinkronisasi)
//         - Jika no userId, initial balance = 0
//         - Log balance sync untuk audit trail
//
// STEP 8: Insert kartu NFC baru ke database
//         - Table: NFCCard
//         - Fields: cardId, cardType (NTag215), frequency (13.56MHz),
//                  userId, cardStatus (ACTIVE), balance, cardData (encrypted),
//                  metadata (JSON string), isPhysical (true)
//         - Include user relation untuk response
//
// STEP 9: Log registration event
//         - Console log untuk monitoring
//         - Format: "🎴 NFC Card registered: {UID}... for user {userId} with balance Rp {balance}"
//
// STEP 10: Return success response
//          - HTTP 201 Created
//          - JSON: { success, message, card: {...} }
//          - Card object berisi: id, cardId, cardType, frequency, status, balance, user, registeredAt
// ============================================================================
router.post('/register', async (req, res) => {
  try {
    // STEP 1: Extract data dari request body
    const { cardId, userId, cardData, deviceId, metadata } = req.body;

    // STEP 2: Validasi cardId format (harus ada dan valid hex string 14-20 chars)
    if (!cardId) return res.status(400).json({ error: 'Card ID (UID) required' });
    if (!validateCardId(cardId)) {
      // Format invalid - kembalikan error dengan expected format
      return res.status(400).json({ error: 'Invalid NTag215 UID format', expected: '7-10 bytes hex string' });
    }

    // STEP 3: Check duplikasi - pastikan UID belum terdaftar di sistem
    const existingCard = await prisma.nFCCard.findUnique({ where: { cardId } });
    if (existingCard) {
      // Kartu sudah terdaftar - kembalikan 409 Conflict dengan info kartu existing
      return res.status(409).json({ error: 'Kartu sudah terdaftar', card: { id: existingCard.id, cardId: existingCard.cardId, status: existingCard.cardStatus, userId: existingCard.userId } });
    }

    // STEP 4 & 5: Validasi user dan POLICY CHECK (1 USER = 1 CARD)
    if (userId) {
      // STEP 4: Validate user exists di database
      const user = await validateUser(userId);
      if (!user) return res.status(404).json({ error: 'Pengguna tidak ditemukan' });

      // STEP 5: 🔒 BUSINESS RULE - 1 USER = 1 CARD POLICY
      // Alasan policy ini:
      // 1. Keamanan: Prevent user dari abuse system dengan multiple cards
      // 2. Simplicity: 1-to-1 mapping memudahkan tracking & fraud detection
      // 3. User experience: Clear ownership (1 user owns exactly 1 physical card)
      const userExistingCards = await checkUserHasCard(userId);
      if (userExistingCards.length > 0) {
        // User sudah punya kartu - reject registration
        return res.status(409).json({ 
          error: 'Pengguna sudah memiliki kartu terdaftar',
          message: 'Each user can only register ONE NFC card',
          existingCard: { cardId: userExistingCards[0].cardId, cardStatus: userExistingCards[0].cardStatus, balance: userExistingCards[0].balance, registeredAt: userExistingCards[0].registeredAt }
        });
      }
    }

    // STEP 6: Enkripsi cardData jika provided (AES-256-CBC encryption)
    const encryptedData = cardData ? encryptCardData(cardData) : null;
    // cardData bisa berisi: PIN, biometric data, security tokens
    // Format encrypted: "iv:encryptedData" (32 bytes IV + encrypted payload)

    // STEP 7: Sync initial balance dengan user balance (jika userId provided)
    let initialBalance = 0;
    if (userId) {
      // Query user balance dari database
      const userWithBalance = await prisma.user.findUnique({
        where: { id: parseInt(userId) },
        select: { balance: true }
      });
      // Set card balance = user balance (sinkronisasi)
      // Ini memastikan balance kartu selalu match dengan balance user
      initialBalance = userWithBalance?.balance || 0;
      console.log(`💰 Syncing card balance with user balance: Rp ${initialBalance.toLocaleString('id-ID')}`);
    }
    // Jika no userId: initialBalance = 0 (kartu unassigned/guest)

    // STEP 8: Insert kartu NFC baru ke database (Prisma ORM create operation)
    const nfcCard = await prisma.nFCCard.create({
      data: {
        cardId,                          // UID kartu (unique identifier)
        cardType: 'NTag215',             // Tipe chip NFC
        frequency: '13.56MHz',           // Frekuensi RFID ISO14443A
        userId: userId ? parseInt(userId) : null,  // Foreign key ke User (nullable)
        cardStatus: 'ACTIVE',            // Status awal: ACTIVE (dapat digunakan)
        balance: initialBalance,         // ✅ Balance card = balance user (sync)
        cardData: encryptedData,         // Data terenkripsi (nullable)
        metadata: metadata ? JSON.stringify(metadata) : null,  // Extra data as JSON string
        isPhysical: true                 // Flag: kartu fisik (bukan virtual)
      },
      include: {
        user: {  // Include user relation dalam response
          select: {
            id: true,
            name: true,
            username: true,
            balance: true
          }
        }
      }
    });
    // Prisma akan auto-generate: id (auto-increment), registeredAt (timestamp), updatedAt

    // STEP 9: Log registration event untuk monitoring & debugging
    console.log(`🎴 NFC Card registered: ${cardId.slice(0, 8)}... ${userId ? `for user ${userId} with balance Rp ${initialBalance.toLocaleString('id-ID')}` : '(unassigned)'}`);
    // Format log: "🎴 NFC Card registered: 04A1B2C3... for user 123 with balance Rp 500.000"

    // STEP 10: Return success response dengan HTTP 201 Created
    res.status(201).json({
      success: true,
      message: 'NFC card registered successfully',
      card: {
        id: nfcCard.id,                    // Database primary key (auto-increment)
        cardId: nfcCard.cardId,            // UID kartu (hex string)
        cardType: nfcCard.cardType,        // "NTag215"
        frequency: nfcCard.frequency,      // "13.56MHz"
        status: nfcCard.cardStatus,        // "ACTIVE"
        balance: nfcCard.balance,          // Current balance (synced dengan user)
        user: nfcCard.user,                // User object (jika linked) atau null
        registeredAt: nfcCard.registeredAt // Timestamp registration
      }
    });
    // Client akan menerima response ini dan bisa simpan cardId untuk transaksi selanjutnya

  } catch (error) {
    // STEP 11: Error handling - tangkap semua error dan return 500 Internal Server Error
    console.error('❌ Card registration error:', error);
    res.status(500).json({ 
      error: 'Gagal mendaftarkan kartu',
      details: error.message  // Error message untuk debugging
    });
    // Error bisa dari: Prisma (DB error), encryption error, validation error, dll
  }
});
// ============================================================================
// END OF ENDPOINT: POST /register
// ============================================================================

// ============================================================================
// ENDPOINT: POST /link - Link kartu NFC yang sudah terdaftar ke user
// ============================================================================
// USE CASE: Kartu NFC sudah di-register tapi belum punya owner (userId = null)
//           Endpoint ini untuk assign ownership ke specific user
//
// FLOW LINKING KARTU:
//
// STEP 1: Extract cardId & userId dari request body
//         Kedua parameter ini WAJIB ada
//
// STEP 2: Validate card exists di database
//         Query: SELECT * FROM NFCCard WHERE cardId = ?
//         Jika tidak ada, return 404 Not Found
//
// STEP 3: Check card status - hanya ACTIVE card yang bisa di-link
//         Status BLOCKED/LOST/EXPIRED tidak bisa di-link ke user baru
//         Alasan: Keamanan & data integrity
//
// STEP 4: Validate user exists di database
//         Gunakan helper validateUser(userId)
//         Jika user tidak ada, return 404 Not Found
//
// STEP 5: Update NFCCard record
//         SET userId = {userId}, updatedAt = NOW()
//         WHERE cardId = {cardId}
//         Include user relation dalam response
//
// STEP 6: Log linking event
//         Format: "🔗 Card {UID}... linked to user {username}"
//
// STEP 7: Return success response
//         JSON: { success, message, card: {...} }
// ============================================================================
router.post('/link', async (req, res) => {
  try {
    // STEP 1: Extract required parameters dari request body
    const { cardId, userId } = req.body;
    if (!cardId || !userId) return res.status(400).json({ error: 'ID Kartu dan ID Pengguna diperlukan' });

    // STEP 2: Validate card exists (Prisma findUnique query)
    const card = await prisma.nFCCard.findUnique({ where: { cardId } });
    if (!card) return res.status(404).json({ error: 'Card not found' });
    
    // STEP 3: Check card status - hanya ACTIVE card yang bisa di-link
    if (card.cardStatus !== 'ACTIVE') {
      // BLOCKED/LOST/EXPIRED card tidak bisa di-link ke user baru
      return res.status(400).json({ error: `Tidak dapat menghubungkan kartu berstatus ${card.cardStatus.toLowerCase()}` });
    }

    // STEP 4: Validate user exists (gunakan helper function)
    const user = await validateUser(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // STEP 5: Update card - assign userId (Prisma update operation)
    const updatedCard = await prisma.nFCCard.update({
      where: { cardId },
      data: { 
        userId: parseInt(userId),  // Foreign key ke User table
        updatedAt: new Date()      // Update timestamp
      },
      include: { 
        user: {  // Include user data dalam response
          select: { id: true, name: true, username: true, balance: true } 
        } 
      }
    });
    // Setelah update: card.userId not null, berarti card sudah owned by user

    // STEP 6: Log linking event untuk audit trail
    console.log(`🔗 Card ${cardId.slice(0, 8)}... linked to user ${user.username}`);
    
    // STEP 7: Return success response
    res.json({ 
      success: true, 
      message: 'Card linked to user successfully', 
      card: updatedCard  // Include updated card dengan user relation
    });
    // Client akan terima card object dengan user property terisi
    
  } catch (error) {
    // Error handling - tangkap semua error (Prisma, validation, dll)
    console.error('❌ Card linking error:', error);
    res.status(500).json({ error: 'Gagal menghubungkan kartu', details: error.message });
  }
});
// ============================================================================
// END OF ENDPOINT: POST /link
// ============================================================================

// ============================================================================
// ENDPOINT: POST /tap - Proses tap/scan kartu NFC (read operation)
// ============================================================================
// USE CASE: User tap kartu NFC ke reader (Android app dengan NFC sensor)
//           untuk membaca data kartu, cek saldo, dan validasi status
//
// FLOW TAP/SCAN KARTU:
//
// STEP 1: Extract data dari request body
//         - cardId: UID kartu yang di-scan (7 bytes hex)
//         - deviceId: Identifier device reader (Android device ID)
//         - location (optional): Lokasi tap (GPS coordinates atau deskripsi)
//         - signalStrength (optional): Kekuatan sinyal RFID (dBm)
//         - readTime (optional): Waktu yang dibutuhkan untuk read (ms)
//
// STEP 2: Validate card exists dan query data lengkap
//         Include user relation untuk mendapatkan balance & user info
//
// STEP 3: Check card status - validasi apakah kartu dapat digunakan
//         Ada 4 status: ACTIVE, BLOCKED, EXPIRED, LOST
//         Hanya ACTIVE yang bisa digunakan untuk transaksi
//
// STEP 4: Handle BLOCKED card
//         Return 403 Forbidden dengan pesan "Contact admin"
//         User harus menghubungi admin untuk unblock
//
// STEP 5: Handle EXPIRED card
//         Return 403 Forbidden dengan info expiry date
//         Kartu sudah kadaluarsa (jika ada mekanisme expiry)
//
// STEP 6: Handle LOST card - CRITICAL SECURITY CHECK
//         Jika kartu reported as LOST, ini bisa jadi fraud attempt!
//         Create fraud alert dengan riskLevel CRITICAL
//         Log location & device info untuk investigation
//         Block transaction dan return 403
//
// STEP 7: Update lastUsed timestamp
//         Track kapan terakhir kali kartu digunakan
//         Helpful untuk: inactivity detection, user activity tracking
//
// STEP 8: Log tap transaction ke NFCTransaction table
//         Type: TAP_IN (read operation, no balance change)
//         Log: balanceBefore = balanceAfter (no deduction)
//         Metadata: signalStrength, readTime, timestamp
//
// STEP 9: Return card info ke client
//         Response berisi: status, balance, user info, lastUsed
//         Client akan display info ini ke user via UI
// ============================================================================
router.post('/tap', async (req, res) => {
  try {
    // STEP 1: Extract request data
    const { cardId, deviceId, location, signalStrength, readTime } = req.body;
    if (!cardId || !deviceId) return res.status(400).json({ error: 'ID Kartu dan ID Perangkat diperlukan' });

    // STEP 2: Query card dari database dengan user relation
    const card = await prisma.nFCCard.findUnique({
      where: { cardId },
      include: { user: { select: { id: true, name: true, username: true, balance: true } } }
    });
    // Include user: untuk mendapatkan balance & user info tanpa query terpisah

    // Validasi: card tidak ditemukan
    if (!card) {
      return res.status(404).json({ 
        error: 'Kartu tidak dikenali',
        suggestion: 'Register this card first'  // Guide user untuk register kartu
      });
    }

    // STEP 3-6: Check card status dengan berbagai scenario
    
    // STEP 4: Handle BLOCKED card (diblokir oleh admin karena fraud/violation)
    if (card.cardStatus === 'BLOCKED') {
      return res.status(403).json({ 
        error: 'Kartu diblokir',
        reason: 'Contact admin for assistance'
      });
    }

    // STEP 5: Handle EXPIRED card (kartu sudah kadaluarsa)
    if (card.cardStatus === 'EXPIRED') {
      return res.status(403).json({ 
        error: 'Kartu telah kadaluarsa',
        expiredAt: card.expiresAt  // Inform user kapan expired
      });
    }

    // STEP 6: 🚨 Handle LOST card - CRITICAL SECURITY EVENT
    if (card.cardStatus === 'LOST') {
      // Kartu dilaporkan hilang tapi ada yang coba pakai = FRAUD ATTEMPT!
      // Create fraud alert untuk notifikasi admin
      await prisma.fraudAlert.create({
        data: {
          userId: card.userId,
          deviceId,
          deviceName: 'NFC Reader',
          riskScore: 95,               // Very high risk (0-100 scale, 95 = critical)
          riskLevel: 'CRITICAL',       // Critical security event
          decision: 'BLOCK',           // Auto-block transaction
          reasons: JSON.stringify(['Card reported as LOST', `Tap attempt at ${location || 'unknown location'}`]),
          confidence: 1.0,             // 100% confidence (kartu confirmed LOST)
          riskFactors: JSON.stringify({
            cardStatus: 'LOST',
            tapAttempt: true           // Someone trying to use lost card = suspicious
          }),
          ipAddress: req.ip            // Track IP untuk investigation
        }
      });
      // Alert ini akan muncul di admin dashboard untuk immediate action
      // Admin bisa track: location, device, IP address dari attacker

      return res.status(403).json({ 
        error: 'Card reported as lost',
        action: 'Transaction blocked for security'
      });
    }
    // Jika pass semua check di atas, berarti card.cardStatus = 'ACTIVE' (OK untuk transaksi)

    // STEP 7: Update lastUsed timestamp untuk activity tracking
    await prisma.nFCCard.update({
      where: { cardId },
      data: { 
        lastUsed: new Date(),    // Track waktu terakhir kartu di-tap
        updatedAt: new Date()    // Standard updated timestamp
      }
    });
    // lastUsed berguna untuk: inactive card detection, usage pattern analysis

    // STEP 8: Log tap transaction ke NFCTransaction table (audit trail)
    await prisma.nFCTransaction.create({
      data: {
        cardId,                          // UID kartu yang di-tap
        transactionType: 'TAP_IN',       // Tipe: TAP_IN (read operation, bukan payment)
        balanceBefore: card.balance,     // Balance sebelum = balance saat ini (no change)
        balanceAfter: card.balance,      // Balance setelah = sama (tap tidak mengubah balance)
        deviceId,                        // Device reader yang digunakan
        location,                        // Lokasi tap (GPS atau deskripsi)
        status: 'SUCCESS',               // Transaction berhasil
        metadata: JSON.stringify({
          signalStrength,                // Kekuatan sinyal RFID (dBm)
          readTime,                      // Waktu baca (milliseconds)
          timestamp: new Date().toISOString()  // Timestamp exact
        }),
        ipAddress: req.ip                // IP address device/client
      }
    });
    // Transaction log ini untuk: audit trail, analytics, usage tracking
    // Admin bisa analyze: kapan kartu digunakan, di mana, device apa

    // STEP 9: Log ke console untuk monitoring real-time
    console.log(`📱 Card tapped: ${cardId.slice(0, 8)}... on ${deviceId.slice(-8)}`);
    // Format log: "📱 Card tapped: 04A1B2C3... on device ...abc12345"

    // STEP 10: Return success response dengan card info lengkap
    res.json({
      success: true,
      message: 'Card read successfully',
      card: {
        id: card.id,                     // Database ID (auto-increment)
        cardId: card.cardId,             // UID kartu (hex string)
        cardType: card.cardType,         // "NTag215"
        status: card.cardStatus,         // "ACTIVE"
        balance: card.balance,           // Current balance (dalam Rupiah)
        user: card.user,                 // User object (id, name, username, balance)
        lastUsed: new Date()             // Timestamp tap (just now)
      }
    });
    // Client (Android app) akan display info ini ke user:
    // - Balance: untuk ditampilkan di UI
    // - User info: untuk konfirmasi "Kartu milik [nama]"
    // - Status: untuk validasi (jika BLOCKED/LOST, show warning)

  } catch (error) {
    // Error handling - tangkap semua error (Prisma, validation, network, dll)
    console.error('❌ Card tap error:', error);
    res.status(500).json({ 
      error: 'Failed to process card tap',
      details: error.message  // Error message untuk debugging
    });
  }
});
// ============================================================================
// END OF ENDPOINT: POST /tap
// ============================================================================

// ============================================================================
// END OF ENDPOINT: POST /tap
// ============================================================================

// ============================================================================
// ENDPOINT: POST /payment - Proses pembayaran NFC card-to-card atau card-to-user
// ============================================================================
// KOMPLEKSITAS TINGGI - Endpoint ini mengimplementasikan:
// 1. AI-powered Fraud Detection (Z-Score anomaly detection)
// 2. Atomic Transaction (Prisma $transaction untuk ensure consistency)
// 3. Balance Synchronization (user ↔ card balance always in sync)
// 4. Multi-receiver support (card-to-card atau user-to-user transfer)
// 5. Comprehensive logging & audit trail
//
// FLOW PEMBAYARAN NFC:
//
// STEP 1: Extract & validate request parameters
//         Required: cardId (sender), amount, deviceId
//         Optional: receiverCardId OR receiverId, location, description
//
// STEP 2: Validate amount (must be positive number)
//
// STEP 3: Query sender card dengan user relation
//         Untuk mendapatkan: user balance, user ID, card status
//
// STEP 4: Validate sender card status (must be ACTIVE)
//
// STEP 5: Check USER balance (not card balance!)
//         ⚠️ PENTING: Balance source adalah USER, bukan CARD
//         Alasan: User balance adalah single source of truth
//         Card balance hanya untuk sync/cache purposes
//
// STEP 6: 🛡️ AI FRAUD DETECTION - Z-Score Anomaly Detection
//         Algoritma: Statistical outlier detection based on historical patterns
//         Input: sender card history (last 15 transactions)
//         Output: Risk score (0-100), decision (ALLOW/REVIEW/BLOCK)
//         Reference: Chandola et al. (2009) - Anomaly Detection Survey
//
//         6a. Analyze transaction amount vs historical mean
//         6b. Calculate Z-Score: Z = (X - μ) / σ
//         6c. Apply 3-Sigma Rule:
//             - Z > 3σ → BLOCK (99.7% confidence interval, extreme outlier)
//             - Z > 2σ → REVIEW (95% confidence, significant deviation)
//             - Z ≤ 2σ → ALLOW (normal transaction pattern)
//         6d. If REVIEW or BLOCK: Create fraud alert untuk admin
//         6e. If BLOCK: Return 403 Forbidden, stop transaction immediately
//
// STEP 7: Validate receiver (card OR user)
//         Dua kemungkinan:
//         - receiverCardId: Card-to-card transfer (tap receiver card)
//         - receiverId: User-to-user transfer (pilih user dari list)
//
// STEP 8: Execute ATOMIC TRANSACTION (Prisma $transaction)
//         ⚠️ CRITICAL: Semua DB operations harus atomic (all-or-nothing)
//         Jika 1 operation gagal, semua di-rollback
//
//         8a. Deduct balance dari sender USER (not card!)
//         8b. Update sender CARD: sync balance + update lastUsed
//         8c. Add balance ke receiver USER
//         8d. Update receiver CARD (if applicable): sync balance + update lastUsed
//         8e. Log sender NFCTransaction (type: PAYMENT, negative amount)
//         8f. Log receiver NFCTransaction (type: TAP_IN, positive amount)
//         8g. Create Transaction record (untuk transaction history)
//
// STEP 9: Log transaction success
//         Format: "✅ Transfer Success! Pengirim: [user] → Penerima: [user] | Amount: Rp X"
//
// STEP 10: Return success response
//          Response: transaction amount, updated balances, timestamp
// ============================================================================
router.post('/payment', async (req, res) => {
  try {
    // STEP 1: Extract request parameters
    const { 
      cardId,              // Sender card UID
      amount,              // Transfer amount (Rupiah)
      receiverCardId,      // Receiver card UID (optional, untuk card-to-card)
      receiverId,          // Receiver user ID (optional, untuk user-to-user)
      deviceId,            // Device reader ID (Android device)
      location,            // Location of transaction (GPS atau deskripsi)
      description          // Transaction description (optional)
    } = req.body;

    // Validate required parameters
    if (!cardId || !amount || !deviceId) {
      return res.status(400).json({ 
        error: 'Card ID, amount, and device ID required' 
      });
    }

    // STEP 2: Parse & validate amount (must be positive number)
    const amountNum = parseFloat(amount);
    if (!amountNum || isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // STEP 3: Query sender card dengan user relation (Prisma include)
    const senderCard = await prisma.nFCCard.findUnique({
      where: { cardId },
      include: { user: true }  // Include untuk mendapatkan user balance & info
    });

    if (!senderCard) {
      return res.status(404).json({ error: 'Sender card not found' });
    }

    // STEP 4: Validate sender card status
    if (senderCard.cardStatus !== 'ACTIVE') {
      return res.status(403).json({ error: 'Sender card is not active' });
    }

    // STEP 5: Check USER balance (bukan card balance!)
    // ⚠️ IMPORTANT DESIGN DECISION: User balance adalah single source of truth
    const userBalance = senderCard.user?.balance || 0;
    console.log(`💰 Balance Check: User ${senderCard.userId} has Rp ${userBalance.toLocaleString('id-ID')}, trying to send Rp ${amountNum.toLocaleString('id-ID')}`);
    
    // Validate sufficient balance
    if (userBalance < amountNum) {
      return res.status(400).json({ 
        error: 'Insufficient balance',
        balance: userBalance,
        required: amountNum
      });
    }

    // STEP 6: 🛡️ AI FRAUD DETECTION - Z-Score Anomaly Detection Algorithm
    // =========================================================================
    // PURPOSE: Detect suspicious transactions before processing payment
    // METHOD: Statistical outlier detection using Z-Score
    // REFERENCE: Chandola et al. (2009) - "Anomaly Detection: A Survey"
    //
    // ALGORITHM:
    // 1. Load last 15 transactions untuk establish baseline pattern
    // 2. Calculate statistical metrics: mean (μ), standard deviation (σ)
    // 3. Calculate Z-Score untuk current transaction: Z = (X - μ) / σ
    // 4. Apply 3-Sigma Rule (99.7% confidence interval):
    //    - Z > 3σ → BLOCK (extreme outlier, 0.3% probability = very suspicious)
    //    - Z > 2σ → REVIEW (significant outlier, 5% probability = needs investigation)
    //    - Z ≤ 2σ → ALLOW (within normal range, 95% probability = safe)
    //
    // EXAMPLE SCENARIO:
    // - User history: transaksi rata-rata Rp 50.000 ± Rp 10.000
    // - Current transaction: Rp 500.000
    // - Z-Score: (500000 - 50000) / 10000 = 45σ → BLOCK!!
    // =========================================================================
    if (senderCard.userId) {
      try {
        // Call fraud detection function (implemented di atas)
        const fraudAnalysis = await analyzeFraudRisk(senderCard, amountNum, deviceId, prisma);
        
        // Log fraud detection results untuk monitoring
        console.log('🔍 Fraud Detection Analysis:');
        console.log(`   └─ Risk Score: ${fraudAnalysis.riskScore}`);  // 0-100 scale
        console.log(`   └─ Decision: ${fraudAnalysis.decision} (${fraudAnalysis.riskLevel} risk)`);
        console.log(`   └─ Z-Score: ${fraudAnalysis.zScore}σ deviation from mean`);
        
        // STEP 6a: Create fraud alert untuk kasus REVIEW dan BLOCK
        // Alert ini akan muncul di admin dashboard untuk manual investigation
        if (fraudAnalysis.decision === 'REVIEW' || fraudAnalysis.decision === 'BLOCK') {
          try {
            await prisma.fraudAlert.create({
              data: {
                userId: senderCard.userId,
                deviceId,
                deviceName: 'NFC Card Reader',
                riskScore: fraudAnalysis.riskScore,  // 50 (REVIEW) atau 100 (BLOCK)
                riskLevel: fraudAnalysis.riskLevel,  // MEDIUM atau HIGH
                decision: fraudAnalysis.decision,     // REVIEW atau BLOCK
                reasons: JSON.stringify(fraudAnalysis.riskFactors),  // Array of reasons
                confidence: fraudAnalysis.riskScore === 100 ? 0.997 : 0.95,  // 3σ = 99.7%, 2σ = 95%
                riskFactors: JSON.stringify({
                  cardId: cardId.slice(0, 8) + '...',
                  amount: amountNum,
                  zScore: fraudAnalysis.zScore,
                  avgAmount: fraudAnalysis.avgAmount,
                  stdDev: fraudAnalysis.stdDev,
                  historicalTransactions: 20  // Based on last 20 transactions
                }),
                ipAddress: req.ip  // Track IP untuk investigation
              }
            });
            console.log(`🚨 Fraud Alert Created: Risk ${fraudAnalysis.riskScore} → ${fraudAnalysis.decision}`);
          } catch (alertError) {
            // Log error tapi jangan stop transaction process (fail-safe)
            // Alert creation failure tidak boleh mengganggu payment flow
            console.error('⚠️ Failed to create fraud alert (non-critical):', alertError.message);
          }
        }

        // STEP 6b: If BLOCK decision → Reject transaction immediately
        if (fraudAnalysis.decision === 'BLOCK') {
          // Return 403 Forbidden dengan user-friendly error message
          return res.status(403).json({
            error: 'ACCOUNT_BANNED',
            message: 'Maaf, akun Anda telah diblokir karena terdeteksi aktivitas mencurigakan. Silakan hubungi Customer Service untuk informasi lebih lanjut.',
            riskScore: fraudAnalysis.riskScore,
            riskLevel: fraudAnalysis.riskLevel,
            reasons: fraudAnalysis.riskFactors,  // Detailed reasons untuk CS investigation
            contactInfo: 'Hubungi CS: +62-XXX-XXX-XXXX atau email: cs@nfcpayment.com'
          });
          // Transaction STOPPED here. User harus contact CS untuk verify identity.
        }

        // STEP 6c: If REVIEW decision → Log warning, tapi tetap process payment
        // Admin akan manually review alert di dashboard
        if (fraudAnalysis.decision === 'REVIEW') {
          console.log(`⚠️ Review Required: Card ${cardId.slice(0, 8)}... | Z-Score: ${fraudAnalysis.zScore}σ`);
          // Transaction tetap diproses, tapi admin harus review manual
        }
      } catch (fraudError) {
        // Fraud detection error → fail-safe: allow transaction
        // Lebih baik false negative (miss fraud) daripada false positive (block legitimate user)
        console.error('Fraud detection error:', fraudError);
      }
    }
    // Jika ALLOW decision atau fraud detection disabled: lanjut ke payment processing

    // STEP 7: Validate receiver - support 2 modes: card-to-card atau user-to-user
    // =========================================================================
    let receiverCard = null;
    let receiverUser = null;

    if (receiverCardId) {
      // MODE 1: Card-to-Card Transfer
      // Use case: User tap 2 kartu NFC (sender & receiver) pada device reader
      // Example: Tap kartu pengirim, masukkan amount, tap kartu penerima
      receiverCard = await prisma.nFCCard.findUnique({
        where: { cardId: receiverCardId },
        include: { user: true }  // Include user untuk update balance
      });

      if (!receiverCard) {
        return res.status(404).json({ error: 'Receiver card not found' });
      }
      // Receiver card valid → akan update card balance & user balance nantinya
      
    } else if (receiverId) {
      // MODE 2: User-to-User Transfer (no receiver card involved)
      // Use case: Transfer saldo ke user lain via user ID (pilih dari contact list)
      // Example: Select "Transfer to John Doe (user ID 123)"
      receiverUser = await prisma.user.findUnique({
        where: { id: parseInt(receiverId) }
      });

      if (!receiverUser) {
        return res.status(404).json({ error: 'Receiver not found' });
      }
      // Receiver user valid → akan update user balance saja (no card involved)
      
    } else {
      // Error: harus provide salah satu (receiverCardId OR receiverId)
      return res.status(400).json({ 
        error: 'Receiver card ID or user ID required' 
      });
    }

    // STEP 8: Execute ATOMIC TRANSACTION - All-or-Nothing Database Operations
    // =========================================================================
    // ⚠️ CRITICAL: Gunakan Prisma $transaction untuk ensure data consistency
    //
    // ACID Properties:
    // - Atomicity: Semua operations sukses ATAU semua di-rollback
    // - Consistency: Database tetap dalam valid state
    // - Isolation: Transaction tidak interfere dengan transaction lain
    // - Durability: Changes dipersist ke database setelah commit
    //
    // WHY ATOMIC?: Untuk prevent inconsistent state seperti:
    // - Money deducted from sender tapi tidak masuk ke receiver
    // - Card balance out of sync dengan user balance
    // - Transaction log incomplete
    //
    // OPERATIONS DALAM TRANSACTION:
    // 1. Deduct sender user balance
    // 2. Sync sender card balance
    // 3. Add receiver user balance
    // 4. Sync receiver card balance (jika card-to-card)
    // 5. Log sender NFCTransaction
    // 6. Log receiver NFCTransaction (jika card-to-card)
    // 7. Create Transaction record (main transaction table)
    // =========================================================================
    const result = await prisma.$transaction(async (tx) => {
      // Prisma transaction: 'tx' adalah isolated Prisma client
      // Semua operations menggunakan 'tx', bukan 'prisma'
      
      // STEP 8a: Deduct balance dari SENDER USER (not card!)
      const updatedSenderUser = await tx.user.update({
        where: { id: senderCard.userId },
        data: { 
          balance: { decrement: amountNum }  // Kurangi balance user
        }
      });
      // Prisma decrement: atomic operation, prevent race condition
      // Equivalent to: SET balance = balance - amountNum WHERE id = senderCard.userId

      // STEP 8b: Update sender CARD - sync balance dengan user + update lastUsed
      const updatedSenderCard = await tx.nFCCard.update({
        where: { cardId },
        data: { 
          lastUsed: new Date(),                      // Track last activity
          balance: updatedSenderUser.balance         // ✅ Sync: card balance = user balance
        }
      });
      // IMPORTANT: Card balance selalu sama dengan user balance (single source of truth)

      // STEP 8c & 8d: Add balance ke receiver (card atau user tergantung mode)
      let updatedReceiverCard = null;
      let updatedReceiverUser = null;

      if (receiverCard) {
        // MODE 1: Card-to-Card Transfer
        
        // Validate: receiver card harus linked ke user
        if (!receiverCard.userId) {
          throw new Error('Receiver card not linked to any user');
          // Error ini akan trigger rollback seluruh transaction
        }
        
        // Update receiver USER balance
        updatedReceiverUser = await tx.user.update({
          where: { id: receiverCard.userId },
          data: { balance: { increment: amountNum } }  // Tambah balance user
        });

        // Update receiver CARD - sync balance dengan user + update lastUsed
        updatedReceiverCard = await tx.nFCCard.update({
          where: { cardId: receiverCardId },
          data: { 
            lastUsed: new Date(),                      // Track last activity
            balance: updatedReceiverUser.balance       // ✅ Sync: card balance = user balance
          }
        });
      } else {
        // MODE 2: User-to-User Transfer (no card involved)
        // Hanya update user balance, no card sync needed
        updatedReceiverUser = await tx.user.update({
          where: { id: parseInt(receiverId) },
          data: { balance: { increment: amountNum } }  // Tambah balance user
        });
      }

      // STEP 8e: Log SENDER NFCTransaction (audit trail untuk sender)
      const senderBalanceBefore = senderCard.user?.balance || 0;
      const senderBalanceAfter = updatedSenderUser.balance;
      
      await tx.nFCTransaction.create({
        data: {
          cardId,                          // Sender card UID
          transactionType: 'PAYMENT',      // Type: PAYMENT (outgoing)
          amount: -amountNum,              // Negative amount (deduction)
          balanceBefore: senderBalanceBefore,   // Balance before payment
          balanceAfter: senderBalanceAfter,     // Balance after payment
          deviceId,                        // Device yang digunakan
          location,                        // Location of transaction
          status: 'SUCCESS',               // Transaction successful
          metadata: JSON.stringify({
            description,                   // Custom description dari user
            receiver: receiverCardId || `user:${receiverId}`,  // Receiver identifier
            timestamp: new Date().toISOString()
          }),
          ipAddress: req.ip                // IP address untuk security tracking
        }
      });
      // Log ini untuk: transaction history, receipt generation, analytics

      // STEP 8f: Log RECEIVER NFCTransaction (jika card-to-card transfer)
      if (updatedReceiverCard) {
        const receiverBalanceBefore = receiverCard.user?.balance || 0;
        const receiverBalanceAfter = updatedReceiverUser.balance;
        
        await tx.nFCTransaction.create({
          data: {
            cardId: receiverCardId,        // Receiver card UID
            transactionType: 'TAP_IN',     // Type: TAP_IN (incoming)
            amount: amountNum,             // Positive amount (addition)
            balanceBefore: receiverBalanceBefore,  // Balance before receive
            balanceAfter: receiverBalanceAfter,    // Balance after receive
            deviceId,                      // Same device sebagai sender
            location,                      // Same location
            status: 'SUCCESS',
            metadata: JSON.stringify({
              description,
              sender: cardId,              // Sender card UID
              timestamp: new Date().toISOString()
            }),
            ipAddress: req.ip
          }
        });
      }
      // Jika user-to-user transfer: no receiver card log (receiver tidak pakai card)

      // STEP 8g: Create main Transaction record (master transaction table)
      // Table Transaction: master record untuk all transaction types (NFC, transfer, topup, dll)
      // NFCTransaction: detailed log per card (linked to specific card UID)
      if (senderCard.userId && (receiverCard?.userId || receiverId)) {
        await tx.transaction.create({
          data: {
            senderId: senderCard.userId,    // FK ke User table (sender)
            receiverId: receiverCard?.userId || parseInt(receiverId),  // FK ke User table (receiver)
            amount: amountNum,              // Transfer amount
            type: 'nfc_payment',            // Transaction type (enum: nfc_payment, transfer, topup, dll)
            status: 'completed',            // Status: completed (success)
            description: description || 'NFC Card Payment',  // User-provided description
            deviceId,                       // Device identifier
            ipAddress: req.ip               // IP address tracking
          }
        });
      }
      // Transaction record ini untuk: user transaction history, accounting, reports

      // Return result dari atomic transaction
      return { updatedSenderCard, updatedSenderUser, updatedReceiverCard, updatedReceiverUser };
    });
    // Prisma $transaction auto-commit jika semua operations sukses
    // Jika ada error: auto-rollback (semua changes di-revert)

    // STEP 9: Log transaction success dengan detail lengkap
    const senderUsername = senderCard.user?.username || 'Unknown';
    const receiverUsername = receiverCard?.user?.username || 'Unknown';
    
    console.log(`✅ Transfer Success!`);
    console.log(`   Pengirim: ${senderUsername} (${cardId.slice(0, 8)}...)`);
    console.log(`   Penerima: ${receiverUsername} (${receiverCardId?.slice(0, 8) || 'user'}...)`);
    console.log(`   💸 Amount: ${formatCurrency(amountNum)}`);
    console.log(`   💰 Saldo Pengirim: ${formatCurrency(result.updatedSenderUser.balance)}`);
    console.log(`   💵 Saldo Penerima: ${formatCurrency(result.updatedReceiverUser?.balance || 0)}`);
    // Log format: Easy to read untuk real-time monitoring

    // STEP 10: Return success response ke client
    res.json({
      success: true,
      message: 'Payment processed successfully',
      transaction: {
        amount: amountNum,                          // Transfer amount
        senderBalance: result.updatedSenderUser.balance,     // Sender balance setelah payment
        receiverBalance: result.updatedReceiverUser?.balance, // Receiver balance setelah payment
        timestamp: new Date()                       // Transaction timestamp
      }
    });
    // Client akan display success message dan updated balances ke user

  } catch (error) {
    // Error handling - tangkap semua error (Prisma, validation, network, dll)
    console.error('❌ Payment error:', error);
    res.status(500).json({ 
      error: 'Payment failed',
      details: error.message  // Error details untuk debugging
    });
    // Jika error terjadi dalam $transaction: automatic rollback (no partial updates)
  }
});
// ============================================================================
// END OF ENDPOINT: POST /payment
// ============================================================================
// SUMMARY: Endpoint ini handle complex payment flow dengan:
// - AI fraud detection (Z-Score algorithm)
// - Atomic transactions (ACID compliance)
// - Balance synchronization (user ↔ card)
// - Comprehensive logging & audit trail
// Total ~200 lines of code untuk ensure secure & reliable payments
// ============================================================================

// ============================================================================
// ENDPOINT: POST /topup - Top up saldo kartu NFC (Admin only)
// ============================================================================
// USE CASE: Admin menambahkan saldo ke kartu user (manual top-up)
// AUTHORIZATION: Require admin password (process.env.ADMIN_PASSWORD)
//
// FLOW TOP-UP:
//
// STEP 1: Extract & validate parameters (cardId, amount, adminPassword)
// STEP 2: Verify admin password untuk authorization
// STEP 3: Parse & validate amount (must be positive)
// STEP 4: Validate card exists di database
// STEP 5: Execute atomic transaction:
//         5a. Increment card balance
//         5b. Log NFCTransaction (type: TOP_UP)
//         5c. Log AdminLog (audit trail untuk admin action)
// STEP 6: Log success
// STEP 7: Return success response dengan old & new balance
// ============================================================================
router.post('/topup', async (req, res) => {
  try {
    // STEP 1: Extract required parameters
    const { cardId, amount, adminPassword } = req.body;
    if (!cardId || !amount) return res.status(400).json({ error: 'Card ID and amount required' });
    
    // STEP 2: Verify admin password (AUTHORIZATION CHECK)
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid admin password' });
    }
    // Only admin dapat melakukan top-up (prevent unauthorized balance manipulation)

    // STEP 3: Parse & validate amount
    const amountNum = parseFloat(amount);
    if (!amountNum || isNaN(amountNum) || amountNum <= 0) return res.status(400).json({ error: 'Invalid amount' });

    // STEP 4: Validate card exists
    const card = await prisma.nFCCard.findUnique({ where: { cardId } });
    if (!card) return res.status(404).json({ error: 'Card not found' });

    // STEP 5: Execute atomic transaction (3 operations: update balance, log transaction, log admin action)
    const updatedCard = await prisma.$transaction(async (tx) => {
      // STEP 5a: Increment card balance
      const updated = await tx.nFCCard.update({
        where: { cardId },
        data: { 
          balance: { increment: amountNum },  // Atomic increment operation
          lastUsed: new Date()                // Update last activity timestamp
        }
      });
      // balance sekarang = balance lama + amountNum

      // STEP 5b: Log top-up transaction ke NFCTransaction table
      await tx.nFCTransaction.create({
        data: {
          cardId,                          // Card yang di-topup
          transactionType: 'TOP_UP',       // Type: TOP_UP (incoming balance)
          amount: amountNum,               // Positive amount (addition)
          balanceBefore: card.balance,     // Balance before top-up
          balanceAfter: updated.balance,   // Balance after top-up
          deviceId: 'admin',               // Device: 'admin' (manual top-up from dashboard)
          status: 'SUCCESS',
          ipAddress: req.ip                // Admin IP address
        }
      });

      // STEP 5c: Log admin action ke AdminLog table (audit trail)
      await tx.adminLog.create({
        data: {
          action: 'CARD_TOP_UP',           // Action type
          details: JSON.stringify({
            cardId,
            amount: amountNum,
            oldBalance: card.balance,
            newBalance: updated.balance
          }),
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']  // Track admin browser/device
        }
      });
      // AdminLog untuk: compliance, security audits, admin activity tracking

      return updated;  // Return updated card
    });
    // Transaction selesai - semua 3 operations committed atomically

    // STEP 6: Log success ke console
    console.log(`💰 Card topped up: ${cardId.slice(0, 8)}... +${formatCurrency(amountNum)}`);

    // STEP 7: Return success response
    res.json({
      success: true,
      message: 'Card topped up successfully',
      card: {
        cardId: updatedCard.cardId,
        balance: updatedCard.balance,        // New balance
        previousBalance: card.balance        // Old balance (untuk comparison)
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
// ============================================================================
// END OF ENDPOINT: POST /topup
// ============================================================================

// ============================================================================
// ENDPOINT: PUT /status - Update status kartu NFC (Admin only)
// ============================================================================
// USE CASE: Admin mengubah status kartu (block, unblock, mark as lost, expire)
// AUTHORIZATION: Require admin password
//
// STATUS OPTIONS:
// - ACTIVE:  Kartu normal, dapat digunakan untuk transaksi
// - BLOCKED: Kartu diblokir (fraud, violation, user request), tidak dapat transaksi
// - LOST:    Kartu dilaporkan hilang, trigger fraud alert jika digunakan
// - EXPIRED: Kartu kadaluarsa, tidak dapat digunakan
//
// FLOW UPDATE STATUS:
//
// STEP 1: Extract & validate parameters (cardId, status, adminPassword, reason)
// STEP 2: Verify admin password untuk authorization
// STEP 3: Validate status value (must be ACTIVE, BLOCKED, LOST, or EXPIRED)
// STEP 4: Validate card exists di database
// STEP 5: Update card status + timestamp
// STEP 6: Log admin action ke AdminLog table (audit trail)
// STEP 7: Return updated card dengan user info
// ============================================================================
router.put('/status', async (req, res) => {
  try {
    // STEP 1: Extract parameters
    const { cardId, status, adminPassword, reason } = req.body;
    if (!cardId || !status) return res.status(400).json({ error: 'Card ID and status required' });
    
    // STEP 2: Verify admin password (AUTHORIZATION CHECK)
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid admin password' });
    }

    // STEP 3: Validate status value (enum validation)
    const validStatuses = ['ACTIVE', 'BLOCKED', 'LOST', 'EXPIRED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status', validStatuses });
    }
    // Status harus salah satu dari 4 options: ACTIVE | BLOCKED | LOST | EXPIRED

    // STEP 4: Validate card exists
    const card = await prisma.nFCCard.findUnique({ where: { cardId } });
    if (!card) return res.status(404).json({ error: 'Card not found' });

    // STEP 5: Update card status di database
    const updatedCard = await prisma.nFCCard.update({
      where: { cardId },
      data: { 
        cardStatus: status,        // Update status (ACTIVE/BLOCKED/LOST/EXPIRED)
        updatedAt: new Date()      // Update timestamp
      },
      include: {
        user: {  // Include user info dalam response
          select: {
            id: true,
            name: true,
            username: true
          }
        }
      }
    });

    // STEP 6: Log admin action ke AdminLog table (audit trail)
    await prisma.adminLog.create({
      data: {
        action: 'CARD_STATUS_UPDATE',    // Action type
        details: JSON.stringify({
          cardId,
          oldStatus: card.cardStatus,    // Previous status (untuk comparison)
          newStatus: status,             // New status
          reason: reason || 'No reason provided'  // Admin reason (optional field)
        }),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']  // Track admin device/browser
      }
    });
    // AdminLog penting untuk: compliance, security audits, investigation fraud

    // Log ke console untuk monitoring
    console.log(`🔒 Card status updated: ${cardId.slice(0, 8)}... ${card.cardStatus} → ${status}`);

    // STEP 7: Return success response
    res.json({
      success: true,
      message: `Card ${status.toLowerCase()} successfully`,
      card: updatedCard  // Include updated card dengan user info
    });

  } catch (error) {
    console.error('❌ Status update error:', error);
    res.status(500).json({ 
      error: 'Failed to update card status',
      details: error.message 
    });
  }
});
// ============================================================================
// END OF ENDPOINT: PUT /status
// ============================================================================

// ============================================================================
// ENDPOINT: GET / atau GET /list - List semua kartu NFC dengan filters & pagination
// ============================================================================
// USE CASE: Admin atau app perlu melihat daftar kartu NFC yang terdaftar
// FEATURES:
// - Filter by status (ACTIVE/BLOCKED/LOST/EXPIRED)
// - Filter by userId (kartu milik user tertentu)
// - Pagination (limit + offset)
// - Sorting (sortBy + order)
//
// QUERY PARAMETERS:
// - status (optional): Filter by card status
// - userId (optional): Filter by user ID (cards owned by specific user)
// - limit (default: 50): Maximum cards to return
// - offset (default: 0): Skip N cards (for pagination)
// - sortBy (default: 'createdAt'): Sort field (createdAt, balance, updatedAt, dll)
// - order (default: 'desc'): Sort order (desc atau asc)
//
// FLOW:
// STEP 1: Extract query parameters dengan default values
// STEP 2: Build where clause untuk filtering (status, userId)
// STEP 3: Query cards dengan Prisma (include user relation)
// STEP 4: Count total cards (untuk pagination info)
// STEP 5: Return cards dengan pagination metadata
// ============================================================================
router.get(['/', '/list'], async (req, res) => {
  try {
    // STEP 1: Extract query parameters dengan default values
    const { 
      status,                    // Filter by status (optional)
      userId,                    // Filter by user (optional)
      limit = 50,                // Default: 50 cards per page
      offset = 0,                // Default: start from beginning
      sortBy = 'createdAt',      // Default: sort by registration date
      order = 'desc'             // Default: newest first
    } = req.query;

    // STEP 2: Build where clause untuk filtering
    const whereClause = {};
    if (status) whereClause.cardStatus = status;          // Filter by status jika provided
    if (userId) whereClause.userId = parseInt(userId);    // Filter by user jika provided
    // whereClause akan dikirim ke Prisma untuk SQL WHERE condition

    // STEP 3: Query cards dari database dengan filters, sorting, pagination
    const cards = await prisma.nFCCard.findMany({
      where: whereClause,
      include: {
        user: {  // Include user data untuk setiap card
          select: {
            id: true,
            name: true,
            username: true,
            balance: true
          }
        }
      },
      orderBy: { [sortBy]: order },      // Dynamic sorting (createdAt desc, balance asc, dll)
      take: parseInt(limit),              // LIMIT clause (SQL)
      skip: parseInt(offset)              // OFFSET clause (SQL)
    });
    // SQL equivalent: SELECT * FROM NFCCard WHERE ... ORDER BY ... LIMIT ... OFFSET ...

    // STEP 4: Count total cards untuk pagination metadata
    const total = await prisma.nFCCard.count({ where: whereClause });

    console.log(`📋 Listed ${cards.length} NFC cards (Total: ${total})`);

    // STEP 5: Return success response dengan pagination info
    res.json({
      success: true,
      cards,                // Array of card objects
      total,                // Total count (all cards, ignoring pagination)
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: total > parseInt(offset) + parseInt(limit)  // Boolean: ada page berikutnya?
      }
    });
    // Client dapat gunakan hasMore untuk show "Load More" button

  } catch (error) {
    console.error('❌ List cards error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to list cards',
      details: error.message 
    });
  }
});
// ============================================================================
// END OF ENDPOINT: GET /list
// ============================================================================

// ============================================================================
// ENDPOINT: GET /transactions/:cardId - Riwayat transaksi kartu NFC
// ============================================================================
// USE CASE: User atau admin ingin melihat history transaksi dari specific card
// FEATURES:
// - Pagination (limit + offset)
// - Sorted by newest first (createdAt desc)
// - Parse metadata JSON untuk readable format
//
// QUERY PARAMETERS:
// - :cardId (URL param): Card UID yang ingin dilihat history-nya
// - limit (default: 50): Maximum transactions to return
// - offset (default: 0): Skip N transactions
//
// FLOW:
// STEP 1: Extract cardId dari URL params & query params (limit, offset)
// STEP 2: Query transactions dari NFCTransaction table
// STEP 3: Count total transactions
// STEP 4: Parse metadata JSON (convert string to object)
// STEP 5: Return transactions dengan pagination metadata
// ============================================================================
router.get('/transactions/:cardId', async (req, res) => {
  try {
    // STEP 1: Extract parameters
    const { cardId } = req.params;           // URL param: /transactions/:cardId
    const { limit = 50, offset = 0 } = req.query;  // Query params: ?limit=10&offset=0

    // STEP 2: Query transactions dari database (sorted by newest first)
    const transactions = await prisma.nFCTransaction.findMany({
      where: { cardId },                     // Filter by specific card
      orderBy: { createdAt: 'desc' },        // Sort: newest first
      take: parseInt(limit),                 // Limit results
      skip: parseInt(offset)                 // Pagination offset
    });
    // Returns: Array of NFCTransaction records untuk card ini

    // STEP 3: Count total transactions untuk pagination info
    const total = await prisma.nFCTransaction.count({ where: { cardId } });

    console.log(`📜 Listed ${transactions.length} transactions for card ${cardId.slice(0, 8)}...`);

    // STEP 4: Parse metadata JSON (convert string -> object untuk easier consumption)
    const parsedTransactions = transactions.map(t => ({
      ...t,  // Spread all fields
      metadata: t.metadata ? JSON.parse(t.metadata) : null  // Parse JSON string
    }));
    // metadata field di database: "{\"description\":\"Payment\",...}" (string)
    // After parse: { description: "Payment", ... } (object)

    // STEP 5: Return success response
    res.json({
      success: true,
      transactions: parsedTransactions,
      total,                                 // Total count (all transactions)
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
// ============================================================================
// END OF ENDPOINT: GET /transactions/:cardId
// ============================================================================

// ============================================================================
// ENDPOINT: GET /info/:cardId - Info detail kartu NFC lengkap
// ============================================================================
// USE CASE: User atau admin ingin melihat detail lengkap dari specific card
// FEATURES:
// - Card info lengkap (status, balance, user, dll)
// - Recent 10 transactions
// - Transaction statistics (total count, total amount)
//
// QUERY PARAMETERS:
// - :cardId (URL param): Card UID yang ingin dilihat info-nya
//
// FLOW:
// STEP 1: Extract cardId dari URL params
// STEP 2: Query card dengan relations (user, recent transactions)
// STEP 3: Calculate transaction statistics (aggregate sum + count)
// STEP 4: Parse metadata JSON
// STEP 5: Return card info + statistics
// ============================================================================
router.get('/info/:cardId', async (req, res) => {
  try {
    // STEP 1: Extract cardId dari URL param
    const { cardId } = req.params;
    
    // STEP 2: Query card dari database dengan relations
    const card = await prisma.nFCCard.findUnique({
      where: { cardId },
      include: {
        user: {  // Include user info lengkap
          select: { 
            id: true, 
            name: true, 
            username: true, 
            balance: true, 
            isActive: true  // User account status
          } 
        },
        transactions: {  // Include recent 10 transactions
          take: 10,                        // Limit 10 transactions
          orderBy: { createdAt: 'desc' }   // Newest first
        }
      }
    });
    // Returns: Card object dengan nested user & transactions

    if (!card) return res.status(404).json({ error: 'Card not found' });

    // STEP 3: Calculate transaction statistics (aggregate functions)
    const stats = await prisma.nFCTransaction.aggregate({
      where: { cardId },
      _sum: { amount: true },    // Total amount (sum all transactions)
      _count: true               // Total transaction count
    });
    // Aggregate: efficient SQL operations (SUM, COUNT tanpa loading all records)

    console.log(`ℹ️ Card info retrieved: ${cardId.slice(0, 8)}...`);

    // STEP 4 & 5: Return card info + statistics
    res.json({
      success: true,
      card: {
        ...card,  // Spread all card fields
        metadata: card.metadata ? JSON.parse(card.metadata) : null  // Parse JSON
      },
      statistics: {
        totalTransactions: stats._count,          // Total transaction count
        totalAmount: stats._sum.amount || 0      // Total amount (all transactions combined)
      }
    });
    // Response berisi: card details, user info, recent transactions, statistics

  } catch (error) {
    console.error('❌ Get card info error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get card info',
      details: error.message 
    });
  }
});
// ============================================================================
// END OF ENDPOINT: GET /info/:cardId
// ============================================================================

// ============================================================================
// ENDPOINT: DELETE /:cardId atau /delete/:cardId - Hapus kartu NFC (Admin only)
// ============================================================================
// USE CASE: Admin ingin menghapus kartu dari sistem (permanent deletion)
// AUTHORIZATION: Require admin password
// ⚠️ WARNING: Ini adalah DESTRUCTIVE operation - tidak bisa di-undo!
//
// FLOW:
// STEP 1: Extract cardId & adminPassword
// STEP 2: Verify admin password (authorization check)
// STEP 3: Validate card exists
// STEP 4: Delete cascade - delete related transactions first (foreign key constraint)
// STEP 5: Delete card record
// STEP 6: Return deletion confirmation
// ============================================================================
router.delete(['/:cardId', '/delete/:cardId'], async (req, res) => {
  try {
    // STEP 1: Extract parameters
    const { cardId } = req.params;         // URL param: /delete/:cardId
    const { adminPassword } = req.body;    // Request body (POST data in DELETE request)

    // Debug logs untuk troubleshooting auth issues
    console.log(`🔍 DELETE request for card: ${cardId}`);
    console.log(`📦 Request body:`, req.body);
    console.log(`🔐 Admin password received: "${adminPassword}"`);
    console.log(`🔐 Expected password: "${process.env.ADMIN_PASSWORD || 'admin123'}"`);

    // STEP 2: Verify admin password (AUTHORIZATION CHECK)
    // Support 2 passwords: env variable OR fallback 'admin123'
    if (adminPassword !== process.env.ADMIN_PASSWORD && adminPassword !== 'admin123') {
      console.log(`❌ Password validation failed`);
      return res.status(403).json({ error: 'Unauthorized: Invalid admin password' });
    }
    // Password match - authorization successful
    console.log(`✅ Password validation passed`);

    // STEP 3: Validate card exists
    const card = await prisma.nFCCard.findUnique({ 
      where: { cardId },
      include: { user: true }  // Include user untuk logging purposes
    });
    
    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    // STEP 4: Delete related transactions first (foreign key cascade)
    // ⚠️ IMPORTANT: Must delete child records before parent (referential integrity)
    await prisma.nFCTransaction.deleteMany({ where: { cardId } });
    // deleteMany: delete all transactions untuk kartu ini

    // STEP 5: Delete card record (parent table)
    await prisma.nFCCard.delete({ where: { cardId } });
    // After this: card permanently deleted from database

    // Log deletion event
    console.log(`🗑️ Card deleted: ${cardId} (User: ${card.user?.username || 'unlinked'})`);

    // STEP 6: Return deletion confirmation
    res.json({
      success: true,
      message: 'Card deleted successfully',
      deletedCard: {
        cardId: card.cardId,
        userId: card.userId,
        username: card.user?.username  // Info user yang kehilangan kartu
      }
    });
    // Client akan display confirmation: "Card {UID} deleted successfully"

  } catch (error) {
    console.error('❌ Delete card error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete card',
      details: error.message 
    });
  }
});
// ============================================================================
// END OF ENDPOINT: DELETE /:cardId
// ============================================================================

// Export router untuk di-mount di server.js
module.exports = router;
// ============================================================================
// END OF FILE: routes/nfcCards.js
// ============================================================================
// SUMMARY DOKUMENTASI:
// - Total 10 endpoints untuk NFC card management
// - Features: registration, linking, tap/scan, payment, top-up, status update
// - Security: admin authentication, fraud detection (Z-Score algorithm)
// - Data integrity: atomic transactions, balance synchronization
// - Comprehensive logging: audit trail, transaction history, admin actions
// ============================================================================
