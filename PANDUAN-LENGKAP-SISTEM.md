# 📚 PANDUAN LENGKAP SISTEM PEMBAYARAN NFC

Dokumentasi lengkap untuk memahami seluruh sistem pembayaran NFC dari backend hingga frontend.

---

## 📂 STRUKTUR PROYEK

```
skripku-jadi/
├── backend/                      # Server Node.js + Express
│   ├── server.js                # Entry point server (jantung backend)
│   ├── middleware/              # Middleware untuk autentikasi & logging
│   │   ├── auth.js             # JWT authentication & authorization
│   │   ├── errorHandler.js     # Centralized error handling
│   │   └── logger.js           # Request logging
│   ├── routes/                 # API endpoints (dikelompokkan by feature)
│   │   ├── auth.js            # Login, register, logout
│   │   ├── users.js           # User management (CRUD)
│   │   ├── transactions.js    # Transaksi pembayaran + fraud detection
│   │   ├── nfcCards.js        # NFC card management
│   │   ├── devices.js         # Device tracking & sync
│   │   ├── fraud.js           # Fraud alerts & analysis
│   │   └── admin.js           # Admin dashboard endpoints
│   ├── prisma/                # Database schema & migrations
│   │   └── schema.prisma     # Database model definitions
│   └── package.json          # Dependencies backend
│
├── src/                        # Frontend React Native + Expo
│   ├── utils/                 # Utility functions & services
│   │   ├── apiService.ts     # HTTP client untuk API calls
│   │   ├── configuration.ts  # App configuration & constants
│   │   ├── database.ts       # Local SQLite database
│   │   ├── fraudDetection.ts # Client-side fraud detection
│   │   └── nfc.ts            # NFC helper functions
│   ├── hooks/                # Custom React hooks
│   │   ├── useNFCScanner.ts  # Hook untuk scan NFC
│   │   └── usePayment.ts     # Hook untuk payment flow
│   ├── screens/              # UI Screens
│   │   ├── LoginScreen.tsx   # Login & Register
│   │   ├── DashboardScreen.tsx # Home dashboard
│   │   ├── NFCScreen.tsx     # NFC payment
│   │   └── MyCardsScreen.tsx # Kartu NFC saya
│   └── components/           # Reusable UI components
│       └── CustomButton.tsx  # Button component
│
└── admin/                     # Admin web dashboard
    ├── simple-dashboard.html  # Web UI untuk admin
    └── simple-admin.js        # Admin backend
```

---

## 🔄 ARSITEKTUR SISTEM

### Gambaran Umum
```
┌─────────────────┐
│  MOBILE APP     │ ← React Native + Expo
│  (Android/iOS)  │
└────────┬────────┘
         │ HTTP/HTTPS + Socket.IO
         ▼
┌─────────────────┐
│  BACKEND API    │ ← Node.js + Express
│  (server.js)    │
└────────┬────────┘
         │ Prisma ORM
         ▼
┌─────────────────┐
│  DATABASE       │ ← PostgreSQL
│  (Prisma)       │
└─────────────────┘

┌─────────────────┐
│  ADMIN WEB      │ ← Simple HTML/JS
│  (Dashboard)    │
└────────┬────────┘
         │ HTTP + Socket.IO
         └──────────► BACKEND API
```

### Alur Komunikasi

#### 1. Login Flow
```
Mobile App               Backend                Database
    │                       │                       │
    ├─ POST /api/auth/login─►│                       │
    │  { username, password} │                       │
    │                       ├─ Query user ──────────►│
    │                       │                       │
    │                       │◄─── User data ────────┤
    │                       │                       │
    │                       ├─ Verify password      │
    │                       ├─ Generate JWT token   │
    │                       ├─ Create session ──────►│
    │                       │                       │
    │◄─ { user, token } ────┤                       │
    │                       │                       │
    ├─ Save token          │                       │
    │   AsyncStorage       │                       │
```

