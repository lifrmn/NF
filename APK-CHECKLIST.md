# ✅ CHECKLIST APK 100% BERJALAN

## 🎯 **SEBELUM BUILD APK - WAJIB!**

### 1. **Cek IP Laptop**
```cmd
ipconfig | findstr "IPv4"
```
**Catat IP WiFi adapter** (contoh: 192.168.1.100)

### 2. **Update eas.json**
- [ ] Buka `eas.json`
- [ ] Ganti IP di bagian `preview` dengan IP laptop Anda:
```json
"EXPO_PUBLIC_API_BASE": "http://[YOUR_IP]:4000"
```

### 3. **Test Network dari HP**
- [ ] HP dan laptop connect WiFi SAMA
- [ ] Buka browser HP, tes: `http://[YOUR_IP]:4000/health`
- [ ] Harus dapat response: `{"status": "OK"}`

## 🚀 **BUILD & TEST PROCESS**

### 1. **Start Backend Server**
```cmd
cd backend
npm start
```
**Status:** Server harus show:
- ✅ `🚀 NFC Payment Backend Server started!`
- ✅ `📡 Socket.IO: Enabled`
- ✅ `🌐 Test from phone: http://[YOUR_IP]:4000`

### 2. **Build APK Preview**
```cmd
eas build --platform android --profile preview
```
**Checklist:**
- [ ] Build berhasil tanpa error
- [ ] Download link diterima
- [ ] APK size wajar (< 50MB)

### 3. **Install & Test APK**
**Di HP Android:**
- [ ] Download APK dari expo.dev
- [ ] Enable "Install from unknown sources"
- [ ] Install APK
- [ ] Buka aplikasi

### 4. **Test Konektivitas Lengkap**

#### **A. Health Check**
- [ ] Browser HP: `http://[YOUR_IP]:4000/health`
- [ ] Response OK

#### **B. Auth System**
- [ ] Register user baru di APK
- [ ] Login berhasil
- [ ] Token JWT diterima

#### **C. Backend Logs**
Terminal backend harus show:
```
✅ POST /api/auth/register - 201
✅ New user connected: [socket_id]
✅ JWT token generated for user: [user_id]
```

#### **D. Admin Dashboard**
- [ ] Buka: `http://[YOUR_IP]:4000/admin`
- [ ] Login admin berhasil
- [ ] Bisa lihat user online
- [ ] Real-time updates jalan

### 5. **Test Fitur Utama APK**

#### **A. NFC System**
- [ ] Permission NFC granted
- [ ] NFC reader active
- [ ] Test dengan kartu NFC

#### **B. Transaction Flow**
- [ ] Buat transaksi baru
- [ ] Data masuk database
- [ ] Notifikasi real-time
- [ ] Admin dashboard update

#### **C. Fraud Detection**
- [ ] Test multiple transactions
- [ ] AI fraud check jalan
- [ ] Alert system active

## 🔍 **TROUBLESHOOTING GUIDE**

### **APK Tidak Connect Backend**
1. **Cek IP Address**
   ```cmd
   ipconfig | findstr "192.168"
   ```

2. **Update eas.json dengan IP baru**

3. **Rebuild APK**
   ```cmd
   eas build --platform android --profile preview
   ```

### **Backend Error**
1. **Restart Server**
   ```cmd
   cd backend
   npm start
   ```

2. **Database Reset (jika perlu)**
   ```cmd
   npx prisma migrate reset --force
   ```

### **Network Issues**
1. **Disable Windows Firewall** (sementara)
2. **Check WiFi same network**
3. **Test dengan browser HP dulu**

## 📊 **FINAL VALIDATION**

### **APK 100% READY jika:**
- ✅ Health check dari HP: OK
- ✅ Register/Login: SUCCESS  
- ✅ Backend logs: Active connections
- ✅ Admin dashboard: Accessible
- ✅ Socket.IO: Real-time updates
- ✅ Database: Data tersimpan
- ✅ NFC: Permission granted
- ✅ AI Fraud: Detection active

## 🎉 **PRODUCTION DEPLOYMENT**

Setelah APK 100% jalan:

1. **Domain Setup** (untuk production)
   ```json
   "EXPO_PUBLIC_API_BASE": "https://yourdomain.com/api"
   ```

2. **Production Build**
   ```cmd
   eas build --platform android --profile production
   ```

3. **Play Store Ready** 🚀

---
**💡 CATATAN:** Simpan IP address & test checklist ini untuk reference!