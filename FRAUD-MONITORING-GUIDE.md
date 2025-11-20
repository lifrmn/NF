# 📊 PANDUAN MONITORING FRAUD DETECTION

Panduan lengkap untuk monitoring fraud detection di **3 tempat**:
1. ✅ **Prisma Studio** (Database Backend)
2. ✅ **Simple Admin Dashboard** (Web Browser)
3. ✅ **Mobile App** (React Native)

---

## 🎯 **RINGKASAN: Fraud Detection Akan Muncul Dimana?**

| **Platform** | **Lokasi** | **Data yang Ditampilkan** | **Update** |
|-------------|-----------|---------------------------|------------|
| **Prisma Studio** | `http://localhost:5555` | ✅ Table `transactions` (semua transaksi + fraud score)<br>✅ Table `fraud_alerts` (HIGH/CRITICAL only) | Manual refresh |
| **Simple Admin Dashboard** | `http://192.168.137.1:3001` | ✅ Fraud Statistics (total alerts, blocked, review)<br>✅ Fraud Alerts List (10 terakhir)<br>✅ **Transaction Monitoring (50 terakhir)** | Auto-refresh 30s |
| **Mobile App** | Dashboard Screen | ✅ Transaction History dengan risk level | Pull-to-refresh |

---

## 📊 **1. PRISMA STUDIO (Database Backend)**

### **Cara Membuka:**

```powershell
cd backend
npx prisma studio
```

**Buka browser:** `http://localhost:5555`

---

### **Tabel 1: `transactions`** ✅

**Kolom Fraud Detection:**
- `fraudRiskScore` (Float) - Score 0-100
- `fraudRiskLevel` (String) - LOW / MEDIUM / HIGH / CRITICAL
- `fraudReasons` (String) - JSON array alasan

**Contoh Query:**
```sql
-- Lihat transaksi HIGH risk
SELECT * FROM transactions WHERE fraudRiskLevel = 'HIGH';

-- Lihat transaksi dengan score > 80
SELECT * FROM transactions WHERE fraudRiskScore > 80;

-- Lihat transaksi hari ini dengan fraud score
SELECT id, senderId, receiverId, amount, fraudRiskScore, fraudRiskLevel 
FROM transactions 
WHERE DATE(createdAt) = DATE('now');
```

**Contoh Data di Prisma Studio:**

| id | senderId | receiverId | amount | fraudRiskScore | fraudRiskLevel | fraudReasons |
|----|----------|------------|--------|----------------|----------------|--------------|
| 1 | 1 | 2 | 50000 | 25.5 | LOW | ["Normal transaction"] |
| 2 | 1 | 2 | 500000 | 75.8 | HIGH | ["High velocity detected", "Amount anomaly"] |
| 3 | 1 | 3 | 5000000 | 92.3 | CRITICAL | ["Amount anomaly", "New receiver", "High velocity"] |

---

### **Tabel 2: `fraud_alerts`** ✅

**Khusus untuk transaksi HIGH dan CRITICAL**

**Kolom:**
- `id` - Auto increment
- `userId` - User yang melakukan transaksi mencurigakan
- `transactionId` - Link ke transaction
- `riskScore` - Score 0-100
- `riskLevel` - HIGH / CRITICAL
- `decision` - ALLOW / REVIEW / BLOCK
- `reasons` - JSON array alasan
- `riskFactors` - JSON detail (velocity, amount, frequency, behavior)
- `status` - NEW / REVIEWED / RESOLVED
- `createdAt` - Timestamp

**Contoh Data:**

| id | userId | transactionId | riskScore | riskLevel | decision | reasons | status |
|----|--------|---------------|-----------|-----------|----------|---------|--------|
| 1 | 1 | 5 | 85.2 | HIGH | REVIEW | ["High velocity detected"] | NEW |
| 2 | 1 | 7 | 95.5 | CRITICAL | BLOCK | ["Amount anomaly", "Velocity attack"] | NEW |

---

## 🌐 **2. SIMPLE ADMIN DASHBOARD (Web)**

### **Cara Menjalankan:**

```powershell
# Terminal 1: Backend (harus jalan dulu!)
cd backend
npm start

# Terminal 2: Admin Dashboard
cd admin
npm start
```

**Buka browser:** `http://192.168.137.1:3001` atau `http://localhost:3001`

---

### **Fitur Dashboard:**

#### **A. Fraud Detection Statistics** 🚨

**4 Card Statistics:**
1. ✅ **Total Fraud Alerts** - Jumlah total fraud terdeteksi
2. ✅ **Blocked Transactions** - Transaksi yang diblokir (CRITICAL)
3. ✅ **Review Transactions** - Transaksi yang perlu review (HIGH)
4. ✅ **Last Fraud Alert** - Waktu alert terakhir (relative time)

