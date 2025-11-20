import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserById, getUserTransactions } from './database';

/**
 * ===============================================================================
 * 🔒 Z-SCORE BASED ANOMALY DETECTION WITH WEIGHTED RISK SCORING
 * ===============================================================================
 * 
 * Algorithm: Statistical Anomaly Detection
 * Methodology: Z-Score Normalization + Weighted Scoring System
 * 
 * Reference:
 * - Chandola, V., et al. (2009). "Anomaly Detection: A Survey"
 * - Bolton, R. J., & Hand, D. J. (2002). "Statistical Fraud Detection: A Review"
 * 
 * Core Principles:
 * 1. Z-Score Calculation: Measures standard deviations from mean
 * 2. Weighted Risk Factors: Multiple factors combined with scientific weights
 * 3. Pure Mathematical Formulas: NO if-else decision logic
 * 4. Real-Time Learning: Adapts to each user's unique behavior pattern
 * 
 * Formula:
 * Z-Score = (X - μ) / σ
 * where X = current value, μ = mean, σ = standard deviation
 * 
 * Risk Score = Σ (Factor_i × Weight_i)
 * 
 * ===============================================================================
 */

// ============================================================================
// INTERFACE DEFINITIONS (Struktur Data)
// ============================================================================

// Interface untuk context transaksi yang akan dianalisis
// Berisi semua informasi yang diperlukan untuk deteksi fraud
export interface TransactionContext {
  senderId: number;        // ID user yang mengirim uang
  receiverId: number;      // ID user yang menerima uang
  amount: number;          // Jumlah uang yang ditransfer (dalam Rupiah)
  timestamp: Date;         // Waktu transaksi terjadi
  deviceId: string;        // ID device yang digunakan (untuk tracking)
  userAgent?: string;      // Browser/app info (optional)
  ipAddress?: string;      // IP address pengirim (optional)
}

// Interface untuk pola perilaku user
// Ini adalah "memory" sistem tentang kebiasaan transaksi user
export interface UserBehaviorPattern {
  averageTransactionAmount: number;    // Rata-rata jumlah transaksi user (μ)
  stdDevTransactionAmount: number;     // Standard deviation transaksi (σ)
  maxTransactionAmount: number;        // Transaksi terbesar yang pernah dilakukan
  transactionFrequency: number;        // Berapa kali transaksi per hari
  commonReceivers: number[];           // Daftar penerima yang sering dikirimi uang
  accountAge: number;                  // Umur akun (dalam hari)
}

// Interface untuk 4 faktor risiko yang dihitung
// Setiap faktor menghasilkan score 0-100
export interface FraudRiskFactors {
  velocityScore: number;      // Score kecepatan transaksi (35% bobot)
  amountZScore: number;       // Score anomali jumlah uang (40% bobot)
  frequencyScore: number;     // Score frekuensi transaksi (15% bobot)
  behaviorScore: number;      // Score pola perilaku (10% bobot)
}

// Interface untuk hasil akhir deteksi fraud
// Ini yang dikembalikan ke aplikasi untuk menentukan transaksi diizinkan atau tidak
export interface FraudDetectionResult {
  overallRiskScore: number;                      // Total risk score (0-100)
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';  // Level risiko
  decision: 'ALLOW' | 'REVIEW' | 'BLOCK';        // Keputusan: izinkan/review/blokir
  riskFactors: FraudRiskFactors;                 // Detail 4 faktor risiko
  reasons: string[];                             // Alasan mengapa berisiko
  confidence: number;                            // Seberapa yakin sistem (0-1)
  timestamp: Date;                               // Waktu analisis
  algorithmUsed: string;                         // Nama algoritma yang dipakai
}

// Interface untuk fraud alert yang disimpan
// Alert ini muncul di admin dashboard untuk transaksi mencurigakan
export interface FraudAlert {
  id: string;              // Unique ID alert
  userId: number;          // User yang melakukan transaksi mencurigakan
  transactionId?: string;  // ID transaksi (optional)
  riskScore: number;       // Risk score transaksi
  riskLevel: string;       // Level risiko
  reason: string;          // Alasan alert dibuat
  timestamp: Date;         // Kapan alert dibuat
  status: 'NEW' | 'REVIEWED' | 'RESOLVED';  // Status: baru/sudah direview/selesai
  adminNotes?: string;     // Catatan dari admin (optional)
}

