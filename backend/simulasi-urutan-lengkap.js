// ============================================================================
// SIMULASI LENGKAP FRAUD DETECTION
// Tanpa Clear Screen - Semua Output Ditampilkan Berurutan
// ============================================================================

console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('                   🔍 FRAUD DETECTION SIMULATION                           ');
console.log('              Urutan Rumus dari Awal Sampai Akhir                          ');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');

// ============================================================================
// STEP 0: DATA TRANSAKSI USER
// ============================================================================
console.log('┌─────────────────────────────────────────────────────────────────────────┐');
console.log('│ STEP 0: DATA TRANSAKSI HISTORIS USER                                   │');
console.log('└─────────────────────────────────────────────────────────────────────────┘');
console.log('');

// Data transaksi historis (15 transaksi terakhir)
const historicalData = [
  { id: 1, amount: 15000, time: '08:15' },
  { id: 2, amount: 20000, time: '08:45' },
  { id: 3, amount: 18000, time: '12:30' },
  { id: 4, amount: 25000, time: '14:20' },
  { id: 5, amount: 22000, time: '15:10' },
  { id: 6, amount: 19000, time: '16:45' },
  { id: 7, amount: 17000, time: '09:30' },
  { id: 8, amount: 21000, time: '11:15' },
  { id: 9, amount: 23000, time: '13:45' },
  { id: 10, amount: 16000, time: '10:20' },
  { id: 11, amount: 24000, time: '14:50' },
  { id: 12, amount: 20000, time: '08:30' },
  { id: 13, amount: 18000, time: '12:10' },
  { id: 14, amount: 22000, time: '15:40' },
  { id: 15, amount: 19000, time: '09:45' }
];

console.log('📊 Transaksi Historis (15 transaksi terakhir):');
console.log('');
historicalData.forEach(tx => {
  console.log(`   #${tx.id.toString().padStart(2)} → Rp ${tx.amount.toLocaleString('id-ID').padStart(10)} @ ${tx.time}`);
});

const amounts = historicalData.map(tx => tx.amount);
console.log('');
console.log(`📝 Array Amount: [${amounts.join(', ')}]`);
console.log('');

// Transaksi baru yang akan dideteksi
const newTransaction = {
  id: 16,
  amount: 85000,  // 👈 Mencurigakan! 4x lipat dari biasanya
  time: '16:30',
  velocityTxCount: 8  // 8 transaksi dalam 1 jam terakhir (biasanya 3.5)
};

console.log('🆕 TRANSAKSI BARU (yang akan dideteksi):');
console.log(`   #${newTransaction.id} → Rp ${newTransaction.amount.toLocaleString('id-ID')} @ ${newTransaction.time}`);
console.log(`   Velocity: ${newTransaction.velocityTxCount} transaksi dalam 1 jam terakhir`);
console.log('');

// ============================================================================
// STEP 1: HITUNG MEAN (μ) - RATA-RATA
// ============================================================================
console.log('┌─────────────────────────────────────────────────────────────────────────┐');
console.log('│ STEP 1: HITUNG MEAN (μ) - RATA-RATA                                    │');
console.log('└─────────────────────────────────────────────────────────────────────────┘');
console.log('');

console.log('📐 RUMUS MEAN:');
console.log('');
console.log('        Σx     x₁ + x₂ + x₃ + ... + xₙ');
console.log('   μ = ─── = ─────────────────────────');
console.log('        n              n');
console.log('');
console.log('   Dimana:');
console.log('   • μ (mu)    = Mean (rata-rata)');
console.log('   • Σx (sigma)= Jumlah semua nilai');
console.log('   • n         = Jumlah data');
console.log('');

// Hitung manual
const sum = amounts.reduce((acc, val) => acc + val, 0);
const n = amounts.length;
const mean = sum / n;

console.log('📊 PERHITUNGAN:');
console.log('');
console.log(`   Σx = ${amounts[0]} + ${amounts[1]} + ${amounts[2]} + ... + ${amounts[14]}`);
console.log(`      = ${sum.toLocaleString('id-ID')}`);
console.log('');
console.log(`   n  = ${n} transaksi`);
console.log('');
console.log(`   μ  = ${sum.toLocaleString('id-ID')} / ${n}`);
console.log(`      = Rp ${mean.toLocaleString('id-ID')}`);
console.log('');
console.log(`✅ MEAN = Rp ${mean.toLocaleString('id-ID')}`);
console.log('');

