# 📂 PENJELASAN FILE BY FILE - SISTEM PEMBAYARAN NFC

Dokumentasi lengkap setiap file dalam sistem pembayaran NFC untuk memudahkan pemahaman skripsi.

---

## 🔷 BACKEND FILES

### 📄 **backend/server.js** - Jantung Backend Server

**Fungsi Utama:**
Entry point backend yang menjalankan Express server dan handle semua API requests.

**Apa yang dilakukan:**
1. **Setup Environment Variables** - Load konfigurasi dari file `.env`
2. **Import Dependencies** - Load semua library (express, cors, helmet, prisma, dll)
3. **Initialize Services** - Setup Express app, HTTP server, Socket.IO, Prisma client
4. **Configure Middleware Stack** - Setup security, logging, rate limiting
5. **Register Routes** - Mount semua endpoint API (/api/auth, /api/users, dll)
6. **Setup Socket.IO** - Real-time communication untuk live updates
7. **Start Server** - Listen di port 4000 (atau PORT dari env)

**Middleware Stack (Urutan Eksekusi):**
```
Request masuk
    ↓
1. helmet()         → Set security headers (XSS protection, dll)
    ↓
2. morgan()         → Log HTTP request (method, URL, status)
    ↓
3. cors()           → Allow cross-origin requests (mobile app)
    ↓
4. express.json()   → Parse JSON body
    ↓
5. rateLimit()      → Limit 100 request/15 menit per IP
    ↓
6. requestLogger()  → Custom logger (save to database)
    ↓
7. Routes           → API endpoint handlers
    ↓
8. errorHandler()   → Catch all errors
    ↓
Response dikirim
```

**Socket.IO Events (Real-time Updates):**
```javascript
// Server emit event ke client
io.to('admin-room').emit('new-transaction', { transaction });

// Mobile app listen:
socket.on('new-transaction', (data) => {
  // Update UI tanpa refresh
});
```

**Health Check Endpoint:**
- **GET /health** atau **GET /api/health** - Cek server status dan database connection
- Digunakan untuk: Monitor uptime, detect server down, auto-retry connection

**Key Endpoints:**
- `GET /api` - API documentation (list semua endpoint)
- `GET /api/users/me` - Get current user info (untuk sync balance)
- `GET /api/users/all` - List all users (debugging)
- `PUT /api/users/:id` - Update user balance/name

**Environment Variables:**
```env
PORT=4000                    # Server port
DATABASE_URL=postgresql://... # PostgreSQL connection string
JWT_SECRET=secret123          # Secret key untuk sign JWT token
APP_SECRET=NFC2025SecureApp   # Secret key untuk mobile app
ADMIN_PASSWORD=admin123       # Password untuk admin dashboard
```

---

### 📄 **backend/middleware/auth.js** - Autentikasi & Otorisasi

**3 Middleware Functions:**

#### **1. authenticateToken(req, res, next)**
**Tujuan:** Protect endpoint yang butuh login (user endpoints)

**Flow Diagram:**
```
Client request dengan header:
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    ↓
1. Extract token dari header
    ↓
2. Verify token signature dengan JWT_SECRET
    ↓
3. Decode token → dapat userId
    ↓
4. Query database: cek user exists & session valid
    ↓
5. Jika valid: set req.user = userData, next()
6. Jika invalid: return 401 Unauthorized
```

**Cara Pakai:**
```javascript
// Protect endpoint dengan authenticateToken
router.get('/profile', authenticateToken, (req, res) => {
  // req.user sudah tersedia (user yang login)
  res.json({ user: req.user });
});
```

**Backward Compatibility:**
```javascript
// Support app key untuk mobile app lama
const appKey = req.headers['x-app-key'];
if (appKey === APP_SECRET) {
  return next(); // Bypass JWT check
}
```

#### **2. authenticateAdmin(req, res, next)**
**Tujuan:** Protect endpoint admin (admin dashboard)

**Flow:**
```
Admin request dengan header:
x-admin-password: admin123
    ↓
1. Extract password dari header
    ↓
2. Compare dengan ADMIN_PASSWORD dari env
    ↓
3. Jika cocok: next()
4. Jika tidak: return 401 Unauthorized
```

**Cara Pakai:**
```javascript
router.post('/admin/topup', authenticateAdmin, handler);
```

#### **3. authenticateDevice(req, res, next)**
**Tujuan:** Verify device yang sync data

**Flow:**
```
Device request dengan header:
x-app-key: NFC2025SecureApp
x-device-id: device_123
    ↓
1. Validate app key
    ↓
2. Check deviceId exists
    ↓
3. Jika valid: next()
```

---

### 📄 **backend/middleware/errorHandler.js** - Error Handler Terpusat

