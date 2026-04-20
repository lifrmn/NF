# 📦 Admin Package Documentation

## Package.json - Konfigurasi NPM

File `package.json` adalah konfigurasi proyek Node.js untuk admin dashboard. Berisi informasi proyek, dependencies, dan scripts untuk menjalankan aplikasi.

---

## 📋 Identitas Proyek

```json
{
  "name": "nfc-payment-admin",
  "version": "1.0.0",
  "description": "Admin dashboard untuk NFC Payment App",
  "main": "simple-admin.js"
}
```

- **name**: `nfc-payment-admin` - Nama package (digunakan di npm registry jika dipublish)
- **version**: `1.0.0` - Versi aplikasi admin (semantic versioning: major.minor.patch)
- **description**: Deskripsi singkat fungsi aplikasi
- **main**: `simple-admin.js` - File utama yang dijalankan saat aplikasi start

---

## 🚀 Scripts - Perintah yang Bisa Dijalankan

Cara pakai: `npm run <nama-script>` atau `npm start`

| Script | Command | Keterangan |
|--------|---------|------------|
| `start` | `node simple-admin.js` | Script default: jalankan admin server (`npm start`) |
| `admin` | `node simple-admin.js` | Script alternatif untuk start admin server (`npm run admin`) |
| `monitor` | `node monitor-database.js` | Script untuk monitoring database real-time (`npm run monitor`) - **BELUM ADA FILE INI** |
| `backup` | `node backup-database.js` | Script untuk backup database (`npm run backup`) - **BELUM ADA FILE INI** |

---

## 📦 Dependencies - Production

Package yang diperlukan untuk menjalankan aplikasi. Install dengan: `npm install`

Package ini **wajib ada di production**.

| Package | Version | Keterangan |
|---------|---------|------------|
| `@types/crypto-js` | ^4.2.2 | TypeScript type definitions untuk crypto-js (untuk enkripsi data sensitif) |
| `cors` | ^2.8.5 | Middleware untuk mengaktifkan CORS (Cross-Origin Resource Sharing) - agar HP bisa akses server |
| `crypto-js` | ^4.2.0 | Library enkripsi untuk keamanan data (encrypt password, token, dll) |
| `express` | ^4.18.2 | Web framework untuk membuat REST API dan serve dashboard HTML |
| `fs-extra` | ^11.1.1 | Extended file system operations (read/write file dengan fitur extra) |
| `helmet` | ^7.1.0 | Security middleware untuk protect dari serangan web (XSS, clickjacking, dll) |
| `node-fetch` | ^3.3.2 | Library untuk HTTP request (seperti fetch di browser) - untuk komunikasi dengan backend |
| `sqlite3` | ^5.1.6 | Database SQLite untuk menyimpan data lokal (**TIDAK DIGUNAKAN SAAT INI** - data di backend Prisma) |

---

## 🛠️ Dev Dependencies - Development Only

Package yang hanya diperlukan saat development. Install dengan: `npm install --dev` atau `npm install`

Package ini **tidak diperlukan di production**.

| Package | Version | Keterangan |
|---------|---------|------------|
| `@types/node` | ^20.8.0 | TypeScript type definitions untuk Node.js API (untuk autocomplete & type checking) |

---

## 📥 Catatan Instalasi

1. **Pertama kali clone project**: 
   ```bash
   npm install
   ```
   Install semua dependencies

2. **Update packages**: 
   ```bash
   npm update
   ```
   Update ke versi terbaru sesuai range `^`

3. **Cek outdated packages**: 
   ```bash
   npm outdated
   ```

---

## 🔢 Catatan Versioning (^)

**Format**: `^4.18.2`

- ✅ **Allow updates**: 4.18.2, 4.19.0, 4.20.0, etc
- ❌ **Tidak boleh**: 5.0.0 (major version change)

**Artinya**: Update minor & patch OK, tapi tidak update major version

### Semantic Versioning (semver)

```
MAJOR.MINOR.PATCH
  ^     ^     ^
  |     |     └─── Bug fixes (4.18.2 → 4.18.3)
  |     └───────── New features, backward compatible (4.18.x → 4.19.0)
  └─────────────── Breaking changes (4.x.x → 5.0.0)
```

---

## 🏃 Cara Menjalankan

### Step 1: Install Dependencies
```bash
cd admin
npm install
```

### Step 2: Start Admin Server
```bash
npm start
```
atau
```bash
npm run admin
```

Server akan jalan di port **3000**

### Step 3: Buka Browser
```
http://localhost:3000
```

Dashboard akan terbuka otomatis.

---

## 📁 Struktur File Admin

```
admin/
├── package.json              # NPM configuration (this file's config)
├── package-lock.json         # Locked dependency versions
├── simple-admin.js           # Main admin server (Express.js)
├── simple-dashboard.html     # Web dashboard UI
├── node_modules/             # Installed packages (auto-generated)
└── README-ADMIN.md          # This documentation file
```

---

## 🔗 Related Files

- **Backend Server**: `backend/server.js` - Main API server (port 4000)
- **Mobile App**: `src/` folder - React Native mobile application
- **Database**: `backend/prisma/` - Prisma ORM schema

---

## 🐛 Troubleshooting

### Error: "Cannot find module 'express'"
```bash
npm install
```

### Error: "Port 3000 already in use"
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID_NUMBER> /F

# Linux/Mac
lsof -ti:3000 | xargs kill
```

### Error: "CORS blocked"
Pastikan `cors` package sudah installed dan configured di `simple-admin.js`

---

## 📝 Notes

- **JSON tidak support comments**: File `package.json` tidak boleh ada comment `//` karena JSON standard tidak support comments
- **Documentation** ada di file ini (`README-ADMIN.md`)
- **Production ready**: Sudah include security (helmet, CORS, password validation)

---

## 📞 Support

Jika ada masalah, cek:
1. File `simple-admin.js` untuk konfigurasi server
2. File `simple-dashboard.html` untuk dokumentasi UI
3. Logs di console saat server running
