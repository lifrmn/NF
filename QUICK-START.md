# 🚀 QUICK START - Dompet Digital NFC

## 📋 STATUS SAAT INI

```
✅ Backend:        RUNNING (Port 4000)
✅ Database:       CONNECTED (Prisma + SQLite)
✅ Fraud AI:       ACTIVE (Z-Score Detection)
⏸️  Mobile App:    PERLU NGROK SETUP
```

---

## 🔧 3 LANGKAH MUDAH

### **STEP 1: Start Backend** ✅ DONE
```bash
cd backend
npm start
```
Backend sudah running di: http://localhost:4000

---

### **STEP 2: Start Ngrok**
Buka terminal BARU:
```bash
ngrok http 4000
```

Copy URL yang muncul (contoh):
```
https://abc-xyz-123.ngrok-free.dev
```

---

### **STEP 3: Update Mobile App**

Edit file `src/utils/configuration.ts`:
```typescript
export const API_URL = 'https://abc-xyz-123.ngrok-free.dev';
```
(Ganti dengan URL ngrok Anda)

---

## 🧪 TEST KONEKSI

Buka browser, akses:
```
https://your-ngrok-url.ngrok-free.dev/health
```

Response yang benar:
```json
{
  "status": "OK",
  "database": "connected"
}
```

---

## 📱 BUILD APK

Setelah koneksi OK:
```bash
eas build --platform android --profile preview
```

Download APK → Install di HP → Test aplikasi

---

## 🎯 TEST FRAUD DETECTION

1. **Register User** di app
2. **Login** dengan user tersebut
3. **Register NFC Card**
4. **Buat Transaksi** (Payment)

Cek terminal backend, akan muncul:
```
📊 Fraud Analysis - User: 1
   Amount: Rp 50000 | Avg: Rp 45000 | StdDev: Rp 8000
   Z-Score: 0.63σ | Decision: ALLOW | Risk: LOW
✅ Transaction ALLOWED - Normal pattern
```

---

## 🐛 TROUBLESHOOTING

**Backend tidak bisa diakses?**
→ Pastikan ngrok running dan URL sudah diupdate di `configuration.ts`

**Fraud detection tidak muncul?**
→ Restart backend: Ctrl+C, lalu `npm start`

**NFC tidak terdeteksi?**
→ Enable NFC di Settings HP, gunakan kartu NTag215

---

## 📊 SISTEM ARCHITECTURE

```
Mobile App (React Native)
    ↓ HTTPS
Ngrok Tunnel
    ↓ HTTP
Backend Server (Node.js) → Fraud AI (Z-Score)
    ↓ Prisma
Database (SQLite)
```

---

## ✅ CHECKLIST

- [✅] Backend running
- [✅] Fraud detection active
- [ ] Ngrok started
- [ ] Mobile app URL updated
- [ ] APK built
- [ ] Full flow tested

---

**System Ready! 🎉**
Dokumentasi lengkap: `CONNECTION-GUIDE.md`
