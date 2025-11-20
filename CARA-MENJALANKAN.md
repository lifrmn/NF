# 🚀 CARA MENJALANKAN APLIKASI NFC PAYMENT

Panduan lengkap untuk menjalankan aplikasi NFC Payment dengan **hotspot dari laptop**.

---

## 📋 PERSIAPAN AWAL (Hanya Sekali)

### 1️⃣ **Install Dependencies**

```powershell
# Install semua dependencies (frontend + backend + admin)
npm run setup
```

Atau manual:
```powershell
# Install frontend
npm install

# Install backend
cd backend
npm install
cd ..

# Install admin (opsional)
cd admin
npm install
cd ..
```

### 2️⃣ **Setup Database Backend**

```powershell
cd backend
npx prisma generate
npx prisma db push
cd ..
```

---

## 🌐 SETUP HOTSPOT LAPTOP

### ⚡ **Cara Mengaktifkan Hotspot Windows**

#### **Metode 1: Settings GUI (Paling Mudah)**

1. **Buka Settings** → Tekan `Win + I`
2. **Network & Internet** → Klik **Mobile hotspot**
3. **Aktifkan hotspot**:
   - ✅ Toggle **Mobile hotspot** menjadi **ON**
   - 📝 Catat **Network name** (SSID)
   - 🔑 Catat **Network password**
4. **Share from**: Pilih koneksi internet Anda (WiFi/Ethernet)
5. **Share over**: Pilih **Wi-Fi**

#### **Metode 2: Command Line (PowerShell Admin)**

```powershell
# Jalankan PowerShell sebagai Administrator
# Klik kanan icon PowerShell → Run as Administrator

# Buat hotspot baru
netsh wlan set hostednetwork mode=allow ssid="NFCPayment" key="password123"

# Aktifkan hotspot
netsh wlan start hostednetwork

# Cek status hotspot
netsh wlan show hostednetwork
```

**Catatan Penting:**
- SSID: `NFCPayment` (nama hotspot)
- Password: `password123` (ganti sesuai keinginan)
- Pastikan laptop terhubung ke internet (WiFi/Ethernet)

---

## 🔍 CEK IP ADDRESS HOTSPOT

### **Cara 1: Otomatis (PowerShell)**

```powershell
# Tampilkan semua IP
ipconfig

# Filter hanya IPv4 hotspot
ipconfig | Select-String "IPv4" | Select-String "192.168.137"
```

### **Cara 2: Manual**

1. Buka **Command Prompt** atau **PowerShell**
2. Ketik: `ipconfig`
3. Cari bagian **"Wireless LAN adapter Local Area Connection* X"**
4. Lihat **IPv4 Address**

**Contoh Output:**
```
Wireless LAN adapter Local Area Connection* 10:
   IPv4 Address. . . . . . . . . . . : 192.168.137.1
   Subnet Mask . . . . . . . . . . . : 255.255.255.0
```

**IP Hotspot biasanya:** `192.168.137.1`

---

## 🚀 MENJALANKAN APLIKASI

### **Opsi 1: Otomatis (Paling Mudah!) ✅**

#### **Windows Batch:**
```bash
# Double-click file ini
start-all.bat
```

#### **PowerShell Script:**
```powershell
.\start-all.ps1
```

File `start-all.ps1` akan:
1. ✅ Jalankan backend di terminal 1
2. ✅ Jalankan expo di terminal 2
3. ✅ Otomatis scan QR code di HP

---

### **Opsi 2: Manual (Step-by-Step) 📝**

#### **STEP 1: Jalankan Backend Server**

```powershell
# Terminal 1 (Backend)
cd backend
npm start
```

**Output yang benar:**
```
🚀 Backend server running on:
   - http://localhost:4000
   - http://192.168.137.1:4000
   
✅ Database connected
✅ CORS enabled for all origins
✅ Health check available at /api/health
```

**Tes Backend:**
```powershell
# Test dari laptop (terminal baru)
curl http://192.168.137.1:4000/api/health

# Output: {"status":"ok","message":"Backend is running"}
```

---

#### **STEP 2: Jalankan Expo Development Server**

```powershell
# Terminal 2 (Frontend) - BUKA TERMINAL BARU!
npm start
```

**Output yang benar:**
```
› Metro waiting on exp://192.168.137.1:8081
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)

› Press a │ open Android
› Press w │ open web

› Press r │ reload app
› Press m │ toggle menu
```

---

#### **STEP 3: Hubungkan HP ke Hotspot**

