# NFC Payment App

Aplikasi pembayaran NFC sederhana yang dibangun menggunakan React Native Expo. Aplikasi ini memungkinkan pengguna untuk mengirim dan menerima uang menggunakan teknologi NFC antar device Android.

## 🚀 Fitur Utama

- ✅ **Autentikasi Pengguna**: Login dan Register dengan validasi
- 💰 **Dashboard**: Menampilkan nama pengguna dan saldo
- 💳 **NFC Payment**: Transfer uang antar device Android menggunakan NFC
- 📱 **Deteksi NFC**: Otomatis mendeteksi device Android lain yang memiliki NFC
- 📊 **Riwayat Transaksi**: Melihat history transaksi masuk dan keluar
- 🔐 **Logout**: Keluar dari aplikasi dengan aman
- 💾 **Database SQLite**: Penyimpanan data local dengan Prisma

## 🛠️ Teknologi yang Digunakan

- **React Native Expo** - Framework mobile development
- **TypeScript** - Type safety dan better development experience
- **React Navigation** - Navigasi antar screen
- **Prisma** - ORM untuk database management
- **SQLite** - Database local storage
- **React Native NFC Manager** - Library untuk fungsi NFC
- **AsyncStorage** - Persistent storage untuk session

## 📋 Prerequisites

- Node.js (v16 atau lebih baru)
- npm atau yarn
- Expo CLI
- Android device dengan NFC support
- Android Studio (untuk testing di emulator)

## 🚀 Instalasi dan Setup

### 1. Clone dan Install Dependencies

```bash
# Clone project (jika dari git repository)
git clone <repository-url>
cd nfc-payment-app

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Setup database
npx prisma db push
```

### 2. Setup Expo

```bash
# Install Expo CLI (jika belum ada)
npm install -g @expo/cli

# Login ke Expo (opsional)
expo login
```

### 3. Jalankan Aplikasi

```bash
# Start development server
npm start

# Atau langsung ke Android
npm run android
```

## 📱 Cara Penggunaan

### 1. Registrasi Akun Baru
- Buka aplikasi
- Tap "Belum punya akun? Daftar di sini"
- Isi form registrasi:
  - Nama Lengkap
  - Username (minimal 3 karakter, harus unik)
  - Password (minimal 6 karakter)
  - Konfirmasi Password
- Tap "Daftar"
- Setelah berhasil, akan diarahkan ke halaman login

### 2. Login
- Masukkan username dan password
- Tap "Masuk"
- Akan diarahkan ke dashboard

### 3. Dashboard
- Melihat nama pengguna dan saldo
- Saldo awal: Rp 100.000
- Tap "NFC Payment" untuk melakukan transaksi
- Melihat riwayat transaksi
- Tap "Keluar" untuk logout

### 4. NFC Payment

#### Untuk Mengirim Uang:
1. Masukkan jumlah uang yang ingin dikirim
2. Tap "Kirim Uang"
3. Device akan masuk mode scanning
4. Dekatkan device ke penerima yang sudah dalam mode "Terima Uang"
5. Transaksi akan otomatis diproses

#### Untuk Menerima Uang:
1. Tap "Terima Uang"
2. Device akan masuk mode scanning
3. Dekatkan device ke pengirim yang sudah dalam mode "Kirim Uang"
4. Transaksi akan otomatis diproses

### 5. Logout
- Dari dashboard, tap tombol "Keluar"
- Konfirmasi logout
- Akan kembali ke halaman login

## 🔧 Konfigurasi NFC

### Persyaratan NFC:
- Device Android dengan NFC support
- NFC harus diaktifkan di Settings
- Kedua device harus menjalankan aplikasi
- Jarak maksimal: ~4cm antar device

### Setup NFC di Android:
1. Buka Settings
2. Cari "NFC" atau "Wireless & Networks"
3. Aktifkan NFC
4. Pastikan Android Beam juga aktif (jika tersedia)

## 📊 Database Schema

### Tabel Users
```sql
id       INTEGER PRIMARY KEY
username TEXT UNIQUE
password TEXT
name     TEXT
balance  REAL DEFAULT 100000
createdAt DATETIME
updatedAt DATETIME
```

### Tabel Transactions
```sql
id         INTEGER PRIMARY KEY
amount     REAL
senderId   INTEGER
receiverId INTEGER
status     TEXT DEFAULT 'completed'
nfcId      TEXT
createdAt  DATETIME
```

## 🛠️ Development

### Menjalankan Database Commands

```bash
# Generate Prisma client
npm run generate

# Push schema changes
npm run db:push

# Open Prisma Studio
npm run db:studio
```

### Build untuk Production

```bash
# Build APK
expo build:android

# Atau untuk EAS Build
eas build --platform android
```

## 🔍 Debugging

### Common Issues:

1. **NFC tidak terdeteksi**
   - Pastikan NFC aktif di kedua device
   - Restart aplikasi
   - Coba jarak yang lebih dekat

2. **Database error**
   - Jalankan `npx prisma db push`
   - Hapus file `dev.db` dan jalankan ulang

3. **Aplikasi crash saat build**
   - Clear Expo cache: `expo start -c`
   - Reinstall node_modules: `rm -rf node_modules && npm install`

### Logs:
```bash
# Melihat logs Expo
expo start

# Android logs
adb logcat
```

## 📝 API Reference

### Database Functions

```typescript
// User Management
createUser(username: string, password: string, name: string)
loginUser(username: string, password: string)
getUserById(id: number)
updateUserBalance(userId: number, newBalance: number)

// Transactions
createTransaction(senderId: number, receiverId: number, amount: number, nfcId?: string)
getUserTransactions(userId: number)
```

### NFC Functions

```typescript
// NFC Service
NFCService.initNFC()
NFCService.checkNFCEnabled()
NFCService.startNFCScanning(onTagDetected, onError)
NFCService.stopNFCScanning()
NFCService.writeNFCData(data: NFCData)
NFCService.readNFCData()
```

## 🚧 Limitations

- Hanya untuk Android devices dengan NFC
- Tidak ada enkripsi password (untuk demo)
- Tidak ada server backend (data local saja)
- Transfer range terbatas (~4cm)
- Tidak ada validasi double-spending advanced

## 🔮 Future Enhancements

- [ ] Enkripsi password dengan bcrypt
- [ ] Server backend dengan sync
- [ ] iOS support (jika memungkinkan)
- [ ] QR Code fallback
- [ ] Push notifications
- [ ] Multi-currency support
- [ ] Transaction fees
- [ ] Account verification

## 📄 License

MIT License - silakan gunakan untuk keperluan pembelajaran dan development.

## 🤝 Contributing

1. Fork project
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📞 Support

Jika ada pertanyaan atau issue, silakan buat GitHub issue atau hubungi developer.

---

**Catatan**: Aplikasi ini dibuat untuk keperluan demo dan pembelajaran. Untuk production, diperlukan security enhancements dan testing yang lebih comprehensive.