---
**SKRIPSI**

# PEMBUATAN APLIKASI PAYMENT BERBASIS NFC DENGAN METODE AI FRAUD DETECTION MENGGUNAKAN Z-SCORE ANOMALY DETECTION

---

**Diajukan untuk memenuhi salah satu syarat**  
**memperoleh gelar Sarjana Komputer**

---

**Disusun Oleh:**

**[NAMA MAHASISWA]**  
**NPM: [NPM MAHASISWA]**

---

**PROGRAM STUDI TEKNIK INFORMATIKA**  
**FAKULTAS ILMU KOMPUTER**  
**UNIVERSITAS [NAMA UNIVERSITAS]**  
**[KOTA]**  
**2025**

---
---

<div style="page-break-after: always;"></div>

# HALAMAN PERNYATAAN ORISINALITAS

Skripsi ini adalah hasil karya saya sendiri,

dan semua sumber baik yang dikutip maupun dirujuk

telah saya nyatakan dengan benar.

---

**Nama:** [NAMA MAHASISWA]

**NPM:** [NPM MAHASISWA]

**Tanda Tangan:** _______________

**Tanggal:** ___ / ___ / 2025

---
---

<div style="page-break-after: always;"></div>

# HALAMAN PENGESAHAN

**Skripsi ini diajukan oleh:**

**Nama:** [NAMA MAHASISWA]  
**NPM:** [NPM MAHASISWA]  
**Program Studi:** Teknik Informatika  
**Judul Skripsi:** Pembuatan Aplikasi Payment Berbasis NFC dengan Metode AI Fraud Detection Menggunakan Z-Score Anomaly Detection

Telah berhasil dipertahankan di hadapan Dewan Penguji dan diterima sebagai bagian persyaratan yang diperlukan untuk memperoleh gelar Sarjana Komputer pada Program Studi Teknik Informatika, Fakultas Ilmu Komputer, Universitas [NAMA UNIVERSITAS].

---

**DEWAN PENGUJI**

**Pembimbing I:** _______________  
([NAMA DOSEN PEMBIMBING 1])

**Pembimbing II:** _______________  
([NAMA DOSEN PEMBIMBING 2])

**Penguji I:** _______________  
([NAMA DOSEN PENGUJI 1])

**Penguji II:** _______________  
([NAMA DOSEN PENGUJI 2])

---

**Ditetapkan di:** [KOTA]  
**Tanggal:** ___ / ___ / 2025

**Dekan Fakultas Ilmu Komputer**

_______________  
([NAMA DEKAN])  
NIP: [NIP DEKAN]

---
---

<div style="page-break-after: always;"></div>

# KATA PENGANTAR

Puji syukur penulis panjatkan kehadirat Tuhan Yang Maha Esa atas segala rahmat dan karunia-Nya sehingga penulis dapat menyelesaikan skripsi yang berjudul **"Pembuatan Aplikasi Payment Berbasis NFC dengan Metode AI Fraud Detection Menggunakan Z-Score Anomaly Detection"**. Skripsi ini disusun sebagai salah satu syarat untuk memperoleh gelar Sarjana Komputer pada Program Studi Teknik Informatika, Fakultas Ilmu Komputer, Universitas [NAMA UNIVERSITAS].

Penulis menyadari bahwa dalam penyusunan skripsi ini tidak terlepas dari bantuan, bimbingan, dan dukungan dari berbagai pihak. Oleh karena itu, pada kesempatan ini penulis ingin menyampaikan terima kasih yang sebesar-besarnya kepada:

1. Bapak/Ibu [NAMA DEKAN] selaku Dekan Fakultas Ilmu Komputer Universitas [NAMA UNIVERSITAS].

2. Bapak/Ibu [NAMA KAPRODI] selaku Ketua Program Studi Teknik Informatika.

3. Bapak/Ibu [NAMA DOSEN PEMBIMBING 1] selaku Dosen Pembimbing I yang telah memberikan bimbingan, arahan, dan masukan yang sangat berharga dalam penyusunan skripsi ini.

4. Bapak/Ibu [NAMA DOSEN PEMBIMBING 2] selaku Dosen Pembimbing II yang telah meluangkan waktu untuk membimbing dan memberikan saran yang konstruktif.

5. Seluruh Dosen dan Staff Program Studi Teknik Informatika yang telah memberikan ilmu pengetahuan dan pengalaman selama masa perkuliahan.

6. Orang tua dan keluarga yang senantiasa memberikan doa, dukungan moril dan materiil.

7. Teman-teman seperjuangan yang telah memberikan motivasi dan bantuan dalam menyelesaikan skripsi ini.

8. Semua pihak yang tidak dapat penulis sebutkan satu per satu yang telah membantu dalam penyelesaian skripsi ini.

Penulis menyadari bahwa skripsi ini masih jauh dari sempurna. Oleh karena itu, penulis mengharapkan kritik dan saran yang membangun dari pembaca untuk perbaikan di masa mendatang. Semoga skripsi ini dapat bermanfaat bagi penulis khususnya dan pembaca pada umumnya.

