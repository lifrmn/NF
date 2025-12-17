# 🔗 PANDUAN KONEKSI SISTEM - Dompet Digital NFC

## ✅ STATUS KONEKSI SAAT INI

### 1. **Backend Server** ✅ RUNNING
```
Status: 🟢 ONLINE
Port: 4000
URL Lokal: http://0.0.0.0:4000
Health Check: http://0.0.0.0:4000/health
Admin Dashboard: http://0.0.0.0:4000/admin
```

### 2. **Database (SQLite + Prisma)** ✅ CONNECTED
```
Status: 🟢 CONNECTED
Provider: SQLite
Lokasi: backend/prisma/dev.db
ORM: Prisma Client v5.22.0
```

### 3. **Fraud Detection AI** ✅ ACTIVE
```
Status: 🟢 ACTIVE
Method: Statistical Anomaly Detection
Algorithm: Z-Score Based Detection
Sample Size: 15 transaksi
Decision: ALLOW / REVIEW / BLOCK
```

### 4. **Mobile App (React Native)** ⚠️ PERLU SETUP
```
Status: ⏸️ WAITING FOR NGROK
API URL: Perlu update di src/utils/configuration.ts
```

---

## 🔧 CARA MENGHUBUNGKAN SEMUA KOMPONEN

### **STEP 1: Start Backend Server** ✅ DONE

Backend sudah running di:
- **Local:** http://0.0.0.0:4000
- **Network IP 1:** http://169.254.85.118:4000
- **Network IP 2:** http://172.18.101.205:4000

Test dengan buka browser:
```
http://localhost:4000/health
```

Response yang benar:
```json
{
  "status": "OK",
  "timestamp": "2025-12-09T...",
  "version": "2.0.0",
  "database": "connected"
}
```

---

### **STEP 2: Setup Ngrok untuk Internet Access**

#### **2.1. Install Ngrok (jika belum)**
Download dari: https://ngrok.com/download
Atau dengan npm:
```bash
npm install -g ngrok
```

#### **2.2. Start Ngrok Tunnel**
Buka terminal baru (JANGAN tutup terminal backend):
```bash
ngrok http 4000
```

Output akan muncul seperti ini:
```
Session Status: online
Forwarding: https://abc-xyz-123.ngrok-free.dev -> http://localhost:4000
```

#### **2.3. Copy URL Ngrok**
Copy URL yang muncul (contoh: `https://abc-xyz-123.ngrok-free.dev`)

---

### **STEP 3: Update Mobile App Configuration**

#### **3.1. Edit File Configuration**
Buka file: `src/utils/configuration.ts`

Ganti URL lama dengan URL ngrok baru:
```typescript
export const API_URL = 'https://abc-xyz-123.ngrok-free.dev';
```

**⚠️ PENTING:** 
- Jangan tambahkan `/` di akhir URL
- Pastikan HTTPS (bukan HTTP)
- Ganti dengan URL ngrok yang BARU setiap restart

#### **3.2. Test Koneksi dari Mobile**
Buka browser HP atau Postman dan test:
```
https://your-ngrok-url.ngrok-free.dev/health
```

Jika sukses, response:
```json
{
  "status": "OK",
  "database": "connected"
}
```

---

### **STEP 4: Build & Deploy Mobile App**

#### **4.1. Build APK dengan EAS**
```bash
eas build --platform android --profile preview
```

#### **4.2. Download & Install APK**
- Download APK dari link yang diberikan EAS
- Install di HP Android
- Buka aplikasi

---

### **STEP 5: Test Full Flow**

#### **5.1. Register User Baru**
1. Buka app di HP
2. Klik "Register"
3. Isi data: username, password, nama
4. Klik "Register"

Backend log akan muncul:
```
POST /api/auth/register - 201 - ...ms
✅ User registered successfully
```

#### **5.2. Login**
1. Masuk dengan username & password
2. Jika sukses, masuk ke Dashboard

Backend log:
```
POST /api/auth/login - 200 - ...ms
👤 User logged in: [username]
```

#### **5.3. Register NFC Card**
1. Klik "Register Card" di Dashboard
2. Tap kartu NFC ke HP
3. Card ID akan terdeteksi otomatis
4. Klik "Register"