// ============================================================================
// STEP 2: HITUNG VARIANCE (σ²) - VARIANS
// ============================================================================
console.log('┌─────────────────────────────────────────────────────────────────────────┐');
console.log('│ STEP 2: HITUNG VARIANCE (σ²) - VARIANS                                 │');
console.log('└─────────────────────────────────────────────────────────────────────────┘');
console.log('');

console.log('📐 RUMUS VARIANCE:');
console.log('');
console.log('        Σ(x - μ)²   (x₁-μ)² + (x₂-μ)² + ... + (xₙ-μ)²');
console.log('   σ² = ───────── = ─────────────────────────────────');
console.log('           n                      n');
console.log('');
console.log('   Dimana:');
console.log('   • σ² (sigma kuadrat) = Variance (varians)');
console.log('   • (x - μ)            = Selisih dari mean');
console.log('   • (x - μ)²           = Selisih dikuadratkan');
console.log('   • n                  = Jumlah data');
console.log('');

// Hitung deviasi
const deviations = amounts.map(x => {
  const deviation = x - mean;
  const squared = deviation * deviation;
  return { x, deviation, squared };
});

console.log('📊 PERHITUNGAN DEVIASI (x - μ)²:');
console.log('');
console.log('   Amount (x)  |  x - μ        | (x - μ)²');
console.log('   ─────────────────────────────────────────────');
deviations.forEach((d, i) => {
  const amountStr = d.x.toLocaleString('id-ID').padStart(10);
  const devStr = d.deviation.toFixed(2).padStart(10);
  const sqStr = d.squared.toFixed(2).padStart(12);
  console.log(`   ${amountStr} | ${devStr} | ${sqStr}`);
});

const sumOfSquares = deviations.reduce((acc, d) => acc + d.squared, 0);
const variance = sumOfSquares / n;

console.log('   ─────────────────────────────────────────────');
console.log(`   Σ(x-μ)² = ${sumOfSquares.toFixed(2)}`);
console.log('');
console.log(`   σ² = ${sumOfSquares.toFixed(2)} / ${n}`);
console.log(`      = ${variance.toFixed(2)}`);
console.log('');
console.log(`✅ VARIANCE = ${variance.toFixed(2)} (dalam Rupiah²)`);
console.log('');

// ============================================================================
// STEP 3: HITUNG STANDARD DEVIATION (σ) - SIMPANGAN BAKU
// ============================================================================
console.log('┌─────────────────────────────────────────────────────────────────────────┐');
console.log('│ STEP 3: HITUNG STANDARD DEVIATION (σ) - SIMPANGAN BAKU                 │');
console.log('└─────────────────────────────────────────────────────────────────────────┘');
console.log('');

console.log('📐 RUMUS STANDARD DEVIATION:');
console.log('');
console.log('        ┌────────');
console.log('   σ = √  σ²');
console.log('');
console.log('   Dimana:');
console.log('   • σ (sigma)  = Standard Deviation');
console.log('   • σ²         = Variance (dari STEP 2)');
console.log('   • √          = Akar kuadrat');
console.log('');
console.log('   ⚠️ KENAPA PERLU AKAR KUADRAT?');
console.log('   Karena variance dalam satuan Rupiah², kita butuh');
console.log('   akar kuadrat untuk kembalikan ke satuan Rupiah.');
console.log('');

const stdDev = Math.sqrt(variance);

console.log('📊 PERHITUNGAN:');
console.log('');
console.log(`   σ = √${variance.toFixed(2)}`);
console.log(`     = ${stdDev.toFixed(2)}`);
console.log('');
console.log(`✅ STANDARD DEVIATION = Rp ${stdDev.toFixed(2)}`);
console.log('');

// ============================================================================
// STEP 4A: HITUNG Z-SCORE UNTUK AMOUNT
// ============================================================================
console.log('┌─────────────────────────────────────────────────────────────────────────┐');
console.log('│ STEP 4A: HITUNG Z-SCORE UNTUK AMOUNT                                   │');
console.log('└─────────────────────────────────────────────────────────────────────────┘');
console.log('');

console.log('📐 RUMUS Z-SCORE:');
console.log('');
console.log('       X - μ');
console.log('   Z = ─────');
console.log('         σ');
console.log('');
console.log('   Dimana:');
console.log('   • Z = Z-Score (berapa standar deviasi dari mean)');
console.log('   • X = Nilai transaksi baru');
console.log('   • μ = Mean (dari STEP 1)');
console.log('   • σ = Standard Deviation (dari STEP 3)');
console.log('');