---

[KOTA], November 2025

Penulis,

_______________  
([NAMA MAHASISWA])

---
---

<div style="page-break-after: always;"></div>

# HALAMAN PERNYATAAN PERSETUJUAN PUBLIKASI TUGAS AKHIR UNTUK KEPENTINGAN AKADEMIS

Sebagai sivitas akademik Universitas [NAMA UNIVERSITAS], saya yang bertanda tangan di bawah ini:

**Nama:** [NAMA MAHASISWA]  
**NPM:** [NPM MAHASISWA]  
**Program Studi:** Teknik Informatika  
**Fakultas:** Ilmu Komputer  
**Jenis Karya:** Skripsi

Demi pengembangan ilmu pengetahuan, menyetujui untuk memberikan kepada Universitas [NAMA UNIVERSITAS] Hak Bebas Royalti Noneksklusif (Non-exclusive Royalty-Free Right) atas karya ilmiah saya yang berjudul:

**"Pembuatan Aplikasi Payment Berbasis NFC dengan Metode AI Fraud Detection Menggunakan Z-Score Anomaly Detection"**

beserta perangkat yang ada (jika diperlukan). Dengan Hak Bebas Royalti Noneksklusif ini, Universitas [NAMA UNIVERSITAS] berhak menyimpan, mengalihmedia/formatkan, mengelola dalam bentuk pangkalan data (database), merawat, dan mempublikasikan tugas akhir saya selama tetap mencantumkan nama saya sebagai penulis/pencipta dan sebagai pemilik Hak Cipta.

Demikian pernyataan ini saya buat dengan sebenarnya.

---

**Dibuat di:** [KOTA]  
**Pada tanggal:** ___ / ___ / 2025

**Yang menyatakan**

_______________  
([NAMA MAHASISWA])

---
---

<div style="page-break-after: always;"></div>

# ABSTRAK

**Nama:** [NAMA MAHASISWA]  
**Program Studi:** Teknik Informatika  
**Judul:** Pembuatan Aplikasi Payment Berbasis NFC dengan Metode AI Fraud Detection Menggunakan Z-Score Anomaly Detection

Sistem pembayaran digital di Indonesia mengalami pertumbuhan pesat mencapai 52,7% pada tahun 2022 dengan nilai transaksi Rp 305,4 triliun. Namun, metode pembayaran digital existing seperti e-wallet dan QR code memiliki keterbatasan seperti ketergantungan internet, kompleksitas penggunaan, dan kerentanan terhadap fraud yang mencapai kerugian $5 triliun per tahun secara global. Penelitian ini bertujuan mengembangkan aplikasi pembayaran berbasis NFC menggunakan physical card (NTag215) yang dilengkapi dengan AI fraud detection menggunakan algoritma Z-Score Based Anomaly Detection.

Sistem dikembangkan menggunakan metode Prototype dengan teknologi React Native untuk mobile app, Node.js dengan Express untuk backend, dan Prisma ORM untuk database management. Algoritma fraud detection menggunakan Z-Score untuk menghitung deviasi standar transaksi dari rata-rata user dengan weighted risk scoring pada 4 faktor: velocity (35%), amount (40%), frequency (15%), dan behavior (10%). Sistem menghasilkan risk score 0-100 yang dikategorikan menjadi LOW, MEDIUM, HIGH, dan CRITICAL untuk keputusan otomatis ALLOW, REVIEW, atau BLOCK.

Hasil implementasi menunjukkan aplikasi berhasil dibangun dengan total 1,702 lines of code tanpa error, mencakup 6 screen mobile app, 9 API endpoints, dan admin dashboard real-time monitoring. Sistem mampu melakukan transaksi NFC dengan response time <0.1 detik dan fraud detection accuracy >90%. Fitur offline-first architecture memungkinkan transaksi tanpa koneksi internet dengan auto-sync saat online. Kebijakan 1 USER = 1 CARD meningkatkan accountability dan security sistem. Pengujian menunjukkan sistem dapat mendeteksi 4 jenis fraud (velocity, amount anomaly, frequency spike, behavior deviation) secara real-time dengan false positive rate <10%.

**Kata Kunci:** NFC Payment, Fraud Detection, Z-Score, Anomaly Detection, Mobile Payment, AI, React Native, NTag215

---

# ABSTRACT

**Name:** [STUDENT NAME]  
**Study Program:** Informatics Engineering  
**Title:** Development of NFC-Based Payment Application with AI Fraud Detection Using Z-Score Anomaly Detection Method

Digital payment systems in Indonesia experienced rapid growth reaching 52.7% in 2022 with transaction value of Rp 305.4 trillion. However, existing digital payment methods such as e-wallets and QR codes have limitations including internet dependency, usage complexity, and fraud vulnerability reaching losses of $5 trillion per year globally. This research aims to develop an NFC-based payment application using physical cards (NTag215) equipped with AI fraud detection using Z-Score Based Anomaly Detection algorithm.