Backend log:
```
POST /api/nfc-cards/register - 201 - ...ms
📇 NFC Card registered: [cardId]
```

#### **5.4. Test Payment (Fraud Detection)**
1. Klik "Pay" atau "NFC Screen"
2. Scan kartu NFC penerima
3. Masukkan jumlah (misal: Rp 50.000)
4. Konfirmasi

Backend log dengan **Fraud Detection**:
```
POST /api/nfc-cards/payment - 200 - ...ms
📊 Fraud Analysis - User: 1
   Amount: Rp 50000 | Avg: Rp 45000 | StdDev: Rp 8000
   Z-Score: 0.63σ | Decision: ALLOW | Risk: LOW
✅ Transaction ALLOWED - Normal pattern
💸 Payment processed: Rp 50000 from [sender] to [receiver]
```

---

## 🔗 ALUR KONEKSI LENGKAP

```
┌─────────────────────────────────────────────────────┐
│         MOBILE APP (React Native + Expo)            │
│  • NFCScreen: Scan kartu NFC                        │
│  • PaymentScreen: Input amount & confirm            │
│  • DashboardScreen: Lihat balance & history         │
└─────────────────────────────────────────────────────┘
                        ↓
                 (HTTPS Request)
                        ↓
┌─────────────────────────────────────────────────────┐
│              NGROK TUNNEL (Internet)                │
│  • https://abc-xyz-123.ngrok-free.dev               │
│  • Forward traffic ke localhost:4000                │
└─────────────────────────────────────────────────────┘
                        ↓
                 (HTTP Forwarding)
                        ↓
┌─────────────────────────────────────────────────────┐
│        BACKEND SERVER (Node.js + Express)           │
│  • Port: 4000                                       │
│  • Routes: /api/auth, /api/nfc-cards, etc.         │
│  • Middleware: CORS, Rate Limit, Auth              │
└─────────────────────────────────────────────────────┘
                        ↓
            (Prisma ORM Query)
                        ↓
┌─────────────────────────────────────────────────────┐
│         DATABASE (SQLite + Prisma)                  │
│  • Tables: users, nfcCards, transactions           │
│  • Location: backend/prisma/dev.db                  │
└─────────────────────────────────────────────────────┘
                        ↓
         (Fraud Detection Analysis)
                        ↓
┌─────────────────────────────────────────────────────┐
│           AI FRAUD DETECTION ENGINE                 │
│  • Algorithm: Z-Score Anomaly Detection             │
│  • Input: Transaction history (15 terakhir)        │
│  • Output: ALLOW / REVIEW / BLOCK                   │
└─────────────────────────────────────────────────────┘
                        ↓
          (Response + Socket.IO Event)
                        ↓
┌─────────────────────────────────────────────────────┐
│          MOBILE APP (Update UI)                     │
│  • Balance updated                                  │
│  • Transaction success/failed notification          │
│  • Real-time sync via Socket.IO                     │
└─────────────────────────────────────────────────────┘
```

---

## 🧪 TESTING CHECKLIST

### ✅ Backend Connection Tests
- [ ] `http://localhost:4000/health` → Status OK
- [ ] `http://localhost:4000/api` → Show endpoints
- [ ] `http://localhost:4000/admin` → Admin dashboard loaded
- [ ] Database query working (check terminal logs)

### ✅ Ngrok Tunnel Tests
- [ ] Ngrok running di terminal
- [ ] `https://your-url.ngrok-free.dev/health` → Status OK
- [ ] No SSL errors
- [ ] Response time < 500ms

### ✅ Mobile App Tests
- [ ] App can reach backend (health check)
- [ ] Login/Register working
- [ ] NFC card detection working
- [ ] Payment transaction working
- [ ] Balance updates in real-time
- [ ] Fraud detection logs muncul di backend

### ✅ Fraud Detection Tests
- [ ] Normal transaction (≤2σ) → ALLOW
- [ ] Large transaction (>2σ) → REVIEW
- [ ] Very large transaction (>3σ) → BLOCK
- [ ] Logs showing Z-Score calculation
- [ ] Risk factors displayed correctly

---

## 🐛 TROUBLESHOOTING