const X_amount = newTransaction.amount;
const zScore_amount = (X_amount - mean) / stdDev;

console.log('📊 PERHITUNGAN:');
console.log('');
console.log(`   X = Rp ${X_amount.toLocaleString('id-ID')} (transaksi baru)`);
console.log(`   μ = Rp ${mean.toLocaleString('id-ID')} (mean)`);
console.log(`   σ = Rp ${stdDev.toFixed(2)} (std dev)`);
console.log('');
console.log(`   Z = (${X_amount.toLocaleString('id-ID')} - ${mean.toLocaleString('id-ID')}) / ${stdDev.toFixed(2)}`);
console.log(`     = ${(X_amount - mean).toFixed(2)} / ${stdDev.toFixed(2)}`);
console.log(`     = ${zScore_amount.toFixed(4)}`);
console.log('');
console.log(`✅ Z-SCORE AMOUNT = ${zScore_amount.toFixed(4)}`);
console.log('');
console.log(`   Interpretasi: Transaksi ini ${zScore_amount.toFixed(2)} standar deviasi`);
console.log(`                 LEBIH TINGGI dari rata-rata!`);
console.log('');

// ============================================================================
// STEP 4B: HITUNG Z-SCORE UNTUK VELOCITY
// ============================================================================
console.log('┌─────────────────────────────────────────────────────────────────────────┐');
console.log('│ STEP 4B: HITUNG Z-SCORE UNTUK VELOCITY                                 │');
console.log('└─────────────────────────────────────────────────────────────────────────┘');
console.log('');

console.log('📐 RUMUS Z-SCORE DENGAN POISSON DISTRIBUTION:');
console.log('');
console.log('       X - μ         X - μ');
console.log('   Z = ───── = ───────────  (untuk Poisson: σ = √μ)');
console.log('         σ          √μ');
console.log('');
console.log('   Dimana:');
console.log('   • X = Jumlah transaksi dalam 1 jam terakhir');
console.log('   • μ = Rata-rata transaksi per jam (historis)');
console.log('   • σ = Standard Deviation = √μ (properti Poisson)');
console.log('');
console.log('   ⚠️ KENAPA POISSON?');
console.log('   Poisson Distribution cocok untuk time-based events karena:');
console.log('   • Event terjadi secara independen');
console.log('   • Rate konstan dalam periode waktu');
console.log('   • Standard deviation = √mean');
console.log('');

const X_velocity = newTransaction.velocityTxCount;
const mu_velocity = 3.5;  // rata-rata historis (3.5 transaksi/jam)
const sigma_velocity = Math.sqrt(mu_velocity);
const zScore_velocity = (X_velocity - mu_velocity) / sigma_velocity;

console.log('📊 PERHITUNGAN:');
console.log('');
console.log(`   X = ${X_velocity} transaksi (1 jam terakhir)`);
console.log(`   μ = ${mu_velocity} transaksi/jam (historis)`);
console.log(`   σ = √${mu_velocity} = ${sigma_velocity.toFixed(4)}`);
console.log('');
console.log(`   Z = (${X_velocity} - ${mu_velocity}) / ${sigma_velocity.toFixed(4)}`);
console.log(`     = ${(X_velocity - mu_velocity).toFixed(2)} / ${sigma_velocity.toFixed(4)}`);
console.log(`     = ${zScore_velocity.toFixed(4)}`);
console.log('');
console.log(`✅ Z-SCORE VELOCITY = ${zScore_velocity.toFixed(4)}`);
console.log('');
console.log(`   Interpretasi: User melakukan transaksi ${zScore_velocity.toFixed(2)} standar deviasi`);
console.log(`                 LEBIH CEPAT dari biasanya!`);
console.log('');

// ============================================================================
// STEP 5A: NORMALISASI VELOCITY DENGAN SIGMOID
// ============================================================================
console.log('┌─────────────────────────────────────────────────────────────────────────┐');
console.log('│ STEP 5A: NORMALISASI VELOCITY DENGAN SIGMOID                           │');
console.log('└─────────────────────────────────────────────────────────────────────────┘');
console.log('');

