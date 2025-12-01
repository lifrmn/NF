# 🚀 Setup Ngrok untuk NFC Payment System

## ✅ Perubahan yang Dilakukan

### 1. **Simplified Configuration**
- ❌ Hapus semua fitur WiFi/LAN auto-detection
- ✅ Hanya menggunakan ngrok untuk koneksi
- ✅ Mobile app langsung connect ke ngrok URL

### 2. **File yang Dimodifikasi**
- `src/utils/configuration.ts` - Ngrok URL configuration
- `src/utils/apiService.ts` - Simplified API service (hapus monitoring)
- `admin/simple-admin.js` - Simplified startup message

---

## 📋 Cara Menjalankan Sistem

### **Terminal 1: Backend Server**
```powershell
cd "C:\Users\ASUS\FINAL 12.12 99%\backend"
node server.js
```
✅ Backend running di **port 4000**

---

### **Terminal 2: Ngrok Tunnel**
```powershell
ngrok http 4000
```

**Output ngrok:**
```
Forwarding  https://abc123.ngrok-free.dev -> http://localhost:4000
```

✅ Copy URL: `https://abc123.ngrok-free.dev`

---

### **Terminal 3: Admin Dashboard**
```powershell
cd "C:\Users\ASUS\FINAL 12.12 99%\admin"
node simple-admin.js
```
✅ Admin dashboard running di **port 3001**

---

## 🔄 Update Ngrok URL (Setiap Restart)

### **1. Update di Mobile App**
File: `src/utils/configuration.ts`
```typescript
export const API_URL = 'https://abc123.ngrok-free.dev';
```

### **2. Update di Admin Dashboard**
File: `admin/simple-admin.js` (line 22)
```javascript
const NGROK_URL = 'https://abc123.ngrok-free.dev';
```

### **3. Rebuild APK**
```powershell
eas build --platform android --profile preview
```

---

## 🎯 Keuntungan Ngrok-Only

✅ **Tidak perlu WiFi sama** - Backend bisa di laptop, HP pakai mobile data  
✅ **Public URL** - Bisa diakses dari mana saja  
✅ **Stabil** - Tidak terpengaruh router/firewall  
✅ **Simple** - Hanya 1 URL yang perlu dikonfigurasi  

---

## 🔍 Testing

### **Test dari HP Android:**
1. Buka app NFC Payment
2. Login dengan username & password
3. App otomatis connect ke ngrok URL
4. Dashboard & transactions berfungsi normal

### **Test Admin Dashboard:**
1. Buka browser: `http://localhost:3001`
2. Monitor users & transactions
3. Admin dashboard fetch data dari backend via ngrok

---

## ⚠️ Catatan Penting

1. **Ngrok Free Tier:**
   - URL berubah setiap restart
   - Max 1 tunnel concurrent
   - Harus update `configuration.ts` setiap kali ngrok restart

2. **Production Setup:**
   - Gunakan ngrok paid plan (static URL)
   - Atau deploy backend ke cloud (Heroku, Railway, dll)

3. **Security:**
   - Ngrok URL bersifat public
   - Pastikan authentication aktif
   - Jangan share ngrok URL ke orang lain

---

## 🐛 Troubleshooting

### **Backend tidak connect:**
```powershell
# Check backend running
netstat -ano | findstr :4000

# Restart backend
cd backend
node server.js
```

### **Ngrok tunnel error:**
```powershell
# Check ngrok status
ngrok version

# Restart ngrok
ngrok http 4000
```

### **Mobile app error 401/403:**
- Pastikan token valid
- Re-login di app
- Check ngrok URL di `configuration.ts`

---

## 📊 Architecture

```
┌─────────────────┐
│  Mobile App     │
│  (Android APK)  │
└────────┬────────┘
         │
         │ HTTPS (Ngrok)
         ▼
┌─────────────────┐
│  Ngrok Tunnel   │
│  (Public URL)   │
└────────┬────────┘
         │
         │ HTTP (localhost)
         ▼
┌─────────────────┐      ┌──────────────┐
│  Backend Server │◄─────┤ Admin Dash   │
│  (Port 4000)    │      │ (Port 3001)  │
└────────┬────────┘      └──────────────┘
         │
         ▼
┌─────────────────┐
│  SQLite DB      │
│  (Prisma)       │
└─────────────────┘
```

---

## 🎉 Selesai!

Sistem sekarang **100% menggunakan ngrok** untuk koneksi backend.  
Tidak ada lagi dependency ke WiFi/LAN.

**Next Steps:**
1. Update ngrok URL di `configuration.ts`
2. Rebuild APK dengan `eas build`
3. Install APK di HP
4. Test payment flow
