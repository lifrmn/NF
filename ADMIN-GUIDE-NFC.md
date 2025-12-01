# 🎴 Panduan Cepat - Admin Dashboard NFC Cards

## 🚀 Quick Start

### 1. Buka Admin Dashboard
```
http://localhost:4000/admin/simple-dashboard.html
```

### 2. Scroll ke Section "🎴 NFC Card Management"

---

## ✨ Fitur-Fitur Utama

### 📝 Register Kartu Baru

1. Click tombol **"➕ Register Kartu Baru"**
2. Masukkan Card ID (UID dari kartu)
   - Contoh: `04E1A3B2C5D6E7`
   - Harus 14-20 karakter (huruf & angka)
3. Masukkan balance awal (Rp)
   - Contoh: `100000` untuk Rp 100.000
4. Click OK
5. Kartu terdaftar! ✅

**Tips:**
- UID bisa dibaca dari app mobile (fitur Scan Card)
- Format harus UPPERCASE atau lowercase (auto-convert)
- Duplicate Card ID akan ditolak

---

### 🔗 Link Kartu ke User

**Untuk Kartu Unlinked:**
1. Cari kartu yang mau di-link
2. Click tombol **"🔗 Link User"**
3. Masukkan username user
4. Click OK
5. Kartu terhubung ke user! ✅

**Untuk Unlink Kartu:**
1. Cari kartu yang sudah linked
2. Click tombol **"🔗 Unlink"**
3. Konfirmasi
4. Kartu terlepas dari user! ✅

**Manfaat Link:**
- Kartu bisa top-up otomatis dari balance user
- Transaksi tercatat atas nama user
- Security lebih baik

---

### 💰 Top-up Saldo Kartu

1. Cari kartu yang mau di-top-up
2. Click tombol **"💰 Top-up"**
3. Lihat balance saat ini
4. Masukkan jumlah top-up (Rp)
   - Contoh: `50000` untuk Rp 50.000
5. Masukkan password admin
6. Click OK
7. Saldo bertambah! ✅

**Notes:**
- Memerlukan password admin (keamanan)
- Balance otomatis update di database
- Activity log tercatat

---

### 🚫 Block Kartu

**Untuk Block:**
1. Cari kartu yang mencurigakan
2. Click tombol **"🚫 Block"**
3. Masukkan alasan (opsional)
   - Contoh: "Lost card" atau "Suspicious activity"
4. Kartu diblokir! ✅

**Untuk Unblock:**
1. Cari kartu yang di-block
2. Click tombol **"✅ Unblock"**
3. Konfirmasi
4. Kartu aktif kembali! ✅

**Status Kartu:**
- ✅ **ACTIVE** (hijau) - Normal, bisa dipakai
- 🚫 **BLOCKED** (merah) - Diblokir, tidak bisa transaksi
- ❌ **LOST** (abu-abu) - Hilang, fraud alert
- ⚠️ **EXPIRED** (kuning) - Kadaluarsa

---

### 📜 Lihat History Transaksi

1. Cari kartu yang mau dilihat
2. Click tombol **"📜 History"**
3. Pop-up menampilkan:
   - 10 transaksi terakhir
   - Tanggal & waktu
   - Tipe transaksi
   - Amount & balance

**Tipe Transaksi:**
- `TAP_IN` - Kartu di-tap masuk
- `TAP_OUT` - Kartu di-tap keluar
- `PAYMENT` - Pembayaran dari kartu
- `TOP_UP` - Isi saldo

---

## 🔍 Filter & Search

### Search Box
```
🔍 Cari Card ID atau User...
```
- Ketik Card ID: `04E1A3`
- Atau username: `john`
- Auto-filter saat mengetik

### Filter Status
```
📊 Semua Status
```
- Pilih: ACTIVE, BLOCKED, LOST, atau EXPIRED
- Filter otomatis apply

### Filter Link
```
👤 Semua Kartu
```
- **Linked** - Hanya kartu yang sudah link ke user
- **Unlinked** - Hanya kartu yang belum link

### Refresh Button
```
🔄 Refresh
```
- Update data kartu dari database
- Auto-refresh setiap 30 detik (jika aktif)

---

## 📊 Informasi Kartu

Setiap kartu menampilkan:

```
🎴 04E1A3B2C5D6E7...               ✅ ACTIVE
NTag215 • 13.56MHz

👤 User: 🔗 Linked: john_doe
💰 Balance: Rp 50,000
Registered: 29/11/2025

[🔗 Unlink]  [💰 Top-up]
[🚫 Block]   [📜 History]
```

**Color Codes:**
- 🟢 Hijau = ACTIVE
- 🔴 Merah = BLOCKED
- ⚪ Abu = LOST
- 🟡 Kuning = EXPIRED

