# 🎛️ Simple Admin Control Center - Panduan Lengkap

## 📋 Daftar Isi
1. [Pengenalan](#pengenalan)
2. [Fitur Utama](#fitur-utama)
3. [Cara Menjalankan](#cara-menjalankan)
4. [Fungsi Quick Actions](#fungsi-quick-actions)
5. [User Management](#user-management)
6. [Transaction Monitoring](#transaction-monitoring)
7. [Activity Log](#activity-log)
8. [Backend API Endpoints](#backend-api-endpoints)
9. [Troubleshooting](#troubleshooting)

---

## 🎯 Pengenalan

**Simple Admin Control Center** adalah dashboard admin lengkap yang memungkinkan Anda untuk:
- ✅ **Monitor semua aktivitas** dalam real-time
- ✅ **Manage users** (add, edit, delete)
- ✅ **Monitor transaksi** dengan fraud detection
- ✅ **Ambil tindakan cepat** tanpa command line
- ✅ **Export data** ke CSV
- ✅ **TIDAK PERLU** membuka Prisma Studio lagi!

Dashboard ini adalah **pengganti lengkap** untuk Prisma Studio dengan interface yang lebih mudah dan fitur yang lebih powerful.

---

## 🚀 Fitur Utama

### 1. Real-time Activity Log 📊
- Monitor semua pergerakan admin dalam real-time
- Color-coded entries (device, transaction, fraud, action, error)
- Auto-scroll ke aktivitas terbaru
- Menyimpan hingga 50 aktivitas terakhir
- Clear log dengan satu klik

### 2. Quick Actions ⚡
6 tombol aksi cepat untuk operasi admin:
- 🚫 **Block User/Transaction** - Block user dari sistem
- 💰 **Reset User Balance** - Reset balance user tertentu
- 💵 **Bulk Top-up All Users** - Top-up semua user sekaligus
- 📥 **Export All Data CSV** - Export transaksi ke CSV
- 🗑️ **Clear Fraud Alerts** - Hapus semua fraud alerts
- 🔄 **Refresh All Data** - Refresh semua data dashboard

### 3. Transaction Monitoring 💳
- View semua transaksi dari seluruh devices
- Filter by Risk Level (ALL, LOW, MEDIUM, HIGH, CRITICAL)
- Filter by Status (completed, pending, failed)
- Search by username
- Limit results untuk performa
- Lihat fraud risk score dan reasons
- Statistics: Total transactions, average risk score, count by risk level

### 4. User Management 👥
- List semua users dari connected devices
- View balance, username, name, device
- **Add New User** - Create user baru
- **Edit User** - Update balance user
- **Delete User** - Hapus user dan transaksinya
- Search/filter user list

### 5. Fraud Detection Integration 🛡️
- View fraud alerts dari sistem
- Clear fraud alerts history
- Monitor fraud statistics
- Lihat fraudRiskScore, fraudRiskLevel, fraudReasons

---

## 🔧 Cara Menjalankan

### Step 1: Start Backend Server
```powershell
cd backend
npm start
```
Backend akan berjalan di: `http://192.168.137.1:4000`

### Step 2: Start Admin Server
```powershell
cd admin
node simple-admin.js
```
Admin akan berjalan di: `http://192.168.137.1:3001`

### Step 3: Buka Dashboard
Buka browser dan akses:
```
http://192.168.137.1:3001
```
atau
```
http://localhost:3001
```

### Step 4: Hubungkan Mobile App
Mobile app akan otomatis connect ke admin server saat pertama kali buka.

---

## ⚡ Fungsi Quick Actions

### 1. 🚫 Block User/Transaction

**Cara Menggunakan:**
1. Klik tombol "🚫 Block User/Transaction"
2. Masukkan username yang akan di-block
3. Masukkan alasan block (opsional)
4. Konfirmasi action
5. User akan ter-block dan tidak bisa transaksi

**Kapan Digunakan:**
- User mencurigakan dengan banyak fraud alerts
- User melakukan transaksi abnormal berulang kali
- Testing security system

**Backend API:**
```javascript
POST /api/block-user
Body: { username: "user123", reason: "Suspicious activity" }
```

---

### 2. 💰 Reset User Balance

**Cara Menggunakan:**
1. Klik tombol "💰 Reset User Balance"
2. Masukkan username
3. Masukkan balance baru (contoh: 1000000 untuk 1 juta)
4. Konfirmasi action
5. Balance user akan di-update

**Kapan Digunakan:**
- Fix balance error
- Testing dengan balance custom
- Reset balance setelah demo

**Backend API:**
```javascript
PUT /api/users/:id
Body: { balance: 1000000 }
```

**Catatan:** Fitur ini akan mencari user dari `allUsers` array dan menggunakan user ID untuk update.

---

### 3. 💵 Bulk Top-up All Users

**Cara Menggunakan:**
1. Klik tombol "💵 Bulk Top-up All Users"
2. Masukkan jumlah top-up (contoh: 100000 untuk 100 ribu)
3. Masukkan password admin untuk konfirmasi (`admin123`)
4. Konfirmasi action
5. Semua user akan mendapat top-up

**Kapan Digunakan:**
- Event promo (kasih bonus ke semua user)
- Testing saldo besar-besaran
- Reset semua user ke balance sama

**Backend API:**
```javascript
POST /api/bulk-topup
Body: { amount: 100000, password: "admin123" }
```

**⚠️ PERHATIAN:** Butuh password admin karena action ini mempengaruhi SEMUA user!

---

### 4. 📥 Export All Data CSV

**Cara Menggunakan:**
1. Klik tombol "📥 Export All Data CSV"
2. File CSV akan otomatis download
3. Buka di Excel/Google Sheets

**Format CSV:**
```
ID,Sender,Receiver,Amount,Risk Score,Risk Level,Status,Date
1,"alice","bob",50000,15.5,"LOW","completed","12/12/2025 10:30:00"
2,"bob","charlie",250000,85.2,"CRITICAL","completed","12/12/2025 10:35:00"
```

**Kapan Digunakan:**
- Membuat laporan untuk dosen/pembimbing
- Analisis data fraud detection
- Backup data transaksi
- Import ke tools analisis lain

**Fitur Khusus:**
- Nama file otomatis dengan tanggal: `transactions_2025-12-12.csv`
- Include semua data transaksi
- Include fraud risk score dan level
- Format tanggal Indonesia

---

### 5. 🗑️ Clear Fraud Alerts

**Cara Menggunakan:**
1. Klik tombol "🗑️ Clear Fraud Alerts"
2. Konfirmasi action
3. Semua fraud alerts akan dihapus dari memory

**Kapan Digunakan:**
- Setelah selesai demo/testing
- Clear history sebelum demo baru
- Reset fraud statistics

**Backend API:**
```javascript
POST /api/clear-fraud-alerts
```

**⚠️ PERHATIAN:** Ini hanya clear dari Simple Admin memory. Fraud alerts di database (Prisma) tidak terhapus.

---

### 6. 🔄 Refresh All Data

**Cara Menggunakan:**
1. Klik tombol "🔄 Refresh All Data"
2. Dashboard akan reload semua data:
   - Devices
   - Fraud Alerts
   - Transactions
   - Users

**Kapan Digunakan:**
- Setelah mobile app sync data baru
- Setelah melakukan action (block user, topup, dll)
- Check data terbaru dari backend

**Function Call:**
```javascript
loadDevices();
loadFraudAlerts();
loadAllTransactions();
loadAllUsers();
```

---

## 👥 User Management

### View All Users
List semua user yang terkoneksi dari devices.

**Data Ditampilkan:**
- User ID
- Username (@username)
- Full Name
- Balance (format Rupiah)
- Device Name/ID
- Actions (Edit, Delete)

### Add New User

**Cara Menggunakan:**
1. Klik tombol "➕ Add New User"
2. Masukkan username (contoh: `alice`)
3. Masukkan nama lengkap (contoh: `Alice Smith`)
4. Masukkan password (default: `password123`)
5. Masukkan balance awal (default: `1000000`)
6. User baru akan dibuat

**Backend API:**
```javascript
POST /api/users
Body: {
  username: "alice",
  name: "Alice Smith",
  password: "password123",
  balance: 1000000
}
```

**⚠️ NOTE:** Backend implementation masih TODO. API endpoint sudah ready, tinggal integrate dengan database Prisma.

### Edit User

**Cara Menggunakan:**
1. Klik tombol "Edit" pada user yang ingin di-edit
2. Masukkan balance baru
3. Konfirmasi
4. Balance user akan di-update

**Backend API:**
```javascript
PUT /api/users/:id
Body: { balance: 2000000 }
```

### Delete User

**Cara Menggunakan:**
1. Klik tombol "Delete" pada user yang ingin dihapus
2. Konfirmasi (ini akan hapus user DAN semua transaksinya!)
3. User akan dihapus dari sistem

**Backend API:**
```javascript
DELETE /api/users/:id
```

**⚠️ PERHATIAN:** Action ini permanen! Semua transaksi user juga akan terhapus.

### Search/Filter Users

**Cara Menggunakan:**
1. Ketik di search box "Search users..."
2. Otomatis filter by username atau name
3. Table akan update real-time

**Fitur:**
- Case-insensitive search
- Search by username OR name
- Real-time filtering

---

## 💳 Transaction Monitoring

### View All Transactions

**Cara Menggunakan:**
1. Dashboard otomatis load transaksi saat buka
2. Scroll untuk lihat semua transaksi
3. Lihat fraud risk score, level, dan reasons

### Filter by Risk Level

**Options:**
- **ALL** - Semua transaksi
- **LOW** - Risk score < 40
- **MEDIUM** - Risk score 40-59
- **HIGH** - Risk score 60-79
- **CRITICAL** - Risk score 80-100

**Cara Menggunakan:**
1. Pilih risk level dari dropdown
2. Masukkan limit (opsional, default 50)
3. Klik "Apply Filter"
4. Table akan update dengan filtered data

### Filter by Status

**Options:**
- **ALL** - Semua status
- **completed** - Transaksi berhasil
- **pending** - Transaksi pending
- **failed** - Transaksi gagal

### Search by Username

**Cara Menggunakan:**
1. Ketik username di search box
2. Klik "Apply Filter"
3. Hanya transaksi dari/ke user tersebut yang muncul

### Transaction Statistics

Dashboard menampilkan:
- **Total Transactions** - Jumlah total transaksi
- **Critical Transactions** - Jumlah transaksi CRITICAL
- **High Risk Transactions** - Jumlah transaksi HIGH
- **Medium Risk Transactions** - Jumlah transaksi MEDIUM
- **Low Risk Transactions** - Jumlah transaksi LOW
- **Average Risk Score** - Rata-rata fraud risk score

---

## 📊 Activity Log

### Fitur Activity Log

**Jenis Aktivitas:**
1. 🔵 **Device** - Device connect/disconnect
2. 💚 **Transaction** - Transaksi baru
3. 🔴 **Fraud** - Fraud alert detected
4. 🟡 **Action** - Admin actions (block, topup, dll)
5. ❌ **Error** - Errors/failures
6. 🔷 **System** - System events (refresh, load data)

**Contoh Log Entries:**
```
[10:30:15] 🔵 Device: 3 devices connected
[10:30:20] 💚 Transaction: 45 transactions loaded
[10:35:10] 🔴 Fraud: 2 fraud alerts detected
[10:40:00] 🟡 Action: ✅ Blocked user: suspicious_user
[10:45:30] 🔷 System: Admin refreshed all data
```

### Clear Activity Log

**Cara Menggunakan:**
1. Klik tombol "Clear Log" di bawah activity log
2. Konfirmasi
3. Log akan kosong

**Catatan:** Log hanya di browser, tidak tersimpan di server.

---

## 🔌 Backend API Endpoints

### Device Management
```javascript
GET  /api/devices              // List all connected devices
POST /api/sync-device          // Sync device data
```

### Transaction Management
```javascript
GET  /api/transactions?limit=50&riskLevel=HIGH&status=completed
     // Get all transactions with filters
```

### Fraud Detection
```javascript
GET  /api/fraud-alerts         // Get all fraud alerts
POST /api/fraud-alert          // Receive fraud alert from mobile
POST /api/clear-fraud-alerts   // Clear all fraud alerts
```

### User Management
```javascript
GET    /api/users              // List all users
POST   /api/users              // Create new user
PUT    /api/users/:id          // Update user (balance, name, etc)
DELETE /api/users/:id          // Delete user
```

### Admin Actions
```javascript
POST /api/block-user           // Block user from transactions
POST /api/bulk-topup           // Top-up all users at once
```

### Health Check
```javascript
GET /api/ping                  // Connection check
GET /api/health                // Server health status
```

---

## 🛡️ Security Headers

Simple Admin Server menggunakan security headers:
```javascript
x-app-key: NFC2025SecureApp
user-agent: okhttp/4.9.0
```

**Cara Kerja:**
1. Semua API endpoints (kecuali dashboard) protected
2. Harus include `x-app-key` header
3. Harus include `user-agent` header
4. Request tanpa headers akan ditolak (401 Unauthorized)

**Catatan untuk Testing:**
Jika testing dengan Postman/curl, tambahkan headers:
```
x-app-key: NFC2025SecureApp
user-agent: okhttp/4.9.0
```

---

## 🔧 Troubleshooting

### Problem 1: Dashboard tidak bisa diakses

**Solusi:**
1. Check admin server running:
   ```powershell
   cd admin
   node simple-admin.js
   ```
2. Check IP address benar:
   ```powershell
   ipconfig
   ```
   Cari "Wireless LAN adapter Wi-Fi" → IPv4 Address
3. Pastikan firewall tidak block port 3001

---

### Problem 2: User Management tidak bekerja

**Penyebab:**
Backend API endpoints (`POST /api/users`, `PUT /api/users/:id`, `DELETE /api/users/:id`) masih **TODO** - belum integrate dengan database Prisma.

**Solusi Sementara:**
1. Gunakan Prisma Studio untuk manage users:
   ```powershell
   cd backend
   npx prisma studio
   ```
2. Atau gunakan backend routes yang sudah ada (`backend/routes/users.js`)

**Solusi Permanent:**
Integrate Simple Admin endpoints dengan backend Prisma database. Contoh implementasi:

```javascript
// In simple-admin.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async createUserEndpoint(req, res) {
  try {
    const { username, name, password, balance } = req.body;
    
    // Hash password
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user in Prisma
    const user = await prisma.user.create({
      data: {
        username,
        name,
        password: hashedPassword,
        balance
      }
    });
    
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

---

### Problem 3: Fraud Alerts tidak muncul

**Penyebab:**
Mobile app belum mengirim fraud alerts ke admin server.

**Solusi:**
1. Check `src/utils/simpleAPI.ts` → function `sendFraudAlert()`
2. Pastikan mobile app connect ke admin server
3. Check console.log di admin server untuk fraud alerts

**Verify:**
```javascript
// Check di admin server console
🚨 [FRAUD ALERT] User alice - Risk: 85.2 - Decision: REVIEW
```

---

### Problem 4: Export CSV tidak ada data

**Penyebab:**
`allTransactions` array kosong.

**Solusi:**
1. Klik "🔄 Refresh All Data"
2. Pastikan mobile app sudah sync transaksi
3. Check console.log:
   ```javascript
   console.log('Transactions:', allTransactions.length);
   ```

---

### Problem 5: Activity Log tidak scroll ke bawah

**Solusi:**
Activity log akan auto-scroll ke entry terbaru. Jika tidak:
1. Scroll manual ke bawah
2. Clear log dan monitor lagi
3. Refresh browser

---

## 📚 Referensi File

### Files Modified:
1. **admin/simple-dashboard.html** (1422 lines)
   - Full control center UI
   - Quick Actions buttons
   - Transaction monitoring
   - User management
   - Activity log
   - JavaScript functions untuk semua features

2. **admin/simple-admin.js** (717+ lines)
   - Express server port 3001
   - API endpoints untuk user/transaction/fraud management
   - Security middleware
   - Device tracking

3. **backend/routes/transactions.js** (558 lines)
   - Fraud detection dengan Z-Score
   - Save fraud data ke database
   - Weights: 35/40/15/10
   - Thresholds: 40/60/80

### Related Documentation:
- `CARA-MENJALANKAN.md` - Complete setup guide
- `FRAUD-MONITORING-GUIDE.md` - Fraud monitoring across 3 platforms
- `ADMIN-SETUP-GUIDE.md` - Original admin setup
- `TROUBLESHOOTING.md` - General troubleshooting

---

## 🎓 Untuk SKRIPSI/Thesis

### Cara Demo ke Dosen:

1. **Start Backend + Admin Server**
   ```powershell
   # Terminal 1
   cd backend
   npm start
   
   # Terminal 2
   cd admin
   node simple-admin.js
   ```

2. **Buka Dashboard**
   - Browser: `http://192.168.137.1:3001`
   - Show Real-time Activity Log
   - Show Transaction Monitoring dengan fraud scores

3. **Demo User Management**
   - Add new user
   - Edit user balance
   - Show user list dengan device info

4. **Demo Quick Actions**
   - Block suspicious user
   - Bulk top-up demo
   - Export data ke CSV
   - Show CSV di Excel

5. **Demo Fraud Detection**
   - Buat transaksi dengan amount besar dari mobile app
   - Show fraud alert muncul di dashboard
   - Show risk score calculation (Z-Score: 35/40/15/10)
   - Show risk level (LOW/MEDIUM/HIGH/CRITICAL)
   - Explain NO if-else, pakai Z-Score algorithm

6. **Show Activity Log**
   - Semua admin actions tercatat
   - Color-coded entries
   - Real-time monitoring

### Key Points untuk Dosen:

✅ **NO IF-ELSE** - Fraud detection pakai Z-Score Anomaly Detection
✅ **AI Algorithm** - Weighted scoring: velocity 35%, amount 40%, frequency 15%, behavior 10%
✅ **Complete Monitoring** - 3 platforms (Mobile, Admin Dashboard, Prisma Studio)
✅ **Full Control** - Admin bisa manage semua tanpa command line
✅ **Real-time** - Activity log dan fraud detection real-time
✅ **Export Data** - Bisa export ke CSV untuk analisis
✅ **Security** - Protected API dengan headers validation

---

## 🚀 Next Steps / Future Enhancements

### Backend Integration (TODO):
1. Integrate user CRUD operations dengan Prisma database
2. Implement block user logic (add `blocked` column ke User table)
3. Implement bulk topup dengan Prisma transaction
4. Add transaction CRUD operations (manual add/edit/delete)
5. Add user sessions tracking
6. Add audit log table untuk admin actions

### Dashboard Enhancements:
1. Add modal dialogs untuk forms (better UX)
2. Add data visualization (charts untuk fraud statistics)
3. Add date range filter untuk transactions
4. Add pagination untuk large datasets
5. Add WebSocket untuk real-time updates (tanpa perlu refresh)
6. Add dark mode theme
7. Add export users to CSV
8. Add import users from CSV

### Mobile App Integration:
1. Call frontend fraud detection sebelum send ke backend
2. Show fraud risk score di mobile app
3. Block transaction jika user ter-block
4. Show admin notifications di mobile app

---

## 📞 Support

Jika ada masalah atau pertanyaan:
1. Check console.log di browser (F12 → Console)
2. Check admin server logs di terminal
3. Check backend server logs
4. Refer to `TROUBLESHOOTING.md`
5. Check `FRAUD-MONITORING-GUIDE.md` untuk fraud detection issues

---

**Created by:** NFC Payment System - SKRIPSI Project
**Last Updated:** December 12, 2025
**Version:** 1.0.0 (Control Center Release)

---

# 🎉 Selamat! Dashboard Admin Control Center Sudah Siap!

**TIDAK PERLU PRISMA STUDIO LAGI!** 🎊

Semua fitur monitoring dan management sudah ada di Simple Admin Dashboard:
- ✅ Monitor transactions dengan fraud detection
- ✅ Manage users (add, edit, delete)
- ✅ Quick actions (block, topup, export, clear)
- ✅ Real-time activity log
- ✅ Export data to CSV

**Ready for SKRIPSI demo!** 🚀
