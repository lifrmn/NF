# ✅ CHECKLIST SETUP SISTEM NFC PAYMENT

Checklist ini untuk memastikan semua langkah setup sudah dilakukan dengan benar.

**Print checklist ini dan centang setiap langkah yang sudah selesai!**

---

## 📦 PERSIAPAN SOFTWARE

- [ ] **Node.js** v18+ terinstall → Cek: `node --version`
- [ ] **npm** terinstall → Cek: `npm --version`
- [ ] **PostgreSQL** v15+ terinstall → Cek: `psql --version`
- [ ] **Ngrok** terinstall → Cek: `ngrok version`
- [ ] **Expo Go** app di HP Android (dari Play Store)
- [ ] **Git** terinstall (opsional) → Cek: `git --version`

**Catatan:** Jika ada yang belum terinstall, ikuti instruksi di **TUTORIAL-MENJALANKAN-SISTEM.md** bagian "Persiapan Awal"

---

## 🗄️ DATABASE SETUP

- [ ] PostgreSQL service **running**
  - Windows: Check di Services → PostgreSQL → harus "Running"
  
- [ ] Database `nfc_payment_db` sudah dibuat
  - Command: `psql -U postgres` → `CREATE DATABASE nfc_payment_db;`
  
- [ ] File `backend/.env` sudah dibuat dengan konfigurasi:
  - [ ] `DATABASE_URL` ✓
  - [ ] `JWT_SECRET` ✓
  - [ ] `APP_SECRET` ✓
  - [ ] `ADMIN_PASSWORD` ✓
  - [ ] `PORT=4000` ✓

**Template .env:** Lihat di **TUTORIAL-MENJALANKAN-SISTEM.md** bagian "Setup Database"

---

## 🔧 BACKEND SETUP

- [ ] Dependencies terinstall
  - Command: `cd backend` → `npm install`
  - Waktu: ~2-5 menit
  
- [ ] Prisma client di-generate
  - Command: `npx prisma generate`
  
- [ ] Database migrations sudah dijalankan
  - Command: `npx prisma migrate deploy`
  - **ATAU** `npx prisma migrate dev --name init` (jika ada error)
  
- [ ] (Opsional) Seed dummy data
  - Command: `node seed.js`
  - Default users: `john` & `jane`, password: `password123`
  
- [ ] Backend server **running** di port 4000
  - Command: `npm run dev`
  - Cek output: "Server running on http://0.0.0.0:4000"

**JANGAN TUTUP TERMINAL BACKEND!**

---

## 🌐 NGROK TUNNEL SETUP

- [ ] Ngrok **running** dan tunneling ke port 4000
  - Command di terminal BARU: `ngrok http 4000`
  
- [ ] URL Ngrok sudah di-copy
  - Format: `https://abc-xyz-123.ngrok-free.dev`
  - Catat URL ini: ___________________________________
  
- [ ] Test Ngrok URL di browser
  - Akses: `https://[URL_NGROK]/api/health`
  - Response: `{"status":"OK","database":"connected"}`

**JANGAN TUTUP TERMINAL NGROK!**

---

## 📱 MOBILE APP SETUP

- [ ] Dependencies terinstall
  - Command di root folder: `npm install`
  - Waktu: ~3-10 menit
  
- [ ] File `src/utils/configuration.ts` sudah diupdate
  - Baris: `export const API_URL = 'https://[URL_NGROK_ANDA]';`
  - Ganti dengan URL Ngrok yang sudah di-copy
  
- [ ] Expo development server **running**
  - Command: `npm start` atau `npx expo start`
  - Cek output: QR code muncul di terminal
  
- [ ] HP Android dan laptop di **WiFi yang sama**
  - HP WiFi: _________________
  - Laptop WiFi: _________________
  - **Harus sama!**
  
- [ ] Expo Go app sudah di-scan / connect
  - Scan QR code ATAU input URL manual
  - URL format: `exp://192.168.1.5:8081`
  
- [ ] App berhasil build dan terbuka di HP
  - Waktu build pertama: ~2-5 menit
  - Screen pertama: **LoginScreen**

---

## 🧪 TESTING SISTEM

### Backend Test:

- [ ] Health check localhost
  - Browser: `http://localhost:4000/api/health`
  - Response: Status OK ✓
  