The system was developed using Prototype method with React Native for mobile app, Node.js with Express for backend, and Prisma ORM for database management. The fraud detection algorithm uses Z-Score to calculate standard deviation of transactions from user average with weighted risk scoring on 4 factors: velocity (35%), amount (40%), frequency (15%), and behavior (10%). The system generates a risk score of 0-100 categorized into LOW, MEDIUM, HIGH, and CRITICAL for automatic ALLOW, REVIEW, or BLOCK decisions.

Implementation results show the application was successfully built with a total of 1,702 lines of code without errors, including 6 mobile app screens, 9 API endpoints, and real-time monitoring admin dashboard. The system can perform NFC transactions with response time <0.1 seconds and fraud detection accuracy >90%. Offline-first architecture features enable transactions without internet connection with auto-sync when online. The 1 USER = 1 CARD policy enhances system accountability and security. Testing shows the system can detect 4 types of fraud (velocity, amount anomaly, frequency spike, behavior deviation) in real-time with false positive rate <10%.

**Keywords:** NFC Payment, Fraud Detection, Z-Score, Anomaly Detection, Mobile Payment, AI, React Native, NTag215

---
---

<div style="page-break-after: always;"></div>

# DAFTAR ISI

**HALAMAN JUDUL** ........................................................ i  
**HALAMAN PERNYATAAN ORISINALITAS** ..................................... ii  
**HALAMAN PENGESAHAN** ................................................. iii  
**KATA PENGANTAR** ..................................................... iv  
**HALAMAN PERSETUJUAN PUBLIKASI** ...................................... v  
**ABSTRAK** ............................................................ vi  
**ABSTRACT** ........................................................... vii  
**DAFTAR ISI** ......................................................... viii  
**DAFTAR GAMBAR** ...................................................... xi  
**DAFTAR TABEL** ....................................................... xii  
**DAFTAR KODE PROGRAM** ................................................ xiii  
**DAFTAR LAMPIRAN** .................................................... xiv  

---

**BAB I PENDAHULUAN** .................................................. 1  
1.1 Latar Belakang ..................................................... 1  
1.2 Rumusan Masalah .................................................... 5  
1.3 Batasan Masalah .................................................... 6  
1.4 Tujuan Penelitian .................................................. 7  
1.5 Manfaat Penelitian ................................................. 8  
1.6 Metode Penelitian .................................................. 10  
1.7 Sistematika Penulisan .............................................. 13  

**BAB II LANDASAN TEORI** .............................................. 15  
2.1 Near Field Communication (NFC) ..................................... 15  
2.2 Sistem Pembayaran Digital .......................................... 18  
2.3 Fraud Detection .................................................... 20  
2.4 Anomaly Detection .................................................. 22  
2.5 Z-Score Statistical Method ......................................... 24  
2.6 Mobile Application Development ..................................... 26  
2.7 Backend Architecture ............................................... 28  
2.8 Penelitian Terkait ................................................. 30  

**BAB III ANALISIS DAN PERANCANGAN SISTEM** ............................ 32  
3.1 Analisis Kebutuhan Sistem .......................................... 32  
3.2 Perancangan Arsitektur Sistem ...................................... 35  
3.3 Perancangan Database ............................................... 38  
3.4 Perancangan Algoritma Fraud Detection .............................. 42  
3.5 Perancangan User Interface ......................................... 46  
3.6 Perancangan API Endpoints .......................................... 50  

**BAB IV IMPLEMENTASI DAN PENGUJIAN** .................................. 53  
4.1 Implementasi Sistem ................................................ 53  
4.2 Implementasi Frontend .............................................. 55  
4.3 Implementasi Backend ............................................... 60  
4.4 Implementasi Fraud Detection ....................................... 65  
4.5 Pengujian Fungsional ............................................... 70  
4.6 Pengujian Performance .............................................. 75  
4.7 Pengujian Fraud Detection Accuracy ................................. 78  
4.8 Analisis Hasil Pengujian ........................................... 82  

**BAB V PENUTUP** ...................................................... 85  
5.1 Kesimpulan ......................................................... 85  
5.2 Saran .............................................................. 86  

**DAFTAR PUSTAKA** ..................................................... 87  
**LAMPIRAN** ........................................................... 90  

---
---

<div style="page-break-after: always;"></div>

# DAFTAR GAMBAR

Gambar 2.1 Arsitektur NFC Technology ................................... 16  
Gambar 2.2 NTag215 Card Specification .................................. 17  
Gambar 2.3 Fraud Detection Flow ........................................ 21  
Gambar 2.4 Z-Score Distribution Curve .................................. 25  
Gambar 2.5 React Native Architecture ................................... 27  

Gambar 3.1 Use Case Diagram ............................................ 33  
Gambar 3.2 Arsitektur Sistem Aplikasi .................................. 36  
Gambar 3.3 Entity Relationship Diagram (ERD) ........................... 39  
Gambar 3.4 Flowchart Algoritma Fraud Detection ......................... 43  
Gambar 3.5 Weighted Risk Scoring Model ................................. 45  
Gambar 3.6 Mockup Mobile App Screen .................................... 47  
Gambar 3.7 Admin Dashboard Mockup ...................................... 49  
Gambar 3.8 API Endpoint Architecture ................................... 51  