---

## 🎯 Use Cases

### Use Case 1: Register Kartu Baru untuk Customer
```
1. Customer beli kartu NTag215
2. Admin scan kartu di HP → dapat UID
3. Admin register di dashboard
4. Link ke account customer
5. Top-up balance awal
6. Customer bisa pakai! ✅
```

### Use Case 2: Handle Kartu Hilang
```
1. Customer lapor kartu hilang
2. Admin cari kartu by username
3. Click "Block" kartu
4. Alasan: "Lost card reported"
5. Kartu tidak bisa dipakai lagi
6. Register kartu baru untuk customer
```

### Use Case 3: Top-up Massal
```
1. Admin prepare list Card ID
2. For each card:
   - Search by Card ID
   - Click Top-up
   - Input amount
   - Input password
   - Confirm
3. Done! Multiple cards topped up
```

### Use Case 4: Audit Transaksi
```
1. Cari kartu by ID atau user
2. Click "History"
3. Review 10 transaksi terakhir
4. Check anomali atau pattern
5. Block jika suspicious
```

---

## 🔐 Security Tips

### Password Admin
- Jangan share password admin
- Change password secara berkala
- Top-up selalu butuh password

### Monitor Activity Log
```
[10:30:45] 🎴 Loaded 5 NFC cards
[10:31:20] ✅ Registered new NFC card
[10:35:40] 💰 Top-up card: Rp 100,000
```
- Check log untuk aktivitas mencurigakan
- Log tercatat real-time
- Scroll untuk lihat history

### Regular Check
- Cek kartu BLOCKED secara berkala
- Review unlinked cards
- Monitor balance anomali
- Check transaction patterns

---

## ⚠️ Common Issues

### 1. Card ID Invalid
```
❌ Format Card ID tidak valid!
```
**Solusi:**
- Pastikan 14-20 karakter
- Hanya huruf A-F dan angka 0-9
- Contoh valid: `04E1A3B2C5D6E7`

### 2. User Not Found
```
❌ Gagal link kartu: User not found
```
**Solusi:**
- Check username (case-sensitive)
- Pastikan user sudah register
- Cek di section "Active Users"

### 3. Insufficient Balance
```
❌ Balance tidak cukup untuk transaksi
```
**Solusi:**
- Top-up kartu terlebih dahulu
- Check balance di card info

### 4. Admin Password Wrong
```
❌ Gagal top-up: Admin password salah
```
**Solusi:**
- Cek password admin
- Kontak super admin

---

## 📱 Integration dengan Mobile App

### Flow Lengkap:

**1. Di Admin Dashboard:**
```
Register kartu → Link ke user → Top-up balance
```

**2. Di Mobile App:**
```
User login → Toggle "Kartu Fisik" → Scan Card → Payment
```

**3. Tracking:**
```
Admin Dashboard → History → Review transaksi
```

---

## 🎓 Best Practices

### 1. **Naming Convention**
- Card ID: Always UPPERCASE
- Username: lowercase
- Reason: Descriptive (min 5 chars)

### 2. **Balance Management**
- Initial balance: Rp 0 - Rp 100,000
- Top-up increment: Rp 50,000 atau Rp 100,000
- Monitor balance <Rp 10,000

### 3. **Status Management**
- Block immediately jika lost/stolen
- Unblock hanya setelah verifikasi
- Set EXPIRED untuk kartu lama

### 4. **Regular Maintenance**
- Weekly: Check unlinked cards
- Monthly: Audit all transactions
- Quarterly: Review blocked cards

---

## 📞 Quick Help

### Admin Dashboard Issues
```
http://localhost:4000/admin/simple-dashboard.html
```
- Refresh browser (Ctrl+F5)
- Check backend running
- Check console (F12)

### Backend Issues
```
cd backend
npm start
```
- Check port 4000 available
- Check database connected
- Check logs

### Card Issues
- Check NFC enabled di HP
- Check kartu NTag215 authentic
- Check distance <5cm

---

## 🎉 Success Indicators

### Dashboard Loaded Successfully
```
✅ Dashboard initialized
🎴 Loaded X NFC cards
```

### Card Registered
```
✅ Kartu berhasil didaftarkan!
Card ID: 04E1A3B2C5D6E7
Balance: Rp 0
```

### Card Linked
```
✅ Kartu berhasil dilink!
Card: 04E1A3B2C5D6E7
User: john_doe
```

### Top-up Success
```
✅ Top-up berhasil!
Card: 04E1A3B2C5D6E7
Jumlah: Rp 100,000
Balance baru: Rp 100,000
```

---

**Selamat mengelola kartu NFC! 🎴✨**

Jika ada pertanyaan, check `NFC-CARD-INTEGRATION.md` untuk dokumentasi lengkap.