**Fungsi:**
Catch semua error yang tidak tertangkap di endpoint dan return response yang informatif.

**Error Types yang Ditangani:**

| Error Type | Code/Name | HTTP Status | Response |
|-----------|-----------|-------------|----------|
| Duplicate entry | P2002 (Prisma) | 400 | "A record with this information already exists" |
| Record not found | P2025 (Prisma) | 404 | "The requested record does not exist" |
| Invalid token | JsonWebTokenError | 401 | "The provided token is invalid" |
| Token expired | TokenExpiredError | 401 | "The provided token has expired" |
| Validation error | ValidationError | 400 | Error details dari validator |
| Generic error | - | 500 | "Internal server error" |

**Cara Kerja:**
```javascript
// Di endpoint, throw error atau call next(error)
throw new Error('User not found');
// atau
next(new Error('User not found'));

// Error akan ditangkap oleh errorHandler middleware
// Yang akan return response:
{
  "error": "User not found",
  "details": "Stack trace..." // (hanya di development mode)
}
```

**Prisma Error Codes:**
- **P2002** - Unique constraint violation (duplicate username, email, dll)
- **P2025** - Record not found (WHERE tidak match)
- **P2003** - Foreign key constraint failed

---

### 📄 **backend/middleware/logger.js** - Request Logger

**Fungsi:**
Log semua HTTP request ke console dengan format custom.

**Log Format:**
```
METHOD URL - STATUS_CODE - DURATION - IP_ADDRESS
```

**Contoh Output:**
```
GET /api/users/me - 200 - 45ms - ::1
POST /api/auth/login - 401 - 120ms - 192.168.1.5
PUT /api/transactions - 201 - 340ms - 192.168.1.10
```

**Cara Kerja:**
```javascript
// 1. Catat waktu mulai request
const start = Date.now();

// 2. Wait sampai response selesai (event 'finish')
res.on('finish', () => {
  // 3. Hitung durasi
  const duration = Date.now() - start;
  
  // 4. Log ke console
  console.log(`${method} ${url} - ${statusCode} - ${duration}ms - ${ip}`);
});

// 5. Lanjut ke middleware berikutnya
next();
```

**Use Cases:**
- Debugging: Track slow endpoints
- Monitoring: Detect unusual traffic patterns
- Analytics: Generate usage reports

---

### 📄 **backend/routes/*.js** - API Endpoints

Penjelasan detail ada di: **[backend/routes/README-PENJELASAN.md](backend/routes/README-PENJELASAN.md)**

**Ringkasan 7 Route Files:**

#### **1. auth.js** - Autentikasi
Endpoints:
- `POST /api/auth/register` - Register user baru
- `POST /api/auth/login` - Login user (return JWT token)
- `POST /api/auth/logout` - Logout user (hapus session)
- `GET /api/auth/verify` - Verify JWT token validity

#### **2. users.js** - User Management
Endpoints:
- `GET /api/users/` - Get all users (admin)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id/balance` - Update balance
- `DELETE /api/users/:id` - Delete user (CASCADE!)

Key Feature: **CASCADE DELETE** - Hapus user akan auto hapus transactions, sessions, cards, dll

#### **3. transactions.js** - Transaksi + Fraud Detection
Endpoints:
- `POST /api/transactions/` - Create transaksi baru
- `GET /api/transactions/user/:userId` - Get history transaksi

Key Feature: **Z-Score Fraud Detection**
```
Risk Score = 
  velocityScore    × 0.35 +  // 35% bobot
  amountScore      × 0.40 +  // 40% bobot
  frequencyScore   × 0.15 +  // 15% bobot
  behaviorScore    × 0.10    // 10% bobot
