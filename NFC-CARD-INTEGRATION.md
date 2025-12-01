# 🎴 Integrasi Kartu NFC Fisik (NTag215)

## 📋 Overview

Sistem NFC Payment sekarang mendukung **kartu NFC fisik (RFID NTag215 13.56MHz)** selain mode virtual (phone-to-phone). Integrasi lengkap mencakup:

- ✅ Database schema untuk kartu dan transaksi
- ✅ Backend API lengkap (9 endpoints)
- ✅ Frontend React Native dengan UI toggle
- ✅ Admin dashboard untuk management kartu
- ✅ Fraud detection untuk transaksi kartu
- ✅ Security & encryption

---

## 🔧 Spesifikasi Kartu NFC

**Model:** RFID NTag215  
**Frekuensi:** 13.56MHz  
**Protokol:** ISO14443A (NFC-A)  
**Memory:** 888 bytes  
**UID:** 7-10 bytes (14-20 karakter hex)  
**Format Data:** NDEF  

**Pembelian:** Shopee - Rp 5,800/kartu

---

## 🗄️ Database Schema

### Model: NFCCard

```prisma
model NFCCard {
  id           Int      @id @default(autoincrement())
  cardId       String   @unique        // UID dari NTag215
  cardType     String   @default("NTag215")
  frequency    String   @default("13.56MHz")
  userId       Int?                    // Link ke user
  cardStatus   String   @default("ACTIVE")
  balance      Float    @default(0)
  issuedDate   DateTime @default(now())
  expiryDate   DateTime?
  lastUsed     DateTime?
  manufacturer String   @default("NXP")
  encryptedData String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  user         User?    @relation(fields: [userId], references: [id])
  transactions NFCTransaction[]
  
  @@index([cardId])
  @@index([userId])
  @@index([cardStatus])
}
```

### Model: NFCTransaction

```prisma
model NFCTransaction {
  id              Int      @id @default(autoincrement())
  cardId          String
  transactionType String   // TAP_IN, TAP_OUT, PAYMENT, TOP_UP
  amount          Float
  balanceBefore   Float
  balanceAfter    Float
  location        String?
  metadata        String?  // JSON untuk data tambahan
  timestamp       DateTime @default(now())
  
  card            NFCCard  @relation(fields: [cardId], references: [cardId])
  
  @@index([cardId])
  @@index([timestamp])
}
```

**Status Kartu:**
- `ACTIVE` - Kartu aktif dan bisa digunakan
- `BLOCKED` - Diblokir oleh admin
- `LOST` - Dilaporkan hilang
- `EXPIRED` - Kadaluarsa

---

## 🔌 Backend API

**Base URL:** `/api/nfc-cards`

### 1. Register Kartu Baru
```http
POST /api/nfc-cards/register
Content-Type: application/json

{
  "cardId": "04E1A3B2C5D6E7",
  "balance": 0
}
```

**Response:**
```json
{
  "success": true,
  "card": {
    "id": 1,
    "cardId": "04E1A3B2C5D6E7",
    "balance": 0,
    "cardStatus": "ACTIVE"
  }
}
```

### 2. Link Kartu ke User
```http
POST /api/nfc-cards/link
Content-Type: application/json

{
  "cardId": "04E1A3B2C5D6E7",
  "username": "john_doe"
}
```

### 3. Tap Kartu (Scan)
```http
POST /api/nfc-cards/tap
Content-Type: application/json

{
  "cardId": "04E1A3B2C5D6E7"
}
```

**Response:**
```json
{
  "success": true,
  "card": {
    "cardId": "04E1A3B2C5D6E7",
    "balance": 50000,
    "cardStatus": "ACTIVE",
    "userId": 1,
    "user": {
      "username": "john_doe",
      "name": "John Doe"
    }
  }
}
```

### 4. Payment (Transfer Saldo)
```http
POST /api/nfc-cards/payment
Content-Type: application/json

{
  "fromCardId": "04E1A3B2C5D6E7",
  "toCardId": "05F2B4C6D8E9F1",
  "amount": 25000
}
```

**Atau bayar ke user (tanpa kartu):**
```json
{
  "fromCardId": "04E1A3B2C5D6E7",
  "toUserId": 2,
  "amount": 25000
}
```

### 5. Top-up Saldo (Admin Only)
```http
POST /api/nfc-cards/topup
Content-Type: application/json

{
  "cardId": "04E1A3B2C5D6E7",
  "amount": 100000,
  "adminPassword": "admin123"
}
```