**Contoh Tampilan:**
```
┌──────────────────┬──────────────────┬──────────────────┬──────────────────┐
│ Fraud Alerts: 12 │ Blocked: 3       │ Review: 7        │ Last: 5m ago     │
└──────────────────┴──────────────────┴──────────────────┴──────────────────┘
```

---

#### **B. Fraud Alerts Section** 🤖

**Menampilkan:**
- ✅ Device ID dan Device Name
- ✅ Risk Score (0-100%)
- ✅ Risk Level (LOW/MEDIUM/HIGH/CRITICAL) dengan color badge
- ✅ Decision (ALLOW/REVIEW/BLOCK) dengan color badge
- ✅ Confidence Score
- ✅ Risk Factors breakdown (velocity, amount, time, device)
- ✅ Reasons (list alasan mengapa berisiko)
- ✅ Timestamp (absolute + relative)

**Contoh Tampilan:**
```
┌─────────────────────────────────────────────────────────────┐
│ 🚨 Samsung Galaxy S21 [CRITICAL] [BLOCK]                   │
│ Risk Score: 92.5% | Confidence: 87%                         │
├─────────────────────────────────────────────────────────────┤
│ Transaction ID: 15                                          │
│ IP Address: 192.168.137.105                                 │
│                                                             │
│ 🔍 Risk Factors:                                           │
│   • High velocity detected (Z-Score: 4.2)                  │
│   • Amount 8.5x above average                              │
│   • Transaction to new receiver                            │
│                                                             │
│ AI Analysis: Velocity: 85%, Amount: 95%, Time: 40%, ...   │
│ 🕐 2024-11-17 10:30:45 (5 minutes ago)                     │
└─────────────────────────────────────────────────────────────┘
```

---

#### **C. Transaction Monitoring (BARU!)** 💳

**Fitur seperti Prisma Studio di browser!**

**Menampilkan:**
- ✅ **Table format** dengan semua kolom transaksi
- ✅ **Filter by Risk Level** (ALL/CRITICAL/HIGH/MEDIUM/LOW)
- ✅ **Adjustable Limit** (default 50, bisa diubah)
- ✅ **Color-coded Risk Score** (merah/orange/hijau)
- ✅ **Risk Level Badge** dengan warna
- ✅ **Fraud Reasons** inline
- ✅ **Sender & Receiver** info lengkap
- ✅ **Status Badge** (completed/pending/failed)
- ✅ **Statistics** di bawah table

**Controls:**
```
[🔄 Refresh Transactions]  [Filter: All Risk Levels ▼]  [Limit: 50]
```

**Table Columns:**
| ID | Sender | Receiver | Amount | Risk Score | Risk Level | Reasons | Status | Date |
|----|--------|----------|--------|------------|------------|---------|--------|------|
| #5 | Budi<br>@budi | Ani<br>@ani | Rp 500,000 | **75.8** | HIGH | • High velocity<br>• Amount anomaly | completed | 17/11/24 10:30 |

**Statistics:**
```
Showing 50 of 125 transactions
```

---

### **API Endpoints yang Digunakan:**

```javascript
// Get fraud alerts
GET /api/fraud-alerts
Response: {
  success: true,
  alerts: [...],
  stats: {
    totalAlerts: 12,
    blockedTransactions: 3,
    reviewTransactions: 7,
    lastAlert: "2024-11-17T10:30:00Z"
  }
}

// Get all transactions
GET /api/transactions?limit=50&riskLevel=HIGH
Response: {
  success: true,
  transactions: [...],
  stats: {
    total: 125,
    critical: 5,
    high: 15,
    medium: 30,
    low: 75,
    averageRiskScore: 42.5
  },
  showing: 50
}
```

---

## 📱 **3. MOBILE APP (React Native)**

### **Lokasi:**

**Dashboard Screen** → **Riwayat Transaksi**

### **Fitur:**

- ✅ List transaksi dengan icon received/sent
- ✅ Amount dengan warna (hijau = received, merah = sent)
- ✅ Tanggal dan waktu transaksi
- ✅ Pull-to-refresh untuk update data
- ⚠️ **Belum menampilkan fraud score** (akan ditambahkan nanti jika perlu)

---

## 🔄 **FLOW FRAUD DETECTION KE DATABASE & DASHBOARD**

### **Skenario: User A kirim Rp 5.000.000 ke User B (Amount Attack)**

