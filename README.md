# 📱 NFC Payment App dengan AI Fraud Detection & Admin Monitoring

Aplikasi pembayaran NFC pintar yang dibangun menggunakan React Native Expo dengan sistem deteksi fraud AI dan monitoring admin real-time. Aplikasi ini memungkinkan pengguna untuk mengirim dan menerima uang menggunakan teknologi NFC antar device Android dengan keamanan tingkat tinggi.

## ⚡ QUICK START (Paling Mudah!)

### Windows:
```bash
# Double click file ini:
start-all.bat
```

### PowerShell:
```powershell
.\start-all.ps1
```

### Manual:
```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Expo (tunggu backend ready dulu!)
npm start
```

> ⚠️ **PENTING**: Backend HARUS jalan dulu sebelum membuka app di HP!

## 🔧 Troubleshooting Layar Putih

Jika app menampilkan **layar putih**, baca: [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md)

**Quick Fix:**
1. ✅ Pastikan backend running: `cd backend && npm start`
2. ✅ Test backend: `curl http://10.3.4.41:4000/api/health`
3. ✅ Reload app di HP (shake HP → Reload)

---

## 🚀 Fitur Utama

### 📱 **Aplikasi Mobile (Android)**
- ✅ **Autentikasi Pengguna**: Login dan Register dengan validasi keamanan
- 💰 **Dashboard Pintar**: Menampilkan saldo, status admin server, dan koneksi real-time
- 💳 **NFC Payment**: Transfer uang antar device Android menggunakan NFC/QR Code
- �️ **AI Fraud Detection**: Deteksi otomatis transaksi mencurigakan dengan 2 algoritma:
  - **Velocity Detection (70%)**: Deteksi transaksi cepat berturut-turut
  - **Amount Analysis (30%)**: Deteksi jumlah transaksi tidak normal
- 📊 **Riwayat Transaksi**: History lengkap dengan status fraud detection
- 🌐 **Auto-Connect Admin**: Otomatis mencari dan terhubung ke admin server
- 🔐 **Logout Aman**: Keluar dengan pembersihan session dan NFC resources

### 💻 **Admin Dashboard (Web)**
- 📊 **Real-time Monitoring**: Monitor semua pengguna dan transaksi live
- � **Fraud Alert System**: Notifikasi real-time untuk transaksi mencurigakan
- 👥 **User Management**: Kelola pengguna dan update saldo
- 📈 **Analytics Dashboard**: Statistik lengkap aplikasi dan fraud detection
- 🌐 **Multi-IP Support**: Auto-detect IP address untuk koneksi Android apps
- 🔒 **Secure Authentication**: Proteksi API dengan app secret key

## 🛠️ Teknologi yang Digunakan

### **Mobile App**
- **React Native Expo SDK 54** - Framework mobile development
- **TypeScript** - Type safety dan better development experience  
- **React Navigation** - Navigasi antar screen dengan TypeScript
- **SQLite + Expo-SQLite** - Database local storage
- **React Native NFC Manager** - Library untuk fungsi NFC
- **AsyncStorage** - Persistent storage untuk session dan cache

### **Admin Server**
- **Node.js + Express.js** - Backend server untuk admin dashboard
- **CORS** - Cross-origin resource sharing untuk web dashboard
- **Real-time Data Sync** - Sinkronisasi otomatis dengan mobile apps
- **IP Auto-Detection** - Deteksi otomatis IP address untuk multi-device

### **AI Fraud Detection**
- **Machine Learning-like Algorithms** - Algoritma deteksi fraud pintar
- **Behavioral Pattern Analysis** - Analisis pola perilaku pengguna
- **Risk Scoring System** - Sistem scoring risiko 0-100
- **Real-time Decision Making** - Keputusan ALLOW/REVIEW/BLOCK otomatis

## 🏗️ Arsitektur Sistem

```
📱 Android Apps (Multiple)
    ↕ ️(Auto-detect IP & Sync)
� Admin Server (laptop)
    ↕️ (Real-time monitoring)
🌐 Web Dashboard (Browser)
```