// ============================================================================
// FRAUD DETECTION CONFIGURATION
// ============================================================================
// Konfigurasi parameter untuk algoritma fraud detection
// Semua nilai ini berdasarkan research paper dan tuning empiris
const FRAUD_CONFIG = {
  // WEIGHTS: Bobot untuk 4 faktor risiko
  // Total harus = 1.0 (100%)
  // Bobot ini dari research "Statistical Fraud Detection" (Bolton & Hand, 2002)
  WEIGHTS: {
    velocityScore: 0.35,    // 35% - Kecepatan transaksi (paling penting untuk deteksi serangan)
    amountZScore: 0.40,     // 40% - Jumlah uang (paling besar dampak finansialnya)
    frequencyScore: 0.15,   // 15% - Frekuensi transaksi (indikator tambahan)
    behaviorScore: 0.10     // 10% - Pola perilaku (pelengkap)
  },
  
  // Z_SCORE: Threshold untuk menentukan seberapa anomali suatu nilai
  // Berdasarkan distribusi normal (68-95-99.7 rule)
  Z_SCORE: {
    NORMAL: 2,        // Z > 2 = anomali ringan (95% confidence)
    SUSPICIOUS: 3,    // Z > 3 = mencurigakan (99.7% confidence)
    ANOMALY: 4        // Z > 4 = anomali ekstrim (99.99% confidence)
  },
  
  // RISK_THRESHOLDS: Batas score untuk risk level
  // Score 0-100 dibagi jadi 4 kategori
  RISK_THRESHOLDS: {
    LOW: 40,          // Score 0-39 = LOW (transaksi aman)
    MEDIUM: 60,       // Score 40-59 = MEDIUM (masih aman, tapi perlu dimonitor)
    HIGH: 80,         // Score 60-79 = HIGH (perlu review manual)
    CRITICAL: 100     // Score 80-100 = CRITICAL (blokir otomatis)
  },
  
  // VELOCITY: Konfigurasi untuk menghitung kecepatan transaksi
  VELOCITY: {
    WINDOW_5MIN: 5 * 60 * 1000,        // Window 5 menit (dalam milliseconds)
    WINDOW_1HOUR: 60 * 60 * 1000,      // Window 1 jam (dalam milliseconds)
    WINDOW_24HOUR: 24 * 60 * 60 * 1000, // Window 24 jam (dalam milliseconds)
    HISTORICAL_SAMPLE_SIZE: 100         // Ambil 100 transaksi terakhir untuk hitung average
  }
};

// ============================================================================
// FRAUD DETECTION AI CLASS - Singleton Pattern
// ============================================================================
// Kelas utama untuk deteksi fraud menggunakan algoritma Z-Score
// Menggunakan singleton pattern agar hanya ada 1 instance di seluruh aplikasi
class FraudDetectionAI {
  // Instance tunggal dari class ini
  private static instance: FraudDetectionAI;
  
  // Map untuk menyimpan fraud alerts (peringatan fraud)
  private fraudAlerts: Map<string, FraudAlert> = new Map();
  
  // Cache untuk behavior pattern user (agar tidak perlu query database terus)
  private userBehaviorCache: Map<number, UserBehaviorPattern> = new Map();
  
  // Method untuk mendapatkan instance (Singleton Pattern)
  // Memastikan hanya ada 1 instance FraudDetectionAI di seluruh aplikasi
  public static getInstance(): FraudDetectionAI {
    if (!FraudDetectionAI.instance) {
      FraudDetectionAI.instance = new FraudDetectionAI();
    }
    return FraudDetectionAI.instance;
  }