```
┌──────────────────────────────────────────────────────────┐
│ STEP 1: Mobile App (Transaction)                         │
└──────────────────────────────────────────────────────────┘
   │
   │ POST /api/transactions
   │ { receiverUsername: "userB", amount: 5000000 }
   │
   ▼
┌──────────────────────────────────────────────────────────┐
│ STEP 2: Backend Fraud Detection (transactions.js)        │
│ - calculateVelocityScore()    → 45.2                     │
│ - calculateAmountZScore()     → 95.5 ✅ ANOMALI!         │
│ - calculateFrequencyScore()   → 30.0                     │
│ - calculateBehaviorScore()    → 50.0 (new receiver)      │
│                                                           │
│ Weighted Score = (45.2×35%) + (95.5×40%) + ... = 92.3    │
│ Risk Level = CRITICAL (score > 80)                       │
│ Decision = BLOCK                                          │
└──────────────────────────────────────────────────────────┘
   │
   ├─────────────────┬─────────────────┬──────────────────┐
   │                 │                 │                  │
   ▼                 ▼                 ▼                  ▼
┌─────────┐   ┌──────────┐   ┌──────────────┐   ┌──────────┐
│ Table:  │   │ Table:   │   │ Simple Admin │   │ Mobile   │
│ trans-  │   │ fraud_   │   │ Dashboard    │   │ App      │
│ actions │   │ alerts   │   │              │   │          │
└─────────┘   └──────────┘   └──────────────┘   └──────────┘
│             │              │                  │
│ fraudRisk   │ userId: 1    │ Fraud Alert     │ Error:
│ Score:92.3  │ riskScore:   │ Card muncul     │ "Transaction
│             │ 92.3         │ di dashboard    │ blocked"
│ fraudRisk   │ riskLevel:   │ Auto-refresh    │
│ Level:      │ CRITICAL     │ setiap 30s      │
│ CRITICAL    │              │                 │
│             │ decision:    │ Transactions    │
│ fraudRea-   │ BLOCK        │ Table update    │
│ sons: JSON  │              │                 │
│             │ status: NEW  │                 │
└─────────────┴──────────────┴─────────────────┴──────────────┘
```

---

## 🧪 **CARA TESTING FRAUD DETECTION**

### **Test 1: Velocity Attack (Transaksi Cepat)**

```bash
# Scenario: Kirim 5 transaksi dalam 1 menit

1. Login user A di HP 1
2. Kirim Rp 10.000 ke user B (wait 10s)
3. Kirim Rp 10.000 ke user B (wait 10s)
4. Kirim Rp 10.000 ke user B (wait 10s)
5. Kirim Rp 10.000 ke user B (wait 10s)
6. Kirim Rp 10.000 ke user B

Expected Result:
- Transaction 1-2: LOW (score < 40)
- Transaction 3: MEDIUM (score 40-59)
- Transaction 4-5: HIGH (score 60-79)

Cek di:
✅ Prisma Studio → table transactions (sort by createdAt DESC)
✅ Admin Dashboard → Fraud Alerts section
✅ Admin Dashboard → Transaction Monitoring (filter: HIGH)
```

---

### **Test 2: Amount Attack (Jumlah Besar)**

```bash
# Scenario: Kirim jumlah 10x lipat dari rata-rata

1. User A rata-rata transaksi Rp 50.000
2. Kirim Rp 500.000 ke user B (10x lipat!)

Expected Result:
- Risk Score: 70-85 (HIGH)
- Reasons: "Amount 10.0x above average (Z-Score: 3.5)"

Cek di:
✅ Prisma Studio → fraudRiskScore > 70
✅ Admin Dashboard → Fraud Alerts (muncul card baru)
✅ Admin Dashboard → Transactions table (row dengan score merah)
```

---

### **Test 3: New Receiver Attack**

```bash
# Scenario: Kirim ke penerima baru pertama kali

1. User A kirim Rp 100.000 ke user C (belum pernah kirim ke C)

Expected Result:
- Behavior Score naik (penalty new receiver)
- Reasons: "Transaction to new receiver"

Cek di:
✅ Prisma Studio → fraudReasons (ada "new receiver")
✅ Admin Dashboard → Risk Factors detail (behavior score tinggi)
```

---

## 📊 **PERBANDINGAN 3 PLATFORM**