### **Data Flow:**
1. **Android Apps** → Auto-scan jaringan WiFi untuk admin server
2. **Mobile** → Kirim user data, transaksi, fraud alerts ke admin
3. **Admin** → Monitor real-time, update saldo, manage users
4. **Fraud AI** → Analisis setiap transaksi, buat alert jika perlu

## �📋 Prerequisites

- **Node.js** (v16 atau lebih baru)
- **npm atau yarn**
- **Expo CLI** (`npm install -g expo-cli`)
- **Android device** dengan NFC support
- **WiFi Network** yang sama untuk laptop admin dan Android devices
- **Android Studio** (optional, untuk testing di emulator)

## 🚀 Instalasi dan Setup

### 1. **Setup Mobile App**

```bash
# Clone project (jika dari git repository)
git clone <repository-url>
cd nfc-payment-app

# Install dependencies
npm install

# Start Expo development server
npx expo start --go

# Scan QR code dengan Expo Go app di Android
```

### 2. **Setup Admin Server**

```bash
# Buka terminal baru
cd admin

# Install admin dependencies  
npm install

# Start admin server
node simple-admin.js

# Buka browser: http://localhost:3001
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

### 🎯 **Setup Pertama Kali**

#### **1. Admin Server (Laptop)**
```bash
cd admin
node simple-admin.js
```
**Output yang diharapkan:**
```
🚀 Simple NFC Payment Admin started!
📊 Dashboard: http://localhost:3001

🌐 IP Address untuk Android Apps:
   📱 http://192.168.1.100:3001
   📱 http://10.31.104.205:3001

📋 Cara menggunakan:
   1. Pastikan laptop dan Android di WiFi yang sama
   2. Aplikasi akan otomatis mencari IP admin server
   3. Jika tidak ketemu, aplikasi tetap jalan mode offline