### 6. Update Status Kartu
```http
PUT /api/nfc-cards/status
Content-Type: application/json

{
  "cardId": "04E1A3B2C5D6E7",
  "status": "BLOCKED",
  "reason": "Suspicious activity"
}
```

### 7. List Semua Kartu
```http
GET /api/nfc-cards/list?status=ACTIVE&limit=50&offset=0
```

### 8. History Transaksi Kartu
```http
GET /api/nfc-cards/transactions/04E1A3B2C5D6E7?limit=100
```

### 9. Info Detail Kartu
```http
GET /api/nfc-cards/info/04E1A3B2C5D6E7
```

**Response:**
```json
{
  "success": true,
  "card": {
    "cardId": "04E1A3B2C5D6E7",
    "balance": 50000,
    "cardStatus": "ACTIVE",
    "issuedDate": "2025-11-29T...",
    "lastUsed": "2025-11-29T...",
    "user": {
      "username": "john_doe",
      "name": "John Doe"
    },
    "statistics": {
      "totalTransactions": 15,
      "totalSpent": 250000,
      "totalReceived": 300000
    }
  }
}
```

---

## 📱 Frontend (React Native)

### File: `src/utils/nfc.ts`

#### 1. Read Physical Card
```typescript
const cardInfo = await NFCService.readPhysicalCard();
// Returns: { id, type, techTypes, maxSize, isWritable, manufacturer }
```

#### 2. Read Card + Data
```typescript
const result = await NFCService.readPhysicalCardWithData();
// Returns: { cardInfo, nfcData }
```

#### 3. Write to Card
```typescript
const result = await NFCService.writePhysicalCard({
  senderId: userId,
  senderName: userName,
  amount: 0,
  timestamp: new Date().toISOString()
});
```

### File: `src/screens/NFCScreen.tsx`

**UI Features:**
- Toggle Physical/Virtual mode
- Scan Card button
- Payment dengan kartu fisik
- Display balance kartu
- Transaction history

**Flow:**
1. User toggle ke mode "Kartu Fisik"
2. Tap "Scan Card" untuk baca UID
3. UID otomatis tersimpan
4. Saat payment, gunakan cardId untuk transaksi

---

## 👨‍💼 Admin Dashboard

**URL:** `http://localhost:4000/admin/simple-dashboard.html`

### Features:

#### 1. **Card List View**
- Display semua kartu terdaftar
- Filter by status (ACTIVE, BLOCKED, LOST, EXPIRED)
- Filter by link status (linked/unlinked)
- Search by Card ID atau username

#### 2. **Register Kartu Baru**
- Input Card ID (UID)
- Set balance awal
- Auto-validation format UID

#### 3. **Link/Unlink User**
- Hubungkan kartu ke user account
- Lepas link (unlink) dari user

#### 4. **Top-up Balance**
- Isi saldo kartu
- Memerlukan password admin
- Log activity tercatat

#### 5. **Block/Unblock Card**
- Blokir kartu mencurigakan
- Aktifkan kembali kartu
- Input reason untuk audit

#### 6. **Transaction History**
- View riwayat transaksi per kartu
- Display 10 transaksi terakhir
- Full details (amount, balance, timestamp)

#### 7. **Real-time Log**
- Monitor aktivitas kartu
- Track register, payment, top-up
- Auto-refresh data

---

## 🛡️ Security & Fraud Detection

### Encryption
- Card data encrypted menggunakan crypto module
- UID validation (14-20 hex characters)
- Duplicate card ID detection

### Fraud Detection

**File:** `src/utils/fraudDetection.ts`

```typescript
interface TransactionContext {
  senderId: number;
  receiverId: number;
  amount: number;
  cardId?: string;           // NEW
  cardType?: 'virtual' | 'physical'; // NEW
  isPhysicalCard?: boolean;  // NEW
}
```

**Rules:**
1. Physical card = **lower risk score** (harder to clone)
2. Block transaction if card status = `BLOCKED` or `LOST`
3. Alert admin untuk aktivitas mencurigakan
4. Track location & metadata untuk audit

---

## 🚀 Cara Testing

### 1. Backend Testing

```bash
# Start backend
cd backend
npm start
```

### 2. Admin Dashboard

```bash
# Open browser
http://localhost:4000/admin/simple-dashboard.html

# Register kartu baru
# Click "➕ Register Kartu Baru"
# Input UID: 04E1A3B2C5D6E7
# Balance: 100000
```

### 3. Mobile App Testing

```bash
# Start React Native app
npx expo start
```