1. **Buka Settings HP** → **WiFi**
2. **Cari hotspot laptop**: `NFCPayment` (atau nama yang Anda buat)
3. **Connect** dengan password: `password123`
4. **Tunggu sampai terhubung** ✅

---

#### **STEP 4: Buka Aplikasi di HP**

##### **Metode A: Expo Go (Development) ⚡**

1. **Install Expo Go** dari Play Store
2. **Buka Expo Go**
3. **Scan QR Code** dari terminal laptop
4. **Tunggu app loading** (pertama kali agak lama ~30 detik)

##### **Metode B: APK Production (Untuk Demo) 📦**

1. Build APK terlebih dahulu (lihat `APK-CHECKLIST.md`)
2. Transfer APK ke HP
3. Install dan buka aplikasi

---

## ✅ VERIFIKASI KONEKSI

### **1. Test Backend dari HP**

Gunakan browser HP, buka:
```
http://192.168.137.1:4000/api/health
```

**Response yang benar:**
```json
{
  "status": "ok",
  "message": "Backend is running"
}
```

### **2. Test dari Aplikasi**

1. Buka aplikasi NFC Payment
2. Login dengan user test:
   - Username: `admin`
   - Password: `admin123`
3. Lihat **Dashboard** → **Status Admin Server**
4. Harus muncul: **"✅ Terhubung ke backend"**

---

## 🔧 TROUBLESHOOTING

### ❌ **Problem 1: Backend tidak bisa diakses dari HP**

**Solusi:**
```powershell
# 1. Cek IP laptop
ipconfig | Select-String "192.168.137"

# 2. Cek firewall Windows
# Buka Windows Defender Firewall → Advanced Settings
# Inbound Rules → New Rule → Port → TCP 4000 → Allow

# 3. Disable firewall sementara (untuk testing)
# Settings → Windows Security → Firewall → Turn off (Domain/Private/Public)

# 4. Restart backend
cd backend
npm start
```

### ❌ **Problem 2: Expo tidak menampilkan QR Code**

**Solusi:**
```powershell
# Clear cache dan restart
npm run clean:cache

# Atau manual
npx expo start -c

# Atau hard reset
rm -rf .expo
rm -rf node_modules
npm install
npm start
```

### ❌ **Problem 3: HP tidak bisa connect ke hotspot**

**Solusi:**
```powershell
# Stop dan restart hotspot
netsh wlan stop hostednetwork
netsh wlan start hostednetwork

# Cek status
netsh wlan show hostednetwork

# Pastikan output:
# Status                 : Started
# Number of clients      : 1 (atau lebih)
```

### ❌ **Problem 4: App layar putih / tidak load**

**Solusi:**
```powershell
# 1. Pastikan backend running
curl http://192.168.137.1:4000/api/health

# 2. Reload app di HP
# Shake HP → "Reload"

# 3. Restart Expo Metro
# Press 'r' di terminal Expo

# 4. Clear app data di HP
# Settings → Apps → Expo Go → Storage → Clear Data
```

### ❌ **Problem 5: NFC tidak bisa membaca**

**Solusi:**
1. ✅ **Cek NFC aktif** di HP: Settings → Connected devices → Connection preferences → NFC
2. ✅ **Gunakan 2 HP Android** (NFC tidak tersedia di Expo Go)
3. ✅ **Dekatkan HP** (jarak < 4cm, bagian belakang HP)
4. ✅ **Mode Manual Payment**: Jika NFC gagal, gunakan QR Code fallback

---

## 📱 CARA MENGGUNAKAN APLIKASI

### **1. Register User Baru**
1. Buka app → **Register**
2. Isi data:
   - **Username**: minimal 3 karakter
   - **Password**: minimal 6 karakter
   - **Name**: nama lengkap
3. Klik **Register**
4. Otomatis login dengan saldo awal **Rp 1.000.000**

### **2. Login**
1. Buka app → **Login**
2. Masukkan username & password
3. Klik **Login**

### **3. Dashboard**
- Lihat **saldo** Anda
- Cek **status backend** (harus connected)
- Lihat **riwayat transaksi**
- Klik **NFC Payment** untuk transfer

### **4. NFC Payment**

#### **Mode 1: Send Money (Kirim Uang) 💸**
1. Klik **Send** di NFC Screen
2. Masukkan **jumlah uang**
3. Dekatkan ke HP penerima (HP lawan harus di mode **Receive**)
4. Tunggu **"Payment Successful"**
5. Cek **fraud detection score** (LOW/MEDIUM/HIGH/CRITICAL)