```

#### **2. Mobile App (Android)**
```bash
npx expo start --go
# Scan QR code dengan Expo Go app
```

### 👤 **Penggunaan Aplikasi Mobile**

#### **1. Registrasi Akun Baru**
- Buka aplikasi → Tap **"Belum punya akun? Daftar di sini"**
- Isi form registrasi:
  - **Nama Lengkap**: Nama asli pengguna
  - **Username**: Minimal 3 karakter, harus unik
  - **Password**: Minimal 6 karakter
  - **Konfirmasi Password**: Harus sama dengan password
- Tap **"Daftar"** → Otomatis login dan ke dashboard

#### **2. Login Pengguna**
- Masukkan **username** dan **password**
- Tap **"Masuk"** → Diarahkan ke dashboard

#### **3. Dashboard Utama**
- **Saldo**: Menampilkan saldo terkini (default Rp 10.000)
- **Status Admin Server**: 
  - 🟢 **Connected** - Terhubung ke admin (IP: xxx.xxx.xxx.xxx)
  - 🟡 **Connecting** - Sedang mencari admin server
  - 🔴 **Offline** - Mode offline (tidak ada admin)
- **NFC Payment**: Button untuk transaksi
- **Riwayat Transaksi**: History lengkap dengan fraud status

#### **4. Transaksi NFC/QR Payment**
- Tap **"💳 NFC Payment"**
- **Mode Kirim**:
  - Masukkan username penerima
  - Masukkan jumlah transfer
  - **AI Fraud Detection** akan analisis otomatis:
    - ✅ **LOW/MEDIUM**: Transaksi disetujui
    - ⚠️ **HIGH**: Perlu review (masih bisa lanjut)
    - ❌ **CRITICAL**: Transaksi diblok
- **Mode Terima**: Scan QR code atau tap device lain

### 💻 **Penggunaan Admin Dashboard**

#### **1. Akses Dashboard**
- Buka browser → **http://localhost:3001**
- Dashboard akan load otomatis (no login required)

#### **2. Monitoring Real-time**
- **System Security**: Status keamanan aplikasi
- **Total Users**: Jumlah pengguna terdaftar
- **Total Balance**: Total saldo semua pengguna
- **Online Devices**: Device yang aktif terhubung
- **Fraud Alerts**: Alert transaksi mencurigakan

#### **3. Fraud Monitoring**
- **Recent Fraud Alerts**: Daftar transaksi dengan risk tinggi
- **Alert Levels**:
  - 🟡 **MEDIUM** (31-60): Normal tapi perlu perhatian
  - 🟠 **HIGH** (61-80): Mencurigakan, perlu review
  - 🔴 **CRITICAL** (81-100): Sangat mencurigakan, auto-block

#### **4. User Management**
- **User List**: Daftar semua pengguna dengan saldo
- **Transaction History**: History transaksi semua pengguna
- **Balance Management**: Update saldo pengguna (fitur admin)

### 🤖 **Sistem AI Fraud Detection**

#### **Algoritma Detection (2 Jenis)**

**1. Velocity Detection (70% weight)**
- Deteksi transaksi cepat berturut-turut
- **Threshold**: Max 3 transaksi per menit
- **Risk Calculation**: Jumlah transaksi / threshold
- **Example**: 5 transaksi dalam 1 menit = Risk 166% = CRITICAL

**2. Amount Analysis (30% weight)**
- Deteksi jumlah transaksi tidak normal vs pola user
- **Baseline**: Rata-rata transaksi user historis
- **Risk Factors**:
  - 2x rata-rata = Risk 30%
  - 3x rata-rata = Risk 50% 
  - 5x rata-rata = Risk 80%

#### **Risk Scoring & Decision**
```
Risk Score 0-30:   LOW (✅ Allow)
Risk Score 31-60:  MEDIUM (✅ Allow + Log)
Risk Score 61-80:  HIGH (⚠️ Review + Alert)
Risk Score 81-100: CRITICAL (❌ Block + Alert)
```

### 🔄 **Auto-Sync System**

#### **Mobile → Admin Sync (setiap 30 detik)**
- User data (nama, username, saldo)
- Transaction history (10 transaksi terbaru)
- Fraud detection results
- Device information

#### **Admin → Mobile Sync**
- Balance updates dari admin
- Security alerts
- System messages

## 🌐 **Network & Connectivity**

### **WiFi Requirements**
- **Laptop admin** dan **Android devices** harus di **WiFi yang sama**
- **Port 3001** terbuka untuk admin server
- **Port 8081** terbuka untuk Expo development

### **IP Auto-Detection**
Aplikasi Android akan otomatis scan 66+ kemungkinan IP:
```
192.168.1.1-255   (WiFi rumah)
192.168.0.1-255   (WiFi kantor)  
10.0.0.1-255      (Kampus/korporat)
172.16.0.1-255    (Enterprise)
```

### **Connection Status**
- **🟢 Connected**: Data sync active, fraud monitoring on
- **🟡 Connecting**: Scanning for admin server
- **🔴 Offline**: No admin found, app works locally

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
## ❓ FAQ & Production Deployment

### 🏗️ **Apakah data pengguna akan ada di admin dashboard saat build APK?**
**✅ YA! Data akan tetap tersedia dan tersinkronisasi ke admin dashboard.**

**Mengapa data aman?**
1. **Local SQLite Database**: Semua data (users, transaksi, saldo) disimpan lokal yang persisten setelah build APK
2. **Auto-Detect IP System**: Aplikasi otomatis mencari admin server di 200+ kemungkinan IP address
3. **Smart Connectivity**: Sistem menyimpan IP server yang berhasil untuk koneksi future
4. **Background Monitoring**: AdminConnector terus monitor dan maintain koneksi ke admin server

### 🌐 **Solusi IP Connectivity untuk Production APK**

**Problem**: Development IP (contoh: 10.31.104.205) tidak akan tersedia di production APK.

**Solution**: Auto-detect system yang scan jaringan WiFi:

```typescript
// System otomatis scan IP ranges:
192.168.1.x     // WiFi rumah umum
192.168.0.x     // Router default  
10.x.x.x        // WiFi kampus/kantor
172.16.x.x      // Enterprise network
192.168.43.x    // Mobile hotspot
// + 60 variasi IP router umum
```

**Cara kerja di APK**:
1. **First Launch**: App scan 200+ IP untuk cari admin server
2. **Found Admin**: Save IP ke AsyncStorage untuk next time
3. **Connection Lost**: Auto-reconnect dan scan ulang
4. **Background Monitor**: Check koneksi setiap 30 detik
5. **Smart Caching**: Prioritas IP yang pernah berhasil

### 🔧 **Setup untuk Production APK**

#### **1. Admin Server Setup**
```bash
# Di laptop/server admin:
cd admin
node simple-admin.js

