# 🎛️ TUTORIAL ADMIN DASHBOARD - NFC PAYMENT SYSTEM

Panduan lengkap cara menampilkan dan menggunakan Admin Dashboard untuk monitoring sistem.

---

## 📊 APA ITU ADMIN DASHBOARD?

Admin Dashboard adalah **halaman web** untuk:
- ✅ Monitor semua transaksi real-time
- ✅ Kelola users (create, edit, delete, block/unblock)
- ✅ Kelola NFC cards (register, link, top-up, block)
- ✅ Monitor fraud alerts
- ✅ Top-up balance users
- ✅ Lihat statistik sistem

---

## 🚀 2 CARA MENJALANKAN ADMIN DASHBOARD

### **CARA 1: Langsung Buka File HTML (PALING MUDAH)** ⭐ RECOMMENDED

Cara ini paling mudah, tidak perlu install apa-apa!

#### Langkah-langkah:

1. **Pastikan Backend Server Running**

```powershell
# Di terminal backend
cd C:\Users\ASUS\skripku jadi\backend
npm run dev

# Harus tampil: Server running on http://localhost:4000
```

2. **Buka Admin Dashboard di Browser**

```powershell
# Cara 1: Double-click file
# Buka File Explorer → admin/simple-dashboard.html → Double-click

# Cara 2: Via browser
# Chrome/Edge → Ctrl+O → pilih file simple-dashboard.html
```

3. **Dashboard Akan Terbuka!**

URL di browser:
```
file:///C:/Users/ASUS/skripku%20jadi/admin/simple-dashboard.html
```

4. **Login Admin (Jika Diminta)**

Password default: `admin123` (sesuai dengan `ADMIN_PASSWORD` di `.env`)

**✅ SELESAI!** Dashboard langsung bisa digunakan!

---

### **CARA 2: Via Admin Server (Port 3000)**

Cara ini menjalankan server admin terpisah di port 3000.

#### Langkah-langkah:

1. **Install Dependencies Admin (Jika Belum)**

```powershell
cd C:\Users\ASUS\skripku jadi\admin
npm install
```

2. **Jalankan Admin Server**

Buka **terminal BARU** (jangan tutup terminal backend):

```powershell
cd C:\Users\ASUS\skripku jadi\admin
node simple-admin.js
```

**Output:**

```
🎛️  Admin Dashboard Server
📊 Admin server running on http://localhost:3000
🔗 Dashboard: http://localhost:3000
📡 Backend proxy: http://localhost:4000
```

3. **Buka Dashboard di Browser**

```
http://localhost:3000
```

**✅ SELESAI!** Dashboard running di port 3000!

---

## 🖥️ TAMPILAN ADMIN DASHBOARD

Setelah dashboard terbuka, Anda akan lihat:

