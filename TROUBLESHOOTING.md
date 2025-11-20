# 🔧 Troubleshooting Guide - NFC Payment App

## ❌ Masalah: Layar Putih / App Tidak Muncul

### ✅ Solusi:

**1. PASTIKAN BACKEND BERJALAN DULU!**
```powershell
# Buka terminal di folder backend
cd backend
npm start

# Backend harus menampilkan:
# 🚀 NFC Payment Backend Server started!
# 📡 Server bind : http://0.0.0.0:4000
```

**2. CEK IP ADDRESS DI .ENV**
```bash
# File: .env
EXPO_PUBLIC_API_BASE=http://10.3.4.41:4000

# Pastikan IP ini sesuai dengan IP komputer Anda
# Cek IP dengan: ipconfig (Windows) atau ifconfig (Mac/Linux)
```

**3. TEST BACKEND CONNECTION**
```powershell
# Test dari PowerShell:
curl http://10.3.4.41:4000/api/health

# Harus return: {"status":"OK"}
```

**4. RELOAD APP DI HP**
- Shake HP untuk buka Developer Menu
- Pilih "Reload"
- Atau tutup app dan buka lagi

---

## 🚀 Cara Menjalankan App (Urutan yang Benar)

### Step 1: Start Backend
```powershell
cd backend
npm start
```
**Tunggu sampai muncul: ✅ Server started!**

### Step 2: Start Expo
```powershell
npm start
# atau
npx expo start
```

### Step 3: Buka di HP
- Scan QR code
- Atau tekan **a** untuk open Android

---

## 📱 Error Messages & Solutions

### "Backend tidak dapat terhubung"
- ✅ Pastikan backend running
- ✅ HP dan PC di Wi-Fi/Hotspot yang sama
- ✅ Firewall tidak block port 4000

### "Loading terus menerus"
- ✅ Backend tidak jalan → start backend
- ✅ IP salah di .env → update IP
- ✅ Timeout → app akan auto ke login setelah 8 detik

### "White Screen"
- ✅ Backend mati → start backend
- ✅ Reload app (shake HP)
- ✅ Clear cache: `npx expo start --clear`

---

## 🔍 Debug Commands

```powershell
# Cek backend status
curl http://10.3.4.41:4000/api/health

# Cek IP lokal
ipconfig | findstr IPv4

# Cek port 4000 available
netstat -ano | findstr :4000

# Clear Expo cache
npx expo start --clear

# Rebuild app
cd android
./gradlew clean
cd ..
npm run android
```

---

## 📋 Checklist Sebelum Build APK

- [ ] Backend berjalan dan bisa diakses
- [ ] IP di .env sudah benar
- [ ] Test health endpoint: http://YOUR_IP:4000/api/health
- [ ] App bisa login & berfungsi normal
- [ ] Database setup sudah dijalankan: `npm run db:setup`

---

## 🆘 Masih Error?

1. **Restart semuanya:**
   ```powershell
   # Stop semua proses
   # Ctrl+C di terminal backend
   # Ctrl+C di terminal expo
   
   # Start ulang dengan urutan benar
   cd backend; npm start
   # Tunggu backend ready
   cd ..; npm start
   ```

2. **Clear semua cache:**
   ```powershell
   npx expo start --clear
   cd android; ./gradlew clean; cd ..
   ```

3. **Rebuild app:**
   ```powershell
   npm run android
   ```

---

## 📞 Contact
Jika masih ada masalah, cek log di:
- Terminal backend untuk error backend
- Terminal expo untuk error app
- Logcat Android: `adb logcat | findstr ReactNative`