# Server akan show semua IP yang bisa diakses:
📱 http://192.168.1.100:3001
📱 http://10.0.0.50:3001
```

#### **2. Build APK dengan Auto-Detect**
```bash
# Build production APK:
expo build:android
# atau
eas build --platform android

# APK akan include auto-detect system
# Tidak perlu config manual IP address
```

#### **3. Testing Connectivity**
- **Dashboard Android**: Check "Status Admin Server" card
- **Force Reconnect**: Tap 🔄 button jika perlu
- **Admin Dashboard**: Akan show device connect real-time

### 📱 **Monitoring Connection Status**

Di aplikasi Android akan tampil:
- ✅ **Terhubung**: Data real-time sync ke admin  
- 🔄 **Mencari**: Sedang scan network untuk admin
- ❌ **Offline**: Mode lokal, data cached untuk sync nanti

### **❌ Admin Server Tidak Terdeteksi**

**Problem**: Dashboard mobile menunjukkan "Tidak terhubung (mode offline)"

**Solutions**:
1. **Cek WiFi**: Pastikan laptop dan Android di WiFi yang sama
   ```bash
   # Di laptop (Windows)
   ipconfig
   
   # Cari IP WiFi adapter, contoh: 192.168.1.100
   ```

2. **Restart Admin Server**:
   ```bash
   cd admin
   node simple-admin.js
   
   # Lihat IP yang ditampilkan:
   # 📱 http://192.168.1.100:3001
   ```

3. **Manual IP Test**: Test IP admin dari Android browser
   - Buka browser di Android
   - Akses: `http://[IP-LAPTOP]:3001`
   - Jika gagal = masalah firewall/network

4. **Firewall Check**: 
   - Windows: Allow Node.js di Windows Firewall
   - Router: Pastikan port 3001 tidak diblock

### **📱 NFC Tidak Bekerja**

**Problem**: "NFC not supported" atau tidak bisa scan

**Solutions**:
1. **Enable NFC di Android**:
   - Settings → Connected devices → NFC → ON
   - Settings → More → NFC → ON

2. **Expo Go Limitation**: 
   - NFC tidak berfungsi di Expo Go
   - Gunakan mode manual: QR Code payment
   - Untuk NFC penuh: build APK dengan EAS

3. **Alternative Payment**: Gunakan username transfer
   - Input username penerima manual
   - Tidak perlu NFC/QR scan

### **🚨 Fraud Detection Error**

**Problem**: Fraud system tidak berfungsi atau error

**Solutions**:
1. **Check Logs**: Lihat Expo console untuk error fraud detection
2. **Reset Fraud Data**:
   ```javascript
   // Di aplikasi, clear AsyncStorage
   AsyncStorage.clear();
   ```
3. **Manual Override**: Transaksi tetap bisa dilakukan meski fraud detection error

### **💾 Database Issues**

**Problem**: Data hilang atau error database

**Solutions**:
1. **Reset Database**:
   ```bash
   # Hapus database file
   rm -rf .expo/
   
   # Restart Expo
   npx expo start --clear
   ```