console.log('📐 RUMUS SIGMOID:');
console.log('');
console.log('              1');
console.log('   f(z) = ─────────');
console.log('          1 + e^(-z)');
console.log('');
console.log('   Dimana:');
console.log('   • f(z)  = Output sigmoid (0 sampai 1)');
console.log('   • z     = Z-Score dari STEP 4B');
console.log('   • e     = Euler\'s number (2.71828...)');
console.log('');
console.log('   🎯 KENAPA SIGMOID?');
console.log('   • Handle nilai negatif (lambat = aman, cepat = fraud)');
console.log('   • Output terbatas 0-1 (tidak bisa over 100%)');
console.log('   • Smooth S-curve transition');
console.log('   • Interpretasi seperti probability');
console.log('');

const e_power = Math.exp(-zScore_velocity);
const sigmoid = 1 / (1 + e_power);
const velocityScore = sigmoid * 100;

console.log('📊 PERHITUNGAN:');
console.log('');
console.log(`   z = ${zScore_velocity.toFixed(4)} (Z-Score velocity)`);
console.log('');
console.log(`   STEP 1: Hitung e^(-z)`);
console.log(`   e^(-${zScore_velocity.toFixed(4)}) = e^${(-zScore_velocity).toFixed(4)}`);
console.log(`                      = ${e_power.toFixed(6)}`);
console.log('');
console.log(`   STEP 2: Hitung 1 + e^(-z)`);
console.log(`   1 + ${e_power.toFixed(6)} = ${(1 + e_power).toFixed(6)}`);
console.log('');
console.log(`   STEP 3: Hitung 1 / (1 + e^(-z))`);
console.log(`   1 / ${(1 + e_power).toFixed(6)} = ${sigmoid.toFixed(6)}`);
console.log('');
console.log(`   STEP 4: Convert ke persentase (× 100)`);
console.log(`   ${sigmoid.toFixed(6)} × 100 = ${velocityScore.toFixed(2)}%`);
console.log('');
console.log(`✅ VELOCITY SCORE = ${velocityScore.toFixed(2)}%`);
console.log('');

// Perbandingan dengan Linear
const linearScore = (Math.abs(zScore_velocity) / 4) * 100;
console.log('📊 PERBANDINGAN DENGAN LINEAR:');
console.log('');
console.log(`   Linear Score = (|${zScore_velocity.toFixed(4)}| / 4) × 100`);
console.log(`                = (${Math.abs(zScore_velocity).toFixed(4)} / 4) × 100`);
console.log(`                = ${linearScore.toFixed(2)}%`);
console.log('');
console.log(`   ❌ Linear GAGAL karena tidak bedakan positif vs negatif!`);
console.log(`      Z = -2.4 (lambat) → 60% (tinggi) ❌`);
console.log(`      Z = +2.4 (cepat)  → 60% (tinggi) ✅`);
console.log('');
console.log(`   ✅ Sigmoid BERHASIL handle negatif dengan benar!`);
console.log(`      Z = -2.4 (lambat) → 8.3% (rendah) ✅`);
console.log(`      Z = +2.4 (cepat)  → 91.7% (tinggi) ✅`);
console.log('');

// ============================================================================
// STEP 5B: NORMALISASI AMOUNT DENGAN LINEAR
// ============================================================================
console.log('┌─────────────────────────────────────────────────────────────────────────┐');
console.log('│ STEP 5B: NORMALISASI AMOUNT DENGAN LINEAR                              │');
console.log('└─────────────────────────────────────────────────────────────────────────┘');
console.log('');

console.log('📐 RUMUS LINEAR NORMALIZATION:');
console.log('');
console.log('              |Z|');
console.log('   Score = ────── × 100');
console.log('              4');
console.log('');
console.log('   Dimana:');
console.log('   • |Z|   = Absolute Z-Score (dari STEP 4A)');
console.log('   • 4     = Threshold (4-Sigma Rule = 99.7% confidence)');
console.log('   • × 100 = Convert ke persentase');
console.log('');
console.log('   🎯 KENAPA LINEAR UNTUK AMOUNT?');
console.log('   • Amount tidak punya "negatif meaningful"');
console.log('   • Yang penting: seberapa JAUH dari normal');
console.log('   • Linear lebih simple dan interpretable');
console.log('   • Threshold 4 → Z > 4 = 100% (extreme fraud)');
console.log('');

const amountScore = Math.min((Math.abs(zScore_amount) / 4) * 100, 100);

