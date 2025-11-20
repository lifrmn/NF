# 📋 DOKUMENTASI LENGKAP SISTEM NFC PAYMENT - SKRIPSI

## 🎯 OVERVIEW SISTEM

### **Judul Sistem**: Aplikasi Pembayaran NFC dengan AI Fraud Detection
### **Platform**: React Native (Mobile) + Node.js (Backend) + Admin Dashboard
### **Database**: SQLite dengan Prisma ORM
### **AI Algorithm**: Z-Score Based Anomaly Detection untuk fraud detection

---

## 🏗️ ARSITEKTUR SISTEM

### **1. Mobile App (React Native Expo)**
- **File Utama**: `App.tsx`, `src/screens/*.tsx`, `src/components/*.tsx`
- **Fungsi**: Interface pengguna untuk transaksi NFC, login, register, dashboard
- **Teknologi**: React Native SDK 54, TypeScript, NFC communication

### **2. Backend Server (Node.js)**
- **File Utama**: `backend/server.js`, `backend/routes/*.js`
- **Port**: 4000
- **Fungsi**: API endpoints, database management, authentication
- **Database**: SQLite dengan Prisma ORM

### **3. Admin Dashboard (HTML/CSS/JS)**
- **File Utama**: `admin/simple-dashboard.html`, `admin/simple-admin.js`
- **Port**: 3001
- **Fungsi**: Monitoring pengguna, transaksi, fraud detection, kontrol sistem

### **4. AI Fraud Detection**
- **File Utama**: `src/utils/fraudDetection.ts`
- **Algorithm**: Z-Score Based Anomaly Detection dengan Poisson Distribution
- **Fungsi**: Real-time detection transaksi mencurigakan

---

## 🔐 FITUR KEAMANAN

### **1. Authentication System**
- JWT Token authentication
- App key validation (`NFC2025SecureApp`)
- Admin password protection (`admin123`)
- Device registration dan validation

### **2. Fraud Detection Algorithm**
```typescript
// Z-Score Based Anomaly Detection
const zScore = (value - mean) / standardDeviation;
const isAnomaly = Math.abs(zScore) > threshold;

// Poisson Distribution untuk frequency analysis
const poissonProbability = (k, lambda) => (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
```

### **3. Data Protection**
- Input validation dan sanitization
- Rate limiting untuk API endpoints
- CORS protection
- Helmet security headers

---

## 📊 DATABASE SCHEMA

### **User Model**
```sql
- id: Integer (Primary Key)
- name: String
- username: String (Unique)
- password: String (Hashed)
- balance: BigInt (Saldo dalam satuan terkecil)
- isActive: Boolean
- createdAt: DateTime
- updatedAt: DateTime
- deviceId: String (nullable)
```

### **Transaction Model**
```sql
- id: Integer (Primary Key) 
- senderId: Integer (Foreign Key → User)
- receiverId: Integer (Foreign Key → User)
- amount: BigInt
- type: String (TRANSFER/TOPUP/PAYMENT)
- status: String (PENDING/COMPLETED/FAILED)
- description: String
- createdAt: DateTime
- metadata: JSON (optional)
```

### **Device Model**
```sql
- id: String (Primary Key)
- name: String
- type: String
- isActive: Boolean
- lastSeen: DateTime
- createdAt: DateTime
```

### **FraudAlert Model**
```sql
- id: Integer (Primary Key)
- transactionId: Integer (Foreign Key → Transaction)
- riskScore: Double
- riskLevel: String (LOW/MEDIUM/HIGH/CRITICAL)
- reasons: String (JSON array)
- isResolved: Boolean
- createdAt: DateTime
```

---

## 🚀 CARA MENJALANKAN SISTEM

### **Setup Environment**
```powershell
# 1. Install Dependencies
cd backend
npm install

cd ../admin  
npm install node-fetch

# 2. Setup Database
cd ../backend
npx prisma generate
npx prisma db push

# 3. Start Servers
# Terminal 1 - Backend
cd backend
node server.js

# Terminal 2 - Admin
cd admin
node simple-admin.js

# 4. Start Mobile App
npx expo start
```

### **Network Configuration**
```javascript
// app.json - Mobile app configuration
"EXPO_PUBLIC_API_BASE": "http://192.168.137.1:4000"

// Backend server - Multiple IP support
Server bind: http://0.0.0.0:4000
Test URLs:
- http://192.168.137.1:4000 (Hotspot)
- http://10.20.30.149:4000 (WiFi)
- http://localhost:4000 (Local)
```

---

## 🧪 TESTING SISTEM

### **1. Unit Testing**
- API endpoint testing dengan curl/Postman
- Database connection testing
- Authentication flow testing

### **2. Integration Testing** 
- Mobile app ↔ Backend communication
- Admin dashboard ↔ Backend sync
- Real-time fraud detection testing

### **3. User Acceptance Testing**
- End-to-end transaction flow
- UI/UX responsiveness
- Error handling scenarios

---

## 📈 PERFORMANCE METRICS