2. **Check SQLite**: Database otomatis dibuat di first run
3. **Demo Data**: Aplikasi auto-create demo users jika database kosong

### **🌐 Network Issues**

**Problem**: Aplikasi tidak bisa connect ke admin/internet

**Solutions**:
1. **Offline Mode**: Aplikasi tetap berfungsi tanpa admin
2. **WiFi Check**: Pastikan Android dapat akses internet
3. **Proxy/VPN**: Disable proxy/VPN yang mungkin interfere

## 📊 **Database Schema & Structure**

### **📱 Mobile Database (SQLite)**

#### **Table: users**
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  balance REAL DEFAULT 10000,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);
```

#### **Table: transactions**
```sql
CREATE TABLE transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  senderId INTEGER NOT NULL,
  receiverId INTEGER NOT NULL,
  amount REAL NOT NULL,
  type TEXT DEFAULT 'transfer',
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (senderId) REFERENCES users (id),
  FOREIGN KEY (receiverId) REFERENCES users (id)
);
```

### **💻 Admin Server Data (In-Memory)**

#### **Device Data**
```javascript
{
  deviceId: "device_123456789",
  users: [
    {
      id: 1,
      username: "user1", 
      name: "John Doe",
      balance: 75000,
      createdAt: "2025-11-05T10:00:00Z"
    }
  ],
  recentTransactions: [...],
  stats: {
    totalUsers: 5,
    totalTransactions: 25,
    totalBalance: 500000,
    lastSyncAt: "2025-11-05T10:30:00Z"
  }
}
```

#### **Fraud Alert Data**
```javascript
{
  id: "fraud_1730897654_123", 
  userId: 1,
  riskScore: 85,
  riskLevel: "CRITICAL",
  reason: "Multiple rapid transactions detected",
  timestamp: "2025-11-05T10:15:00Z",
  status: "NEW"
}
```

## 🔐 **Security Features**

### **App Authentication**
- **Secret Key**: `NFC2025SecureApp` untuk API authentication
- **Request Validation**: Cek user-agent dan app key
- **IP Filtering**: Only accept dari aplikasi mobile resmi

### **Data Protection**  
- **Password**: Disimpan plain text (demo purposes)
- **API Endpoints**: Protected dengan app secret
- **Local Storage**: SQLite database dengan encryption planning

### **Fraud Protection**
- **Real-time Analysis**: Setiap transaksi dianalisis AI
- **Behavioral Learning**: System belajar pola user
- **Risk Scoring**: 0-100 scoring dengan threshold blocking
- **Admin Alerts**: Real-time notification untuk admin

## 📈 **Performance & Scalability**

### **Mobile App**
- **Database**: SQLite untuk performance optimal
- **Caching**: AsyncStorage untuk network data
- **Background Sync**: 30 detik interval untuk efficiency
- **Memory Management**: Auto cleanup NFC resources

### **Admin Server**
- **In-Memory Storage**: Fast access untuk real-time data
- **Connection Pooling**: Multiple device connections
- **Data Cleanup**: Auto cleanup old fraud alerts
- **Scalability**: Dapat handle 50+ concurrent devices

### **Network Optimization**
- **Auto-retry**: Multiple IP attempts dengan smart priority
- **Timeout Handling**: 5 detik timeout per request
- **Offline Capability**: Full app functionality tanpa admin
- **Data Compression**: Optimized JSON payloads

## 🚀 **Production Deployment**

### **Build APK untuk Production**
```bash
# Install EAS CLI
npm install -g @expo/eas-cli

# Login ke Expo
eas login

# Configure build
eas build:configure

# Build APK untuk Android
eas build --platform android --profile preview
```

### **Admin Server Production**
```bash
# Install PM2 for process management
npm install -g pm2

# Start admin server with PM2
pm2 start admin/simple-admin.js --name "nfc-admin"