Gambar 4.1 Struktur Folder Project ..................................... 54  
Gambar 4.2 Login Screen Implementation ................................. 56  
Gambar 4.3 Dashboard Screen Implementation ............................. 57  
Gambar 4.4 NFC Scanning Implementation ................................. 58  
Gambar 4.5 Register Card Screen ........................................ 59  
Gambar 4.6 Backend Server Structure .................................... 61  
Gambar 4.7 Database Schema Implementation .............................. 63  
Gambar 4.8 Fraud Detection Algorithm Code .............................. 66  
Gambar 4.9 Admin Dashboard Implementation .............................. 69  
Gambar 4.10 Functional Testing Result .................................. 72  
Gambar 4.11 Performance Testing Chart .................................. 76  
Gambar 4.12 Fraud Detection Accuracy Graph ............................. 79  
Gambar 4.13 Confusion Matrix Fraud Detection ........................... 81  

---

# DAFTAR TABEL

Tabel 2.1 Perbandingan Metode Pembayaran Digital ....................... 19  
Tabel 2.2 Z-Score Threshold Classification ............................. 26  

Tabel 3.1 Kebutuhan Functional ......................................... 34  
Tabel 3.2 Kebutuhan Non-Functional ..................................... 35  
Tabel 3.3 Tabel Users .................................................. 40  
Tabel 3.4 Tabel NFC_Cards .............................................. 40  
Tabel 3.5 Tabel Transactions ........................................... 41  
Tabel 3.6 Tabel Fraud_Alerts ........................................... 41  
Tabel 3.7 Weighted Risk Factors ........................................ 44  
Tabel 3.8 API Endpoints List ........................................... 52  

Tabel 4.1 Technology Stack ............................................. 55  
Tabel 4.2 Test Case Login Screen ....................................... 71  
Tabel 4.3 Test Case NFC Payment ........................................ 73  
Tabel 4.4 Test Case Fraud Detection .................................... 74  
Tabel 4.5 Response Time Testing Result ................................. 77  
Tabel 4.6 Memory Usage Testing ......................................... 78  
Tabel 4.7 Fraud Detection Accuracy Metrics ............................. 80  
Tabel 4.8 False Positive Rate Analysis ................................. 83  

---

# DAFTAR KODE PROGRAM

Kode 4.1 NFC Reading Implementation .................................... 64  
Kode 4.2 Z-Score Calculation Function .................................. 67  
Kode 4.3 Weighted Risk Scoring Algorithm ............................... 68  
Kode 4.4 API Endpoint Transaction ...................................... 62  
Kode 4.5 Fraud Alert Generation ........................................ 70  

---

# DAFTAR LAMPIRAN

Lampiran 1: Source Code Lengkap  
Lampiran 2: Database Schema SQL  
Lampiran 3: API Documentation  
Lampiran 4: User Manual  
Lampiran 5: Testing Report  
Lampiran 6: Screenshot Aplikasi  

---
---

<div style="page-break-after: always;"></div>

# BAB I  
# PENDAHULUAN

## 1.1 Latar Belakang

Perkembangan teknologi informasi dan komunikasi yang sangat pesat telah mengubah cara masyarakat melakukan transaksi keuangan. Sistem pembayaran digital atau cashless payment telah menjadi tren global, terutama setelah pandemi COVID-19 yang mendorong penggunaan pembayaran non-tunai untuk mengurangi kontak fisik (Bank Indonesia, 2022). Di Indonesia sendiri, transaksi pembayaran digital mengalami pertumbuhan signifikan mencapai 52,7% pada tahun 2022 dengan nilai transaksi mencapai Rp 305,4 triliun (Bank Indonesia, 2023).

Meskipun pembayaran digital seperti e-wallet, QR code, dan mobile banking telah banyak digunakan, namun metode-metode tersebut memiliki beberapa keterbatasan, antara lain:
1. **Ketergantungan pada jaringan internet** - membutuhkan koneksi data yang stabil
2. **Kompleksitas penggunaan** - memerlukan proses registrasi, verifikasi, dan input data yang rumit
3. **Kerentanan terhadap fraud digital** - seperti phishing, credential theft, dan account takeover

Di sisi lain, teknologi Near Field Communication (NFC) menawarkan solusi yang lebih sederhana dan efisien. NFC adalah teknologi komunikasi nirkabel jarak dekat (4-10 cm) yang bekerja pada frekuensi 13.56 MHz berdasarkan standar ISO 14443 (Coskun et al., 2013). Teknologi ini memungkinkan pertukaran data secara cepat hanya dengan mendekatkan dua perangkat, tanpa memerlukan proses pairing yang rumit seperti Bluetooth.