#### 2. Payment Flow (Transaksi)
```
Mobile App               Backend                Database
    │                       │                       │
    ├─ POST /api/transactions                       │
    │  { receiver, amount } │                       │
    │                       │                       │
    │                       ├─ Cek saldo sender ────►│
    │                       │                       │
    │                       ├─ FRAUD DETECTION      │
    │                       │   (Z-Score algorithm) │
    │                       │                       │
    │                       ├─ Atomic Transaction:  │
    │                       │   - Kurangi sender ───►│
    │                       │   - Tambah receiver ──►│
    │                       │   - Create tx record ─►│
    │                       │                       │
    │◄─ { success, fraud }──┤                       │
    │                       │                       │
    │                       ├─ Socket.IO Emit ─────►Admin Dashboard
    │                       │   'new-transaction'   │
```

#### 3. NFC Payment Flow
```
Mobile App           NFC Card             Backend           Database
    │                   │                    │                 │
    ├─ Scan NFC card ──►│                    │                 │
    │                   │                    │                 │
    │◄─ Card UID ───────┤                    │                 │
    │                   │                    │                 │
    ├─ POST /api/nfc/payment                │                 │
    │  { senderCardId, receiverCardId }     │                 │
    │                   │                    │                 │
    │                   │                    ├─ Validate cards─►│
    │                   │                    ├─ Fraud check    │
    │                   │                    ├─ Transfer saldo─►│
    │                   │                    │                 │
    │◄─ Success ────────────────────────────┤                 │
```

---

## 🔐 BACKEND DETAIL

### server.js - Main Server

**Fungsi Utama:**
- Entry point backend server
- Setup Express app dengan middleware
- Register semua routes (/api/auth, /api/users, dll)
- Setup Socket.IO untuk real-time updates
- Database connection via Prisma

**Middleware Stack (urutan eksekusi):**
```javascript
1. helmet()          → Security headers
2. morgan()          → HTTP request logger
3. cors()            → Allow cross-origin requests
4. express.json()    → Parse JSON body
5. rateLimit()       → Limit requests (anti-spam)
6. requestLogger()   → Custom logger (save to DB)
7. Routes            → API endpoints
8. errorHandler()    → Catch all errors
```

**Port & Host:**
- Default: `http://0.0.0.0:4000` (listen all network interfaces)
- Bisa diubah via environment variable `PORT`

**Real-Time dengan Socket.IO:**
```javascript
// Server emit event ke client
io.to('admin-room').emit('new-transaction', { transaction });

// Mobile app / Admin web listen:
socket.on('new-transaction', (data) => {
  // Update UI real-time tanpa refresh
});
```

---

### middleware/auth.js - Autentikasi

**3 Middleware:**

#### 1. authenticateToken
**Untuk:** Protect endpoint user (butuh login)

**Cara Kerja:**
1. Ambil token dari header: `Authorization: Bearer <token>`
2. Verify token dengan JWT_SECRET
3. Query database cek user & session valid
4. Jika valid: `req.user = userData`, lanjut ke endpoint
5. Jika tidak: return 401 Unauthorized

**Usage:**
```javascript
router.get('/profile', authenticateToken, (req, res) => {
  // req.user sudah tersedia
  res.json({ user: req.user });
});
```

#### 2. authenticateAdmin
**Untuk:** Protect endpoint admin

**Cara Kerja:**
1. Ambil password dari header: `x-admin-password`
2. Compare dengan `ADMIN_PASSWORD` di .env
3. Jika cocok: lanjut ke endpoint
4. Jika tidak: return 401 Unauthorized

**Usage:**
```javascript
router.post('/admin/topup', authenticateAdmin, handler);
```

#### 3. authenticateDevice
**Untuk:** Verify device yang sync data

**Cara Kerja:**
1. Cek `x-app-key` header
2. Compare dengan `APP_SECRET`
3. Validasi deviceId exists

---

### routes/ - API Endpoints

Penjelasan lengkap ada di: **[README-PENJELASAN.md](backend/routes/README-PENJELASAN.md)**

**Ringkasan Routes:**