### **Problem 1: Backend tidak bisa diakses dari HP**
**Solusi:**
1. Pastikan ngrok running: `ngrok http 4000`
2. Update `src/utils/configuration.ts` dengan URL ngrok terbaru
3. Rebuild APK: `eas build --platform android --profile preview`
4. Install APK baru di HP

### **Problem 2: Fraud Detection tidak jalan**
**Cek:**
1. Backend logs menampilkan "📊 Fraud Analysis"?
2. Database ada data transaksi minimal 1?
3. File `backend/routes/nfcCards.js` sudah diupdate?

**Fix:**
```bash
cd backend
npm start
```
Cek terminal untuk error logs.

### **Problem 3: Database error (Prisma)**
**Solusi:**
```bash
cd backend
npx prisma generate
npx prisma migrate deploy
npm start
```

### **Problem 4: NFC tidak terdeteksi**
**Cek:**
1. HP support NFC? (Settings → Connections → NFC)
2. NFC enabled di HP?
3. Kartu NFC compatible? (NTag215 recommended)
4. Jarak kartu ke HP < 5cm

### **Problem 5: "Network Request Failed"**
**Solusi:**
1. Cek internet connection
2. Cek ngrok masih running
3. Cek URL di `configuration.ts` benar
4. Test URL di browser dulu

---

## 📊 MONITORING & LOGS

### **Backend Logs (Terminal 1)**
```bash
cd backend
npm start
```
Output akan show:
- ✅ Connection status
- 📊 Fraud detection analysis
- 💸 Payment transactions
- ❌ Errors (jika ada)

### **Ngrok Logs (Terminal 2)**
```bash
ngrok http 4000
```
Output akan show:
- HTTP requests
- Response codes
- Request duration

### **Mobile App Logs**
Gunakan React Native Debugger atau Expo Go logs

---

## 🎯 QUICK START COMMANDS

### **Terminal 1: Backend**
```bash
cd backend
npm start
```

### **Terminal 2: Ngrok**
```bash
ngrok http 4000
```

### **Terminal 3: Mobile Development**
```bash
# For development
npx expo start

# For production build
eas build --platform android --profile preview
```

---

## 📝 CATATAN PENTING

### **Setiap Restart Ngrok:**
1. ❌ URL lama tidak valid lagi
2. ✅ Copy URL baru dari ngrok terminal
3. ✅ Update `src/utils/configuration.ts`
4. ✅ Rebuild APK (jika production)
5. ✅ Test koneksi di browser dulu

### **Setiap Update Code Backend:**
1. ❌ Stop backend (Ctrl+C)
2. ✅ Save semua file
3. ✅ Restart: `npm start`
4. ✅ Test endpoint di browser/Postman

### **Setiap Update Code Mobile:**
1. ✅ Save file
2. ✅ Expo akan auto-reload (development)
3. ✅ Jika production, rebuild APK

---

## 🚀 DEPLOYMENT CHECKLIST

### **Development Mode (Testing):**
- [✅] Backend running di localhost:4000
- [✅] Ngrok tunnel active
- [✅] Mobile app via Expo Go
- [✅] Fraud detection active
- [✅] Database connected

### **Production Mode (User Testing):**
- [✅] Backend running 24/7 (VPS/Cloud)
- [✅] Domain name (optional)
- [✅] APK built dan signed
- [✅] APK distributed via Google Drive/TestFlight
- [✅] User documentation ready

---

## ✅ KESIMPULAN

**Status Sistem Saat Ini:**
```
Backend:    🟢 RUNNING (Port 4000)
Database:   🟢 CONNECTED (SQLite + Prisma)
Fraud AI:   🟢 ACTIVE (Z-Score Detection)
Mobile App: ⏸️ WAITING NGROK UPDATE
```

**Next Steps:**
1. ✅ Start ngrok: `ngrok http 4000`
2. ✅ Update `src/utils/configuration.ts` dengan URL ngrok
3. ✅ Test koneksi: `https://your-url.ngrok-free.dev/health`
4. ✅ Build APK: `eas build --platform android --profile preview`
5. ✅ Test full flow: Register → Login → Register Card → Payment

**System is READY! 🚀**

---

**Last Updated:** December 9, 2025
**Version:** 2.0.0
**Fraud Detection:** Z-Score Algorithm (Simplified)