# Setup auto-restart
pm2 startup
pm2 save
```

### **Network Configuration**
- **Static IP**: Configure static IP untuk admin server
- **Port Forwarding**: Setup router untuk external access
- **SSL/HTTPS**: Add SSL certificate untuk production
- **Domain**: Configure domain name untuk professional setup
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
## 📝 **API Reference & Documentation**

### **🔌 Admin Server API Endpoints**

#### **POST /api/sync-device**
Sync device data dengan admin server
```javascript
// Request Headers
{
  "Content-Type": "application/json",
  "x-app-key": "NFC2025SecureApp",
  "user-agent": "okhttp/4.9.1"
}

// Request Body
{
  "device": {
    "deviceId": "device_123456789",
    "deviceName": "Android Device",
    "appVersion": "1.0.0",
    "platform": "android"
  },
  "users": [...],
  "recentTransactions": [...],
  "stats": {...}
}

// Response
{
  "success": true,
  "message": "Device synced successfully",
  "balanceUpdates": [],
  "timestamp": "2025-11-05T10:30:00Z"
}
```

#### **POST /api/fraud-alert**
Report fraud alert ke admin
```javascript
// Request Body
{
  "userId": 1,
  "transactionId": "tx_123",
  "riskScore": 85,
  "riskLevel": "CRITICAL",
  "reason": "Multiple rapid transactions",
  "timestamp": "2025-11-05T10:15:00Z"
}
```

#### **GET /api/fraud-alerts**
Ambil daftar fraud alerts untuk dashboard
```javascript
// Response
{
  "success": true,
  "alerts": [...],
  "stats": {
    "totalAlerts": 5,
    "criticalAlerts": 1,
    "highAlerts": 2,
    "mediumAlerts": 2
  }
}
```

### **📱 Mobile Database Functions**

#### **User Management**
```typescript
// Create new user
registerUser(username: string, password: string, name: string): Promise<User | null>

// Authenticate user
loginUser(username: string, password: string): Promise<User | null>

// Get user by ID
getUserById(id: number): Promise<User | null>

// Update user balance
updateUserBalance(userId: number, newBalance: number): Promise<boolean>

// Get all users
getAllUsers(): Promise<User[]>
```

#### **Transaction Management**
```typescript
// Process payment dengan fraud detection
processPayment(
  senderId: number, 
  receiverId: number, 
  amount: number
): Promise<{ success: boolean; transaction?: Transaction; fraudResult?: FraudDetectionResult }>

// Get user transactions
getUserTransactions(userId: number): Promise<Transaction[]>

// Create transaction record
createTransaction(
  senderId: number, 
  receiverId: number, 
  amount: number, 
  type?: string
): Promise<Transaction | null>
```

#### **Fraud Detection**
```typescript
// Main fraud detection
detectFraud(context: TransactionContext): Promise<FraudDetectionResult>

// Get device ID
getDeviceId(): Promise<string>