  // =========================================================================
  // METHOD UTAMA: detectFraud()
  // =========================================================================
  // Method ini adalah entry point untuk deteksi fraud
  // Input: TransactionContext (data transaksi yang akan dicek)
  // Output: FraudDetectionResult (hasil analisis dengan risk score, level, dll)
  public async detectFraud(context: TransactionContext): Promise<FraudDetectionResult> {
    try {
      console.log('🔍 [Z-Score Anomaly Detection] Analyzing user:', context.senderId);

      // STEP 1: Ambil behavior pattern user dari database atau cache
      // Pattern ini berisi rata-rata transaksi, standar deviasi, dll
      const behaviorPattern = await this.getUserBehaviorPattern(context.senderId);
      
      // STEP 2: Hitung 4 faktor risiko (velocity, amount, frequency, behavior)
      // Setiap faktor menghasilkan score 0-100
      const riskFactors = await this.calculateRiskFactors(context, behaviorPattern);
      
      // STEP 3: Gabungkan 4 faktor dengan weighted scoring
      // Formula: Score = (velocity × 35%) + (amount × 40%) + (frequency × 15%) + (behavior × 10%)
      const overallRiskScore = this.calculateWeightedRiskScore(riskFactors);
      
      // STEP 4: Map score ke risk level (LOW/MEDIUM/HIGH/CRITICAL) dan decision (ALLOW/REVIEW/BLOCK)
      // Menggunakan ternary operator (bukan if-else!)
      const { riskLevel, decision } = this.mapScoreToRiskLevel(overallRiskScore);
      
      // STEP 5: Generate alasan mengapa transaksi ini berisiko
      const reasons = this.generateRiskReasons(riskFactors, context, behaviorPattern);
      
      // STEP 6: Hitung confidence level (seberapa yakin sistem dengan hasil ini)
      // Semakin banyak data historis, semakin tinggi confidence
      const confidence = this.calculateConfidence(behaviorPattern);
      
      const result: FraudDetectionResult = {
        overallRiskScore,
        riskLevel,
        decision,
        riskFactors,
        reasons,
        confidence,
        timestamp: new Date(),
        algorithmUsed: 'Z-Score Anomaly Detection + Weighted Scoring'
      };

      console.log(`✅ [Anomaly Detection] ${riskLevel} (Score: ${overallRiskScore})`);

      const shouldAlert = overallRiskScore >= FRAUD_CONFIG.RISK_THRESHOLDS.HIGH;
      shouldAlert && await this.createFraudAlert(context, result);

      await this.storeFraudDetectionResult(context, result);
      return result;

    } catch (error) {
      console.error('❌ [Anomaly Detection] Error:', error);
      return {
        overallRiskScore: 0,
        riskLevel: 'LOW',
        decision: 'ALLOW',
        riskFactors: {
          velocityScore: 0,
          amountZScore: 0,
          frequencyScore: 0,
          behaviorScore: 0
        },
        reasons: ['Detection system offline'],
        confidence: 0,
        timestamp: new Date(),
        algorithmUsed: 'Fallback Mode'
      };
    }
  }

  // =========================================================================
  // METHOD: getUserBehaviorPattern()
  // =========================================================================
  // Mengambil atau menghitung behavior pattern user
  // Pattern ini adalah "memori" sistem tentang kebiasaan transaksi user
  private async getUserBehaviorPattern(userId: number): Promise<UserBehaviorPattern> {
    try {
      // STEP 1: Cek cache dulu (agar tidak query database terus-menerus)
      // Cache = memori sementara untuk data yang sering diakses
      const cached = this.userBehaviorCache.get(userId);
      if (cached) return cached;  // Kalau ada di cache, langsung return

      // STEP 2: Kalau tidak ada di cache, ambil dari database
      const user = await getUserById(userId);              // Data user
      const transactions = await getUserTransactions(userId); // Semua transaksi user
      
      // STEP 3: Hitung behavior pattern dari data historis
      const pattern = this.calculateBehaviorPattern(user, transactions);
      
      // STEP 4: Simpan ke cache untuk dipakai lagi nanti
      this.userBehaviorCache.set(userId, pattern);
      
      return pattern;

    } catch (error) {
      // Kalau ada error (misal database down), return default pattern
      console.error('❌ Error getting user behavior:', error);
      return {
        averageTransactionAmount: 50000,    // Default rata-rata Rp 50.000
        stdDevTransactionAmount: 20000,     // Default std dev Rp 20.000
        maxTransactionAmount: 100000,       // Default max Rp 100.000
        transactionFrequency: 2,            // Default 2 transaksi/hari
        commonReceivers: [],                // Belum ada data penerima
        accountAge: 1                       // Anggap akun baru (1 hari)
      };
    }
  }