```
┌─────────────────────────────────────────────────────────────┐
│  📊 ADMIN DASHBOARD - NFC PAYMENT SYSTEM                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  📡 Backend Status: 🟢 CONNECTED                            │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│  📊 REAL-TIME ACTIVITY LOG                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ [10:30:15] ✅ User john logged in                     │  │
│  │ [10:30:20] 💸 Transaction: john → jane (Rp 50,000)   │  │
│  │ [10:30:25] 🚨 Fraud Alert: High risk transaction     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│  🎛️ QUICK ACTIONS                                           │
│  [Block User] [Unblock User] [Top-Up] [Reset Balance]      │
│  [Clear Logs] [Refresh Data]                                │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│  🚨 FRAUD ALERTS                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ⚠️ HIGH RISK - Transaction Rp 500,000                │   │
│  │ User: john → jane | Score: 75/100                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│  👥 USERS MANAGEMENT                                         │
│  ┌─────┬──────────┬──────────┬──────────┬──────────────┐  │
│  │ ID  │ Username │ Name     │ Balance  │ Status       │  │
│  ├─────┼──────────┼──────────┼──────────┼──────────────┤  │
│  │ 1   │ john     │ John Doe │ 500,000  │ 🟢 Active    │  │
│  │ 2   │ jane     │ Jane S.  │ 300,000  │ 🟢 Active    │  │
│  └─────┴──────────┴──────────┴──────────┴──────────────┘  │
│  [Create User] [Edit] [Delete] [Block]                     │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│  💳 NFC CARDS MANAGEMENT                                     │
│  ┌──────────────┬──────────┬──────────┬──────────────┐     │
│  │ Card ID      │ Owner    │ Balance  │ Status       │     │
│  ├──────────────┼──────────┼──────────┼──────────────┤     │
│  │ 04A1B2C3     │ john     │ 150,000  │ 🟢 ACTIVE    │     │
│  │ 04Z9Y8X7     │ jane     │ 200,000  │ 🟢 ACTIVE    │     │
│  └──────────────┴──────────┴──────────┴──────────────┘     │
│  [Register Card] [Link] [Top-Up] [Block] [Delete]          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 FITUR-FITUR ADMIN DASHBOARD

### 1. **Real-Time Activity Log**

Monitor semua aktivitas sistem:
- ✅ User login/logout
- 💸 Transaksi pembayaran
- 🚨 Fraud alerts
- 📱 Device sync
- ⚙️ System events

**Auto-refresh:** Setiap 30 detik (bisa diubah ke manual)

---

### 2. **User Management**

#### **A. Create User Baru**

1. Klik button **"Create User"**
2. Isi form:
   - Username: `alice`
   - Password: `password123`
   - Name: `Alice Wong`
   - Initial Balance: `100000` (Rp 100,000)
3. Klik **"Create"**
4. User baru muncul di table

#### **B. Edit User**

1. Klik button **"Edit"** di row user
2. Ubah data (name, balance)
3. Klik **"Save"**

#### **C. Delete User**

1. Klik button **"Delete"** di row user
2. Confirm: "Are you sure?"
3. User terhapus (CASCADE: transaksi & cards ikut terhapus!)

#### **D. Block/Unblock User**

1. Pilih user dari dropdown
2. Klik **"Block User"** atau **"Unblock User"**
3. User status berubah

---

### 3. **Balance Management**

#### **A. Top-Up Individual User**

1. Klik button **"Top-Up Balance"**
2. Isi form:
   - Select User: `john`
   - Amount: `50000` (Rp 50,000)
   - Admin Password: `admin123`
3. Klik **"Top-Up"**
4. Balance user bertambah

**Maximum:** Rp 500,000 per transaksi

#### **B. Bulk Top-Up (Semua User)**

1. Klik button **"Bulk Top-Up All Users"**
2. Input amount: `10000` (Rp 10,000 untuk setiap user)
3. Input admin password: `admin123`
4. Klik **"Confirm"**
5. Semua user balance bertambah

#### **C. Reset Balance**

1. Klik button **"Reset Balance"**
2. Select user: `john`
3. Confirm
4. Balance user jadi Rp 0

---

### 4. **NFC Card Management**

#### **A. Register Card Baru**

1. Klik button **"Register Card"**
2. Isi form:
   - Card ID: `04A1B2C3D4E5F6` (dari scan NFC)
   - Card Type: `NTag215`
   - Select Owner: `john`
   - Initial Balance: `50000`
3. Klik **"Register"**

#### **B. Link Card ke User**

1. Klik button **"Link Card"**
2. Isi:
   - Card ID: `04A1B2C3D4E5F6`
   - Select User: `john`
3. Klik **"Link"**

**PENTING:** 1 user hanya bisa punya 1 card aktif!

#### **C. Top-Up Card**

1. Klik button **"Top-Up Card"**
2. Isi:
   - Card ID: `04A1B2C3D4E5F6`
   - Amount: `25000`
3. Klik **"Top-Up"**
4. Card balance bertambah

#### **D. Block/Unblock Card**

1. Klik button **"Block"** di row card
2. Card status jadi **BLOCKED**
3. Card tidak bisa dipakai untuk transaksi
4. Klik **"Activate"** untuk unblock

#### **E. Delete Card**

1. Klik button **"Delete"** di row card
2. Confirm
3. Card terhapus permanent

---

### 5. **Fraud Detection Monitoring**

Dashboard menampilkan fraud alerts real-time:

#### **Fraud Alert Card:**

```
┌─────────────────────────────────────────────┐
│ 🚨 CRITICAL RISK                             │
│ Risk Score: 85/100                           │
│ Transaction: john → jane                     │
│ Amount: Rp 500,000                           │
│ Reason: Amount too high, velocity suspicious│
│ Time: 2 minutes ago                          │
│ [Review] [Block User]                        │
└─────────────────────────────────────────────┘
```

#### **Fraud Statistics:**

- Total Alerts: 15
- Blocked: 3
- Under Review: 5
- Resolved: 7

#### **Clear All Alerts:**

1. Klik button **"Clear All Fraud Alerts"**
2. Semua alerts terhapus (untuk cleanup)

---

## 🔧 KONFIGURASI ADMIN DASHBOARD

### **1. Ubah Admin Password**

Edit file `backend/.env`:

```env
ADMIN_PASSWORD=password_baru_anda
```

Restart backend server.

### **2. Ubah Backend URL**

Jika backend tidak di `localhost:4000`, edit file `admin/simple-dashboard.html`:

Cari baris ini (sekitar line 800-850):

```javascript
const BACKEND_URL = 'http://localhost:4000';
```

Ganti dengan:

```javascript
const BACKEND_URL = 'https://your-ngrok-url.ngrok-free.dev';
```

### **3. Memahami Kolom "Device" di User Table**

Kolom **Device** menampilkan informasi berbeda tergantung status user:

#### **📱 Device ID Ditampilkan (contoh: "📱 ANDROID_ABC...")**

User **sudah pernah login** via mobile app (React Native).

**Cara agar muncul:**
1. User login di mobile app
2. App otomatis mengirim `deviceId` ke backend
3. Backend simpan `deviceId` di database
4. Dashboard tampilkan device ID

**Device ID Format:**
```
ANDROID_ABC123DEF456
```
(12 karakter pertama ditampilkan + "...")

#### **👤 "Manual Account" Ditampilkan**

User **belum pernah login** dari mobile app.

**Penyebab:**
- User dibuat manual oleh admin via dashboard
- User dibuat via backend API (bukan mobile app)
- User belum pernah login ke mobile app

**Cara mengisi deviceId:**

User harus login sekali dari mobile app:
1. Buka mobile app
2. Login dengan username & password
3. Backend otomatis assign deviceId
4. Refresh dashboard → device ID muncul

**PENTING:** Ini **bukan error**, hanya informasi bahwa user belum pernah menggunakan mobile app.

---

### **4. Ubah Auto-Refresh Interval**

Cari di `simple-dashboard.html`:

```javascript
// Auto-refresh setiap 30 detik
const AUTO_REFRESH_INTERVAL = 30000; // 30000 ms = 30 detik
```

Ubah menjadi:

```javascript
const AUTO_REFRESH_INTERVAL = 10000; // 10 detik
// atau
const AUTO_REFRESH_INTERVAL = 60000; // 60 detik
```

---

## 🌐 AKSES DASHBOARD DARI HP/DEVICE LAIN

Jika ingin akses dashboard dari HP atau laptop lain di jaringan yang sama:

### **Via Admin Server (Port 3000):**

1. **Cari IP Laptop:**

```powershell
ipconfig
# Cari IPv4 Address, contoh: 192.168.1.5
```

2. **Akses dari HP/Laptop Lain:**

```
http://192.168.1.5:3000
```

**PENTING:** HP/laptop harus di WiFi yang sama!

### **Via File HTML:**

File HTML tidak bisa diakses dari device lain (karena `file://` protocol).
Gunakan admin server untuk akses remote.

