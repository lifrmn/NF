# 📚 PANDUAN MEMAHAMI BACKEND ROUTES

File ini menjelaskan struktur dan cara kerja semua route di backend sistem pembayaran NFC Anda.

---

## 📁 STRUKTUR FILE ROUTES

```
backend/routes/
├── admin.js          → Endpoint untuk admin dashboard
├── auth.js           → Endpoint untuk login & registrasi
├── devices.js        → Endpoint untuk manajemen perangkat Android
├── fraud.js          → Endpoint untuk deteksi & manajemen fraud
├── nfcCards.js       → Endpoint untuk manajemen kartu NFC
├── transactions.js   → Endpoint untuk transaksi pembayaran
└── users.js          → Endpoint untuk manajemen pengguna
```

---

## 🔐 AUTH.JS - Autentikasi User

### Tujuan
Menangani login, registrasi, dan verifikasi token JWT

### Endpoint Utama

#### 1. POST /api/auth/register
**Untuk apa?** Daftar user baru ke sistem

**Input:**
```json
{
  "name": "John Doe",
  "username": "john",
  "password": "password123",
  "deviceId": "ABC123" // optional
}
```

**Output:**
```json
{
  "message": "Pengguna berhasil didaftarkan",
  "user": { "id": 1, "name": "John Doe", ... },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Cara Kerja:**
1. Validasi input (nama min 2 huruf, username min 3 huruf, password min 6)
2. Cek username sudah ada atau belum
3. Hash password pakai bcrypt (untuk keamanan)
4. Simpan user baru ke database
5. Buat JWT token (berlaku 7 hari)
6. Simpan session ke database
7. Return user data + token

#### 2. POST /api/auth/login
**Untuk apa?** Login user yang sudah terdaftar

**Input:**
```json
{
  "username": "john",
  "password": "password123"
}
```

**Cara Kerja:**
1. Cari user berdasarkan username
2. Compare password yang diinput dengan hash di database
3. Jika cocok, buat JWT token baru
4. Update session
5. Return user data + token

#### 3. GET /api/auth/verify
**Untuk apa?** Cek apakah token masih valid (saat app dibuka)

**Input:** Header → `Authorization: Bearer <token>`

**Output:**
```json
{
  "valid": true,
  "user": { ... }
}
```

---

## 👥 USERS.JS - Manajemen Pengguna

### Endpoint Utama

#### 1. GET /api/users
**Untuk apa?** Admin melihat daftar semua user

**Output:**
```json
[
  {
    "id": 1,
    "name": "John Doe",
    "username": "john",
    "balance": 50000,
    "isActive": true,
    "_count": {
      "sentTransactions": 15,
      "receivedTransactions": 8
    }
  }
]
```

#### 2. GET /api/users/:id
**Untuk apa?** Lihat detail 1 user

**Contoh:** `GET /api/users/5`

#### 3. PUT /api/users/:id/balance
**Untuk apa?** Admin top-up saldo user

**Input:**
```json
{
  "amount": 100000,
  "adminPassword": "admin123",
  "reason": "Top-up manual"
}
```

**Keamanan:**
- Butuh password admin
- Dicatat di log (audit trail)
- Kirim notifikasi real-time ke user & admin

#### 4. DELETE /api/users/:id
**Untuk apa?** Hapus user secara permanen

**⚠️ HATI-HATI:** Ini CASCADE DELETE!

**Data yang terhapus:**
1. Transaksi NFC dari kartu user
2. Kartu NFC user
3. Transaksi user (sent & received)
4. Fraud alerts user
5. Sessions user
6. User record

**Urutan penting:** Child table → Parent table (karena foreign key)

---

## 💳 TRANSACTIONS.JS - Transaksi Pembayaran

### Fitur Utama
- Kirim uang antar user
- Deteksi fraud otomatis (Z-Score algorithm)
- History transaksi
- Statistik

### Endpoint Utama

#### 1. POST /api/transactions
**Untuk apa?** Kirim uang ke user lain

**Input:**
```json
{
  "receiverUsername": "jane",
  "amount": 50000,
  "description": "Bayar makan", // optional
  "deviceId": "ABC123"
}
```

**Cara Kerja:**
1. Validasi input (amount > 0)
2. Cari receiver by username
3. Cek saldo sender cukup atau tidak
4. **FRAUD DETECTION** - Analisa risiko transaksi
   - Jika CRITICAL → BLOCK transaksi
   - Jika HIGH → REVIEW (butuh approval)
   - Jika LOW/MEDIUM → ALLOW
5. **Atomic Transaction** (semua atau tidak sama sekali):
   - Kurangi saldo sender
   - Tambah saldo receiver
   - Buat record transaksi
6. Log fraud jika risiko tinggi
7. Kirim notifikasi real-time
8. Return hasil transaksi

#### 2. GET /api/transactions/user/:userId
**Untuk apa?** Lihat history transaksi user

**Output:**
```json
[
  {
    "id": 100,
    "amount": 50000,
    "sender": { "name": "John", "username": "john" },
    "receiver": { "name": "Jane", "username": "jane" },
    "transactionType": "sent", // atau "received"
    "createdAt": "2025-01-20T10:00:00Z"
  }
]
```

---

## 🚨 FRAUD DETECTION - Deteksi Penipuan

### Algoritma: Z-Score Based Anomaly Detection

**Konsep:**
Z-Score mengukur seberapa "aneh" suatu transaksi dibanding pola normal user

**Formula:**
```
Z = (X - μ) / σ