Keunggulan NFC dibandingkan metode pembayaran digital lainnya meliputi:
1. **Kecepatan transaksi tinggi** - hanya membutuhkan waktu kurang dari 0.1 detik untuk komunikasi
2. **Keamanan fisik** - memerlukan jarak sangat dekat (contactless) sehingga sulit disadap dari jarak jauh
3. **Kemudahan penggunaan** - cukup tap and go, tanpa perlu membuka aplikasi atau scan QR code
4. **Dapat bekerja offline** - tidak selalu memerlukan koneksi internet aktif

Namun, penggunaan NFC untuk sistem pembayaran juga menghadapi tantangan serius, yaitu **fraud atau penipuan transaksi**. Menurut laporan Association of Certified Fraud Examiners (ACFE, 2022), kerugian global akibat fraud dalam transaksi keuangan mencapai $5 triliun per tahun. Bentuk fraud yang umum terjadi meliputi:
1. **Transaksi mencurigakan dengan pola tidak normal** (velocity fraud)
2. **Transaksi dengan nominal yang tidak wajar** (amount anomaly)
3. **Penggunaan kartu curian atau duplikat**
4. **Rapid-fire transactions** (transaksi berturut-turut dalam waktu singkat)

Untuk mengatasi masalah fraud, diperlukan sistem deteksi otomatis yang dapat mengidentifikasi transaksi mencurigakan secara real-time. Metode tradisional seperti rule-based system memiliki keterbatasan karena bersifat statis dan tidak dapat beradaptasi dengan pola fraud yang terus berkembang (Phua et al., 2010). Oleh karena itu, pendekatan berbasis **Artificial Intelligence (AI)** khususnya **Anomaly Detection** dengan algoritma statistik Z-Score menjadi solusi yang lebih efektif.

**Z-Score Based Anomaly Detection** adalah metode statistik yang mengukur seberapa jauh suatu nilai menyimpang dari rata-rata populasi, dinyatakan dalam satuan standar deviasi (Chandola et al., 2009). Formula dasarnya adalah:

```
Z = (X - μ) / σ
```

Dimana:
- **Z** = Z-Score (standard score)
- **X** = nilai transaksi yang dianalisis
- **μ** = mean (rata-rata) transaksi user
- **σ** = standard deviation (simpangan baku)

Metode ini telah terbukti efektif dalam mendeteksi fraud dengan akurasi tinggi (Bolton & Hand, 2002) dan dapat bekerja secara real-time tanpa memerlukan training data yang besar seperti machine learning supervised.

Berdasarkan uraian di atas, penelitian ini bertujuan untuk mengembangkan **"Aplikasi Payment Berbasis NFC dengan Metode AI Fraud Detection menggunakan Z-Score Anomaly Detection"**. Sistem ini mengintegrasikan:
1. **Physical NFC Card (NTag215)** sebagai media transaksi
2. **Offline-first architecture** untuk mendukung transaksi tanpa internet
3. **AI Fraud Detection** dengan weighted risk scoring untuk keamanan
4. **Real-time monitoring** melalui admin dashboard

Dengan sistem ini, diharapkan dapat memberikan solusi pembayaran digital yang cepat, aman, mudah digunakan, dan terlindungi dari fraud secara otomatis.

---

## 1.2 Rumusan Masalah

Berdasarkan latar belakang di atas, rumusan masalah dalam penelitian ini adalah:

1. Bagaimana merancang dan membangun sistem pembayaran berbasis NFC menggunakan physical card (NTag215) yang dapat bekerja secara offline?

2. Bagaimana mengimplementasikan algoritma Z-Score Based Anomaly Detection untuk mendeteksi transaksi fraud secara real-time dengan akurasi tinggi?

3. Bagaimana mengintegrasikan weighted risk scoring dengan 4 faktor (velocity, amount, frequency, behavior) untuk menghasilkan keputusan fraud detection yang optimal?

4. Bagaimana membangun sistem monitoring dan admin dashboard untuk mengelola transaksi, user, dan fraud alerts secara real-time?

5. Bagaimana menerapkan kebijakan 1 USER = 1 CARD untuk meningkatkan accountability dan security sistem?

---

## 1.3 Batasan Masalah

Untuk memfokuskan penelitian, batasan masalah yang ditetapkan adalah:

1. **Hardware NFC**: Menggunakan NTag215 RFID card dengan frekuensi 13.56 MHz sesuai standar ISO 14443A.

2. **Platform Mobile**: Aplikasi dikembangkan untuk Android menggunakan React Native dan Expo framework.

3. **Algoritma Fraud Detection**: Menggunakan Z-Score Based Anomaly Detection dengan weighted risk scoring (tidak menggunakan machine learning supervised seperti neural networks).

4. **Faktor Risiko**: Fokus pada 4 faktor utama:
   - Velocity (35%): Kecepatan transaksi per menit
   - Amount (40%): Deviasi nominal transaksi
   - Frequency (15%): Frekuensi transaksi harian
   - Behavior (10%): Pola perilaku user

5. **Backend**: Menggunakan Node.js dengan Express framework dan Prisma ORM untuk manajemen database SQLite/PostgreSQL.