---

## 📊 MONITORING BACKEND CONNECTION

Dashboard akan menampilkan status koneksi:

### **🟢 CONNECTED** (Hijau)

Backend server running dan responding.

**Indikator:**
- Status badge: `🟢 CONNECTED`
- Data ter-load dengan benar
- Logs update real-time

### **🔴 DISCONNECTED** (Merah)

Backend server offline atau tidak responding.

**Indikator:**
- Status badge: `🔴 DISCONNECTED`
- Error messages di console
- Data tidak ter-load

**Solusi:**

1. Cek backend server running:

```powershell
cd backend
npm run dev
```

2. Cek URL backend di dashboard benar
3. Test health endpoint:

```
http://localhost:4000/api/health
```

---

## 🐛 TROUBLESHOOTING

### ❌ Error: "Backend connection failed"

**Penyebab:** Backend server tidak running

**Solusi:**

```powershell
# Start backend
cd backend
npm run dev
```

### ❌ Dashboard kosong / no data

**Penyebab:** Database kosong (belum ada user)

**Solusi:** Seed dummy data

```powershell
cd backend
node seed.js
```

### ❌ Error: "Admin password incorrect"

**Penyebab:** Password salah

**Solusi:**

1. Cek `ADMIN_PASSWORD` di `backend/.env`
2. Default: `admin123`
3. Input password yang benar

### ❌ Fraud alerts tidak muncul

**Penyebab:** Belum ada transaksi suspicious

**Solusi:**