console.log('📊 PERHITUNGAN:');
console.log('');
console.log(`   Z = ${zScore_amount.toFixed(4)} (Z-Score amount)`);
console.log(`  |Z|= ${Math.abs(zScore_amount).toFixed(4)} (absolute)`);
console.log('');
console.log(`   Score = (${Math.abs(zScore_amount).toFixed(4)} / 4) × 100`);
console.log(`         = ${(Math.abs(zScore_amount) / 4).toFixed(4)} × 100`);
console.log(`         = ${amountScore.toFixed(2)}%`);
console.log('');
console.log(`✅ AMOUNT SCORE = ${amountScore.toFixed(2)}%`);
console.log('');

// ============================================================================
// STEP 6: WEIGHTED SCORING (RISK CALCULATION)
// ============================================================================
console.log('┌─────────────────────────────────────────────────────────────────────────┐');
console.log('│ STEP 6: WEIGHTED SCORING (RISK CALCULATION)                            │');
console.log('└─────────────────────────────────────────────────────────────────────────┘');
console.log('');

console.log('📐 RUMUS WEIGHTED SCORING:');
console.log('');
console.log('   Risk = (Velocity × 35%) + (Amount × 40%) +');
console.log('          (Frequency × 15%) + (Behavior × 10%)');
console.log('');
console.log('   Dimana:');
console.log('   • Velocity  = Score dari STEP 5A (Sigmoid)');
console.log('   • Amount    = Score dari STEP 5B (Linear)');
console.log('   • Frequency = Score transaksi berulang (asumsi 45%)');
console.log('   • Behavior  = Score pola anomali (asumsi 30%)');
console.log('');
console.log('   🎯 KENAPA BOBOT INI?');
console.log('   • Amount (40%)    → Paling penting (nilai uang)');
console.log('   • Velocity (35%)  → Sangat penting (serangan cepat)');
console.log('   • Frequency (15%) → Cukup penting (pola berulang)');
console.log('   • Behavior (10%)  → Pendukung (anomali lain)');
console.log('');

// Asumsi score lain
const frequencyScore = 45;
const behaviorScore = 30;

// Weights
const weights = {
  velocity: 0.35,
  amount: 0.40,
  frequency: 0.15,
  behavior: 0.10
};

const riskScore = 
  (velocityScore * weights.velocity) +
  (amountScore * weights.amount) +
  (frequencyScore * weights.frequency) +
  (behaviorScore * weights.behavior);

console.log('📊 PERHITUNGAN:');
console.log('');
console.log('   Komponen Scores:');
console.log(`   • Velocity Score  = ${velocityScore.toFixed(2)}% (bobot 35%)`);
console.log(`   • Amount Score    = ${amountScore.toFixed(2)}% (bobot 40%)`);
console.log(`   • Frequency Score = ${frequencyScore.toFixed(2)}% (bobot 15%)`);
console.log(`   • Behavior Score  = ${behaviorScore.toFixed(2)}% (bobot 10%)`);
console.log('');
console.log('   Risk Calculation:');
console.log(`   Risk = (${velocityScore.toFixed(2)} × 0.35) + (${amountScore.toFixed(2)} × 0.40) +`);
console.log(`          (${frequencyScore.toFixed(2)} × 0.15) + (${behaviorScore.toFixed(2)} × 0.10)`);
console.log('');
console.log(`        = ${(velocityScore * weights.velocity).toFixed(2)} + ${(amountScore * weights.amount).toFixed(2)} +`);
console.log(`          ${(frequencyScore * weights.frequency).toFixed(2)} + ${(behaviorScore * weights.behavior).toFixed(2)}`);
console.log('');
console.log(`        = ${riskScore.toFixed(2)}%`);
console.log('');
console.log(`✅ TOTAL RISK SCORE = ${riskScore.toFixed(2)}%`);
console.log('');

// ============================================================================
// STEP 7: DECISION (APPROVE OR BLOCK)
// ============================================================================
console.log('┌─────────────────────────────────────────────────────────────────────────┐');
console.log('│ STEP 7: DECISION (APPROVE OR BLOCK)                                    │');
console.log('└─────────────────────────────────────────────────────────────────────────┘');
console.log('');

console.log('📐 RUMUS DECISION:');
console.log('');
console.log('   IF Risk > 70% THEN');
console.log('      Decision = BLOCK (Fraud Detected)');
console.log('   ELSE');
console.log('      Decision = APPROVE (Safe Transaction)');
console.log('   END IF');
console.log('');
console.log('   🎯 KENAPA THRESHOLD 70%?');
console.log('   • Balance antara security dan user experience');
console.log('   • < 70% = False positive rate rendah');
console.log('   • > 70% = High confidence fraud detection');
console.log('');