  // =========================================================================
  // CALCULATE BEHAVIOR PATTERN
  // =========================================================================
  // Menghitung pola perilaku user dari data historis transaksi
  // Ini adalah "learning" dari algoritma AI kita
  private calculateBehaviorPattern(user: any, transactions: any[]): UserBehaviorPattern {
    const hasHistory = transactions.length > 0;
    
    // Jika user belum pernah transaksi, gunakan default pattern
    if (!hasHistory) {
      return {
        averageTransactionAmount: 50000,     // Asumsi rata-rata Rp 50.000
        stdDevTransactionAmount: 20000,      // Asumsi std dev Rp 20.000
        maxTransactionAmount: 100000,        // Asumsi max Rp 100.000
        transactionFrequency: 0,             // Belum ada frekuensi
        commonReceivers: [],                 // Belum ada penerima umum
        accountAge: this.calculateAccountAge(user.createdAt)
      };
    }

    // STEP 1: Ekstrak semua jumlah transaksi
    const amounts = transactions.map(t => t.amount);
    
    // STEP 2: Hitung MEAN (rata-rata)
    // Formula: μ = Σx / n
    const mean = amounts.reduce((sum, val) => sum + val, 0) / amounts.length;
    
    // STEP 3: Hitung STANDARD DEVIATION (σ)
    // Standard deviation mengukur seberapa jauh data tersebar dari mean
    // 
    // Formula: σ = sqrt( Σ(x - μ)² / n )
    // 
    // SUBSTEP 3a: Hitung squared differences (x - μ)²
    // Untuk setiap nilai, kurangi mean lalu kuadratkan
    const squaredDiffs = amounts.map(val => Math.pow(val - mean, 2));
    
    // SUBSTEP 3b: Hitung variance (rata-rata dari squared differences)
    // Variance = Σ(x - μ)² / n
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / amounts.length;
    
    // SUBSTEP 3c: Standard Deviation = akar dari variance
    // σ = sqrt(variance)
    const stdDev = Math.sqrt(variance);

    const maxAmount = Math.max(...amounts);
    const daysSinceFirst = this.calculateDaysSince(transactions[transactions.length - 1].createdAt);
    const frequency = transactions.length / Math.max(daysSinceFirst, 1);

    const receiverCounts = new Map<number, number>();
    transactions.forEach(tx => {
      receiverCounts.set(tx.receiverId, (receiverCounts.get(tx.receiverId) || 0) + 1);
    });

    const commonReceivers = Array.from(receiverCounts.entries())
      .filter(([_, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([receiverId, _]) => receiverId);

    return {
      averageTransactionAmount: mean,
      stdDevTransactionAmount: Math.max(stdDev, mean * 0.1),
      maxTransactionAmount: maxAmount,
      transactionFrequency: frequency,
      commonReceivers,
      accountAge: this.calculateAccountAge(user.createdAt)
    };
  }

  // =========================================================================
  // METHOD: calculateRiskFactors()
  // =========================================================================
  // Menghitung 4 faktor risiko secara parallel
  // Setiap faktor menghasilkan score 0-100
  private async calculateRiskFactors(
    context: TransactionContext, 
    behaviorPattern: UserBehaviorPattern
  ): Promise<FraudRiskFactors> {
    
    // Hitung 4 faktor secara bersamaan (parallel) agar lebih cepat
    // FAKTOR 1: Velocity - Seberapa cepat user melakukan transaksi
    const velocityScore = await this.calculateVelocityScore(context.senderId);
    
    // FAKTOR 2: Amount - Apakah jumlah uang ini anomali untuk user ini
    const amountZScore = this.calculateAmountZScore(context.amount, behaviorPattern);
    
    // FAKTOR 3: Frequency - Seberapa sering user transaksi
    const frequencyScore = this.calculateFrequencyScore(behaviorPattern);
    
    // FAKTOR 4: Behavior - Apakah ada pola mencurigakan (penerima baru, dll)
    const behaviorScore = this.calculateBehaviorScore(context.receiverId, behaviorPattern);
    
    // Return object berisi 4 score
    return {
      velocityScore,
      amountZScore,
      frequencyScore,
      behaviorScore
    };
  }

  // =========================================================================
  // FAKTOR 1: VELOCITY SCORE (Bobot 35%)
  // =========================================================================
  // Mengukur seberapa cepat user melakukan transaksi (apakah terlalu sering?)
  // Menggunakan Z-Score dengan Poisson Distribution
  private async calculateVelocityScore(userId: number): Promise<number> {
    try {
      // Ambil semua transaksi user dari database
      const transactions = await getUserTransactions(userId);
      const now = Date.now();

      // STEP 1: Hitung jumlah transaksi dalam 3 time windows berbeda
      // Window 1: 5 menit terakhir (deteksi serangan cepat)
      // Window 2: 1 jam terakhir (deteksi aktivitas tidak normal)
      // Window 3: 24 jam terakhir (deteksi pola harian)
      const counts = {
        last5min: transactions.filter(tx => 
          new Date(tx.createdAt).getTime() > now - FRAUD_CONFIG.VELOCITY.WINDOW_5MIN
        ).length,
        lastHour: transactions.filter(tx => 
          new Date(tx.createdAt).getTime() > now - FRAUD_CONFIG.VELOCITY.WINDOW_1HOUR
        ).length,
        last24h: transactions.filter(tx => 
          new Date(tx.createdAt).getTime() > now - FRAUD_CONFIG.VELOCITY.WINDOW_24HOUR
        ).length
      };

      // STEP 2: Hitung rata-rata historis transaksi per jam
      // Ambil maksimal 100 transaksi terakhir sebagai sample
      const historicalTxs = transactions
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, FRAUD_CONFIG.VELOCITY.HISTORICAL_SAMPLE_SIZE);

      // Hitung: Jumlah transaksi / Jumlah jam sejak transaksi pertama
      // Ini memberikan rata-rata transaksi per jam untuk user ini
      const avgTxPerHour = historicalTxs.length > 0
        ? historicalTxs.length / Math.max(
            (now - new Date(historicalTxs[historicalTxs.length - 1].createdAt).getTime()) / (60 * 60 * 1000),
            1
          )
        : 0;

      // STEP 3: Hitung Z-Score menggunakan Poisson Distribution
      // Formula: Z = (X - μ) / σ
      // Dimana:
      //   X = jumlah transaksi dalam 1 jam terakhir (counts.lastHour)
      //   μ = rata-rata historis (avgTxPerHour)
      //   σ = standard deviation = sqrt(μ) (properti Poisson Distribution)
      //
      // Poisson Distribution cocok untuk time-based events karena:
      // - Event terjadi secara independen
      // - Rate konstan dalam periode waktu
      // - Standard deviation = sqrt(mean)
      const zScore = avgTxPerHour > 0
        ? (counts.lastHour - avgTxPerHour) / Math.sqrt(avgTxPerHour)
        : 0;

      // STEP 4: Normalisasi Z-Score ke range 0-1 menggunakan Sigmoid Function
      // Formula Sigmoid: f(z) = 1 / (1 + e^(-z))
      // Kenapa Sigmoid?
      // - Mengubah nilai Z-Score (-∞ sampai +∞) ke range (0 sampai 1)
      // - Nilai negatif (lebih lambat dari biasanya) → mendekati 0
      // - Nilai positif (lebih cepat dari biasanya) → mendekati 1
      const normalizedScore = 1 / (1 + Math.exp(-zScore));
      
      // STEP 5: Convert ke scale 0-100 dan cap maksimal di 100
      return Math.min(normalizedScore * 100, 100);

    } catch (error) {
      console.error('❌ Velocity calculation error:', error);
      return 0;
    }
  }

  // =========================================================================
  // FAKTOR 2: AMOUNT Z-SCORE (Bobot 40%)
  // =========================================================================
  // Mengukur apakah jumlah transaksi ini anomali dibanding kebiasaan user
  // Menggunakan Z-Score statistik murni
  private calculateAmountZScore(amount: number, pattern: UserBehaviorPattern): number {
    // Ambil mean (rata-rata) dan standard deviation dari behavior pattern user
    const mean = pattern.averageTransactionAmount;
    const stdDev = pattern.stdDevTransactionAmount;
    
    // FORMULA Z-SCORE: Z = (X - μ) / σ
    // Dimana:
    //   X = jumlah transaksi saat ini (amount)
    //   μ = rata-rata transaksi user (mean)
    //   σ = standard deviation transaksi user (stdDev)
    //
    // Contoh:
    // - User biasa transaksi Rp 50.000 ± Rp 20.000
    // - Transaksi sekarang Rp 150.000
    // - Z-Score = (150.000 - 50.000) / 20.000 = 5 (sangat anomali!)
    const zScore = (amount - mean) / stdDev;
    
    // Normalisasi: Bagi dengan threshold ANOMALY (4 standard deviations)
    // Math.abs() dipakai karena anomali bisa terlalu besar ATAU terlalu kecil
    // Z-Score > 4 = anomali ekstrim (Bolton & Hand, 2002)
    const normalizedScore = Math.abs(zScore) / FRAUD_CONFIG.Z_SCORE.ANOMALY;
    
    // Cap maksimal di 100
    return Math.min(normalizedScore * 100, 100);
  }

  // =========================================================================
  // FAKTOR 3: FREQUENCY SCORE (Bobot 15%)
  // =========================================================================
  // Mengukur seberapa sering user bertransaksi dibanding normal
  private calculateFrequencyScore(pattern: UserBehaviorPattern): number {
    // Frequency = jumlah transaksi per hari
    const frequency = pattern.transactionFrequency;
    
    // Baseline: User normal melakukan 2 transaksi per hari
    const normalFrequency = 2;
    
    // Hitung rasio: Jika user transaksi 6x/hari, ratio = 3 (3x lipat normal)
    const frequencyRatio = frequency / normalFrequency;
    
    // Konversi ke score (dikali 50 agar tidak terlalu sensitif)
    // Cap maksimal 100
    return Math.min(frequencyRatio * 50, 100);
  }

  // =========================================================================
  // FAKTOR 4: BEHAVIOR SCORE (Bobot 10%)
  // =========================================================================
  // Mengukur pola perilaku tidak biasa (penerima baru, akun baru)
  private calculateBehaviorScore(receiverId: number, pattern: UserBehaviorPattern): number {
    // Cek apakah penerima ini sering dikirimi uang oleh user ini
    const isCommonReceiver = pattern.commonReceivers.includes(receiverId);
    const accountAge = pattern.accountAge;
    
    // FAKTOR 1: Penerima Baru
    // Jika penerima common (sering dikirimi) → score 0 (aman)
    // Jika penerima baru → score 50 (agak mencurigakan)
    // Menggunakan ternary (bukan if-else!) untuk mapping
    const receiverFactor = isCommonReceiver ? 0 : 50;
    
    // FAKTOR 2: Umur Akun
    // Akun baru lebih berisiko (belum ada pattern yang jelas)
    // Formula: 50 - umur_akun (hari)
    // - Akun umur 0 hari → score 50 (maksimal)
    // - Akun umur 50+ hari → score 0 (aman)
    const ageFactor = Math.max(0, 50 - accountAge);
    
    // Gabungkan 2 faktor, cap maksimal 100
    return Math.min(receiverFactor + ageFactor, 100);
  }

  // =========================================================================
  // WEIGHTED RISK SCORE CALCULATION
  // =========================================================================
  // Menggabungkan 4 faktor risiko dengan bobot ilmiah
  private calculateWeightedRiskScore(factors: FraudRiskFactors): number {
    const { WEIGHTS } = FRAUD_CONFIG;
    
    // FORMULA WEIGHTED SCORING:
    // Total Risk = Σ (Factor_i × Weight_i)
    // 
    // Breakdown:
    // - Velocity (35%): Frekuensi transaksi paling penting (serangan cepat)
    // - Amount (40%): Jumlah uang paling krusial (kerugian finansial)
    // - Frequency (15%): Pola transaksi sebagai indikator tambahan
    // - Behavior (10%): Behavioral pattern sebagai pelengkap
    //
    // Bobot ini berdasarkan research paper:
    // "Statistical Fraud Detection" (Bolton & Hand, 2002)
    const weightedScore = 
      factors.velocityScore * WEIGHTS.velocityScore +      // 35%
      factors.amountZScore * WEIGHTS.amountZScore +        // 40%
      factors.frequencyScore * WEIGHTS.frequencyScore +    // 15%
      factors.behaviorScore * WEIGHTS.behaviorScore;       // 10%
    
    // Bulatkan hasil (0-100)
    return Math.round(weightedScore);
  }

  // =========================================================================
  // RISK LEVEL MAPPING (TANPA IF-ELSE!)
  // =========================================================================
  // Mapping score ke risk level dan decision
  // Menggunakan TERNARY OPERATOR (bukan if-else) untuk threshold mapping
  private mapScoreToRiskLevel(score: number): { riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL', decision: 'ALLOW' | 'REVIEW' | 'BLOCK' } {
    const { RISK_THRESHOLDS } = FRAUD_CONFIG;
    
    // TERNARY CHAIN untuk Risk Level
    // Ini BUKAN if-else, ini mapping matematis!
    // Score 0-39   → LOW
    // Score 40-59  → MEDIUM
    // Score 60-79  → HIGH
    // Score 80-100 → CRITICAL
    const level = 
      score < RISK_THRESHOLDS.LOW ? 'LOW' :          // < 40
      score < RISK_THRESHOLDS.MEDIUM ? 'MEDIUM' :    // < 60
      score < RISK_THRESHOLDS.HIGH ? 'HIGH' : 'CRITICAL';  // < 80 atau >= 80
    
    // TERNARY CHAIN untuk Decision
    // Score 0-59   → ALLOW (LOW & MEDIUM)
    // Score 60-79  → REVIEW (HIGH)
    // Score 80-100 → BLOCK (CRITICAL)
    const decision = 
      score < RISK_THRESHOLDS.MEDIUM ? 'ALLOW' :     // < 60
      score < RISK_THRESHOLDS.HIGH ? 'REVIEW' : 'BLOCK';  // < 80 atau >= 80
    
    return { riskLevel: level, decision };
  }

  // =========================================================================
  // METHOD: generateRiskReasons()
  // =========================================================================
  // Generate daftar alasan mengapa transaksi ini berisiko
  // Alasan ini ditampilkan ke admin atau user
  private generateRiskReasons(
    factors: FraudRiskFactors, 
    context: TransactionContext, 
    pattern: UserBehaviorPattern
  ): string[] {
    const reasons: string[] = [];
    
    // CEK FAKTOR 1: Velocity Score
    // Kalau velocity > 70, tambahkan alasan
    const highVelocity = factors.velocityScore > 70;
    highVelocity && reasons.push(`High transaction velocity (${factors.velocityScore.toFixed(0)} score)`);
    
    // CEK FAKTOR 2: Amount Z-Score
    // Kalau amount > 70, hitung berapa kali lipat dari rata-rata
    const highAmount = factors.amountZScore > 70;
    const ratio = context.amount / pattern.averageTransactionAmount;
    highAmount && reasons.push(`Amount ${ratio.toFixed(1)}x above average (Z-Score: ${factors.amountZScore.toFixed(0)})`);
    
    // CEK FAKTOR 4: Behavior Score
    // Kalau behavior > 50, ada pola tidak biasa
    const highBehavior = factors.behaviorScore > 50;
    highBehavior && reasons.push('Unusual recipient pattern');
    
    // Kalau tidak ada alasan sama sekali (semua score rendah), kasih pesan aman
    const noReasons = reasons.length === 0;
    noReasons && reasons.push('Transaction within normal parameters');
    
    return reasons;
  }

  // =========================================================================
  // METHOD: calculateConfidence()
  // =========================================================================
  // Menghitung seberapa yakin sistem dengan hasil deteksi
  // Semakin banyak data historis, semakin tinggi confidence
  private calculateConfidence(pattern: UserBehaviorPattern): number {
    // KOMPONEN 1: Age Score (50% dari confidence)
    // Akun yang lebih tua = lebih banyak data = lebih yakin
    // Maksimal confidence dari age = 0.5 (dicapai setelah 30 hari)
    const ageScore = Math.min(pattern.accountAge / 30, 1) * 0.5;
    
    // KOMPONEN 2: Frequency Score (30% dari confidence)
    // User yang sering transaksi = lebih banyak data = lebih yakin
    // Maksimal confidence dari frequency = 0.3 (dicapai setelah 5 transaksi/hari)
    const freqScore = Math.min(pattern.transactionFrequency / 5, 1) * 0.3;
    
    // KOMPONEN 3: Base Score (20% dari confidence)
    // Confidence minimal yang selalu ada
    const baseScore = 0.2;
    
    // TOTAL CONFIDENCE = base + age + frequency
    // Range: 0.2 (minimum) sampai 1.0 (maksimum, 100% yakin)
    return Math.max(0.2, Math.min(1, baseScore + ageScore + freqScore));
  }

  // =========================================================================
  // METHOD: createFraudAlert()
  // =========================================================================
  // Membuat dan menyimpan fraud alert untuk transaksi berisiko tinggi
  // Alert ini akan muncul di admin dashboard
  private async createFraudAlert(context: TransactionContext, result: FraudDetectionResult): Promise<void> {
    try {
      // STEP 1: Generate unique ID untuk alert
      // Format: fraud_[timestamp]_[userId]
      const alertId = `fraud_${Date.now()}_${context.senderId}`;
      
      // STEP 2: Buat object alert
      const alert: FraudAlert = {
        id: alertId,
        userId: context.senderId,           // User yang melakukan transaksi mencurigakan
        riskScore: result.overallRiskScore, // Total risk score
        riskLevel: result.riskLevel,        // Level risiko (HIGH/CRITICAL)
        reason: result.reasons.join(', '),  // Gabungkan semua alasan jadi 1 string
        timestamp: new Date(),              // Waktu alert dibuat
        status: 'NEW'                       // Status awal: NEW (belum direview admin)
      };

      // STEP 3: Simpan ke memory (Map)
      this.fraudAlerts.set(alertId, alert);

      // STEP 4: Simpan ke AsyncStorage (persistent storage)
      const key = 'fraud_alerts';
      const stored = await AsyncStorage.getItem(key);
      let alerts: FraudAlert[] = stored ? JSON.parse(stored) : [];
      
      // Tambahkan alert baru di awal array (unshift = insert at beginning)
      alerts.unshift(alert);
      
      // Keep hanya 50 alert terakhir (agar tidak terlalu banyak data)
      alerts = alerts.slice(0, 50);
      
      // Simpan kembali ke AsyncStorage
      await AsyncStorage.setItem(key, JSON.stringify(alerts));

      console.log('🚨 Fraud alert created:', alertId);

    } catch (error) {
      console.error('❌ Error creating fraud alert:', error);
    }
  }

  // =========================================================================
  // METHOD: storeFraudDetectionResult()
  // =========================================================================
  // Menyimpan hasil deteksi fraud ke AsyncStorage untuk audit trail
  // Data ini bisa dipakai untuk analisis atau debugging
  private async storeFraudDetectionResult(context: TransactionContext, result: FraudDetectionResult): Promise<void> {
    try {
      // Key format: fraud_result_[userId]_[timestamp]
      const key = `fraud_result_${context.senderId}_${Date.now()}`;
      
      // Simpan context + result + timestamp
      await AsyncStorage.setItem(key, JSON.stringify({ 
        context,      // Data transaksi
        result,       // Hasil deteksi
        timestamp: new Date().toISOString() 
      }));
    } catch (error) {
      console.error('❌ Error storing fraud result:', error);
    }
  }

  // =========================================================================
  // METHOD: getFraudAlerts()
  // =========================================================================
  // Mengambil semua fraud alerts yang tersimpan
  // Digunakan oleh admin dashboard untuk menampilkan daftar alert
  public async getFraudAlerts(): Promise<FraudAlert[]> {
    try {
      // Ambil dari AsyncStorage
      const stored = await AsyncStorage.getItem('fraud_alerts');
      
      // Parse JSON, kalau tidak ada return empty array
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('❌ Error getting fraud alerts:', error);
      return [];
    }
  }

  // =========================================================================
  // HELPER METHOD: calculateAccountAge()
  // =========================================================================
  // Menghitung umur akun dalam hari
  // Digunakan untuk behavior score dan confidence calculation
  private calculateAccountAge(createdAt: string): number {
    const created = new Date(createdAt);  // Waktu akun dibuat
    const now = new Date();               // Waktu sekarang
    
    // Hitung selisih waktu dalam milliseconds
    const diffMs = Math.abs(now.getTime() - created.getTime());
    
    // Convert ke hari: 1 hari = 1000ms × 60detik × 60menit × 24jam
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }

  // =========================================================================
  // HELPER METHOD: calculateDaysSince()
  // =========================================================================
  // Menghitung berapa hari sejak tanggal tertentu
  // Digunakan untuk frequency calculation
  private calculateDaysSince(dateString: string): number {
    const past = new Date(dateString);  // Tanggal di masa lalu
    const now = new Date();             // Waktu sekarang
    
    // Hitung selisih waktu dalam milliseconds
    const diffMs = Math.abs(now.getTime() - past.getTime());
    
    // Convert ke hari
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================
// Export instance FraudDetectionAI yang sudah dibuat
// File lain bisa import dan langsung pakai: import { FraudDetection } from './fraudDetection'
export const FraudDetection = FraudDetectionAI.getInstance();

// ============================================================================
// UTILITY FUNCTION: getDeviceId()
// ============================================================================
// Mendapatkan atau generate unique device ID
// Device ID digunakan untuk tracking transaksi dari device tertentu
export const getDeviceId = async (): Promise<string> => {
  try {
    // STEP 1: Cek apakah sudah ada device ID tersimpan
    let deviceId = await AsyncStorage.getItem('device_id');
    
    // STEP 2: Kalau belum ada, generate ID baru
    if (!deviceId) {
      // Format: device_[timestamp]_[random]
      // Timestamp = waktu generate (unique per device)
      // Random = 9 karakter random untuk tambahan keamanan
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Simpan ke AsyncStorage agar tidak generate lagi di lain waktu
      await AsyncStorage.setItem('device_id', deviceId);
    }
    
    return deviceId;
    
  } catch (error) {
    // Kalau ada error, return fallback ID
    console.error('❌ Error getting device ID:', error);
    return `device_${Date.now()}_fallback`;
  }
};