1. Buat transaksi dengan amount besar (e.g., Rp 500,000)
2. Atau transaksi berturut-turut cepat (velocity)
3. Fraud AI akan detect dan kirim alert

### ❌ Error: "Cannot read property 'map'"

**Penyebab:** API response tidak sesuai format

**Solusi:**

1. Buka Browser DevTools (F12)
2. Tab Console → lihat error detail
3. Tab Network → cek API response
4. Pastikan backend version terbaru

### ❌ CORS Error di console

**Penyebab:** CORS policy blocking request

**Solusi:**

1. Pastikan backend CORS enabled
2. Cek `backend/server.js` ada:

```javascript
app.use(cors({ origin: '*' }));
```

3. Restart backend

### ❌ Kolom "Device" menampilkan "Manual Account" atau null

**Penyebab:** User belum pernah login dari mobile app

**Penjelasan:**

Kolom Device menampilkan:
- 📱 **Device ID** → User sudah login via mobile app
- 👤 **"Manual Account"** → User dibuat manual/belum login

Ini **BUKAN error**, hanya info bahwa user belum menggunakan mobile app.

**Cara mengisi Device ID:**

1. User login di mobile app (React Native)
2. App otomatis kirim deviceId ke backend
3. Refresh dashboard → deviceId muncul

**Jika ingin test:**

```powershell
# 1. Jalankan mobile app
cd "c:\Users\ASUS\skripku jadi"
npm start

# 2. Login di app dengan user yang "Manual Account"
# 3. Refresh dashboard → device ID akan muncul
```

---

## 🎓 TIPS & BEST PRACTICES

### 1. **Always Keep Backend Running**

Dashboard memerlukan backend API untuk semua operasi.

### 2. **Use Auto-Refresh for Monitoring**

Toggle auto-refresh ON untuk real-time monitoring.

### 3. **Regular Fraud Alert Review**

Check fraud alerts setiap hari dan clear yang sudah resolved.

### 4. **Backup Database Before Bulk Operations**

Sebelum bulk top-up atau delete, backup database:

```powershell
pg_dump -U postgres nfc_payment_db > backup.sql
```

### 5. **Monitor Activity Log**

Activity log membantu debug issues dan track user behavior.

### 6. **Use Strong Admin Password**

Ganti default password `admin123` dengan password yang kuat.

---

## 📱 ADMIN VIA MOBILE (ALTERNATIVE)

Jika tidak punya laptop, bisa akses admin via HP:

1. **Install Chrome/Firefox di HP**

2. **Connect HP ke WiFi yang sama dengan backend**

3. **Akses URL:**

```
http://192.168.1.5:3000
```

(Ganti dengan IP laptop Anda)

4. **Dashboard akan terbuka di mobile browser**

**TIPS:** Gunakan landscape mode untuk tampilan lebih baik.

---

## 🔐 SECURITY CHECKLIST

- [ ] Admin password bukan default (`admin123`)
- [ ] Dashboard hanya di-access dari trusted devices
- [ ] Backend tidak di-expose ke internet (hanya localhost atau LAN)
- [ ] Regular check fraud alerts
- [ ] Backup database sebelum bulk operations
- [ ] Monitor activity log untuk suspicious actions

---

## 📚 DOKUMENTASI TERKAIT

- **[PANDUAN-LENGKAP-SISTEM.md](../PANDUAN-LENGKAP-SISTEM.md)** - Arsitektur sistem
- **[backend/routes/admin.js](../backend/routes/admin.js)** - Admin API endpoints
- **[backend/routes/README-PENJELASAN.md](../backend/routes/README-PENJELASAN.md)** - API documentation

---

## 🎯 QUICK REFERENCE

### Jalankan Dashboard (Cara Cepat):

```powershell
# 1. Backend (Terminal 1)
cd backend
npm run dev

# 2. Buka browser
# File Explorer → admin/simple-dashboard.html → Double-click
```

### Default Credentials:

- **Admin Password:** `admin123`
- **Backend URL:** `http://localhost:4000`
- **Dashboard URL:** `file:///.../admin/simple-dashboard.html`

### Keyboard Shortcuts (di dashboard):

- `Ctrl + R` - Refresh data
- `Ctrl + L` - Clear logs
- `F5` - Reload page
- `F12` - Open DevTools (untuk debugging)

---

**Dashboard sudah siap digunakan! Selamat monitoring sistem NFC Payment Anda!** 🎛️📊

**Last Updated:** April 22, 2026