### **Response Time Targets**
- API endpoints: < 500ms
- Database queries: < 100ms
- Fraud detection: < 200ms
- Mobile app loading: < 3s

### **Scalability**
- Concurrent users: 100+
- Transactions per second: 50+
- Database size: Up to 1GB
- Memory usage: < 512MB

---

## 🔍 AI FRAUD DETECTION DETAILS

### **Algorithm Implementation**
```typescript
class FraudDetectionAI {
  // 1. Statistical Analysis
  calculateZScore(value: number, dataset: number[]): number
  
  // 2. Pattern Recognition
  detectAnomalousPatterns(transactions: Transaction[]): boolean
  
  // 3. Risk Scoring
  calculateRiskScore(transaction: Transaction): number
  
  // 4. Real-time Monitoring
  monitorTransaction(transaction: Transaction): FraudResult
}
```

### **Detection Rules**
1. **Amount Anomaly**: Transaksi dengan jumlah tidak wajar
2. **Frequency Anomaly**: Terlalu banyak transaksi dalam waktu singkat
3. **Pattern Anomaly**: Pola transaksi mencurigakan
4. **Behavioral Anomaly**: Perubahan perilaku user yang ekstrem

### **Risk Levels**
- **LOW** (0-25): Normal transaction
- **MEDIUM** (26-50): Requires attention
- **HIGH** (51-75): Needs verification
- **CRITICAL** (76-100): Block transaction

---

## 📱 USER INTERFACE

### **Mobile App Screens**
1. **Login Screen**: Authentication pengguna
2. **Register Screen**: Registrasi user baru
3. **Dashboard Screen**: Overview saldo dan aktivitas
4. **NFC Screen**: Interface untuk transaksi NFC
5. **Transaction History**: Riwayat transaksi

### **Admin Dashboard Sections**
1. **Real-time Activity Log**: Monitoring aktivitas sistem
2. **User Management**: CRUD operations untuk pengguna
3. **Transaction Monitoring**: Oversight transaksi
4. **Fraud Detection Panel**: Alert dan analisis fraud
5. **System Controls**: Quick actions untuk admin

---

## 🛠️ TROUBLESHOOTING GUIDE

### **Common Issues**

**1. Connection Error**
```
ERROR: Backend not connected
SOLUTION: 
- Check IP configuration
- Restart backend server
- Verify network connectivity
```

**2. Authentication Failed** 
```
ERROR: Invalid or expired token
SOLUTION:
- Clear app cache
- Login ulang
- Check token expiry
```

**3. Database Error**
```
ERROR: Prisma connection failed
SOLUTION:
- Check database file permissions
- Run prisma generate
- Restart backend server
```

**4. Fraud Detection Not Working**
```
ERROR: AI detection inactive
SOLUTION:
- Check fraudDetection.ts file
- Verify transaction data flow
- Review algorithm parameters
```

---

## 📋 DEPLOYMENT CHECKLIST

### **Pre-Production**
- [ ] All dependencies installed
- [ ] Database schema migrated
- [ ] Environment variables set
- [ ] Security headers configured
- [ ] API rate limiting enabled
- [ ] Error logging implemented

### **Production**
- [ ] HTTPS certificates installed
- [ ] Database backups configured
- [ ] Monitoring systems active
- [ ] Load balancing setup
- [ ] Security audit completed
- [ ] User documentation ready

---

## 🎓 KESIMPULAN SKRIPSI

### **Kontribusi Penelitian**
1. **Implementasi NFC Payment** pada platform mobile native
2. **AI-powered Fraud Detection** dengan statistical analysis
3. **Real-time Monitoring System** untuk keamanan transaksi
4. **Scalable Architecture** untuk sistem pembayaran digital

### **Hasil Achieved**
- ✅ Sistem NFC payment yang functional
- ✅ AI fraud detection dengan accuracy rate tinggi
- ✅ Admin dashboard untuk monitoring comprehensive
- ✅ Mobile app dengan UX yang user-friendly
- ✅ Security implementation yang robust

### **Future Enhancements**
- Machine Learning model yang lebih sophisticated
- Multi-currency support
- Blockchain integration untuk transparency
- Advanced analytics dashboard
- Mobile wallet integration

---

## 👨‍💻 TECHNICAL SPECIFICATIONS

**Development Environment:**
- OS: Windows 11
- Node.js: v22.14.0
- React Native: Expo SDK 54
- Database: SQLite with Prisma
- IDE: VS Code

**Production Requirements:**
- RAM: Minimum 4GB
- Storage: Minimum 10GB
- Network: Stable internet connection
- Mobile: Android 8+ / iOS 12+

**Code Quality:**
- TypeScript for type safety
- ESLint for code quality
- Prettier for formatting
- Indonesian comments untuk dokumentasi

---

*Dokumentasi ini dibuat untuk mendukung skripsi sistem NFC Payment dengan AI Fraud Detection. Semua implementasi telah diuji dan berfungsi dengan baik.*

**© 2025 - NFC Payment System with AI Fraud Detection**