- [ ] Health check Ngrok
  - Browser: `https://[URL_NGROK]/api/health`
  - Response: Status OK ✓

### Mobile App Test:

- [ ] LoginScreen tampil dengan benar
  - Ada input Username & Password
  - Ada button "Masuk"
  
- [ ] Test login berhasil
  - Username: `john`
  - Password: `password123`
  - Alert: "Login berhasil"
  
- [ ] DashboardScreen tampil
  - Nama user tampil: "John Doe"
  - Saldo tampil: "Rp 500,000"
  - Menu buttons tampil

### API Test (Opsional - pakai Postman):

- [ ] Test login endpoint
  - POST `https://[URL_NGROK]/api/auth/login`
  - Body: `{"username":"john","password":"password123"}`
  - Response: Token & user data ✓

---

## 🔄 TROUBLESHOOTING CHECKLIST

Jika ada masalah, cek ini:

### Backend Issues:

- [ ] Terminal backend masih aktif dan tidak ada error
- [ ] PostgreSQL service running
- [ ] Port 4000 tidak dipakai aplikasi lain
- [ ] File `.env` konfigurasi benar

### Ngrok Issues:

- [ ] Terminal Ngrok masih aktif
- [ ] URL Ngrok masih valid (tidak expired)
- [ ] Ngrok URL bisa diakses di browser
- [ ] Ngrok auth token valid (jika pakai account)

### Mobile App Issues:

- [ ] Terminal Expo masih aktif
- [ ] `configuration.ts` sudah di-save setelah edit
- [ ] HP dan laptop di WiFi yang sama
- [ ] Expo Go app versi terbaru
- [ ] Storage HP tidak penuh

### Connection Issues:

- [ ] Backend server responding (test health endpoint)
- [ ] Ngrok tunnel active (test Ngrok URL)
- [ ] API_URL di `configuration.ts` benar (cocok dengan Ngrok URL)
- [ ] Firewall tidak block port 4000 atau 8081

---

## 📝 CATATAN PENTING

### IP Addresses:

**Laptop IP Address:** _________________ (dari `ipconfig`)

**Ngrok URL:** _________________________________________________

**Expo URL:** exp://___________________:8081

### Credentials:

**PostgreSQL:**
- Username: postgres
- Password: ________________

**Dummy Users (setelah seed):**
- User 1: `john` / `password123` / Saldo: Rp 500,000
- User 2: `jane` / `password123` / Saldo: Rp 300,000

**Admin:**
- Password: `admin123` (dari .env)

### Ports:

- Backend: `4000`
- Expo Metro: `8081`
- Ngrok Web Interface: `4040`
- Prisma Studio: `5555`

---

## 🚀 DAILY WORKFLOW

Setiap kali ingin jalankan sistem:

**Terminal 1:**
```
cd backend
npm run dev
```

**Terminal 2:**
```
ngrok http 4000
(Copy URL → Update configuration.ts jika berubah)
```

**Terminal 3:**
```
npm start
(Scan QR code di Expo Go)
```

**Estimasi waktu startup:** 1-2 menit setelah pertama kali setup

---

## ✅ FINAL CHECK

Jika semua checklist di atas sudah dicentang:

- [ ] **Backend:** Server running, no errors
- [ ] **Ngrok:** Tunnel active, URL valid
- [ ] **Mobile App:** Login berhasil, dashboard tampil
- [ ] **Database:** Connected, data tersimpan

**🎉 SISTEM SIAP DIGUNAKAN! 🎉**

---

## 📚 NEXT STEPS

Setelah semua running:

1. **Pelajari sistem:** Baca [PANDUAN-LENGKAP-SISTEM.md](PANDUAN-LENGKAP-SISTEM.md)
2. **Pahami code:** Baca [PENJELASAN-FILE-BY-FILE.md](PENJELASAN-FILE-BY-FILE.md)
3. **Test fitur:** Coba NFC payment, register card, dll
4. **Lihat dokumentasi:** Check [INDEX-DOKUMENTASI.md](INDEX-DOKUMENTASI.md)

---

**Jika ada error, cek:** [TUTORIAL-MENJALANKAN-SISTEM.md](TUTORIAL-MENJALANKAN-SISTEM.md) bagian "Troubleshooting"

**Print checklist ini untuk memudahkan setup!** 📋✨

**Last Updated:** April 22, 2026
