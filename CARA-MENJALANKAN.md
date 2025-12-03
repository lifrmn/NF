# 🚀 Cara Menjalankan Aplikasi NFC Payment

## 📋 Prerequisites

- ✅ Node.js installed
- ✅ Ngrok installed
- ✅ Android device dengan NFC
- ✅ Minimal 2 kartu NFC (untuk testing)

---

## 🎯 Step-by-Step Tutorial

### **STEP 1: Jalankan Backend Server**

**Terminal 1 (Backend):**
```powershell
# Masuk ke folder backend
cd "C:\Users\ASUS\FINAL 12.12 sdkitt\backend"

# Jalankan server
npm start
```

**Output yang diharapkan:**
```
🗄️ Prisma connected successfully.
🚀 NFC Payment Backend Server started!
📊 Server bind : http://0.0.0.0:4000
🔍 Health Check: http://0.0.0.0:4000/health
```

✅ **Backend running di port 4000**

---

### **STEP 2: Jalankan Ngrok Tunnel**

**Terminal 2 (Ngrok):**
```powershell
# Jalankan ngrok untuk expose backend ke internet
ngrok http 4000
```

**Output yang diharapkan:**
```
Session Status                online
Account                       [your account]
Forwarding                    https://xxxxxx.ngrok-free.app -> http://localhost:4000
```

✅ **Copy URL ngrok:** `https://xxxxxx.ngrok-free.app`

**PENTING:** 
- Jangan tutup terminal ngrok!
- URL ini akan digunakan oleh mobile app
- Setiap restart ngrok, URL berubah (free plan)

---

### **STEP 3: Update API_URL di Mobile App**

**File:** `eas.json`

```json
{
  "build": {
    "preview": {
      "env": {
        "API_URL": "https://xxxxxx.ngrok-free.app"
      }
    }
  }
}
```

**Ganti `xxxxxx` dengan URL ngrok Anda!**

---

### **STEP 4: Jalankan Admin Dashboard (Optional)**

**Terminal 3 (Admin):**
```powershell
# Masuk ke folder admin
cd "C:\Users\ASUS\FINAL 12.12 sdkitt\admin"

# Jalankan admin dashboard
npm start
```

**Output:**
```
🚀 Simple NFC Payment Admin started!
📊 Dashboard: http://localhost:3001
```

✅ **Buka browser:** `http://localhost:3001`

---

### **STEP 5: Test Backend Connection**

**PowerShell:**
```powershell
# Test health check
Invoke-RestMethod -Uri "http://localhost:4000/api/health"

# Expected output:
# status  : ok
# server  : NFC Payment Backend
# database: connected
```

✅ **Backend siap digunakan!**

---

### **STEP 6: Download & Install APK**

**Dari EAS Build:**

1. **Buka link build** (dari terminal sebelumnya):
   ```
   https://expo.dev/accounts/aymm/projects/nfc-payment-app/builds/94616f25-136b-4498-9eff-8d4d8519a7ad
   ```

2. **Scan QR Code** atau buka link di HP Android

3. **Download APK** (tunggu build selesai jika masih processing)

4. **Install APK:**
   - Buka file APK di HP
   - Izinkan "Install from Unknown Sources"
   - Tap "Install"
   - Tunggu sampai selesai
   - Tap "Open"

---

### **STEP 7: Setup Database (First Time Only)**

**PowerShell:**
```powershell
# Masuk ke folder backend
cd "C:\Users\ASUS\FINAL 12.12 sdkitt\backend"

# Run Prisma migration
npx prisma migrate dev

# (Optional) Seed data
node seed.js
```

---

## 📱 Cara Menggunakan Aplikasi

### **A. Register User Pertama (Penjual/Kasir)**

1. Buka aplikasi di HP
2. Tap **"Register"**
3. Isi data:
   - Name: `Budi`
   - Username: `budi`
   - Password: `123456`
4. Tap **"Register"**
5. Login otomatis

### **B. Daftar Kartu NFC (Penjual)**

1. Dari Dashboard, tap **"Daftar Kartu"**
2. Tap **"Scan Kartu NFC"**
3. **Tempelkan kartu NFC** ke belakang HP
4. Kartu terdaftar! ✅
5. Status: **ACTIVE**

### **C. Register User Kedua (Pembeli/Customer)**

1. Logout dari user Budi
2. Tap **"Register"**
3. Isi data:
   - Name: `Ahmad`
   - Username: `ahmad`
   - Password: `123456`
4. Daftar kartu NFC (berbeda dari Budi)

### **D. Top Up Saldo (Via Admin Dashboard)**

1. Buka **http://localhost:3001**
2. Klik tab **"Users"**
3. Cari user **Ahmad**
4. Klik **"Top Up"**
5. Masukkan jumlah: `200000`
6. Submit
7. Saldo Ahmad sekarang: **Rp 200.000** ✅

---

## 💳 Testing Payment Flow

### **Scenario: Budi (Penjual) Terima Bayaran dari Ahmad (Pembeli)**

**1. Login sebagai Budi (Penjual):**
```
Username: budi
Password: 123456
```

**2. Dari Dashboard, tap "NFC Payment"**

**3. Input jumlah pembayaran:**
```
Masukkan: 50000
```

**4. Tap "Terima Pembayaran"**

**5. Alert muncul:**
```
💳 Scan Kartu Pembeli
Tempelkan kartu NFC PEMBELI ke HP Anda
```

**6. Tap "Siap"**

**7. Ahmad tempelkan kartunya ke HP Budi** 💳