| **Fitur** | **Prisma Studio** | **Simple Admin** | **Mobile App** |
|-----------|-------------------|------------------|----------------|
| **Access** | `localhost:5555` | `192.168.137.1:3001` | React Native |
| **All Transactions** | ✅ Full SQL query | ✅ Last 50 (adjustable) | ✅ User's only |
| **Fraud Score** | ✅ Semua transaksi | ✅ Semua transaksi | ❌ Belum |
| **Fraud Alerts** | ✅ Table `fraud_alerts` | ✅ Card dengan detail | ❌ Tidak ada |
| **Filter by Risk** | ✅ Manual SQL | ✅ Dropdown filter | ❌ Tidak ada |
| **Real-time** | ❌ Manual refresh | ✅ Auto 30s | ✅ Pull-to-refresh |
| **Detail Risk Factors** | ✅ JSON di DB | ✅ Breakdown visual | ❌ Tidak ada |
| **Statistics** | ❌ Manual query | ✅ Auto calculate | ❌ Tidak ada |
| **Edit Data** | ✅ Full CRUD | ❌ Read-only | ❌ Read-only |
| **Best For** | Developer/DBA | Admin monitoring | End user |

---

## 🎯 **UNTUK PRESENTASI SKRIPSI**

### **Demo Flow (5 menit):**

```
1. SETUP (1 min):
   - Buka 3 window:
     * Window 1: Prisma Studio (localhost:5555)
     * Window 2: Admin Dashboard (192.168.137.1:3001)
     * Window 3: 2 HP Android (user A & B)

2. TRANSAKSI NORMAL (1 min):
   - User A kirim Rp 50.000 ke User B
   - Tunjukkan:
     * ✅ Prisma Studio: Row baru, fraudRiskScore: 25, fraudRiskLevel: LOW
     * ✅ Admin Dashboard: Transactions table update otomatis
     * ✅ Mobile App: Saldo berkurang

3. FRAUD ATTACK (2 min):
   - User A kirim 5x transaksi cepat (velocity attack)
   - User A kirim Rp 5.000.000 (amount attack)
   - Tunjukkan:
     * ✅ Prisma Studio: fraudRiskScore naik ke 85+, fraudRiskLevel: CRITICAL
     * ✅ Admin Dashboard: 
       - Fraud Alert card muncul (merah, CRITICAL badge)
       - Transactions table: row dengan score merah
       - Statistics: Blocked Transactions +1
     * ✅ Mobile App: Popup "Transaction blocked due to fraud risk"

4. EXPLAIN ALGORITHM (1 min):
   - Tunjukkan Risk Factors di Admin Dashboard:
     * Velocity: 85% (transaksi cepat)
     * Amount: 95% (10x lipat rata-rata)
     * Frequency: 30%
     * Behavior: 50% (new receiver)
   - Formula: (85×35%) + (95×40%) + (30×15%) + (50×10%) = 92.3
   - Threshold: > 80 = CRITICAL = BLOCK
```

---

## 💡 **TIPS & TROUBLESHOOTING**

### **Problem 1: Transactions tidak muncul di Admin Dashboard**

**Solusi:**
```powershell
# 1. Cek backend running
curl http://192.168.137.1:4000/api/health

# 2. Cek admin running
curl http://192.168.137.1:3001/api/health

# 3. Cek mobile app sync data
# Di mobile app: Pull-to-refresh dashboard

# 4. Manual refresh di admin dashboard
# Klik tombol "🔄 Refresh Transactions"
```

---

### **Problem 2: Fraud Alerts tidak muncul**

**Cek:**
1. ✅ Backend fraud detection aktif (cek console backend saat transaksi)
2. ✅ Transaction risk level >= HIGH (hanya HIGH/CRITICAL yang create alert)
3. ✅ Admin dashboard auto-refresh aktif (toggle "Auto Refresh: ON")

---

### **Problem 3: Prisma Studio tidak bisa connect**

```powershell
# 1. Pastikan backend running
cd backend
npm start

# 2. Generate Prisma Client
npx prisma generate

# 3. Buka Prisma Studio
npx prisma studio

# 4. Jika masih error, cek DATABASE_URL
# File: backend/.env
DATABASE_URL="file:./dev.db"
```

---

## 📚 **REFERENSI**

### **Academic Papers:**
1. Chandola, V., et al. (2009). "Anomaly Detection: A Survey"
2. Bolton, R. J., & Hand, D. J. (2002). "Statistical Fraud Detection: A Review"

### **Algoritma:**
- **Z-Score Anomaly Detection**
- **Weighted Risk Scoring** (35/40/15/10)
- **Poisson Distribution** (untuk velocity)
- **Sigmoid Normalization** (untuk score mapping)

### **Thresholds:**
- LOW: 0-39
- MEDIUM: 40-59
- HIGH: 60-79
- CRITICAL: 80-100

---

**🎓 Good luck dengan presentasi SKRIPSI Anda!**
