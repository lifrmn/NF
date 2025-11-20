# 🚀 CARA MENJALANKAN NFC PAYMENT SYSTEM

## 📋 LANGKAH-LANGKAH MENJALANKAN

### **STEP 1: JALANKAN ADMIN SERVER** 🖥️

#### A. Buka Command Prompt/PowerShell
```cmd
# Tekan Windows + R, ketik "cmd", Enter
# Atau buka PowerShell
```

#### B. Masuk ke Folder Admin
```cmd
cd C:\Users\ASUS\11.4.2025\admin
```

#### C. Jalankan Server
```cmd
node simple-admin.js
```

#### D. Output yang Benar:
```
🚀 Simple NFC Payment Admin started!
📊 Dashboard: http://localhost:3001
```

---

### **STEP 2: BUKA DASHBOARD** 🌐

#### A. Buka Browser (Chrome/Edge/Firefox)
#### B. Ketik URL:
```
http://localhost:3001
```

#### C. Dashboard Akan Menampilkan:
- ✅ Statistics (Total Devices, Users, Balance)
- ✅ Device List (kosong jika belum ada yang connect)
- ✅ Form Tambah Saldo

---

### **STEP 3: CARA INSTALL APLIKASI DI HP** 📱

#### **A. Download APK (2 Cara)**

**Cara 1: Build APK Baru (Jika Perlu)**
```cmd
# ⚠️ PENTING: Harus dari folder ROOT project, bukan dari folder admin!

# 1. Masuk ke folder ROOT project
cd C:\Users\ASUS\11.4.2025

# 2. Build APK baru (CLEAN VERSION - tanpa data demo)
npx eas build --profile preview --platform android

# 3. Tunggu 5-10 menit sampai selesai
# 4. Akan muncul QR Code dan link download
```

**⚠️ KESALAHAN UMUM:**
```cmd
# ❌ SALAH - Jangan dari folder admin
cd C:\Users\ASUS\11.4.2025\admin
npx eas build --profile preview --platform android
# ERROR: This akan gagal!

# ✅ BENAR - Harus dari folder root
cd C:\Users\ASUS\11.4.2025
npx eas build --profile preview --platform android
```

**Cara 2: Gunakan APK yang Sudah Ada**
- Build ID: `d294d74a-22cd-455d-8fe4-99ca59a9d5fb`
- Link: https://expo.dev/accounts/terrakion/projects/nfc-payment-app/builds/d294d74a-22cd-455d-8fe4-99ca59a9d5fb

#### **B. Download ke HP Android**

1. **Scan QR Code** yang muncul saat build
   - Buka kamera HP
   - Scan QR Code di layar laptop
   - Atau copy link ke browser HP

2. **Download File APK**
   - File akan terdownload ke folder Downloads
   - Ukuran sekitar 10-15 MB
   - Nama file: `nfc-payment-app-xxx.apk`

#### **C. Install APK di HP**

1. **Buka File Manager** di HP
2. **Masuk ke folder Downloads**
3. **Tap file APK** yang sudah didownload
4. **Allow Installation from Unknown Sources** (jika diminta)
   - Settings → Security → Unknown Sources → ON
   - Atau Settings → Apps → Special Access → Install Unknown Apps
5. **Tap "Install"**
6. **Tunggu instalasi selesai**
7. **Tap "Open"** atau cari icon aplikasi di home screen

#### **D. Pertama Kali Buka Aplikasi**

1. **Icon aplikasi**: "NFC Payment" akan muncul di home screen
2. **Tap icon** untuk membuka aplikasi
3. **Akan muncul screen login/register**
4. **Pilih "Register"** untuk user baru
5. **Isi data**:
   - Username: (bebas, contoh: "user1")
   - Password: (bebas, contoh: "123456")
   - Nama: (nama lengkap)
6. **Tap "Register"**
7. **Login dengan akun yang baru dibuat**

#### **E. Test Aplikasi Berfungsi**

✅ **Aplikasi berhasil jika:**
- Login berhasil masuk ke dashboard
- Muncul saldo awal Rp 0 (bersih tanpa demo)
- Menu NFC scan tersedia
- Data sync ke admin server (cek dashboard laptop)

---

### **STEP 4: TEST KONEKSI APLIKASI** 🔗