| Route | Endpoint | Fungsi |
|-------|----------|--------|
| auth.js | /api/auth/* | Login, register, logout, verify token |
| users.js | /api/users/* | CRUD users, balance, transactions history |
| transactions.js | /api/transactions/* | Create transaksi, fraud detection |
| nfcCards.js | /api/nfc/* | Register kartu, link, payment NFC |
| devices.js | /api/devices/* | Track devices, sync data |
| fraud.js | /api/fraud/* | Fraud alerts, analysis, stats |
| admin.js | /api/admin/* | Dashboard, logs, bulk operations |

---

### Prisma ORM - Database

**File:** `backend/prisma/schema.prisma`

**Models Utama:**

```prisma
model User {
  id          Int       @id @default(autoincrement())
  username    String    @unique
  password    String
  name        String
  balance     Float     @default(0)
  deviceId    String?
  isActive    Boolean   @default(true)
  
  // Relations
  sentTransactions      Transaction[] @relation("Sender")
  receivedTransactions  Transaction[] @relation("Receiver")
  nfcCards             NFCCard[]
  sessions             UserSession[]
  fraudAlerts          FraudAlert[]
}

model Transaction {
  id          Int       @id @default(autoincrement())
  senderId    Int
  receiverId  Int
  amount      Float
  type        String    @default("transfer")
  status      String    @default("completed")
  deviceId    String?
  createdAt   DateTime  @default(now())
  
  sender      User      @relation("Sender", fields: [senderId])
  receiver    User      @relation("Receiver", fields: [receiverId])
}

model NFCCard {
  cardId      String    @id
  userId      Int?
  cardType    String    @default("NTag215")
  balance     Float     @default(0)
  cardStatus  String    @default("ACTIVE")
  
  user        User?     @relation(fields: [userId])
  transactions NFCTransaction[]
}
```

**Migrations:**
```bash
# Buat migration baru
npx prisma migrate dev --name migration_name

# Apply migration
npx prisma migrate deploy

# Reset database (DANGER!)
npx prisma migrate reset
```

**Prisma Studio:**
```bash
# Buka database GUI
npx prisma studio
```

---

## 📱 FRONTEND DETAIL

### App.tsx - Entry Point

**Fungsi:**
- Root component aplikasi
- Setup navigation stack
- Initialize services (API, database, NFC)

**Navigation Stack:**
```
┌──────────────────┐
│  LoginScreen     │ ← Start here
└────────┬─────────┘
         │ Login sukses
         ▼
┌──────────────────┐
│ DashboardScreen  │ ← Main menu
└────────┬─────────┘
         │
    ┌────┴────┬──────────┬──────────┐
    ▼         ▼          ▼          ▼
┌────────┐ ┌──────┐ ┌────────┐ ┌───────┐
│  NFC   │ │Cards │ │History │ │Profile│
└────────┘ └──────┘ └────────┘ └───────┘
```

---

### utils/apiService.ts - HTTP Client

**Pattern:** Singleton (hanya 1 instance)

**Initialization:**
```typescript
// Di App.tsx atau root component
const api = APIService.getInstance();
await api.initialize(); // Load token dari AsyncStorage
```

**Cara Pakai:**
```typescript
// Login
const result = await api.login('john', 'pass123');
if (result.success) {
  // Token otomatis tersimpan
  navigation.navigate('Dashboard');
}

// Get user
const user = await api.getUserById(5);

// Create transaction
const tx = await api.createTransaction({
  receiverUsername: 'jane',
  amount: 50000,
  description: 'Bayar makan'
});

// NFC Payment
const result = await api.processNFCPayment({
  senderCardId: '04A1B2C3',
  receiverCardId: '04Z9Y8X7',
  amount: 25000
});
```

**Auto Token Refresh:**
Jika token expired (7 hari), otomatis redirect ke login.

**Error Handling:**
```typescript
try {
  await api.createTransaction({ ... });
} catch (error) {
  if (error.message.includes('Saldo tidak cukup')) {
    Alert.alert('Gagal', 'Saldo Anda tidak mencukupi');
  }
}
```

---

### utils/fraudDetection.ts - Client-Side Fraud Detection

**Algoritma:** Z-Score Based Anomaly Detection (sama dengan backend)

**Kapan Dipakai?**
- BEFORE mengirim request transaksi ke server
- Memberikan warning dini ke user
- Bukan pengganti fraud detection server (tetap divalidasi di backend)

**Cara Kerja:**
```typescript
const fraudCheck = await FraudDetectionService.analyzeTransaction({
  senderId: currentUser.id,
  receiverId: receiver.id,
  amount: 500000
});

if (fraudCheck.decision === 'BLOCK') {
  Alert.alert(
    'Transaksi Diblokir',
    `Risiko fraud: ${fraudCheck.riskLevel}\n${fraudCheck.reasons.join('\n')}`
  );
  return; // Stop transaksi
}

if (fraudCheck.decision === 'REVIEW') {
  // Tampilkan konfirmasi
  Alert.alert(
    'Peringatan',
    'Transaksi ini terdeteksi tidak biasa. Lanjutkan?',
    [
      { text: 'Batal', style: 'cancel' },
      { text: 'Lanjutkan', onPress: () => submitTransaction() }
    ]
  );
}
```

**4 Faktor Risiko:**
1. **Velocity** (35%): Frekuensi transaksi
2. **Amount** (40%): Anomali jumlah
3. **Frequency** (15%): Pola harian
4. **Behavior** (10%): Penerima baru, waktu tidak biasa

---

### utils/nfc.ts - NFC Utilities

**Fungsi:**
- Initialize NFC reader
- Scan NFC tag untuk dapat UID
- Write data ke NFC tag (opsional)

**Cara Pakai:**
```typescript
import { scanNFCTag, initializeNFC } from './nfc';

// Initialize (di useEffect)
await initializeNFC();

// Scan kartu
const cardId = await scanNFCTag();
console.log('Card UID:', cardId); // "04A1B2C3D4E5F6"
```

**NFC Tag Spec:**
- Type: NTag215 (RFID ISO14443A)
- Frequency: 13.56 MHz
- Memory: 540 bytes
- UID: 7 bytes (14 hex chars)

---

### hooks/useNFCScanner.ts - Custom Hook NFC

**Apa itu Custom Hook?**
React hook untuk reuse logic NFC di berbagai screen.

**Usage:**
```typescript
function PaymentScreen() {
  const { 
    isScanning, 
    scannedCard, 
    startScan, 
    stopScan,
    error 
  } = useNFCScanner();

  const handleScan = async () => {
    await startScan();
    // Wait scan...
  };

  useEffect(() => {
    if (scannedCard) {
      console.log('Kartu terdeteksi:', scannedCard.cardId);
      // Process payment
    }
  }, [scannedCard]);

  return (
    <View>
      <Button 
        title={isScanning ? "Scanning..." : "Scan NFC"} 
        onPress={handleScan} 
      />
      {error && <Text>{error}</Text>}
    </View>
  );
}
```

---

### hooks/usePayment.ts - Custom Hook Payment

**Fungsi:**
- Handle payment flow lengkap
- Validate input (amount, receiver)
- Client-side fraud detection
- API call ke backend
- Error handling

**Usage:**
```typescript
function SendMoneyScreen() {
  const { 
    isProcessing, 
    sendPayment, 
    error 
  } = usePayment();

  const handleSend = async () => {
    const result = await sendPayment({
      receiverUsername: 'jane',
      amount: 50000,
      description: 'Bayar makan'
    });

    if (result.success) {
      Alert.alert('Berhasil', 'Uang terkirim!');
      navigation.goBack();
    }
  };

  return (
    <View>
      <TextInput placeholder="Username penerima" />
      <TextInput placeholder="Jumlah" keyboardType="numeric" />
      <Button 
        title={isProcessing ? "Processing..." : "Kirim"} 
        onPress={handleSend} 
        disabled={isProcessing}
      />
      {error && <Text>{error}</Text>}
    </View>
  );
}
```

---

### screens/ - UI Screens

#### LoginScreen.tsx
**Fungsi:**
- Form login & register
- Simpan token ke AsyncStorage
- Navigate ke Dashboard

**Flow:**
```
User input username + password
    ↓
Validate input (tidak boleh kosong)
    ↓
API call: api.login(username, password)
    ↓
Success: Save token → Navigate Dashboard
Fail: Show error message
```

#### DashboardScreen.tsx
**Fungsi:**
- Tampilkan saldo user
- Menu navigasi (NFC Payment, Cards, History, dll)
- Real-time balance update (via Socket.IO)

**Features:**
- Pull to refresh
- Real-time notifications
- Quick actions (Scan NFC, Send Money, dll)

#### NFCScreen.tsx
**Fungsi:**
- Scan NFC card untuk payment
- 2 mode: Card-to-Card, Card-to-User
- Fraud detection warning

**Flow:**
```
1. User klik "Scan Kartu Pengirim"
    ↓
2. Scan NFC → Dapat senderCardId
    ↓
3. User klik "Scan Kartu Penerima"
    ↓
4. Scan NFC → Dapat receiverCardId
    ↓
5. User input amount
    ↓
6. Fraud detection check
    ↓
7. API call: processNFCPayment()
    ↓
8. Success: Show receipt
```

#### MyCardsScreen.tsx
**Fungsi:**
- Lihat daftar kartu NFC yang dimiliki
- Register kartu baru
- Top-up kartu
- Block/unblock kartu

---

## 🔐 KEAMANAN (SECURITY)

### 1. JWT Token
**Apa itu?** JSON Web Token untuk autentikasi stateless

**Cara Kerja:**
```
1. User login → Server generate JWT
2. JWT dikirim ke mobile app
3. App simpan di AsyncStorage (encrypted)
4. Setiap request, kirim di header:
   Authorization: Bearer eyJhbGciOiJIUzI1...
5. Server verify signature → allow/deny request
```

**Expiry:** 7 hari (bisa diubah di backend)

### 2. Password Hashing
**Library:** bcryptjs (10 salt rounds)

**Proses:**
```javascript
// Register: Hash password
const hashedPassword = await bcrypt.hash('password123', 10);
// Save: $2a$10$abcdef... (tidak bisa di-reverse)

// Login: Verify password
const isValid = await bcrypt.compare('password123', hashedPassword);
```

### 3. Rate Limiting
**Tujuan:** Mencegah brute force attack & DDoS

**Config:**
```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 100,                  // Max 100 request per IP
  message: 'Terlalu banyak request, coba lagi nanti'
});
```

### 4. SQL Injection Prevention
**Cara:** Pakai Prisma ORM (parameterized queries)

**BAD** (vulnerable):
```javascript
const query = `SELECT * FROM users WHERE username = '${username}'`;
// Bisa di-inject: username = "' OR 1=1--"
```

**GOOD** (safe):
```javascript
const user = await prisma.user.findUnique({
  where: { username: username } // Auto-escaped by Prisma
});
```

### 5. CORS (Cross-Origin Resource Sharing)
**Config:**
```javascript
app.use(cors({
  origin: '*',           // Allow semua origin (mobile app)
  credentials: true,     // Allow cookies/auth headers
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));
```

---

## 📊 DATABASE DESIGN

### Entity Relationship Diagram (ERD)

```
┌─────────────┐          ┌──────────────┐
│    User     │          │  Transaction │
├─────────────┤          ├──────────────┤
│ id (PK)     │◄────────┤│ senderId (FK)│
│ username    │          │ receiverId   │
│ password    │          │ amount       │
│ balance     │          │ createdAt    │
│ isActive    │          └──────────────┘
└─────┬───────┘
      │ 1:N
      ▼
┌─────────────┐          ┌──────────────┐
│   NFCCard   │          │NFCTransaction│
├─────────────┤          ├──────────────┤
│ cardId (PK) │◄────────┤│ cardId (FK)  │
│ userId (FK) │          │ amount       │
│ balance     │          │ createdAt    │
│ cardStatus  │          └──────────────┘
└─────────────┘

┌─────────────┐          ┌──────────────┐
│   Device    │          │  FraudAlert  │
├─────────────┤          ├──────────────┤
│ deviceId    │          │ userId (FK)  │
│ isOnline    │          │ riskScore    │
│ lastSeen    │          │ decision     │
└─────────────┘          └──────────────┘
```

### Relationships

**User → Transaction (1:N)**
- 1 user bisa punya banyak transaksi (sent & received)

**User → NFCCard (1:N)**
- 1 user bisa punya banyak kartu NFC
- 1 kartu hanya bisa dimiliki 1 user

**NFCCard → NFCTransaction (1:N)**
- 1 kartu bisa punya banyak transaksi

**User → FraudAlert (1:N)**
- 1 user bisa punya banyak fraud alerts

---

## 🚨 FRAUD DETECTION DETAIL

### Algoritma: Z-Score Based Anomaly Detection

**Formula Matematika:**
```
Z-Score = (X - μ) / σ

Di mana:
- X = nilai transaksi sekarang
- μ (mu) = rata-rata transaksi user
- σ (sigma) = deviasi standar
```

**Interpretasi:**
```
|Z| ≤ 2  → Normal (95% confidence)
|Z| > 2  → Anomali sedang (butuh review)
|Z| > 3  → Anomali ekstrem (BLOCK!)
```

**Contoh Kalkulasi:**

```
User A riwayat transaksi:
[50000, 45000, 60000, 55000, 48000]

Rata-rata (μ) = 51,600
Deviasi standar (σ) = 5,850

Transaksi baru: 500,000

Z-Score = (500000 - 51600) / 5850 = 76.67

Z > 3 → EXTREME OUTLIER → BLOCK!
```

### 4 Faktor Risiko (Weighted):

```javascript
Overall Risk = (
  velocityScore    × 0.35 +  // 35% bobot
  amountScore      × 0.40 +  // 40% bobot
  frequencyScore   × 0.15 +  // 15% bobot
  behaviorScore    × 0.10    // 10% bobot
)
```

**1. Velocity Score (35%)**
```
Indikator: Transaksi terlalu cepat berturut-turut
Contoh: 10 transaksi dalam 2 menit → SUSPICIOUS
```

**2. Amount Z-Score (40%)**
```
Indikator: Jumlah tidak normal
Contoh: Biasa Rp 50rb, tiba-tiba Rp 5jt → HIGH RISK
```

**3. Frequency Score (15%)**
```
Indikator: Frekuensi harian tidak biasa
Contoh: Biasa 3 tx/hari, hari ini 50 tx → ANOMALY
```

**4. Behavior Score (10%)**
```
Indikator: 
- Transfer ke orang baru (belum pernah)
- Transaksi jam tidak biasa (misal jam 3 pagi)
```

### Decision Tree:

```
Risk Score >= 80 → CRITICAL → BLOCK (tolak otomatis)
Risk Score >= 60 → HIGH     → REVIEW (butuh approval admin)
Risk Score >= 40 → MEDIUM   → ALLOW (catat log)
Risk Score < 40  → LOW      → ALLOW
```

---

## 🧪 TESTING & DEBUGGING

### 1. Test API dengan Postman/Thunder Client

**Login:**
```
POST http://localhost:4000/api/auth/login
Content-Type: application/json

{
  "username": "john",
  "password": "password123"
}

Response:
{
  "message": "Login berhasil",
  "user": { "id": 1, "name": "John", ... },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Create Transaction:**
```
POST http://localhost:4000/api/transactions
Authorization: Bearer <token>
Content-Type: application/json

{
  "receiverUsername": "jane",
  "amount": 50000,
  "description": "Test payment"
}
```

### 2. Database GUI dengan Prisma Studio

```bash
cd backend
npx prisma studio
```

Buka: http://localhost:5555

### 3. Cek Logs

**Backend logs:**
```bash
cd backend
npm run dev
# Akan tampil semua console.log
```

**Mobile app logs:**
```bash
npx expo start
# Tekan 'j' untuk buka debugger
# atau lihat di terminal
```

### 4. Common Errors & Solutions

**Error: "Token tidak valid"**
```
Solusi: 
1. Cek token tersimpan di AsyncStorage
2. Cek JWT_SECRET sama antara login & verify
3. Token expired → Login ulang
```

**Error: "Saldo tidak cukup"**
```
Solusi: Top-up saldo via admin dashboard
```

**Error: "Kartu tidak dikenali"**
```
Solusi:
1. Cek cardId format benar (14-20 hex chars)
2. Register kartu dulu via /api/nfc/register
```

**Error: "Connection refused"**
```
Solusi:
1. Cek backend server running
2. Cek API_URL di frontend configuration.ts
3. Pastikan laptop & HP di network yang sama (WiFi)
```

---

## 🚀 DEPLOYMENT

### Backend ke Server

**1. Setup Database (PostgreSQL)**
```bash
# Install PostgreSQL
# Buat database baru
createdb nfc_payment_db

# Update .env
DATABASE_URL="postgresql://user:pass@localhost:5432/nfc_payment_db"
```

**2. Run Migrations**
```bash
cd backend
npx prisma migrate deploy
```

**3. Start Server**
```bash
# Development
npm run dev

# Production
npm start
```

**4. Deploy ke Cloud (Heroku, Railway, dll)**
```bash
# Example: Heroku
heroku create nfc-payment-api
git push heroku main
heroku ps:scale web=1
```

### Frontend ke App Store

**1. Build APK (Android)**
```bash
expo build:android
# Ikuti instruksi
# Download APK
```

**2. Build IPA (iOS)**
```bash
expo build:ios
# Butuh Apple Developer Account ($99/tahun)
```

**3. Test Production Build**
```bash
expo start --no-dev --minify
```

---

## 📞 TROUBLESHOOTING

### Mobile App tidak bisa connect ke Backend

**Cek:**
1. Backend server running? `npm run dev`
2. IP address benar? Lihat console log saat server start
3. Firewall block port 4000?
4. HP & laptop di WiFi yang sama?

**Solusi:**
```typescript
// Di configuration.ts, ubah IP:
export const API_URL = 'http://192.168.1.5:4000/api';
// Ganti 192.168.1.5 dengan IP laptop Anda

// Cara cek IP laptop:
// Windows: ipconfig
// Mac/Linux: ifconfig
```

### NFC tidak berfungsi

**Cek:**
1. NFC enabled di HP? (Settings → NFC)
2. Pakai device fisik (emulator tidak support NFC)
3. Kartu NFC benar? (NTag215, Mifare, dll)

### Database error

**Cek:**
1. PostgreSQL running?
2. DATABASE_URL benar di .env?
3. Migrations sudah di-apply? `npx prisma migrate deploy`

---

## 📚 REFERENSI

### Libraries & Frameworks

**Backend:**
- Express.js - https://expressjs.com/
- Prisma ORM - https://www.prisma.io/
- Socket.IO - https://socket.io/
- JWT - https://jwt.io/

**Frontend:**
- React Native - https://reactnative.dev/
- Expo - https://expo.dev/
- React Navigation - https://reactnavigation.org/

### Algoritma

**Fraud Detection:**
- Chandola et al. (2009) - "Anomaly detection: A survey"
- Bolton & Hand (2002) - "Statistical fraud detection: A review"

### NFC Technology

- ISO14443A Standard - https://en.wikipedia.org/wiki/ISO/IEC_14443
- NTag215 Datasheet - https://www.nxp.com/

---

## 🤝 KONTRIBUSI

Untuk menambah fitur atau fix bugs:

1. Fork repo
2. Buat branch: `git checkout -b feature/nama-fitur`
3. Commit changes: `git commit -m "Add fitur X"`
4. Push: `git push origin feature/nama-fitur`
5. Create Pull Request

---

## 📝 CHANGELOG

### Version 1.0.0 (Current)
- ✅ Login & Register
- ✅ Send Money (user-to-user)
- ✅ NFC Payment (card-to-card)
- ✅ Fraud Detection (Z-Score algorithm)
- ✅ Admin Dashboard
- ✅ Real-time updates (Socket.IO)

### Planned Features (v2.0)
- [ ] QR Code payment
- [ ] Split bill
- [ ] Recurring payments
- [ ] Multi-currency support
- [ ] Biometric authentication

---

**Dibuat dengan ❤️ untuk memudahkan pemahaman sistem pembayaran NFC**

**Last Updated:** April 22, 2026