#### **Mode 2: Receive Money (Terima Uang) 💰**
1. Klik **Receive** di NFC Screen
2. Tunggu HP pengirim mendekat
3. Otomatis terima uang
4. Cek **saldo bertambah** di Dashboard

#### **Mode 3: Manual Payment (Tanpa NFC) 📝**
1. Scroll ke bawah di NFC Screen
2. **Kirim**: Masukkan username penerima + jumlah
3. **Terima**: Generate QR Code untuk ditunjukkan ke pengirim

---

## 🎯 TESTING FRAUD DETECTION

### **Skenario 1: Velocity Attack (Transaksi Cepat)**
```
1. User A kirim Rp 10.000 ke User B
2. Tunggu 5 detik
3. User A kirim Rp 10.000 ke User B lagi
4. Tunggu 5 detik
5. User A kirim Rp 10.000 ke User B lagi
6. HASIL: Score akan naik → MEDIUM/HIGH
```

### **Skenario 2: Amount Attack (Jumlah Besar)**
```
1. User A kirim Rp 500.000 (transaksi normal dulu)
2. User A kirim Rp 5.000.000 (10x lebih besar!)
3. HASIL: Score HIGH/CRITICAL (amount Z-Score tinggi)
```

### **Skenario 3: New Receiver Attack**
```
1. User A kirim ke User B (penerima baru pertama kali)
2. HASIL: Behavior score naik (new receiver penalty)
```

---

## 📊 MONITORING ADMIN (Opsional)

### **Jalankan Admin Dashboard**

```powershell
# Terminal 3 (Admin Dashboard) - BARU!
cd admin
npm start
```

**Buka browser laptop:**
```
http://localhost:3000
```

**Features:**
- 📊 Real-time monitoring semua transaksi
- 🚨 Fraud alert notifications
- 👥 User management (update saldo, dll)
- 📈 Statistics dan analytics

---

## 🛑 CARA STOP APLIKASI

### **Stop Backend + Expo**
```powershell
# Di setiap terminal, tekan:
Ctrl + C

# Atau tutup terminal langsung
```

### **Stop Hotspot**
```powershell
# PowerShell Admin
netsh wlan stop hostednetwork

# Atau via Settings
# Settings → Network & Internet → Mobile hotspot → OFF
```

---

## 💡 TIPS & BEST PRACTICES

### ✅ **DO:**
1. ✅ **Selalu jalankan backend dulu** sebelum expo
2. ✅ **Cek IP hotspot** sebelum mulai (harus `192.168.137.1`)
3. ✅ **Tes curl backend** dari laptop sebelum test di HP
4. ✅ **Gunakan 2 HP** untuk test NFC (NFC tidak jalan di Expo Go)
5. ✅ **Build APK** untuk demo SKRIPSI yang real

### ❌ **DON'T:**
1. ❌ Jangan jalankan expo sebelum backend ready
2. ❌ Jangan ganti IP address di tengah-tengah (restart backend jika IP berubah)
3. ❌ Jangan expect NFC jalan di emulator atau Expo Go
4. ❌ Jangan lupa aktifkan hotspot sebelum jalankan backend

---

## 📞 SUPPORT

Jika masih ada masalah, cek file troubleshooting:
- `TROUBLESHOOTING.md` - Solusi error umum
- `APK-CHECKLIST.md` - Panduan build APK
- `BUILD_INSTRUCTIONS.md` - Build native Android
- `DATABASE-INFO.md` - Info database dan schema

---

## 🎓 UNTUK PRESENTASI SKRIPSI

### **Persiapan Demo:**
1. ✅ Build APK production (bukan Expo Go)
2. ✅ Install di 2 HP Android dengan NFC
3. ✅ Buat hotspot dari laptop
4. ✅ Test semua fitur sebelum presentasi:
   - Login/Register
   - NFC Payment (send + receive)
   - Fraud Detection (velocity + amount attack)
   - Dashboard monitoring
5. ✅ Siapkan backup plan: Manual Payment jika NFC gagal

### **Flow Demo:**
```
1. Login user pertama (HP 1)
2. Login user kedua (HP 2)
3. Show dashboard (balance, transactions)
4. Demo NFC payment normal (Rp 50.000) → Score LOW
5. Demo velocity attack (3x transaksi cepat) → Score MEDIUM/HIGH
6. Demo amount attack (Rp 5.000.000) → Score CRITICAL
7. Show fraud alert di admin dashboard (opsional)
8. Explain algoritma Z-Score (velocity + amount + frequency + behavior)
```

---

**Good luck dengan SKRIPSI! 🎓💪**