```

Decision Tree:
- Score >= 80 → BLOCK (tolak otomatis)
- Score >= 60 → REVIEW (butuh approval)
- Score < 60 → ALLOW

#### **4. nfcCards.js** - NFC Card Management
Endpoints:
- `POST /api/nfc/register` - Register kartu NFC baru
- `POST /api/nfc/link` - Link kartu ke user
- `POST /api/nfc/payment` - NFC card-to-card payment
- `POST /api/nfc/tap` - Log NFC tap (analytics)

NFC Spec:
- Type: NTag215 (ISO14443A)
- UID: 7 bytes (14 hex chars)
- Frequency: 13.56 MHz

#### **5. devices.js** - Device Tracking
Endpoints:
- `POST /api/devices/register` - Register device baru
- `POST /api/devices/sync-device` - Sync data device
- `GET /api/devices/stats/summary` - Device statistics

Track: deviceId, IP address, last seen, online status

#### **6. fraud.js** - Fraud Management
Endpoints:
- `GET /api/fraud/alerts` - Get fraud alerts
- `POST /api/fraud/alert` - Create manual alert
- `PUT /api/fraud/alerts/:id/status` - Update alert status
- `GET /api/fraud/stats` - Fraud statistics

#### **7. admin.js** - Admin Dashboard
Endpoints:
- `GET /api/admin/dashboard` - Dashboard stats
- `POST /api/admin/balance-update` - Bulk balance update
- `GET /api/admin/logs` - System logs
- `POST /api/admin/bulk-topup` - Bulk top-up

---

### 📄 **backend/prisma/schema.prisma** - Database Schema

**7 Main Models:**

#### **1. User**
```prisma
model User {
  id          Int       @id @default(autoincrement())
  username    String    @unique
  password    String    // bcrypt hashed
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
```

#### **2. Transaction**
```prisma
model Transaction {
  id          Int       @id @default(autoincrement())
  senderId    Int
  receiverId  Int
  amount      Float
  type        String    @default("transfer")
  status      String    @default("completed")
  description String?
  deviceId    String?
  createdAt   DateTime  @default(now())
  
  // Foreign keys
  sender      User      @relation("Sender", fields: [senderId])
  receiver    User      @relation("Receiver", fields: [receiverId])
}
```

#### **3. NFCCard**
```prisma
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

#### **4. UserSession** (untuk JWT tracking)
```prisma
model UserSession {
  id          Int       @id @default(autoincrement())
  userId      Int
  token       String    @unique
  expiresAt   DateTime
  createdAt   DateTime  @default(now())
  
  user        User      @relation(fields: [userId])
}
```

#### **5. FraudAlert**
```prisma
model FraudAlert {
  id          Int       @id @default(autoincrement())
  userId      Int
  riskScore   Float
  decision    String    // "ALLOW", "REVIEW", "BLOCK"
  reasons     String[]
  status      String    @default("pending")
  
  user        User      @relation(fields: [userId])
}
```

#### **6. Device**
```prisma
model Device {
  deviceId    String    @id
  deviceName  String
  platform    String    // "android", "ios"
  ipAddress   String?
  lastSeen    DateTime?
  isOnline    Boolean   @default(false)
  totalUsers  Int       @default(0)
  totalBalance Float    @default(0)
}
```

#### **7. NFCTransaction**
```prisma
model NFCTransaction {
  id          Int       @id @default(autoincrement())
  cardId      String
  amount      Float
  type        String    // "tap", "payment", "topup"
  createdAt   DateTime  @default(now())
  
  card        NFCCard   @relation(fields: [cardId])
}
```

**Relationships:**
- User → Transaction (1:N) - 1 user punya banyak transaksi
- User → NFCCard (1:N) - 1 user punya banyak kartu
- User → FraudAlert (1:N) - 1 user punya banyak fraud alerts
- NFCCard → NFCTransaction (1:N) - 1 kartu punya banyak transaksi

**Migrations:**
```bash
# Buat migration baru
npx prisma migrate dev --name add_new_table

# Apply migration
npx prisma migrate deploy

# Buka database GUI
npx prisma studio
```

---

## 🔷 FRONTEND FILES

### 📄 **App.tsx** - Entry Point Aplikasi Mobile

**Fungsi:**
Root component yang setup navigation dan initialize services.

**Navigation Stack:**
```
LoginScreen (start here)
    ↓ Login success
DashboardScreen (main menu)
    ↓
┌───────┬────────┬──────────┬─────────┐
│  NFC  │ Cards  │ History  │ Profile │
└───────┴────────┴──────────┴─────────┘
```

**Initialization:**
```typescript
useEffect(() => {
  // 1. Initialize API service (load token from AsyncStorage)
  await apiService.initialize();
  
  // 2. Initialize NFC hardware
  await NFCService.initialize();
  
  // 3. Setup Socket.IO connection
  socket.connect();
}, []);
```

---

### 📄 **src/utils/apiService.ts** - HTTP Client (Singleton)

**Pattern:** Singleton Pattern (hanya 1 instance di seluruh app)

**Cara Kerja:**
```typescript
// Get instance (selalu return instance yang sama)
const api = APIService.getInstance();

// Initialize (load token dari AsyncStorage)
await api.initialize();

// Auto token management
api.setToken(token);  // Save token
api.getToken();       // Get token
api.clearToken();     // Logout
```

**Semua API Methods:**

**Authentication:**
```typescript
await api.login(username, password);
await api.register(userData);
await api.logout();
```

**User Management:**
```typescript
await api.getUserById(userId);
await api.updateBalance(userId, amount);
await api.getAllUsers();
```

**Transactions:**
```typescript
await api.createTransaction({
  receiverUsername: 'jane',
  amount: 50000,
  description: 'Bayar makan'
});
await api.getTransactionHistory(userId);
```

**NFC Payments:**
```typescript
await api.processNFCPayment({
  senderCardId: '04A1B2C3',
  receiverCardId: '04Z9Y8X7',
  amount: 25000
});
await api.validateNFCReceiver(cardId);
```

**Fraud Detection:**
```typescript
await api.checkFraudRisk(transactionData);
await api.reportFraudulent(transactionId);
```

**Admin:**
```typescript
await api.getDashboardStats();
await api.blockUser(userId);
await api.topUpBalance(userId, amount);
```

**Auto Error Handling:**
```typescript
try {
  await api.createTransaction(...);
} catch (error) {
  // Error sudah di-handle di apiService
  // Show user-friendly message
  Alert.alert('Error', error.message);
}
```

**Ngrok Error Detection:**
```typescript
// Detect Ngrok warning page
if (responseText.includes('ngrok')) {
  throw new Error('Ngrok connection error. Restart ngrok.');
}
```

---

### 📄 **src/utils/configuration.ts** - App Configuration

**Fungsi:**
Menyimpan URL backend API dan konfigurasi app lainnya.

**Key Constants:**
```typescript
// Backend API URL (Ngrok tunnel)
export const API_URL = 'https://unbellicose-troublesomely-miley.ngrok-free.dev';

// Alternative: Production URL
// export const API_URL = 'https://api.nfcpayment.com';

// Alternative: Local network (jika HP & laptop di WiFi sama)
// export const API_URL = 'http://192.168.1.5:4000';
```

**Cara Update Ngrok URL:**
```bash
# 1. Jalankan ngrok
ngrok http 4000

# 2. Copy URL yang muncul (misal: https://abc123.ngrok-free.dev)

# 3. Update API_URL di configuration.ts

# 4. Rebuild app
expo start --clear
# atau
eas build --platform android --profile preview
```

**Kenapa Pakai Ngrok?**
- Mobile app tidak bisa akses `localhost:4000` langsung
- Ngrok membuat tunnel: `https://xyz.ngrok-free.dev` → `http://localhost:4000`
- Mobile app bisa akses backend via URL Ngrok

**Production Alternative:**
- Deploy backend ke cloud (Heroku, Railway, dll)
- Ganti API_URL dengan production URL
- Tidak perlu Ngrok lagi

---

### 📄 **src/utils/nfc.ts** - NFC Helper Functions

**Fungsi:**
Handle NFC hardware operations (read, write, scan).

**Key Functions:**

#### **1. initializeNFC()**
```typescript
// Initialize NFC hardware
await initializeNFC();
```

#### **2. scanNFCTag()**
```typescript
// Scan NFC card untuk dapat UID
const cardId = await scanNFCTag();
console.log('Card UID:', cardId); // "04A1B2C3D4E5F6"
```

**Flow:**
```
User tap button "Scan NFC"
    ↓
1. Enable NFC reader
    ↓
2. Wait for card detection (auto mode)
    ↓
3. Read UID dari NFC chip
    ↓
4. Return UID as string
```

#### **3. readPhysicalCard()**
```typescript
// Read NFC card dengan validation
const cardInfo = await NFCService.readPhysicalCard();
if (cardInfo) {
  console.log('Card ID:', cardInfo.uid);
  console.log('Type:', cardInfo.type); // "NTag215"
}
```

**NFC Tag Specifications:**
- **Type:** NTag215 (ISO14443A)
- **UID Length:** 7 bytes (14 hex characters)
- **Frequency:** 13.56 MHz
- **Memory:** 540 bytes
- **Read Range:** 0-10 cm

**Error Handling:**
```typescript
try {
  const cardId = await scanNFCTag();
} catch (error) {
  if (error.message.includes('NFC not supported')) {
    Alert.alert('Error', 'Device Anda tidak support NFC');
  }
  if (error.message.includes('NFC disabled')) {
    Alert.alert('Info', 'Aktifkan NFC di Settings');
  }
}
```

---

### 📄 **src/utils/fraudDetection.ts** - Client-Side Fraud Detection

**Fungsi:**
Detect fraud BEFORE send request ke server (pre-validation).

**Algoritma:** Z-Score Based Anomaly Detection (sama dengan backend)

**Cara Pakai:**
```typescript
import { FraudDetectionService } from './fraudDetection';

// Analyze transaction
const result = await FraudDetectionService.analyzeTransaction({
  senderId: currentUser.id,
  receiverId: receiver.id,
  amount: 500000
});

console.log('Risk Score:', result.riskScore);     // 85.5
console.log('Decision:', result.decision);         // "BLOCK"
console.log('Reasons:', result.reasons);           // ["Amount too high", ...]
```

**Decision Tree:**
```javascript
if (result.decision === 'BLOCK') {
  // Auto-reject, jangan kirim ke server
  Alert.alert('Transaksi Diblokir', result.reasons.join('\n'));
  return;
}

if (result.decision === 'REVIEW') {
  // Show confirmation
  Alert.alert(
    'Peringatan',
    'Transaksi ini tidak biasa. Lanjutkan?',
    [
      { text: 'Batal', style: 'cancel' },
      { text: 'Lanjut', onPress: () => submitTransaction() }
    ]
  );
}

if (result.decision === 'ALLOW') {
  // OK, langsung submit
  await submitTransaction();
}
```

**4 Risk Factors:**
```javascript
// 1. Velocity Score (35%) - Transaksi terlalu cepat
// Contoh: 10 transaksi dalam 2 menit

// 2. Amount Z-Score (40%) - Jumlah tidak normal
// Contoh: Biasa Rp 50rb, tiba-tiba Rp 5jt

// 3. Frequency Score (15%) - Frekuensi harian tidak biasa
// Contoh: Biasa 3 tx/hari, hari ini 50 tx

// 4. Behavior Score (10%) - Pola tidak biasa
// Contoh: Transfer ke orang baru, jam 3 pagi
```

**Formula:**
```
Z-Score = (X - μ) / σ

Overall Risk = 
  velocityScore    × 0.35 +
  amountScore      × 0.40 +
  frequencyScore   × 0.15 +
  behaviorScore    × 0.10
```

---

### 📄 **src/utils/database.ts** - Local SQLite Database

**Fungsi:**
Menyimpan data lokal di mobile app (offline support).

**Tables:**
- `users` - Cache user data
- `transactions` - Transaction history (offline mode)
- `nfc_cards` - NFC cards yang pernah di-scan
- `settings` - App settings

**Key Functions:**
```typescript
// Initialize database
await initDatabase();

// Save user
await saveUser(userData);

// Get transactions
const txs = await getTransactions(userId);

// Sync with backend
await syncToBackend();
```

---

### 📄 **src/hooks/useNFCScanner.ts** - Custom Hook untuk NFC

**Apa itu Custom Hook?**
React hook untuk reuse logic NFC di berbagai screens.

**Usage:**
```typescript
function PaymentScreen() {
  const { 
    lastScannedCard,    // Card terakhir di-scan
    isScanning,         // Flag sedang scanning
    scanAndValidateCard,// Function untuk scan
    resetScanner        // Reset state
  } = useNFCScanner(currentUserId);

  const handleScan = async () => {
    const cardId = await scanAndValidateCard();
    if (cardId) {
      // Card valid, proceed payment
      console.log('Valid card:', cardId);
    }
  };

  return (
    <Button 
      title={isScanning ? "Scanning..." : "Scan NFC"} 
      onPress={handleScan}
      disabled={isScanning}
    />
  );
}
```

**Validation Flow:**
```
1. Read physical card UID
    ↓
2. Backend validation:
   - Card registered?
   - Card active?
   - Correct owner?
    ↓
3. Log tap to backend (analytics)
    ↓
4. Show success alert
    ↓
5. Return cardId
```

**Error Messages:**
- "Kartu belum terdaftar" - Card not in database
- "Kartu ini bukan milik Anda" - Wrong owner
- "Kartu tidak aktif" - Card blocked/inactive
- "Gagal membaca kartu" - NFC read error

---

### 📄 **src/hooks/usePayment.ts** - Custom Hook untuk Payment

**Usage:**
```typescript
function SendMoneyScreen() {
  const { 
    isProcessing,    // Flag sedang processing
    sendPayment,     // Function untuk send money
    error            // Error message
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
      <TextInput placeholder="Jumlah" />
      <Button 
        title={isProcessing ? "Processing..." : "Kirim"} 
        onPress={handleSend}
        disabled={isProcessing}
      />
      {error && <Text style={{color: 'red'}}>{error}</Text>}
    </View>
  );
}
```

**Payment Flow:**
```
1. Validate input
   - Amount > 0
   - Receiver exists
   - Balance cukup
    ↓
2. Client-side fraud detection
    ↓
3. Show confirmation
    ↓
4. API call: POST /api/transactions
    ↓
5. Success: Update local balance
6. Fail: Show error
```

---

### 📄 **src/screens/** - UI Screens

#### **LoginScreen.tsx**
**Fungsi:** Form login & register

**Features:**
- Login form (username + password)
- Register form (name, username, password)
- Validation (tidak boleh kosong)
- Auto-navigate to Dashboard setelah login
- Error handling (wrong password, user not found)

**Flow:**
```
User input credentials
    ↓
Validate input
    ↓
API call: POST /api/auth/login
    ↓
Success: Save token → Navigate to Dashboard
Fail: Show error message
```

#### **DashboardScreen.tsx**
**Fungsi:** Main menu aplikasi

**Features:**
- Display saldo user
- Quick actions (Scan NFC, Send Money, Cards, History)
- Real-time balance update (via Socket.IO)
- Pull to refresh
- Notification badges

**Layout:**
```
┌─────────────────────────┐
│  Welcome, John!         │
│  Saldo: Rp 500,000      │
├─────────────────────────┤
│  [Scan NFC]  [Send $]   │
│  [My Cards]  [History]  │
│  [Profile]   [Logout]   │
└─────────────────────────┘
```

#### **NFCScreen.tsx**
**Fungsi:** NFC payment screen

**2 Modes:**
1. **Card-to-Card Payment** - Transfer dari kartu ke kartu
2. **Card-to-User Payment** - Transfer dari kartu ke user

**Flow:**
```
1. Tap "Scan Kartu Pengirim"
    ↓
2. Scan NFC → dapat senderCardId
    ↓
3. Tap "Scan Kartu Penerima"
    ↓
4. Scan NFC → dapat receiverCardId
    ↓
5. Input amount
    ↓
6. Fraud detection check
    ↓
7. Confirm payment
    ↓
8. API call: POST /api/nfc/payment
    ↓
9. Success: Show receipt
```

**UI Components:**
- NFC scanner indicator (animasi)
- Card info display (cardId, balance, owner)
- Amount input (number keyboard)
- Fraud warning badge
- Receipt modal

#### **MyCardsScreen.tsx**
**Fungsi:** Manage NFC cards

**Features:**
- List semua kartu yang dimiliki
- Card detail (cardId, balance, status)
- Register kartu baru
- Top-up kartu
- Block/unblock kartu
- Delete kartu

**Card Item Layout:**
```
┌─────────────────────────┐
│ 💳 Card #04A1B2C3       │
│ Balance: Rp 150,000     │
│ Status: ACTIVE          │
│ [Top Up] [Block] [Del]  │
└─────────────────────────┘
```

#### **RegisterCardScreen.tsx**
**Fungsi:** Register kartu NFC baru

**Flow:**
```
1. Tap "Scan Kartu Baru"
    ↓
2. Read NFC card UID
    ↓
3. Input card name (opsional)
    ↓
4. API call: POST /api/nfc/register
    ↓
5. Success: Auto-link ke user
    ↓
6. Navigate ke MyCardsScreen
```

---

### 📄 **src/components/CustomButton.tsx** - Reusable Button Component

**Props:**
```typescript
interface CustomButtonProps {
  title: string;          // Button text
  onPress: () => void;    // Handler saat di-tap
  disabled?: boolean;     // Disable button
  loading?: boolean;      // Show loading spinner
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  icon?: string;          // Icon name
}
```

**Usage:**
```tsx
<CustomButton 
  title="Kirim Uang"
  onPress={handleSend}
  disabled={isProcessing}
  loading={isProcessing}
  variant="primary"
  size="large"
  icon="send"
/>
```

**Variants:**
- `primary` - Blue button (main action)
- `secondary` - Gray button (secondary action)
- `danger` - Red button (delete, block)

---

## 🔷 DOKUMENTASI FILES

### 📄 **PANDUAN-LENGKAP-SISTEM.md**
Panduan lengkap sistem dari A-Z (arsitektur, flow, testing, deployment).

### 📄 **backend/routes/README-PENJELASAN.md**
Penjelasan detail semua API endpoints + fraud detection algorithm.

### 📄 **PENJELASAN-FILE-BY-FILE.md** (File ini)
Penjelasan setiap file dalam project.

### 📄 **CARA-MENJALANKAN.md**
Cara setup dan menjalankan project (backend + frontend).

### 📄 **TESTING-REPORT.md**
Report hasil testing (unit test, integration test, user acceptance test).

### 📄 **BUG-FIXES-CHECKLIST.md**
Checklist bugs yang sudah di-fix.

---

## 🔷 ALUR LENGKAP SISTEM

### **1. User Registration Flow**
```
Mobile App                Backend                  Database
    │                        │                         │
    ├─ Input data:           │                         │
    │  - name: "John"        │                         │
    │  - username: "john"    │                         │
    │  - password: "pass123" │                         │
    │                        │                         │
    ├─ POST /api/auth/register                        │
    │  { name, username,     │                         │
    │    password }          │                         │
    │                        │                         │
    │                        ├─ Validate:             │
    │                        │  - username unique?    │
    │                        │  - password length?    │
    │                        │                        │
    │                        ├─ Hash password        │
    │                        │  bcrypt.hash(pass, 10)│
    │                        │                        │
    │                        ├─ INSERT user ─────────►│
    │                        │  (name, username,      │
    │                        │   hashed_password)     │
    │                        │                        │
    │◄─ { user, token } ─────┤                        │
    │                        │                        │
    ├─ Save token to         │                        │
    │  AsyncStorage          │                        │
    │                        │                        │
    ├─ Navigate to Dashboard│                        │
```

### **2. Login Flow**
```
Mobile App                Backend                  Database
    │                        │                         │
    ├─ Input credentials     │                         │
    │                        │                         │
    ├─ POST /api/auth/login  │                         │
    │  { username, password }│                         │
    │                        │                         │
    │                        ├─ Query user ──────────►│
    │                        │  WHERE username = ?    │
    │                        │                        │
    │                        │◄─ user data ───────────┤
    │                        │                        │
    │                        ├─ Verify password:     │
    │                        │  bcrypt.compare(       │
    │                        │    input, hashed)      │
    │                        │                        │
    │                        ├─ Generate JWT:        │
    │                        │  jwt.sign({userId},    │
    │                        │    SECRET, {exp: 7d})  │
    │                        │                        │
    │                        ├─ Create session ──────►│
    │                        │                        │
    │◄─ { user, token } ─────┤                        │
    │                        │                        │
    ├─ Save token           │                        │
    ├─ Navigate to Dashboard│                        │
```

### **3. Payment Flow (dengan Fraud Detection)**
```
Mobile App              Backend                    Database
    │                      │                           │
    ├─ Input:              │                           │
    │  - receiver: "jane"  │                           │
    │  - amount: 50000     │                           │
    │                      │                           │
    ├─ Client-side fraud   │                           │
    │  detection (pre-check)                           │
    │                      │                           │
    ├─ POST /api/transactions                          │
    │  { receiver, amount, │                           │
    │    token }           │                           │
    │                      │                           │
    │                      ├─ Verify JWT token        │
    │                      ├─ Get sender from token   │
    │                      │                           │
    │                      ├─ Query receiver ─────────►│
    │                      │                           │
    │                      ├─ Check sender balance ───►│
    │                      │  (balance >= amount?)     │
    │                      │                           │
    │                      ├─ FRAUD DETECTION:        │
    │                      │  1. Get sender history ──►│
    │                      │  2. Calculate Z-Scores   │
    │                      │  3. Weighted risk score  │
    │                      │  4. Decision tree        │
    │                      │                           │
    │                      ├─ If BLOCK:               │
    │                      │   → Create fraud alert ──►│
    │                      │   → Return 403 Forbidden │
    │                      │                           │
    │                      ├─ If ALLOW/REVIEW:        │
    │                      │  → START TRANSACTION     │
    │                      │  → UPDATE sender balance─►│
    │                      │  → UPDATE receiver bal ──►│
    │                      │  → INSERT transaction ───►│
    │                      │  → COMMIT                │
    │                      │                           │
    │                      ├─ Socket.IO emit:         │
    │                      │  'new-transaction' ──────►Admin
    │                      │                           │
    │◄─ { success, tx } ───┤                           │
    │                      │                           │
    ├─ Update local balance│                           │
    ├─ Show success alert  │                           │
```

### **4. NFC Payment Flow**
```
Mobile App          NFC Card         Backend           Database
    │                  │                │                 │
    ├─ Tap "Scan"      │                │                 │
    │                  │                │                 │
    ├─ Enable NFC ────►│                │                 │
    │  reader          │                │                 │
    │                  │                │                 │
    │◄─ Card detected ─┤                │                 │
    │                  │                │                 │
    ├─ Read UID ───────►│                │                 │
    │                  │                │                 │
    │◄─ UID: 04A1B2C3 ─┤                │                 │
    │                  │                │                 │
    ├─ Validate card ──────────────────►│                 │
    │  GET /api/nfc/info/04A1B2C3       │                 │
    │                  │                │                 │
    │                  │                ├─ Query card ───►│
    │                  │                │  (check owner,  │
    │                  │                │   status, bal)  │
    │                  │                │                 │
    │◄─ Card info ───────────────────────┤                 │
    │  (owner, balance, status)          │                 │
    │                  │                │                 │
    ├─ Scan receiver card                │                 │
    │  (repeat process)│                │                 │
    │                  │                │                 │
    ├─ Input amount    │                │                 │
    │                  │                │                 │
    ├─ POST /api/nfc/payment            │                 │
    │  { senderCardId, │                │                 │
    │    receiverCardId,                │                 │
    │    amount }      │                │                 │
    │                  │                │                 │
    │                  │                ├─ Fraud check   │
    │                  │                ├─ Transfer ─────►│
    │                  │                │  (card to card) │
    │                  │                ├─ Log tx ───────►│
    │                  │                │                 │
    │◄─ Success ──────────────────────────┤                 │
    │                  │                │                 │
    ├─ Show receipt    │                │                 │
```

---

## 🎯 KEY CONCEPTS

### **1. JWT (JSON Web Token)**
```
Struktur JWT:
header.payload.signature

Contoh:
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.    ← header (algorithm)
eyJ1c2VySWQiOjEsImlhdCI6MTYxNjIzOTAyMn0.  ← payload (userId, iat)
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c    ← signature

Cara kerja:
1. Server sign payload dengan SECRET key
2. Client simpan token di AsyncStorage
3. Setiap request, kirim token di header
4. Server verify signature
5. Jika valid: allow request
```

### **2. Bcrypt Password Hashing**
```
Plain password: "password123"
    ↓
Hashing dengan bcrypt (10 salt rounds)
    ↓
Hashed: "$2a$10$N9qo8uLOickgx2ZMRZoMye..."

Cara verify:
bcrypt.compare("password123", hashed) → true
bcrypt.compare("wrongpass", hashed)   → false

Kenapa aman?
- Tidak bisa di-reverse (one-way function)
- Setiap hash beda (karena salt random)
- Slow by design (prevent brute force)
```

### **3. Socket.IO Real-Time**
```javascript
// Server side (backend)
io.to('admin-room').emit('new-transaction', { 
  transaction: { id: 123, amount: 50000 }
});

// Client side (mobile app / admin dashboard)
socket.on('new-transaction', (data) => {
  console.log('New transaction:', data.transaction);
  // Update UI tanpa refresh
  updateBalance(data.transaction.amount);
});
```

**Use Cases:**
- Live balance updates
- Real-time notifications
- Admin dashboard live stats
- Fraud alerts

### **4. Prisma ORM**
```javascript
// BAD: SQL injection vulnerable
const query = `SELECT * FROM users WHERE username = '${username}'`;

// GOOD: Prisma ORM (auto parameterized)
const user = await prisma.user.findUnique({
  where: { username: username }
});

// Prisma benefits:
// - Type-safe queries (TypeScript support)
// - Auto-generated client
// - Migration management
// - No SQL injection
```

### **5. Atomic Transactions**
```javascript
// Transfer uang harus atomic (semua sukses atau semua gagal)
await prisma.$transaction(async (tx) => {
  // 1. Kurangi saldo sender
  await tx.user.update({
    where: { id: senderId },
    data: { balance: { decrement: amount } }
  });
  
  // 2. Tambah saldo receiver
  await tx.user.update({
    where: { id: receiverId },
    data: { balance: { increment: amount } }
  });
  
  // 3. Create transaction record
  await tx.transaction.create({
    data: { senderId, receiverId, amount }
  });
});

// Jika salah satu step gagal, semua rollback
```

### **6. Cascade Delete**
```javascript
// Delete user akan auto-delete semua data terkait
await prisma.user.delete({
  where: { id: userId }
});

// Auto-deleted:
// - sentTransactions (CASCADE)
// - receivedTransactions (CASCADE)
// - nfcCards (CASCADE)
// - sessions (CASCADE)
// - fraudAlerts (CASCADE)

// Configured di schema.prisma:
onDelete: Cascade
```

---

## 📊 DATABASE QUERIES EXAMPLES

### **Get User dengan Transactions**
```javascript
const user = await prisma.user.findUnique({
  where: { id: 1 },
  include: {
    sentTransactions: true,      // Transaksi yang dikirim
    receivedTransactions: true,  // Transaksi yang diterima
    nfcCards: true,              // Kartu NFC miliknya
    fraudAlerts: true            // Fraud alerts
  }
});
```

### **Get Transaction History**
```javascript
const transactions = await prisma.transaction.findMany({
  where: {
    OR: [
      { senderId: userId },
      { receiverId: userId }
    ]
  },
  include: {
    sender: { select: { name: true, username: true } },
    receiver: { select: { name: true, username: true } }
  },
  orderBy: { createdAt: 'desc' },
  take: 50  // Limit 50 transaksi terakhir
});
```

### **Get Fraud Stats**
```javascript
const fraudStats = await prisma.fraudAlert.groupBy({
  by: ['decision'],  // Group by decision (ALLOW, REVIEW, BLOCK)
  _count: true,      // Count each group
  _avg: { riskScore: true }  // Average risk score
});

// Result:
// [
//   { decision: 'ALLOW', _count: 150, _avg: { riskScore: 25.5 } },
//   { decision: 'REVIEW', _count: 30, _avg: { riskScore: 65.8 } },
//   { decision: 'BLOCK', _count: 10, _avg: { riskScore: 85.2 } }
// ]
```

---

**Dibuat dengan ❤️ untuk memudahkan pemahaman sistem NFC Payment**

**Last Updated:** April 22, 2026