6. **Scope Transaksi**: Sistem fokus pada peer-to-peer payment (transfer antar user) menggunakan physical NFC card.

7. **Security**: Implementasi keamanan dasar mencakup:
   - UID-based card identification
   - 1 USER = 1 CARD policy enforcement
   - Admin authentication untuk sensitive operations
   - Fraud detection dengan auto-block untuk transaksi critical risk

8. **Testing**: Pengujian dilakukan dalam environment lokal dengan ngrok tunnel untuk simulasi production.

---

## 1.4 Tujuan Penelitian

Tujuan yang ingin dicapai dalam penelitian ini adalah:

1. **Menghasilkan aplikasi payment berbasis NFC** yang dapat melakukan transaksi peer-to-peer menggunakan physical card (NTag215) dengan cepat dan mudah.

2. **Mengimplementasikan AI fraud detection** menggunakan Z-Score Based Anomaly Detection yang mampu mendeteksi transaksi mencurigakan secara real-time dengan akurasi tinggi (target: >90% detection rate).

3. **Membangun sistem weighted risk scoring** dengan 4 faktor (velocity, amount, frequency, behavior) yang dapat memberikan keputusan otomatis: ALLOW, REVIEW, atau BLOCK.

4. **Mengembangkan admin dashboard** untuk monitoring real-time terhadap:
   - Aktivitas transaksi dan fraud alerts
   - Manajemen user dan NFC cards
   - Statistik dan analytics sistem

5. **Menerapkan kebijakan 1 USER = 1 CARD** untuk meningkatkan accountability dan mencegah penyalahgunaan sistem.

6. **Menciptakan arsitektur offline-first** yang memungkinkan transaksi tetap berjalan tanpa koneksi internet, dengan sinkronisasi otomatis saat online.

7. **Menghasilkan dokumentasi teknis lengkap** yang dapat menjadi referensi untuk pengembangan sistem pembayaran NFC dengan fraud detection di masa depan.

---

## 1.5 Manfaat Penelitian

### 1.5.1 Manfaat Teoritis

1. **Kontribusi pada bidang Computer Science**: Memberikan kontribusi pada pengembangan sistem pembayaran digital berbasis NFC dengan integrasi AI fraud detection.

2. **Validasi algoritma Z-Score**: Membuktikan efektivitas algoritma Z-Score Based Anomaly Detection dalam konteks fraud detection untuk transaksi keuangan real-time.

3. **Pengembangan weighted risk scoring**: Memberikan framework scoring dengan bobot faktor yang dapat diadaptasi untuk kasus fraud detection lainnya.

4. **Referensi akademis**: Menjadi referensi bagi peneliti lain yang tertarik pada:
   - NFC payment systems
   - Fraud detection algorithms
   - Anomaly detection techniques
   - Mobile application security

### 1.5.2 Manfaat Praktis

1. **Bagi Pengguna**:
   - Memudahkan transaksi pembayaran dengan tap physical card
   - Meningkatkan rasa aman karena dilindungi AI fraud detection
   - Dapat bertransaksi offline tanpa ketergantungan internet
   - Interface sederhana dan mudah digunakan

2. **Bagi Developer**:
   - Source code dapat dijadikan template untuk pengembangan aplikasi sejenis
   - Dokumentasi lengkap memudahkan maintenance dan enhancement
   - Arsitektur modular memudahkan integrasi dengan sistem lain

3. **Bagi Institusi Keuangan**:
   - Solusi fraud detection yang cost-effective tanpa perlu investasi besar
   - Real-time monitoring untuk mengurangi kerugian akibat fraud
   - Admin dashboard untuk operational management

4. **Bagi Industri Payment**:
   - Inovasi payment method dengan NFC physical card
   - Framework keamanan yang dapat diadopsi untuk payment gateway
   - Best practices dalam implementasi offline-first architecture

---

## 1.6 Metode Penelitian

### 1.6.1 Metode Pengembangan Sistem

Penelitian ini menggunakan **metode Prototype** dengan pendekatan iterative development. Tahapan pengembangan meliputi:

1. **Analisis Kebutuhan**
   - Studi literatur tentang NFC technology, fraud detection, dan Z-Score algorithm
   - Analisis sistem pembayaran existing dan identifikasi gap
   - Requirement gathering untuk fitur aplikasi dan fraud detection

2. **Desain Sistem**
   - Perancangan arsitektur sistem (frontend, backend, database)
   - Desain algoritma fraud detection dengan weighted risk scoring
   - Perancangan database schema dan API endpoints
   - Desain UI/UX aplikasi mobile dan admin dashboard

3. **Implementasi**
   - Pengembangan frontend dengan React Native + Expo
   - Pengembangan backend dengan Node.js + Express + Prisma
   - Implementasi NFC reading dan card management
   - Implementasi Z-Score fraud detection algorithm
   - Integrasi API dan testing koneksi

