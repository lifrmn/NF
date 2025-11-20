# 📂 Database Location & Information

## 🗄️ **Lokasi Database Anda:**

### **Database SQLite:**
- **Nama File**: `nfcpayment.db`  
- **Lokasi**: Internal app storage (private untuk setiap aplikasi)
- **Type**: SQLite database file

### **Platform-Specific Locations:**

#### **📱 Android (Development - Expo Go)**
```
/data/data/host.exp.exponent/databases/ExperienceData%2B<hash>/SQLite/nfcpayment.db
```

#### **📱 Android (Production APK)**
```
/data/data/com.yourcompany.nfcpayment/databases/nfcpayment.db
```

#### **💻 Development (Windows)**
Database disimpan di Expo cache directory:
```
%USERPROFILE%\.expo\android\simulator\databases\nfcpayment.db
```

---

## 🔍 **Cara Mengakses Database:**

### **1. Melalui Aplikasi (Recommended)**
Database dapat diakses melalui fungsi-fungsi di aplikasi:
```typescript
// Di src/utils/database.ts
getUserById(id: number)
getUserByUsername(username: string)  
getUserTransactions(userId: number)
getAllUsers()
```

### **2. SQLite Browser (Development)**
Untuk development, Anda bisa:
```bash
# Install SQLite Browser
npm install -g sqlite3

# Atau gunakan SQLite Browser GUI
# Download dari: https://sqlitebrowser.org/
```

### **3. ADB (Android Debug Bridge)**
Untuk debug production APK:
```bash
# Connect device
adb shell

# Navigate to app data (requires root)
cd /data/data/com.yourcompany.nfcpayment/databases/
ls -la

# Pull database to computer
adb pull /data/data/com.yourcompany.nfcpayment/databases/nfcpayment.db
```

---

## 🏗️ **Database Schema:**

### **Tables:**
1. **users** - Data pengguna (id, name, username, password, balance)
2. **transactions** - Riwayat transaksi (id, senderId, receiverId, amount, createdAt, type)

### **Current Data Structure:**
```sql
-- Users Table
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  balance REAL DEFAULT 0
);

-- Transactions Table  
CREATE TABLE transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  senderId INTEGER NOT NULL,
  receiverId INTEGER NOT NULL,
  amount REAL NOT NULL,
  type TEXT DEFAULT 'transfer',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (senderId) REFERENCES users (id),
  FOREIGN KEY (receiverId) REFERENCES users (id)
);
```

---

## 📊 **Melihat Data Database:**

### **Via Admin Dashboard:**
1. Jalankan admin server: `node admin/simple-admin.js`
2. Buka: `http://localhost:3001`
3. Lihat real-time data dari semua devices

### **Via SQLite Commands:**
```sql
-- Lihat semua users
SELECT * FROM users;

-- Lihat transaksi terbaru
SELECT t.*, u1.username as sender, u2.username as receiver 
FROM transactions t
JOIN users u1 ON t.senderId = u1.id
JOIN users u2 ON t.receiverId = u2.id
ORDER BY t.createdAt DESC;

-- Lihat total balance
SELECT SUM(balance) as total_balance FROM users;
```

---

## 🔒 **Database Security:**

### **Data Protection:**
- ✅ SQLite file internal storage (private per app)
- ✅ Tidak bisa diakses app lain
- ✅ Encrypted saat device locked
- ✅ Dihapus saat uninstall app

### **Backup Considerations:**
- Database lokal akan hilang jika uninstall app
- Data tersync ke admin server untuk monitoring
- Consider backup mechanism untuk production

---

## ⚙️ **Database Operations:**

### **Initialize Database:**
```typescript
// Auto-initialized saat app start
await initializeDatabase();
```

### **Clear All Data:**
```typescript
// Reset database (development only)
await clearAllData();
```

### **Check Database Status:**
```typescript
// Lihat connection status
const db = await getDatabaseConnection();
console.log('Database ready:', db);
```

---

## 📍 **Summary:**

**Database Anda (`nfcpayment.db`) tersimpan di:**
- **Development**: Expo cache directory  
- **Production APK**: App private storage `/data/data/`
- **Accessible via**: App functions, Admin dashboard, SQLite tools
- **Security**: Private storage, encrypted, deleted on uninstall

**Untuk melihat data real-time, gunakan Admin Dashboard di `http://localhost:3001` 📊**