#### A. Di Aplikasi HP:
1. **Login** dengan akun yang sudah dibuat
2. **Masuk ke dashboard** aplikasi
3. **Cek saldo** sudah muncul

#### B. Di Terminal Admin (harus muncul log):
```
📞 POST /api/sync-device from 192.168.1.xxx
✅ Valid app request from 192.168.1.xxx
📱 Device sync: abcd1234 | Users: 1 | Balance: Rp 0
```

#### C. Di Dashboard Browser:
1. **Refresh halaman** (F5)
2. **Device baru muncul** di list
3. **Data user dan saldo** terlihat

---

### **STEP 5: KELOLA SALDO** 💰

#### A. Tambah Saldo:
1. Di dashboard, cari device yang mau ditambah saldo
2. Masukkan jumlah (1 - 500,000)
3. Klik "Tambah Saldo"
4. **Password admin**: `admin123`
5. Saldo akan bertambah di aplikasi HP

---

## ⚠️ TROUBLESHOOTING BUILD APK

### **Problem: Build Error - Wrong Directory**
```
Error: No package.json found or EAS config missing
```
**Solusi:**
```cmd
# ❌ Jangan build dari folder admin
# ✅ Harus dari folder root project
cd C:\Users\ASUS\11.4.2025
npx eas build --profile preview --platform android
```

### **Problem: EAS CLI not found**
```
'eas' is not recognized as internal or external command
```
**Solusi:**
```cmd
npm install -g @expo/eas-cli
eas login
```

### **Problem: Build queue timeout**
**Solusi:**
- Tunggu beberapa menit, server EAS mungkin busy
- Coba build ulang
- Pastikan koneksi internet stabil

---

## ⚠️ TROUBLESHOOTING INSTALL APLIKASI

### **Problem: APK tidak bisa didownload**
**Solusi:**
1. **Pastikan internet stabil**
2. **Coba browser lain** (Chrome/Firefox)
3. **Hapus cache browser**
4. **Restart HP** dan coba lagi

### **Problem: HP tidak bisa install APK**
```
"Installation blocked - Unknown sources"
```
**Solusi:**
1. **Buka Settings** HP
2. **Security → Unknown Sources → ON**
3. **Atau Apps → Special Access → Install Unknown Apps**
4. **Pilih browser → Allow from this source**

### **Problem: Aplikasi crash saat dibuka**
**Solusi:**
1. **Restart HP**
2. **Hapus aplikasi** dan install ulang
3. **Pastikan Android versi 7.0+**
4. **Free up storage** (minimal 100MB)

### **Problem: Tidak bisa register/login**
**Solusi:**
1. **Cek koneksi internet** HP
2. **Pastikan admin server running** di laptop
3. **HP dan laptop di WiFi yang sama**
4. **Restart aplikasi**

---

## ⚠️ TROUBLESHOOTING SERVER

### **Problem: Server tidak start**
```cmd
# Solution:
taskkill /f /im node.exe
cd C:\Users\ASUS\11.4.2025\admin
node simple-admin.js
```

### **Problem: APK tidak connect**
1. **Pastikan WiFi sama** antara HP dan laptop
2. **Cek IP laptop**: `ipconfig`
3. **Update IP di file**: `src/utils/database.ts`

### **Problem: Password salah**
- Password admin yang benar: `admin123`

---

## 🎯 RINGKASAN CARA INSTALL APLIKASI

### **� CARA CEPAT INSTALL APK**

1. **Download APK**
   - Link: https://expo.dev/accounts/terrakion/projects/nfc-payment-app/builds/d294d74a-22cd-455d-8fe4-99ca59a9d5fb
   - Atau scan QR code saat build

2. **Install di HP**
   - Buka Downloads → Tap APK → Allow Unknown Sources → Install

3. **Buka Aplikasi**
   - Register user baru → Login → Masuk dashboard

4. **Test Koneksi**
   - Pastikan admin server running di laptop
   - HP dan laptop di WiFi yang sama
   - Device muncul di dashboard admin

### **🔧 JIKA PERLU BUILD APK BARU**

```cmd
# Di laptop:
cd C:\Users\ASUS\11.4.2025
npx eas build --profile preview --platform android

# Tunggu 5-10 menit
# Scan QR code dengan HP untuk download
```

---

## �🔑 INFORMASI PENTING