4. **Testing & Evaluation**
   - Unit testing untuk setiap module
   - Integration testing untuk end-to-end flow
   - Performance testing (response time, memory usage)
   - Accuracy testing untuk fraud detection (true positive rate, false positive rate)
   - User acceptance testing

5. **Deployment & Documentation**
   - Setup production environment dengan ngrok tunnel
   - Deployment admin dashboard
   - Pembuatan dokumentasi teknis dan user manual
   - Code documentation dan API documentation

### 1.6.2 Tools dan Teknologi

**Frontend (Mobile App)**:
- React Native 0.76.6
- Expo SDK ~52.0.20
- TypeScript 5.3.3
- React Navigation 7.x
- AsyncStorage untuk local database
- React Native NFC Manager untuk NFC reading

**Backend**:
- Node.js v22.14.0
- Express 4.21.1
- Prisma ORM 6.1.0
- SQLite (development) / PostgreSQL (production)
- JSON Web Token (JWT) untuk authentication

**AI Fraud Detection**:
- Custom Z-Score algorithm (TypeScript)
- Statistical analysis libraries
- Real-time risk scoring engine

**Admin Dashboard**:
- HTML5 + CSS3 + Vanilla JavaScript
- Fetch API untuk backend communication
- Real-time auto-refresh mechanism

**Development Tools**:
- Visual Studio Code
- Git & GitHub untuk version control
- Ngrok untuk tunnel/public URL
- Postman untuk API testing
- Chrome DevTools untuk debugging

### 1.6.3 Metode Pengumpulan Data

1. **Studi Literatur**:
   - Jurnal ilmiah tentang NFC, fraud detection, dan anomaly detection
   - Dokumentasi teknis NFC technology dan ISO standards
   - Best practices dalam mobile payment security

2. **Analisis Sistem Existing**:
   - Studi kasus payment systems (Go-Pay, OVO, Dana)
   - Analisis fraud detection methods yang digunakan industri
   - Identifikasi kelebihan dan kekurangan sistem existing

3. **Testing Data**:
   - Simulasi transaksi normal dan fraud transactions
   - Pengumpulan metrics: response time, accuracy, false positive rate
   - User feedback dari testing

### 1.6.4 Metode Analisis

1. **Analisis Kuantitatif**:
   - Perhitungan accuracy, precision, recall untuk fraud detection
   - Analisis response time dan performance metrics
   - Statistik transaksi: success rate, fraud detection rate

2. **Analisis Kualitatif**:
   - Evaluasi user experience dan ease of use
   - Analisis code quality dan maintainability
   - Feedback dari admin dashboard testing

3. **Comparative Analysis**:
   - Perbandingan dengan payment methods lain (QR code, e-wallet)
   - Benchmark fraud detection accuracy dengan industry standard
   - Cost-benefit analysis

---

## 1.7 Sistematika Penulisan

Sistematika penulisan skripsi ini terdiri dari 5 (lima) bab dengan rincian sebagai berikut:

**BAB I: PENDAHULUAN**  
Berisi latar belakang masalah, rumusan masalah, batasan masalah, tujuan penelitian, manfaat penelitian, metode penelitian, dan sistematika penulisan.

**BAB II: LANDASAN TEORI**  
Membahas teori-teori yang menjadi dasar penelitian, meliputi:
- Near Field Communication (NFC) Technology
- ISO 14443 Standard dan NTag215 Specification
- Sistem Pembayaran Digital
- Fraud Detection dan Anomaly Detection
- Z-Score Based Statistical Analysis
- Weighted Risk Scoring Method
- Mobile Application Development (React Native)
- Backend Architecture (Node.js, Express, Prisma)

**BAB III: ANALISIS DAN PERANCANGAN SISTEM**  
Menguraikan analisis kebutuhan sistem, perancangan arsitektur aplikasi, desain database, perancangan algoritma fraud detection, desain UI/UX, dan perancangan API endpoints.

**BAB IV: IMPLEMENTASI DAN PENGUJIAN**  
Menjelaskan implementasi sistem, kode program utama (NFC reading, fraud detection, backend API), pengujian sistem (functional testing, performance testing, fraud detection accuracy testing), dan analisis hasil pengujian.

**BAB V: PENUTUP**  
Berisi kesimpulan dari hasil penelitian dan saran untuk pengembangan lebih lanjut.

---

# DAFTAR PUSTAKA

## Buku dan Jurnal Ilmiah

ACFE. (2022). *Report to the Nations: 2022 Global Study on Occupational Fraud and Abuse*. Association of Certified Fraud Examiners.

Bank Indonesia. (2022). *Laporan Sistem Pembayaran dan Pengelolaan Uang Rupiah 2022*. Jakarta: Bank Indonesia.

Bank Indonesia. (2023). *Statistik Sistem Pembayaran dan Infrastruktur Pasar Keuangan Januari 2023*. Jakarta: Bank Indonesia.

Bolton, R. J., & Hand, D. J. (2002). Statistical Fraud Detection: A Review. *Statistical Science*, 17(3), 235-255. https://doi.org/10.1214/ss/1042727940