Di mana:
- X = nilai transaksi sekarang
- μ = rata-rata transaksi user (mean)
- σ = deviasi standar (variasi data)
```

**Contoh:**
```
User biasa transfer Rp 50.000 - Rp 100.000
Rata-rata: Rp 75.000
Deviasi standar: Rp 25.000

Tiba-tiba transfer Rp 500.000
Z-Score = (500000 - 75000) / 25000 = 17

Z > 3 = EXTREME OUTLIER → BLOCK!
```

### 4 Faktor Risiko:

#### 1. Velocity Score (35% bobot)
**Apa itu?** Kecepatan transaksi

**Indikator fraud:**
- 10 transaksi dalam 5 menit → SUSPICIOUS
- Normal: 2-3 transaksi per jam

#### 2. Amount Z-Score (40% bobot)
**Apa itu?** Anomali jumlah uang

**Indikator fraud:**
- Transaksi jauh lebih besar dari biasanya
- Contoh: Biasa Rp 50rb, tiba-tiba Rp 5jt

#### 3. Frequency Score (15% bobot)
**Apa itu?** Pola frekuensi harian

**Indikator fraud:**
- Hari ini 50 transaksi, biasanya 5 transaksi/hari

#### 4. Behavior Score (10% bobot)
**Apa itu?** Perilaku tidak normal

**Indikator fraud:**
- Transfer ke orang baru yang belum pernah
- Transaksi jam 3 pagi (biasanya siang)

### Risk Level Mapping:
```
Overall Risk Score = (Velocity × 0.35) + (Amount × 0.40) + 
                     (Frequency × 0.15) + (Behavior × 0.10)