**8. Loading... (processing)**

**9. Success! Alert muncul:**
```
✅ Pembayaran Berhasil Diterima! 🎉

✅ Anda menerima Rp 50.000 dari:
💳 Ahmad

💰 Saldo Anda Sekarang: Rp 50.000
💳 Saldo Pembeli: Rp 150.000
```

**10. Check saldo:**
- Budi: +Rp 50.000 ✅
- Ahmad: -Rp 50.000 ✅

**11. Balance otomatis ter-update di UI!** ♻️

---

## 🔧 Troubleshooting

### **Problem 1: Backend tidak bisa diakses**

**Symptom:**
```
❌ Error Koneksi
Gagal mengambil data kartu Anda
```

**Solution:**
```powershell
# 1. Cek backend running
Get-Process node -ErrorAction SilentlyContinue

# 2. Restart backend
cd "C:\Users\ASUS\FINAL 12.12 sdkitt\backend"
npm start

# 3. Test health check
Invoke-RestMethod -Uri "http://localhost:4000/api/health"
```

---

### **Problem 2: Ngrok disconnected**

**Symptom:**
```
Session Expired
```

**Solution:**
```powershell
# Restart ngrok
ngrok http 4000

# Copy URL baru
# Update eas.json dengan URL baru
# Rebuild APK (eas build)
```

---

### **Problem 3: Kartu tidak terbaca**

**Symptom:**
```
❌ Kartu Pembeli Tidak Terbaca
```

**Solution:**
1. **Aktifkan NFC di HP:**
   - Settings → Connected Devices → NFC
   - Toggle ON

2. **Posisi kartu:**
   - Tempelkan ke **belakang HP**
   - Area NFC biasanya di tengah belakang
   - Tahan 2-3 detik

3. **Coba lagi**

---

### **Problem 4: Saldo tidak update**

**Symptom:**
- Payment success tapi saldo tidak berubah

**Solution:**
```powershell
# Check di database
cd "C:\Users\ASUS\FINAL 12.12 sdkitt\backend"
npx prisma studio

# Buka tabel User
# Cek balance user
```

**Di Mobile:**
- Kembali ke Dashboard
- Balance akan auto-refresh (useFocusEffect)

---

### **Problem 5: Authentication error**

**Symptom:**
```
❌ Access token required
```

**Solution:**
1. Logout dari aplikasi
2. Login ulang
3. Token akan di-refresh

---

## 📊 Monitoring & Debugging

### **Backend Logs**

**Terminal Backend akan menampilkan:**
```
💳 Buyer card scanned: 04:xx:xx:xx:xx:xx:xx
💰 Buyer balance: Rp 200,000
🔍 Getting receiver card info...
📥 Receiver card (auto-detected): 04:yy:yy:yy:yy:yy:yy
💸 Processing payment...
📤 Payment data: {...}
📥 Payment result: {"success":true,...}
✅ Payment successful!
```

### **Mobile Logs**

**React Native Debugger:**
```
console.log('💳 Buyer card scanned:', buyerCard.id);
console.log('💰 Buyer balance:', buyerBalance);
console.log('📥 Receiver card:', receiverCard.cardId);
console.log('✅ Balance refreshed:', newBalance);
```

### **Database Check**

**Prisma Studio:**
```powershell
cd backend
npx prisma studio
```

**Buka:** http://localhost:5555

**Check:**
- ✅ User balances
- ✅ Transaction logs
- ✅ NFC card status
- ✅ Fraud alerts

---

## 🎯 Quick Start Commands

**PowerShell Script (Jalankan semua sekaligus):**

```powershell
# Terminal 1: Backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\ASUS\FINAL 12.12 sdkitt\backend'; npm start"

# Terminal 2: Ngrok
Start-Process powershell -ArgumentList "-NoExit", "-Command", "ngrok http 4000"

# Terminal 3: Admin Dashboard
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\ASUS\FINAL 12.12 sdkitt\admin'; npm start"
```

**Tunggu 10 detik, semua service akan running!** 🚀

---

## ✅ Pre-Flight Checklist

Sebelum testing, pastikan:

- [ ] ✅ Backend running (port 4000)
- [ ] ✅ Ngrok running (URL copied)
- [ ] ✅ Admin dashboard running (port 3001)
- [ ] ✅ APK installed di HP Android
- [ ] ✅ NFC enabled di HP
- [ ] ✅ 2 user terdaftar (penjual + pembeli)
- [ ] ✅ 2 kartu NFC terdaftar
- [ ] ✅ Pembeli punya saldo cukup
- [ ] ✅ Internet connection stable

**Semua ready? Let's test payment!** 💳🎉

---

## 📚 File Structure Reference

```
FINAL 12.12 sdkitt/
├── backend/              # Backend server (port 4000)
│   ├── server.js        # Main server
│   ├── routes/          # API routes
│   └── prisma/          # Database
│
├── admin/               # Admin dashboard (port 3001)
│   ├── simple-admin.js
│   └── simple-dashboard.html
│
├── src/                 # Mobile app source
│   ├── screens/
│   │   ├── DashboardScreen.tsx
│   │   └── NFCScreen.tsx
│   ├── hooks/
│   │   └── usePayment.ts
│   └── utils/
│       └── apiService.ts
│
└── eas.json            # Build configuration
```

---

**Last Updated:** December 3, 2025  
**Version:** 2.0 (Merchant Payment Flow)  
**Status:** ✅ Ready to Use

**Need help?** Check BUG-FIXES-CHECKLIST.md untuk troubleshooting lengkap!