// Get fraud alerts
getFraudAlerts(): Promise<FraudAlert[]>
```

### **🤖 Fraud Detection Types**

#### **TransactionContext**
```typescript
interface TransactionContext {
  senderId: number;
  receiverId: number;
  amount: number;
  timestamp: Date;
  deviceId: string;
  userAgent?: string;
  ipAddress?: string;
}
```

#### **FraudDetectionResult**
```typescript
interface FraudDetectionResult {
  overallRiskScore: number;    // 0-100
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  decision: 'ALLOW' | 'REVIEW' | 'BLOCK';
  riskFactors: {
    velocityRisk: number;      // 0-1
    amountRisk: number;        // 0-1
  };
  reasons: string[];
  confidence: number;          // 0-1
  timestamp: Date;
}
```

## 🎯 **Development Roadmap**

### **📋 Current Features (v1.0)**
- ✅ Basic NFC/QR payment system
- ✅ User authentication & management
- ✅ SQLite local database
- ✅ Admin dashboard dengan real-time monitoring
- ✅ AI fraud detection (2 algorithms)
- ✅ Auto-detect admin server IP
- ✅ Offline-first architecture

### **🚀 Planned Features (v2.0)**
- 🔄 **Enhanced NFC**: Support untuk payment cards emulation
- 🔐 **Advanced Security**: End-to-end encryption, secure password hashing
- 📊 **Advanced Analytics**: Machine learning fraud detection dengan 6+ algorithms
- 🌐 **Cloud Sync**: Firebase/AWS backend untuk multi-device sync
- 💱 **Multi-Currency**: Support untuk berbagai mata uang
- 📱 **iOS Support**: React Native iOS dengan Apple Pay integration
- 🔔 **Push Notifications**: Real-time notifications untuk transactions
- 🏪 **Merchant Mode**: QR code generator untuk merchant payments

### **🎨 Future Enhancements (v3.0)**
- 🤝 **P2P Lending**: User-to-user lending dengan interest calculation
- � **Loyalty Points**: Reward system untuk frequent users
- 📈 **Investment Features**: Simple investment options
- 🏛️ **Bank Integration**: Connect dengan real bank accounts
- 🌍 **Multi-Language**: Internationalization support
- 📊 **Business Dashboard**: Advanced analytics untuk business users

## 👥 **Contributing & Development**

### **📋 Development Guidelines**
1. **Code Style**: Follow TypeScript dan React Native best practices
2. **Commits**: Use conventional commits format
3. **Testing**: Add unit tests untuk new features
4. **Documentation**: Update README untuk setiap perubahan besar

### **🔧 Development Setup**
```bash
# Fork repository
git clone https://github.com/yourusername/nfc-payment-app
cd nfc-payment-app

# Create feature branch
git checkout -b feature/new-feature

# Make changes dan test
npm test

# Commit changes
git commit -m "feat: add new payment feature"

# Push and create PR
git push origin feature/new-feature
```

### **🧪 Testing Guidelines**
```bash
# Run unit tests
npm test

# Run integration tests  
npm run test:integration

# Test di Android emulator
npm run android

# Test di real device
expo start --android
```

## 📞 **Support & Contact**

### **🐛 Bug Reports**
Jika menemukan bug atau issue:
1. **Check existing issues** di GitHub
2. **Create new issue** dengan detail:
   - Device information (Android version, model)
   - Steps to reproduce
   - Screenshots/logs jika memungkinkan
   - Expected vs actual behavior

### **💡 Feature Requests**
Untuk request fitur baru:
1. **Search existing requests** dulu
2. **Create detailed proposal** dengan:
   - Use case dan problem yang dipecahkan
   - Proposed solution
   - Alternative solutions yang dipertimbangkan

### **📧 Contact Information**
- **Developer**: [Your Name]
- **Email**: [your.email@example.com]
- **GitHub**: [https://github.com/yourusername](https://github.com/yourusername)
- **LinkedIn**: [Your LinkedIn Profile]

### **🤝 Community**
- **Discord**: [Join our Discord server](https://discord.gg/your-server)
- **Telegram**: [Join Telegram group](https://t.me/your-group)
- **Forum**: [Developer Forum](https://your-forum.com)

## 📄 **License & Legal**

### **📜 MIT License**
```
MIT License

Copyright (c) 2025 NFC Payment App

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### **⚖️ Legal Disclaimers**
- **Demo Purpose**: Aplikasi ini untuk educational/demo purposes
- **Not Production Ready**: Tidak direkomendasikan untuk real money transactions
- **Security**: Password masih plain text, tidak suitable untuk production
- **Compliance**: Belum comply dengan financial regulations (PCI DSS, etc.)
- **Liability**: Developer tidak bertanggung jawab atas kehilangan data/money

### **🔒 Privacy Policy**
- **Data Collection**: App hanya collect data yang diperlukan untuk functionality
- **Data Storage**: Semua data disimpan local di device (SQLite)
- **Data Sharing**: Tidak ada data sharing ke third parties
- **Admin Monitoring**: Admin hanya bisa monitor data yang di-sync oleh user

---

## 🎉 **Acknowledgments**