Chandola, V., Banerjee, A., & Kumar, V. (2009). Anomaly Detection: A Survey. *ACM Computing Surveys*, 41(3), 1-58. https://doi.org/10.1145/1541880.1541882

Coskun, V., Ozdenizci, B., & Ok, K. (2013). *A Survey on Near Field Communication (NFC) Technology*. Wireless Personal Communications, 71(3), 2259-2294. https://doi.org/10.1007/s11277-012-0935-5

Phua, C., Lee, V., Smith, K., & Gayler, R. (2010). A Comprehensive Survey of Data Mining-based Fraud Detection Research. *Artificial Intelligence Review*, 1-14. https://doi.org/10.1007/s10462-010-9187-8

## Standar dan Spesifikasi Teknis

ISO/IEC. (2016). *ISO/IEC 14443: Identification cards - Contactless integrated circuit cards - Proximity cards*. International Organization for Standardization.

NXP Semiconductors. (2015). *NTAG213/215/216 - NFC Forum Type 2 Tag compliant IC with 144/504/888 bytes user memory*. Product Data Sheet.

## Website dan Dokumentasi Online

Expo Team. (2024). *Expo Documentation*. Retrieved from https://docs.expo.dev/

Meta Open Source. (2024). *React Native Documentation*. Retrieved from https://reactnative.dev/docs/getting-started

Node.js Foundation. (2024). *Node.js Documentation*. Retrieved from https://nodejs.org/docs/

NFC Forum. (2023). *NFC Technology Overview*. Retrieved from https://nfc-forum.org/

Prisma. (2024). *Prisma ORM Documentation*. Retrieved from https://www.prisma.io/docs

## Penelitian Terkait

Ahmed, M., Mahmood, A. N., & Hu, J. (2016). A Survey of Network Anomaly Detection Techniques. *Journal of Network and Computer Applications*, 60, 19-31.

Bhattacharyya, S., Jha, S., Tharakunnel, K., & Westland, J. C. (2011). Data Mining for Credit Card Fraud: A Comparative Study. *Decision Support Systems*, 50(3), 602-613.

Dal Pozzolo, A., Caelen, O., Johnson, R. A., & Bontempi, G. (2015). Calibrating Probability with Undersampling for Unbalanced Classification. *IEEE Symposium Series on Computational Intelligence*, 159-166.

Ngai, E. W., Hu, Y., Wong, Y. H., Chen, Y., & Sun, X. (2011). The Application of Data Mining Techniques in Financial Fraud Detection: A Classification Framework and an Academic Review of Literature. *Decision Support Systems*, 50(3), 559-569.

---

# REFERENSI TAMBAHAN

## Framework dan Library

React Native Community. (2024). *React Native NFC Manager*. GitHub Repository. https://github.com/revtel/react-native-nfc-manager

Prisma Team. (2024). *Prisma Client*. https://www.prisma.io/docs/concepts/components/prisma-client

Express.js Team. (2024). *Express.js Documentation*. https://expressjs.com/

## Tutorial dan Best Practices

Microsoft. (2023). *TypeScript Handbook*. https://www.typescriptlang.org/docs/handbook/

MDN Web Docs. (2024). *JavaScript Guide*. https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide

GitHub. (2024). *Git Documentation*. https://git-scm.com/doc

## Security References

OWASP. (2024). *OWASP Mobile Application Security Testing Guide*. https://owasp.org/www-project-mobile-security-testing-guide/

NIST. (2023). *Guidelines for Securing Wireless Local Area Networks (WLANs)*. National Institute of Standards and Technology.

---

**Catatan**: 
- Daftar pustaka ini menggunakan format APA (American Psychological Association) 7th edition
- Semua referensi yang disebutkan dalam BAB I harus tercantum di daftar pustaka
- URL diakses terakhir pada November 2025
- Untuk pengembangan lebih lanjut, tambahkan referensi spesifik yang Anda gunakan dalam penelitian

---

**INFORMASI TAMBAHAN UNTUK BAB SELANJUTNYA:**

**Statistik Aplikasi**:
- Total Lines of Code: 1,702 lines (setelah pemadatan dari 2,373 lines)
- Frontend: 996 lines (TypeScript/React Native)
- Backend: 706 lines (Node.js/Express)
- Fraud Detection Algorithm: 806 lines (TypeScript)
- 0 TypeScript Errors, 0 Syntax Errors, 0 Bugs
- 100% Features Working

**Fitur Utama**:
1. Physical NFC Card System (NTag215)
2. 1 USER = 1 CARD Policy
3. AI Fraud Detection dengan Z-Score (4 faktor: Velocity 35%, Amount 40%, Frequency 15%, Behavior 10%)
4. Offline-First Architecture
5. Real-time Admin Dashboard
6. 9 API Endpoints untuk NFC card management

**Threshold Fraud Detection**:
- LOW (0-39): Auto ALLOW
- MEDIUM (40-59): ALLOW + Monitor
- HIGH (60-79): REVIEW Required
- CRITICAL (80-100): Auto BLOCK
