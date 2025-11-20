# 🚀 PANDUAN LENGKAP MENJALANKAN SISTEM NFC PAYMENT

## 📋 PERSIAPAN AWAL

### 1️⃣ **Pastikan Node.js Terinstall**
```powershell
# Cek versi Node.js
node --version
# Harus versi 16+ (Anda pakai v22.14.0 ✅)
```

### 2️⃣ **Buka 4 Terminal/Command Prompt**
- Terminal 1: Backend Server
- Terminal 2: Admin Server  
- Terminal 3: Expo Development Server
- Terminal 4: Prisma Studio (Optional)

---

## 🔥 LANGKAH MENJALANKAN SISTEM

### **TERMINAL 1 - BACKEND SERVER** 
```powershell
# Masuk ke folder backend
cd "c:\Users\ASUS\FINAL 12.12 98%\backend"

# Install dependencies (jika belum)
npm install

# Generate Prisma client
npx prisma generate

# Push schema ke database
npx prisma db push

# Start backend server
node server.js
```

**Expected Output:**
```
🗄️ Prisma connected successfully.
🚀 NFC Payment Backend Server started!
📊 Server bind : http://0.0.0.0:4000
🔍 Health Check: http://0.0.0.0:4000/health
📡 Socket.IO   : Enabled
```

### **TERMINAL 2 - ADMIN SERVER**
```powershell
# Masuk ke folder admin
cd "c:\Users\ASUS\FINAL 12.12 98%\admin"

# Install dependencies (jika belum)
npm install node-fetch

# Start admin server
node simple-admin.js
```

**Expected Output:**
```
🚀 Simple NFC Payment Admin started!
📊 Dashboard: http://localhost:3001
🌐 IP Address untuk Android Apps:
   📱 http://192.168.137.1:3001
```

### **TERMINAL 3 - EXPO DEVELOPMENT SERVER**
```powershell
# Masuk ke folder root project
cd "c:\Users\ASUS\FINAL 12.12 98%"

# Start Expo development server
npx expo start

# Atau dengan clear cache
npx expo start --clear
```

**Expected Output:**
```
› Metro waiting on exp://192.168.137.1:8081
› Scan the QR code above with Expo Go (Android)
› Press a │ open Android
```

### **TERMINAL 4 - PRISMA STUDIO (OPTIONAL)**
```powershell
# Masuk ke folder backend
cd "c:\Users\ASUS\FINAL 12.12 98%\backend"

# Start Prisma Studio
npx prisma studio
```

**Expected Output:**
```
Prisma Studio is up on http://localhost:5555
```

---

## 🌐 SETUP NETWORK HOTSPOT

### **1. Buat Hotspot Laptop**
```powershell
# Buka Command Prompt sebagai Administrator
# Run commands berikut:

netsh wlan set hostednetwork mode=allow ssid="NFC-Payment" key="12345678"
netsh wlan start hostednetwork
```

### **2. Cek IP Hotspot**
```powershell
ipconfig
# Cari "Local Area Connection* X" 
# IP biasanya: 192.168.137.1
```

---

## 📱 MENJALANKAN MOBILE APP

### **Method 1: Expo Go (Recommended)**
1. Install **Expo Go** di HP Android
2. Connect HP ke hotspot laptop ("NFC-Payment")
3. Scan QR code dari terminal Expo
4. App akan terbuka di Expo Go

### **Method 2: Development Build**
```powershell
# Build untuk Android (jika diperlukan)
npx expo run:android
```

---

## 🔧 AKSES DASHBOARD & TOOLS

### **URLs untuk Browser:**
- **Admin Dashboard**: `http://192.168.137.1:3001`
- **Backend Health**: `http://192.168.137.1:4000/api/health` 
- **Backend Debug Users**: `http://192.168.137.1:4000/api/debug/users`
- **Prisma Studio**: `http://localhost:5555`

### **Kredensial Sistem:**
- **Admin Password**: `admin123`
- **App Secret**: `NFC2025SecureApp`
- **Database User**: username `bji` (password ter-hash)

---

## ✅ VERIFIKASI SISTEM BERJALAN

### **1. Cek Backend Status**
```powershell
curl http://192.168.137.1:4000/api/health
# Output: {"status":"ok","message":"Backend server is running"}
```

### **2. Cek Admin Dashboard**
- Buka `http://192.168.137.1:3001` di browser
- Should show dashboard dengan user data

### **3. Cek Database**
- Buka `http://localhost:5555` 
- Should show Prisma Studio dengan user "Bji"

### **4. Test Mobile Connection**
- Mobile app connect ke backend
- Login dengan user yang ada di database

---

## 🚨 TROUBLESHOOTING

### **Backend Tidak Start:**
```powershell
# Kill semua proses node
taskkill /f /im node.exe

# Restart dari awal
cd backend
node server.js
```

### **Port Sudah Digunakan:**
```powershell
# Cek proses yang menggunakan port 4000
netstat -ano | findstr :4000

# Kill proses berdasarkan PID
taskkill /PID [PID_NUMBER] /F
```

### **Mobile App Tidak Connect:**
1. Pastikan HP connect ke hotspot laptop
2. Cek IP hotspot: `ipconfig`
3. Update `app.json` dengan IP yang benar
4. Restart Expo server

### **Database Error:**
```powershell
cd backend
npx prisma db push
npx prisma generate
```

---

## 🎯 DEMO SEQUENCE UNTUK SKRIPSI

### **1. System Startup (5 menit)**
1. Start backend server
2. Start admin server  
3. Start Expo development server
4. Show Prisma Studio dengan data

### **2. Admin Dashboard Demo (5 menit)**
1. Open admin dashboard
2. Show user management
3. Demo bulk top-up functionality
4. Show real-time activity monitoring

### **3. Mobile App Demo (10 menit)**
1. Connect mobile to hotspot
2. Login to mobile app
3. Show dashboard dengan balance
4. Demo NFC payment simulation
5. Show transaction in admin dashboard

### **4. AI Fraud Detection Demo (5 menit)**
1. Show fraudDetection.ts algorithm
2. Explain Z-Score based detection
3. Demo fraud alerts in admin

---

## 📁 FILE STRUCTURE SUMMARY

```
FINAL 12.12 98%/
├── backend/              # Backend Server (Port 4000)
│   ├── server.js         # Main server file
│   ├── routes/           # API endpoints
│   └── prisma/           # Database schema
├── admin/                # Admin Dashboard (Port 3001)
│   ├── simple-admin.js   # Admin server
│   └── simple-dashboard.html # Dashboard UI
├── src/                  # Mobile App Source
│   ├── screens/          # App screens
│   ├── components/       # UI components
│   └── utils/            # Utilities & API
├── app.json              # Expo configuration
└── package.json          # Project dependencies
```

---

## 🎓 SISTEM READY UNTUK DEMO SKRIPSI!

Semua komponen sistem sudah dikonfigurasi dan siap untuk demonstrasi:

✅ Backend server dengan API lengkap
✅ Admin dashboard dengan kontrol penuh  
✅ Mobile app dengan NFC payment interface
✅ AI fraud detection algorithm
✅ Database management dengan Prisma
✅ Real-time monitoring dan logging
✅ Hotspot network configuration

**Total setup time: ~10 menit**
**Demo ready: 100% functional** 🚀

---

*Dokumentasi ini dibuat untuk memastikan sistem NFC Payment dapat dijalankan dengan sempurna untuk presentasi skripsi.*