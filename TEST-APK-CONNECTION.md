# 📱 PANDUAN TEST KONEKSI APK

## 🔧 **SEBELUM BUILD APK**

### 1. **Cek IP Address Laptop Anda**
```cmd
ipconfig
```
Catat IPv4 Address WiFi adapter (contoh: 192.168.1.100)

### 2. **Update eas.json dengan IP Anda**
Ganti IP address di file `eas.json` bagian preview:
```json
"env": {
  "EXPO_PUBLIC_API_BASE": "http://[YOUR_IP]:4000"
}
```

### 3. **Pastikan Laptop dan HP dalam WiFi yang Sama**
- Laptop connect ke WiFi rumah
- HP juga connect ke WiFi rumah yang SAMA

## 🚀 **LANGKAH BUILD APK**

### 1. **Jalankan Backend Server**
```cmd
cd backend
npm start
```
**PENTING:** Harus jalan dulu sebelum test APK!

### 2. **Build APK**
```cmd
eas build --platform android --profile preview
```

### 3. **Download & Install APK di HP**
- Download APK dari expo.dev
- Install di HP Android
- Buka aplikasi

## ✅ **TEST KONEKSI**

### 1. **Cek Backend dari HP Browser**
Buka browser di HP, ketik:
```
http://[YOUR_IP]:4000/health
```
Harus muncul: `{"status": "OK", "timestamp": "..."}`

### 2. **Test Login di APK**
- Buka APK
- Coba register user baru
- Atau login jika sudah ada user

### 3. **Cek Logs Backend**
Di terminal backend harus muncul:
```
✅ New user connected: [socket_id]
✅ POST /api/auth/login
```

## 🔍 **TROUBLESHOOTING**

### Jika APK Tidak Connect:
1. **Firewall Windows** - Disable sementara
2. **IP Salah** - Cek ulang dengan `ipconfig`
3. **WiFi Berbeda** - Pastikan laptop & HP sama WiFi
4. **Backend Mati** - Restart `npm start` di folder backend

### Jika Backend Error:
1. **Port Conflict** - Ganti port di `.env`
2. **Database Error** - Jalankan `npx prisma generate`
3. **Missing Dependencies** - `npm install` ulang

## 📊 **MONITORING REALTIME**

### Admin Dashboard:
```
http://[YOUR_IP]:4000/admin
```
Bisa monitor:
- User online/offline
- Transaksi realtime
- Fraud detection alerts
- Device management

## 🎯 **FINAL CHECK**

APK 100% BERJALAN jika:
- ✅ Health check response OK
- ✅ User bisa register/login
- ✅ Dashboard admin bisa akses
- ✅ Socket.IO connection established
- ✅ Backend logs menunjukkan activity

---
**💡 TIP:** Simpan IP address laptop untuk reference!