Risk Score >= 80 → CRITICAL (BLOCK)
Risk Score >= 60 → HIGH (REVIEW)
Risk Score >= 40 → MEDIUM (ALLOW dengan log)
Risk Score < 40  → LOW (ALLOW)
```

---

## 📱 DEVICES.JS - Manajemen Perangkat

### Tujuan
Track perangkat Android yang terkoneksi

### Endpoint Utama

#### 1. POST /api/devices/register
**Untuk apa?** Daftar perangkat baru (first install)

**Input:**
```json
{
  "deviceId": "ABC123XYZ789",
  "deviceName": "Samsung Galaxy S21",
  "platform": "android",
  "appVersion": "1.0.0"
}
```

#### 2. POST /api/devices/sync-device
**Untuk apa?** Sync data perangkat ke server

**Input:**
```json
{
  "device": { "deviceId": "ABC123", ... },
  "users": [ ... ],
  "recentTransactions": [ ... ],
  "stats": { "totalUsers": 5, "totalBalance": 500000 }
}
```

**Cara Kerja:**
1. Update/create device record
2. Sync users dari app ke server
3. Sync transaksi
4. Cek pending balance updates dari admin
5. Emit real-time update ke admin dashboard

#### 3. GET /api/devices/stats/summary
**Untuk apa?** Statistik perangkat

**Output:**
```json
{
  "totalDevices": 10,
  "onlineDevices": 7,
  "offlineDevices": 3,
  "totalUsers": 50,
  "totalBalance": 5000000
}
```

**Online Status:**
- Online jika `lastSeen` < 5 menit yang lalu
- Offline jika > 5 menit

---

## 💳 NFCCARDS.JS - Manajemen Kartu NFC

### Teknologi
- **NFC Tag:** NTag215 (ISO14443A)
- **Frequency:** 13.56 MHz (RFID)
- **UID:** 7 bytes (unique per kartu)
- **Memory:** 540 bytes

### Endpoint Utama

#### 1. POST /api/nfc/register
**Untuk apa?** Daftar kartu NFC baru

**Input:**
```json
{
  "cardId": "04A1B2C3D4E5F6", // UID dari NFC tag
  "userId": 5, // optional
  "deviceId": "ABC123"
}
```

**Business Rule:**
- 1 user = 1 kartu NFC (tidak bisa lebih)
- cardId harus unique (tidak boleh duplikat)
- Format UID: 14-20 karakter hexadecimal

#### 2. POST /api/nfc/payment
**Untuk apa?** Bayar pakai kartu NFC

**Input:**
```json
{
  "senderCardId": "04A1B2C3D4E5F6",
  "receiverCardId": "04Z9Y8X7W6V5U4",
  "amount": 50000,
  "deviceId": "ABC123"
}
```

**Cara Kerja:**
1. Validasi kedua kartu exists & ACTIVE
2. Cek saldo kartu sender
3. Fraud detection
4. Atomic transaction (kurangi + tambah saldo)
5. Buat record transaksi NFC
6. Jika ada userId, sync dengan transaksi user

---

## 🛡️ ADMIN.JS - Admin Dashboard

### Tujuan
Backend untuk panel admin (web dashboard)

### Endpoint Utama

#### 1. GET /api/admin/dashboard
**Untuk apa?** Statistik keseluruhan sistem

**Output:**
```json
{
  "summary": {
    "totalUsers": 100,
    "totalDevices": 50,
    "onlineDevices": 30,
    "totalTransactions": 1500,
    "totalBalance": 50000000,
    "fraudAlerts24h": 5
  },
  "recentTransactions": [ ... ],
  "recentFraudAlerts": [ ... ]
}
```

#### 2. POST /api/admin/balance-update
**Untuk apa?** Admin top-up saldo ke semua user di device tertentu

**Input:**
```json
{
  "deviceId": "ABC123",
  "amount": 100000,
  "adminPassword": "admin123",
  "reason": "Promo akhir tahun"
}
```

**Cara Kerja:**
1. Verifikasi admin password
2. Cari semua user di device tersebut
3. Tambah saldo ke semua user
4. Log admin action
5. Emit notifikasi real-time

---

## 🔄 KONSEP PENTING

### 1. Atomic Transaction
**Apa itu?** Semua atau tidak sama sekali

**Contoh:**
```javascript
await prisma.$transaction(async (tx) => {
  // Step 1: Kurangi saldo sender
  await tx.user.update({ ... });
  
  // Step 2: Tambah saldo receiver
  await tx.user.update({ ... });
  
  // Jika salah satu error, semua dibatalkan (rollback)
});
```

**Kenapa penting?**
- Mencegah saldo "hilang"
- Contoh error: Saldo sender berkurang, tapi receiver tidak bertambah
- Dengan atomic, kedua step sukses atau kedua dibatalkan

### 2. CASCADE DELETE
**Apa itu?** Hapus parent otomatis hapus child

**Contoh:**
```
User (parent)
  ├── NFCCard (child)
  │     └── NFCTransaction (grandchild)
  ├── Transaction
  └── FraudAlert