| Item | Value |
|------|-------|
| **Dashboard URL** | `http://localhost:3001` |
| **Admin Password** | `admin123` |
| **Max Top-up** | `Rp 500,000` |
| **APK Build ID** | `d294d74a-22cd-455d-8fe4-99ca59a9d5fb` |
| **APK Size** | ~10-15 MB |
| **Android Minimum** | 7.0+ |

---
```

### 4. **Build Ulang APK**
```bash
# Di folder utama project
eas build --platform android --profile production
```

### 5. **Start Admin Server**
```bash
cd admin
npm run admin
```

### 6. **Open Dashboard**
```
http://localhost:3001
```

## 🎯 Cara Menggunakan

### **Monitoring Real-time**
1. Client download dan install APK
2. Client buat akun dan login
3. Data otomatis sync ke admin server setiap 30 detik
4. Admin bisa lihat:
   - 📱 Device yang aktif
   - 👥 User di setiap device
   - 💰 Saldo masing-masing user
   - 💸 Transaksi real-time

### **Update Saldo Client**
1. Buka tab "📱 Live Devices"
2. Klik "💰 Update Balance" pada device
3. Pilih user dan masukkan saldo baru
4. Saldo akan otomatis terupdate di device client

## 📱 Monitoring Features

### **Device Tracking**
- ✅ Real-time device status (Online/Offline)
- ✅ Total users per device
- ✅ Total balance per device
- ✅ Last sync timestamp

### **User Management**
- ✅ View all users across all devices
- ✅ Monitor user balances
- ✅ Update balances remotely
- ✅ Track transaction history

### **Admin Controls**
- ✅ Remote balance top-up
- ✅ Real-time monitoring
- ✅ Data backup
- ✅ Transaction alerts

## 🔧 Network Requirements

### **Same WiFi Network**
- Admin laptop dan client device harus di WiFi yang sama
- Port 3001 harus terbuka di firewall

### **Port Forwarding (Optional)**
Untuk monitoring dari internet:
```bash
# Setup port forwarding di router
# Forward port 3001 ke IP laptop admin
```

## 🚨 Security Notes

1. **Admin dashboard hanya untuk lokal network**
2. **Jangan expose ke internet tanpa authentication**
3. **Password user tidak di-sync ke server**
4. **Data sync menggunakan HTTP (bukan HTTPS)**

## 📊 Data yang Di-sync

### **Device Info**
```json
{
  "deviceId": "unique_device_id",
  "deviceName": "Android Device",
  "platform": "android",
  "lastSyncAt": "2025-11-05T10:30:00Z"
}
```

### **User Data**
```json
{
  "id": 1,
  "username": "johndoe",
  "name": "John Doe",
  "balance": 100000,
  "createdAt": "2025-11-05T09:00:00Z"
}
```

### **Transaction Data**
```json
{
  "id": 1,
  "amount": 5000,
  "type": "transfer",
  "sender_name": "John Doe",
  "receiver_name": "Jane Smith",
  "createdAt": "2025-11-05T10:15:00Z"
}
```

## 🔄 Auto Sync Behavior

- **Sync Interval**: 30 seconds
- **Retry on Fail**: Silent fail, retry next interval
- **Background Sync**: Stops when app backgrounded
- **Resume Sync**: Resumes when app active
- **Data Transfer**: Only changes and new data

## 🎯 Admin Actions

### **Balance Top-up**
```javascript
// Admin update balance
{
  "deviceId": "device_123",
  "userId": 1,
  "newBalance": 150000,
  "reason": "Monthly bonus"
}
```

### **Monitoring Alerts**
- 🔔 New user registration
- 🔔 Large transactions (>100k)
- 🔔 Low balance alerts (<10k)
- 🔔 Device offline alerts

## 📱 Client Experience

- ✅ Tidak ada perubahan UI untuk user
- ✅ Sync berjalan background
- ✅ Tidak ada notifikasi sync
- ✅ Balance update otomatis
- ✅ Tidak perlu restart app

## 🐛 Troubleshooting

### **Device tidak muncul di dashboard:**
1. Check IP address di `database.ts`
2. Pastikan admin server running
3. Check WiFi connection
4. Restart app di device

### **Balance update tidak masuk:**
1. Check device status online
2. Wait for next sync (30 seconds)
3. Check console log di admin

### **Sync error:**
1. Check network connection
2. Check firewall settings
3. Restart admin server
4. Check IP address config