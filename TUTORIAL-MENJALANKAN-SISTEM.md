# 🚀 TUTORIAL LENGKAP MENJALANKAN SISTEM NFC PAYMENT

Panduan step-by-step untuk menjalankan sistem pembayaran NFC dari awal hingga bisa digunakan.

---

## 📋 DAFTAR ISI

1. [Persiapan Awal](#1-persiapan-awal)
2. [Setup Database PostgreSQL](#2-setup-database-postgresql)
3. [Setup Backend Server](#3-setup-backend-server)
4. [Setup Ngrok Tunnel](#4-setup-ngrok-tunnel)
5. [Setup Mobile App](#5-setup-mobile-app)
6. [Testing Sistem](#6-testing-sistem)
7. [Troubleshooting](#7-troubleshooting)

**📊 BONUS:** Lihat **[TUTORIAL-ADMIN-DASHBOARD.md](TUTORIAL-ADMIN-DASHBOARD.md)** untuk cara menjalankan Admin Dashboard!

---

## 1️⃣ PERSIAPAN AWAL

### A. Cek Instalasi Software yang Dibutuhkan

Buka **PowerShell** atau **Command Prompt**, lalu cek satu per satu:

```powershell
# Cek Node.js (harus versi 16 atau lebih tinggi)
node --version
# Hasil: v18.17.0 atau lebih tinggi

# Cek npm (package manager)
npm --version
# Hasil: 9.6.7 atau lebih tinggi

# Cek PostgreSQL
psql --version
# Hasil: psql (PostgreSQL) 15.x atau lebih tinggi

# Cek Git
git --version
# Hasil: git version 2.x.x
```

### B. Jika Ada yang Belum Terinstall

**Install Node.js:**
1. Download dari: https://nodejs.org/
2. Pilih versi LTS (Long Term Support)
3. Install dengan klik Next-Next-Finish
4. Restart terminal setelah install

**Install PostgreSQL:**
1. Download dari: https://www.postgresql.org/download/
2. Install dengan password default: `postgres`
3. Port default: `5432`
4. Catat username dan password!

**Install Ngrok:**
1. Download dari: https://ngrok.com/download
2. Extract file zip
3. (Opsional) Daftar account gratis untuk auth token

**Install Expo CLI (untuk mobile app):**
```powershell
npm install -g expo-cli
```

---

## 2️⃣ SETUP DATABASE POSTGRESQL

### A. Buat Database Baru

```powershell
# Masuk ke PostgreSQL shell
psql -U postgres

# Di dalam psql shell, buat database:
CREATE DATABASE nfc_payment_db;

# Cek database sudah dibuat
\l

# Keluar dari psql
\q
```

### B. Setup Environment Variables

1. Buka folder project: `C:\Users\ASUS\skripku jadi\backend`

2. Buat file `.env` (jika belum ada):

```powershell
cd backend
notepad .env
```

3. Isi file `.env` dengan konfigurasi berikut:

```env
# Database Configuration
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/nfc_payment_db"

# Ganti 'postgres:postgres' dengan username:password PostgreSQL Anda
# Format: postgresql://USERNAME:PASSWORD@localhost:5432/DATABASE_NAME

# JWT Secret (untuk authentication)
JWT_SECRET=nfc-payment-jwt-secret-2025-ultra-secure-key

# App Secret (untuk mobile app)
APP_SECRET=NFC2025SecureApp

# Admin Password (untuk admin dashboard)
ADMIN_PASSWORD=admin123

# Server Configuration
PORT=4000
HOST=0.0.0.0

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

4. **Save dan tutup** file `.env`

---

## 3️⃣ SETUP BACKEND SERVER

### A. Install Dependencies

```powershell
# Pastikan Anda di folder backend
cd C:\Users\ASUS\skripku jadi\backend

# Install semua package yang dibutuhkan
npm install
```

**Proses ini akan install:**
- Express.js (web framework)
- Prisma ORM (database client)
- bcryptjs (password hashing)
- jsonwebtoken (JWT authentication)
- socket.io (real-time updates)
- Dan 20+ package lainnya

**Waktu estimasi:** 2-5 menit (tergantung internet)

### B. Setup Database Schema dengan Prisma

```powershell
# Generate Prisma Client
npx prisma generate

# Jalankan migrations (buat tables di database)
npx prisma migrate deploy
```

**Jika ada error "Migration not found"**, jalankan:

```powershell
# Reset dan buat migration baru
npx prisma migrate dev --name init
```

### C. (Opsional) Seed Database dengan Data Dummy

Buat file `backend/seed.js`:

```javascript
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Buat user dummy
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const user1 = await prisma.user.create({
    data: {
      username: 'john',
      password: hashedPassword,
      name: 'John Doe',
      balance: 500000,
      isActive: true,
    }
  });

  const user2 = await prisma.user.create({
    data: {
      username: 'jane',
      password: hashedPassword,
      name: 'Jane Smith',
      balance: 300000,
      isActive: true,
    }
  });

  console.log('✅ Seed data berhasil dibuat:');
  console.log('User 1:', user1);
  console.log('User 2:', user2);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
```

Jalankan seed:

```powershell
node seed.js
```

### D. Jalankan Backend Server

```powershell
# Development mode (dengan auto-reload)
npm run dev

# ATAU production mode
npm start
```

**Output yang benar:**

```
🚀 NFC Payment Backend Server v2.0.0
📡 Server running on http://0.0.0.0:4000
🌍 Local IP: http://192.168.1.5:4000
📊 Database connected successfully
⚡ Socket.IO ready for real-time updates
```

**Cek IP Address Anda:**
- Windows: Buka PowerShell → `ipconfig` → cari **IPv4 Address**
- Contoh: `192.168.1.5`

**JANGAN TUTUP TERMINAL INI!** Backend harus tetap running.

---

## 4️⃣ SETUP NGROK TUNNEL

### A. Mengapa Perlu Ngrok?

Mobile app tidak bisa akses `localhost:4000` langsung. Ngrok membuat tunnel dari internet ke localhost.

```
Mobile App → https://abc.ngrok-free.dev → http://localhost:4000
```

### B. Jalankan Ngrok

Buka **terminal BARU** (jangan tutup terminal backend):

```powershell
# Pindah ke folder dimana ngrok.exe berada
cd C:\path\to\ngrok

# Jalankan ngrok
ngrok http 4000
```

**Output:**

```
ngrok

Session Status                online
Account                       user@email.com (Plan: Free)
Version                       3.3.0
Region                        Asia Pacific (ap)
Latency                       25ms
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc-xyz-123.ngrok-free.dev -> http://localhost:4000

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

### C. Copy URL Ngrok

**Copy URL Forwarding:** `https://abc-xyz-123.ngrok-free.dev`

**PENTING:** URL ini akan berubah setiap kali Ngrok restart (free tier)!

**JANGAN TUTUP TERMINAL NGROK!** Harus tetap running.

---

## 5️⃣ SETUP MOBILE APP

### A. Update API URL

1. Buka file: `src/utils/configuration.ts`

2. **Ganti** API_URL dengan URL Ngrok Anda:

```typescript
// SEBELUM:
export const API_URL = 'https://old-url.ngrok-free.dev';

// SESUDAH:
export const API_URL = 'https://abc-xyz-123.ngrok-free.dev';
//                      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//                      GANTI DENGAN URL NGROK ANDA!
```

3. **Save** file

### B. Install Dependencies Mobile App

```powershell
# Pindah ke root folder project
cd C:\Users\ASUS\skripku jadi

# Install dependencies
npm install
```

**Waktu estimasi:** 3-10 menit

### C. Jalankan Mobile App

```powershell
# Start Expo development server
npm start

# ATAU
npx expo start
```

**Output:**

```
› Metro waiting on exp://192.168.1.5:8081
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)

› Press a │ open Android
› Press i │ open iOS simulator
› Press w │ open web

› Press r │ reload app
› Press m │ toggle menu
› Press ? │ show all commands
```

### D. Buka di HP Android

**Opsi 1: Scan QR Code (Recommended)**

1. Download **Expo Go** dari Play Store
2. Buka Expo Go app
3. Scan QR code yang muncul di terminal
4. Tunggu build selesai (2-5 menit)
5. App akan terbuka di HP

**Opsi 2: Manual URL**

1. Buka Expo Go app
2. Tap **"Enter URL manually"**
3. Input: `exp://192.168.1.5:8081` (ganti dengan IP laptop Anda)
4. Tap **"Connect"**

**Opsi 3: Emulator Android**

```powershell
# Tekan 'a' di terminal Expo
# Akan otomatis buka Android emulator (jika sudah install)
```

### E. Pastikan HP & Laptop di WiFi yang Sama

⚠️ **PENTING:**
- HP dan Laptop harus tersambung ke **WiFi yang sama**
- Jika pakai hotspot HP → connect laptop ke hotspot HP
- Jika pakai WiFi router → connect keduanya ke WiFi yang sama

---

## 6️⃣ TESTING SISTEM

### A. Test Backend API dengan Browser

Buka browser (Chrome/Edge), akses:

```
http://localhost:4000/api/health
```

**Response yang benar:**

```json
{
  "status": "OK",
  "timestamp": "2026-04-22T10:30:00.000Z",
  "version": "2.0.0",
  "database": "connected"
}
```

### B. Test Backend via Ngrok

Buka browser, akses:

```
https://abc-xyz-123.ngrok-free.dev/api/health
```

**Jika muncul halaman Ngrok warning:**
- Klik **"Visit Site"**
- Response JSON akan muncul

**Response sama seperti di atas = Ngrok berfungsi! ✅**

### C. Test Login di Mobile App

1. Buka app di HP
2. Tampil **LoginScreen**
3. Input:
   - Username: `john`
   - Password: `password123`
4. Tap **"Masuk"**

**Jika berhasil:**
- Alert: "Login berhasil"
- Navigate ke **DashboardScreen**
- Tampil saldo: `Rp 500,000`

### D. Test API dengan Postman/Thunder Client

**Test Login:**

```
POST https://abc-xyz-123.ngrok-free.dev/api/auth/login
Content-Type: application/json

{
  "username": "john",
  "password": "password123"
}
```

**Response:**

```json
{
  "message": "Login berhasil",
  "user": {
    "id": 1,
    "name": "John Doe",
    "username": "john",
    "balance": 500000
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## 7️⃣ TROUBLESHOOTING

### ❌ Error: "Database connection failed"

**Penyebab:** PostgreSQL tidak running atau DATABASE_URL salah

**Solusi:**

```powershell
# Cek PostgreSQL service
# Windows: Services → PostgreSQL → harus "Running"

# Atau restart PostgreSQL
net stop postgresql-x64-15
net start postgresql-x64-15

# Cek DATABASE_URL di .env
# Format: postgresql://USERNAME:PASSWORD@localhost:5432/DATABASE_NAME
```

### ❌ Error: "Port 4000 already in use"

**Penyebab:** Ada aplikasi lain pakai port 4000

**Solusi 1: Kill process di port 4000**

```powershell
# Cari process yang pakai port 4000
netstat -ano | findstr :4000

# Kill process (ganti PID dengan hasil di atas)
taskkill /PID <PID> /F
```

**Solusi 2: Ganti port**

Edit `.env`:

```env
PORT=5000
```

Restart backend dan Ngrok dengan port baru:

```powershell
ngrok http 5000
```

### ❌ Error: "Cannot connect to backend" (Mobile App)

**Penyebab:** API_URL salah atau Ngrok mati

**Solusi:**

1. **Cek Ngrok masih running**
   - Terminal Ngrok harus tetap terbuka
   - Jika tidak, jalankan lagi: `ngrok http 4000`

2. **Update API_URL di configuration.ts**
   - Copy URL Ngrok yang baru
   - Paste ke `src/utils/configuration.ts`
   - Save file
   - Reload app: tekan `r` di terminal Expo

3. **Cek WiFi sama**
   - HP dan laptop harus di WiFi yang sama

### ❌ Error: "Prisma Client not generated"

**Solusi:**

```powershell
cd backend
npx prisma generate
```

### ❌ Error: "Migration failed"

**Solusi: Reset database**

```powershell
# PERINGATAN: Ini akan hapus semua data!
npx prisma migrate reset

# Lalu migrate ulang
npx prisma migrate deploy

# Seed ulang data dummy
node seed.js
```

### ❌ Error: "Module not found"

**Solusi:**

```powershell
# Di folder backend
cd backend
npm install

# Di folder root (mobile app)
cd ..
npm install
```

### ❌ Error: Ngrok "ERR_NGROK_108"

**Penyebab:** Ngrok auth token tidak valid (jika pakai account)

**Solusi:**

```powershell
# Login ke ngrok.com
# Copy auth token dari dashboard
# Set auth token
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

### ❌ Mobile App: "Network request failed"

**Checklist:**

1. ✅ Backend server running? (terminal backend aktif)
2. ✅ Ngrok running? (terminal Ngrok aktif)
3. ✅ API_URL di configuration.ts sudah benar?
4. ✅ HP & laptop di WiFi yang sama?
5. ✅ Test Ngrok URL di browser bisa?

### ❌ NFC Not Working

**Solusi:**

1. **Aktifkan NFC di HP:**
   - Settings → Connected devices → Connection preferences → NFC
   - Toggle ON

2. **Pakai HP Fisik:**
   - Emulator tidak support NFC
   - Harus pakai HP Android fisik

3. **Pakai Kartu NFC yang Benar:**
   - NTag215 (recommended)
   - Mifare Classic / Ultralight
   - Frekuensi 13.56 MHz

---

## 🎯 CHECKLIST LENGKAP

Gunakan checklist ini untuk memastikan semua step sudah dilakukan:

### Backend:

- [ ] PostgreSQL installed & running
- [ ] Database `nfc_payment_db` sudah dibuat
- [ ] File `.env` sudah dibuat dengan konfigurasi yang benar
- [ ] `npm install` di folder backend berhasil
- [ ] `npx prisma generate` berhasil
- [ ] `npx prisma migrate deploy` berhasil
- [ ] (Opsional) Seed data dummy berhasil
- [ ] Backend server running di port 4000
- [ ] Test `http://localhost:4000/api/health` → status OK

### Ngrok:

- [ ] Ngrok installed
- [ ] Ngrok running dengan command `ngrok http 4000`
- [ ] URL Ngrok sudah di-copy
- [ ] Test Ngrok URL di browser → status OK

### Mobile App:

- [ ] `npm install` di root folder berhasil
- [ ] File `src/utils/configuration.ts` sudah diupdate dengan URL Ngrok
- [ ] Expo development server running (`npm start`)
- [ ] Expo Go app sudah terinstall di HP Android
- [ ] QR code sudah di-scan atau URL manual sudah diinput
- [ ] HP dan laptop di WiFi yang sama
- [ ] App berhasil dibuka di HP
- [ ] Test login berhasil
- [ ] Dashboard tampil dengan saldo

---

## 🚀 WORKFLOW HARIAN

Setiap kali ingin jalankan sistem (development):

### Terminal 1: Backend

```powershell
cd C:\Users\ASUS\skripku jadi\backend
npm run dev
```

### Terminal 2: Ngrok

```powershell
ngrok http 4000
```

**Copy URL Ngrok → Update di `configuration.ts` (jika URL berubah)**

### Terminal 3: Mobile App

```powershell
cd C:\Users\ASUS\skripku jadi
npm start
```

**Scan QR code di Expo Go app**

---

## 📱 BUILD APK (PRODUCTION)

Untuk build APK yang bisa di-install tanpa Expo Go:

### A. Setup EAS Build

```powershell
# Install EAS CLI
npm install -g eas-cli

# Login ke Expo account
eas login

# Configure project
eas build:configure
```

### B. Build APK

```powershell
# Build untuk Android (APK)
eas build --platform android --profile preview

# ATAU build AAB (untuk Play Store)
eas build --platform android --profile production
```

**Waktu build:** 10-20 menit

**Download APK** dari link yang diberikan setelah build selesai.

### C. Install APK di HP

1. Download APK dari link EAS
2. Transfer ke HP via USB atau cloud
3. Install APK (enable "Install from unknown sources")
4. Buka app
5. Login dan gunakan!

**PENTING:** Sebelum build production, ganti API_URL dengan server production (bukan Ngrok):

```typescript
// src/utils/configuration.ts
export const API_URL = 'https://your-production-server.com';
```

---

## 🎓 TIPS & BEST PRACTICES

### 1. Gunakan Ngrok Premium (Opsional)

**Free tier:** URL berubah setiap restart
**Premium:** URL tetap (fixed subdomain)

### 2. Setup Hotspot HP

Jika tidak ada WiFi:

1. HP → Settings → Hotspot & tethering → WiFi hotspot → ON
2. Laptop → Connect ke hotspot HP
3. Laptop dan HP otomatis di jaringan yang sama

### 3. Monitor Logs

**Backend logs:**

```powershell
# Di terminal backend, semua request akan ter-log:
GET /api/users/me - 200 - 45ms - 192.168.1.10
POST /api/transactions - 201 - 230ms - 192.168.1.10
```

**Mobile app logs:**

```powershell
# Di terminal Expo:
LOG  📱 API Call: POST https://abc.ngrok-free.dev/api/auth/login
LOG  📥 Response: 200
```

### 4. Database GUI

```powershell
# Buka Prisma Studio (database GUI)
cd backend
npx prisma studio

# Akses: http://localhost:5555
```

### 5. Auto-Restart Backend

Install nodemon untuk auto-restart saat code berubah:

```powershell
npm install -g nodemon
```

Edit `package.json`:

```json
{
  "scripts": {
    "dev": "nodemon server.js"
  }
}
```

---

## 📚 RESOURCE TAMBAHAN

### Dokumentasi Lengkap:

1. **PANDUAN-LENGKAP-SISTEM.md** - Arsitektur & flow lengkap
2. **PENJELASAN-FILE-BY-FILE.md** - Penjelasan setiap file
3. **backend/routes/README-PENJELASAN.md** - Penjelasan API endpoints
4. **INDEX-DOKUMENTASI.md** - Index semua dokumentasi

### Video Tutorial:

- Expo Go: https://expo.dev/go
- Ngrok: https://ngrok.com/docs
- Prisma: https://www.prisma.io/docs

---

## ❓ FAQ

**Q: Apakah harus pakai Ngrok?**
A: Ya, untuk development dengan mobile app. Alternatif: deploy backend ke cloud (Heroku, Railway).

**Q: Berapa lama waktu setup total?**
A: 30-60 menit untuk pertama kali (termasuk download & install).

**Q: Apakah bisa pakai iOS?**
A: Ya, tapi butuh Mac untuk build. Atau pakai Expo Go di iPhone.

**Q: Backend harus selalu running?**
A: Ya, mobile app butuh backend untuk semua operasi (kecuali offline mode).

**Q: Ngrok URL berubah terus, solusinya?**
A: Upgrade ke Ngrok Pro ($8/bulan) untuk fixed subdomain. Atau deploy backend ke cloud.

**Q: Bisa deploy ke Play Store?**
A: Ya, build dengan `eas build --platform android --profile production`, lalu upload AAB ke Play Console.

---

**Selamat mencoba! Jika ada error, cek bagian Troubleshooting atau tanya lagi.** 🚀

**Dibuat dengan ❤️ untuk memudahkan setup sistem NFC Payment**

**Last Updated:** April 22, 2026