### **📚 Technologies & Libraries**
- **Expo Team** - Amazing React Native framework
- **React Native Community** - Comprehensive mobile development tools
- **SQLite Team** - Reliable local database solution
- **Node.js & Express** - Powerful backend framework
- **TypeScript Team** - Type safety untuk better development

### **💡 Inspiration**
- **Modern Payment Apps** - UX/UI inspiration dari apps seperti GoPay, OVO
- **Security Best Practices** - Fraud detection techniques dari fintech industry
- **Open Source Community** - Contribution dan feedback dari developers worldwide

### **🌟 Special Thanks**
- **Beta Testers** - Early adopters yang membantu testing dan feedback
- **Contributors** - Developer yang berkontribusi pada codebase
- **Community** - Users yang memberikan feature requests dan bug reports

---

**📱 Happy Coding & Secure Payments! 🔐✨**

---

*Last updated: November 6, 2025*
*Version: 1.0.0*
*Documentation: Complete*

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

---

## 🚨 **Troubleshooting Production Issues**

#### **Issue: APK tidak connect ke admin setelah build**
**Solutions**:
1. **Check WiFi Network**: Pastikan Android dan admin server di WiFi sama
2. **Restart Admin Server**: Tutup dan jalankan ulang `node simple-admin.js`
3. **Force Reconnect**: Di app Android, tap tombol 🔄 di Status Admin Server
4. **Check Firewall**: Disable firewall laptop sementara untuk testing
5. **Manual IP Check**: 
   ```bash
   # Cek IP laptop:
   ipconfig
   # Pastikan admin server running di IP yang benar
   ```

#### **Issue: Data tidak sync ke admin dashboard**
**Solutions**:
1. **Check Connection Status**: Pastikan status "Terhubung" di app Android
2. **Refresh Dashboard**: Reload browser admin dashboard (F5)
3. **Check Admin Logs**: Lihat console admin server untuk error messages
4. **Background Sync**: Wait 30 detik, system auto-retry sync

#### **Issue: QR Expo tidak bisa dibuka**
**Solutions**:
1. Install Expo Go app dari Play Store
2. Pastikan phone dan laptop di WiFi sama
3. Scan QR dengan Expo Go app, bukan camera biasa
4. Alternative: Manual connect dengan `exp://IP:19000`

### 💡 **Best Practices untuk Production**

1. **Network Setup**:
   - Gunakan WiFi stabil untuk admin server
   - Avoid hotspot mobile untuk admin (IP sering berubah)
   - Consider static IP untuk admin server jika memungkinkan

2. **Monitoring**:
   - Check admin dashboard regular untuk device connections
   - Monitor fraud alerts untuk security
   - Backup SQLite database periodic jika perlu

3. **User Education**:
   - Inform users untuk connect WiFi yang sama dengan admin
   - Guidance untuk troubleshoot connectivity issues
   - Fallback: App tetap jalan offline mode jika admin tidak tersedia

### 🎯 **Production Deployment Checklist**

- [ ] Admin server running dan accessible via network
- [ ] Build APK dengan auto-detect system enabled  
- [ ] Test connectivity di real devices (bukan emulator)
- [ ] Verify data sync dari app ke admin dashboard
- [ ] Test fraud detection dengan real transactions
- [ ] Setup monitoring untuk admin server uptime
- [ ] Document network requirements untuk end users

### ❓ **Common Production Questions**

**Q: Apakah perlu internet untuk app bekerja?**
A: Tidak! App bekerja full offline. Internet hanya untuk sync ke admin server.

**Q: Bisa pakai mobile hotspot untuk admin server?**  
A: Bisa, tapi IP akan sering berubah. WiFi router lebih stabil.

**Q: Fraud detection masih jalan tanpa admin server?**
A: Ya! Fraud detection jalan lokal di device, hasil sync ke admin kalau connect.

**Q: Data hilang kalau uninstall app?**
A: Ya, data SQLite lokal akan hilang. Consider backup mechanism jika perlu.

---

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