Hapus User → otomatis hapus semua child & grandchild
```

**Urutan penting:**
Grandchild → Child → Parent (dari bawah ke atas)

### 3. Real-Time dengan Socket.IO
**Apa itu?** Kirim data tanpa reload

**Contoh:**
```javascript
// Server emit event
req.io.to('admin-room').emit('user-registered', { user });

// Admin dashboard (client) langsung terima:
socket.on('user-registered', (data) => {
  // Update UI tanpa refresh page
  console.log('User baru:', data.user);
});
```

### 4. JWT Token
**Apa itu?** Token untuk autentikasi

**Format:**
```
Header: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
Payload: eyJ1c2VySWQiOjUsInVzZXJuYW1lIjoiam9obiJ9
Signature: SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

**Cara Kerja:**
1. User login → Server buat token
2. Token dikirim ke client
3. Client simpan token (AsyncStorage)
4. Setiap request, kirim token di header:
   ```
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
5. Server verify token → allow/deny request

---

## 🐛 DEBUGGING TIPS

### 1. Cek Log Console
Semua endpoint punya console.log untuk tracking:
```
✅ User ditemukan: john
💰 Admin menambahkan Rp 100.000
🚨 PERINGATAN FRAUD: risiko HIGH (85%)
```

### 2. Cek Database
Gunakan Prisma Studio:
```bash
npx prisma studio
```

### 3. Test API dengan Postman/Thunder Client
Contoh request:
```
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "username": "john",
  "password": "password123"
}
```

### 4. Error Common

**Error: "Pengguna tidak ditemukan"**
- Cek username benar atau salah
- Cek user belum dihapus

**Error: "Saldo tidak cukup"**
- Cek balance user >= amount
- Top-up saldo dulu via admin

**Error: "Token tidak valid"**
- Token expired (7 hari)
- Login ulang untuk dapat token baru

---

## 📖 REFERENSI TAMBAHAN

### Database Schema (Prisma)
Lihat: `backend/prisma/schema.prisma`

### Middleware
- `auth.js` → Verify JWT token
- `errorHandler.js` → Handle errors
- `logger.js` → Log requests

### Environment Variables
File: `.env`
```
DATABASE_URL="postgresql://..."
JWT_SECRET="secret-key"
ADMIN_PASSWORD="admin123"
```

---

## ❓ PERTANYAAN UMUM

**Q: Bagaimana cara menambah endpoint baru?**
A: 
1. Buka file route yang sesuai (contoh: users.js)
2. Tambah endpoint baru:
   ```javascript
   router.get('/new-endpoint', async (req, res) => {
     // Logic di sini
   });
   ```
3. Export router (sudah ada di akhir file)

**Q: Bagaimana cara mengubah business rule?**
A: Edit logic di endpoint terkait. Contoh: Ubah "1 user = 1 kartu" jadi "1 user = 3 kartu":
```javascript
// Di nfcCards.js
const userCards = await prisma.nFCCard.count({ where: { userId } });
if (userCards >= 3) { // ubah dari 1 jadi 3
  return res.status(409).json({ error: 'Maksimal 3 kartu per user' });
}
```

**Q: Bagaimana cara menambah field baru di database?**
A:
1. Edit `schema.prisma`
2. Run migration:
   ```bash
   npx prisma migrate dev --name add_new_field
   ```

---

**Dibuat dengan ❤️ untuk memudahkan pemahaman kode Anda**