**Test Flow:**
1. Login ke app
2. Go to NFC Screen
3. Toggle ke "Kartu Fisik"
4. Tap "Scan Card"
5. Dekatkan kartu NTag215
6. UID otomatis terbaca
7. Test payment dengan kartu

### 4. Test dengan Kartu Fisik

**Prerequisites:**
- Kartu NTag215 sudah dibeli
- HP support NFC (Android)
- NFC setting ON

**Steps:**
1. Register kartu di admin dashboard
2. Link kartu ke user
3. Top-up balance
4. Test tap card di app
5. Test payment antar kartu

---

## 📊 Monitoring & Logs

### Activity Log (Admin Dashboard)
```
[10:30:45] 🎴 Loaded 5 NFC cards
[10:31:20] ✅ Registered new NFC card: 04E1A3B2C5D6E7
[10:32:15] 🔗 Linked card 04E1A3B2C5D6E7 to user john_doe
[10:35:40] 💰 Top-up card 04E1A3B2C5D6E7: Rp 100,000
[10:40:10] 💳 Payment from card 04E1A3B2C5D6E7: Rp 25,000
[10:45:30] 🚫 Blocked card 05F2B4C6D8E9F1
```

### Database Logs
```sql
-- Total kartu terdaftar
SELECT COUNT(*) FROM NFCCard;

-- Kartu aktif
SELECT COUNT(*) FROM NFCCard WHERE cardStatus = 'ACTIVE';

-- Total balance sistem
SELECT SUM(balance) FROM NFCCard;

-- Top 10 kartu by transaksi
SELECT cardId, COUNT(*) as total 
FROM NFCTransaction 
GROUP BY cardId 
ORDER BY total DESC 
LIMIT 10;
```

---

## 🐛 Troubleshooting

### 1. Card tidak terbaca
- ✅ Pastikan NFC ON di HP
- ✅ Jarak kartu <5cm dari HP
- ✅ Kartu NTag215 authentic
- ✅ App memiliki NFC permission

### 2. Card ID invalid
- ✅ Format: 14-20 hex characters
- ✅ Contoh valid: `04E1A3B2C5D6E7`
- ✅ Uppercase/lowercase accepted

### 3. Payment gagal
- ✅ Check card status = ACTIVE
- ✅ Check balance mencukupi
- ✅ Check card linked ke user
- ✅ Check fraud detection rules

### 4. Admin dashboard tidak load
- ✅ Backend running di port 4000
- ✅ Check console untuk errors
- ✅ Clear browser cache
- ✅ Check network tab

---

## 📝 Checklist Implementation

### Database ✅
- [x] NFCCard model created
- [x] NFCTransaction model created
- [x] Relations configured
- [x] Indexes added
- [x] Migration executed

### Backend ✅
- [x] 9 API endpoints implemented
- [x] Authentication & authorization
- [x] Validation & error handling
- [x] Atomic transactions
- [x] Fraud detection integration
- [x] Activity logging
- [x] Routes registered in server.js

### Frontend ✅
- [x] NFC service methods
- [x] Physical card read/write
- [x] UI with mode toggle
- [x] Payment flow updated
- [x] Error handling
- [x] Loading states

### Admin Dashboard ✅
- [x] Card list view
- [x] Register card modal
- [x] Link/unlink user
- [x] Top-up balance
- [x] Block/unblock card
- [x] Transaction history
- [x] Search & filters
- [x] Real-time activity log

### Security ✅
- [x] Card encryption
- [x] UID validation
- [x] Admin password protection
- [x] Fraud detection rules
- [x] Status checks
- [x] Audit trail

### Testing ⏳
- [ ] Backend API testing
- [ ] Frontend UI testing
- [ ] Physical card testing
- [ ] Payment flow testing
- [ ] Admin dashboard testing
- [ ] Security testing

---

## 🎯 Next Steps

1. **Test dengan kartu fisik**
   - Beli kartu NTag215 dari Shopee
   - Register di admin dashboard
   - Test read/write operations
   - Test payment flow

2. **Load testing**
   - Test dengan multiple cards
   - Concurrent transactions
   - Performance monitoring

3. **Documentation**
   - User manual (Bahasa Indonesia)
   - API documentation
   - Video tutorial

4. **Enhancements**
   - Bulk card registration
   - Export transaction history
   - Analytics dashboard
   - QR code fallback

---

## 📞 Support

Jika ada masalah:
1. Check logs di admin dashboard
2. Check backend console errors
3. Check mobile app console
4. Review API responses
5. Check database integrity

---

**Created:** November 29, 2025  
**Version:** 1.0.0  
**Status:** ✅ Implementation Complete - Ready for Testing