const threshold = 70;
const decision = riskScore > threshold ? 'BLOCK' : 'APPROVE';
const status = riskScore > threshold ? '🚨 FRAUD DETECTED!' : '✅ SAFE TRANSACTION';

console.log('📊 DECISION:');
console.log('');
console.log(`   Risk Score = ${riskScore.toFixed(2)}%`);
console.log(`   Threshold  = ${threshold}%`);
console.log('');
console.log(`   ${riskScore.toFixed(2)}% ${riskScore > threshold ? '>' : '<'} ${threshold}%`);
console.log('');
console.log(`   Decision: ${decision}`);
console.log(`   Status:   ${status}`);
console.log('');

// ============================================================================
// RINGKASAN FINAL
// ============================================================================
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('                          📊 RINGKASAN FINAL                               ');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');
console.log('🔢 STATISTIK DASAR:');
console.log(`   • Mean (μ)             = Rp ${mean.toLocaleString('id-ID')}`);
console.log(`   • Variance (σ²)        = ${variance.toFixed(2)}`);
console.log(`   • Std Deviation (σ)    = Rp ${stdDev.toFixed(2)}`);
console.log('');
console.log('📈 Z-SCORES:');
console.log(`   • Amount Z-Score       = ${zScore_amount.toFixed(4)}`);
console.log(`   • Velocity Z-Score     = ${zScore_velocity.toFixed(4)}`);
console.log('');
console.log('🎯 NORMALIZED SCORES:');
console.log(`   • Velocity (Sigmoid)   = ${velocityScore.toFixed(2)}%`);
console.log(`   • Amount (Linear)      = ${amountScore.toFixed(2)}%`);
console.log(`   • Frequency            = ${frequencyScore.toFixed(2)}%`);
console.log(`   • Behavior             = ${behaviorScore.toFixed(2)}%`);
console.log('');
console.log('⚖️ WEIGHTED SCORES:');
console.log(`   • Velocity × 35%       = ${(velocityScore * weights.velocity).toFixed(2)}%`);
console.log(`   • Amount × 40%         = ${(amountScore * weights.amount).toFixed(2)}%`);
console.log(`   • Frequency × 15%      = ${(frequencyScore * weights.frequency).toFixed(2)}%`);
console.log(`   • Behavior × 10%       = ${(behaviorScore * weights.behavior).toFixed(2)}%`);
console.log('');
console.log('🎲 FINAL RESULT:');
console.log(`   • Total Risk Score     = ${riskScore.toFixed(2)}%`);
console.log(`   • Threshold            = ${threshold}%`);
console.log(`   • Decision             = ${decision}`);
console.log(`   • Status               = ${status}`);
console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');

// ============================================================================
// URUTAN RUMUS YANG DIGUNAKAN
// ============================================================================
console.log('┌─────────────────────────────────────────────────────────────────────────┐');
console.log('│               📋 URUTAN RUMUS YANG DIGUNAKAN                            │');
console.log('└─────────────────────────────────────────────────────────────────────────┘');
console.log('');
console.log('1️⃣  MEAN:');
console.log('    μ = Σx / n');
console.log('');
console.log('2️⃣  VARIANCE:');
console.log('    σ² = Σ(x - μ)² / n');
console.log('');
console.log('3️⃣  STANDARD DEVIATION:');
console.log('    σ = √σ²');
console.log('');
console.log('4️⃣  Z-SCORE:');
console.log('    Z = (X - μ) / σ');
console.log('');
console.log('5️⃣  SIGMOID (untuk Velocity):');
console.log('    f(z) = 1 / (1 + e^(-z))');
console.log('    Score = f(z) × 100');
console.log('');
console.log('6️⃣  LINEAR (untuk Amount):');
console.log('    Score = (|Z| / 4) × 100');
console.log('');
console.log('7️⃣  WEIGHTED SCORING:');
console.log('    Risk = (V×35%) + (A×40%) + (F×15%) + (B×10%)');
console.log('');
console.log('8️⃣  DECISION:');
console.log('    IF Risk > 70% THEN BLOCK ELSE APPROVE');
console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');
console.log('✅ SIMULASI SELESAI!');
console.log('');
