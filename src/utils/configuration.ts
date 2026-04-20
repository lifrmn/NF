// src/utils/configuration.ts
/* ==================================================================================
 * 🌐 CONFIGURATION FILE - API ENDPOINT CONFIGURATION
 * ==================================================================================
 * 
 * Tujuan File:
 * File ini berisi konfigurasi URL backend API yang digunakan oleh aplikasi mobile.
 * Untuk development mode, kita menggunakan Ngrok untuk tunneling local server.
 * 
 * Apa itu Ngrok?
 * Ngrok adalah tool untuk membuat tunnel dari internet ke localhost.
 * Kenapa butuh Ngrok? Karena aplikasi mobile tidak bisa akses localhost langsung.
 * 
 * Contoh:
 * - Backend berjalan di http://localhost:4000 (hanya bisa diakses dari komputer sendiri)
 * - Ngrok membuat tunnel: https://xyz.ngrok-free.dev → http://localhost:4000
 * - Mobile app bisa akses backend melalui URL Ngrok ini
 * 
 * ==================================================================================
 */

// ==================================================================================
// LANGKAH-LANGKAH SETUP NGROK (Development Mode)
// ==================================================================================
// 
// STEP 1: Jalankan Backend Server
//   Command: cd backend && node server.js
//   Backend akan berjalan di http://localhost:4000
// 
// STEP 2: Jalankan Ngrok Tunnel
//   Command: ngrok http 4000
//   Ngrok akan generate URL random seperti: https://abc-xyz.ngrok-free.dev
// 
// STEP 3: Copy URL Ngrok ke Constant di Bawah
//   Ganti nilai API_URL dengan URL dari Ngrok
// 
// STEP 4: Rebuild Aplikasi Mobile
//   - Jika menggunakan Expo: expo start --clear
//   - Jika sudah build APK: build ulang APK dengan URL baru
// 
// CATATAN PENTING:
// - URL Ngrok berubah setiap kali Ngrok di-restart (free tier)
// - Untuk production, ganti dengan URL server yang fix (tidak pakai Ngrok)
// - Jangan commit URL development ke Git (bisa bocor ke orang lain)
// 
// ==================================================================================

// KONFIGURASI URL BACKEND API
// URL ini adalah endpoint base untuk semua API calls ke backend
// Format lengkap: API_URL + /api/[endpoint]
// Contoh: https://unbellicose-troublesomely-miley.ngrok-free.dev/api/auth/login
export const API_URL = 'https://unbellicose-troublesomely-miley.ngrok-free.dev';

// CARA UPDATE URL NGROK (JIKA NGROK DI-RESTART)
// 1. Jalankan ngrok di terminal: ngrok http 4000
// 2. Copy URL yang muncul (misal: https://abc123.ngrok-free.dev)
// 3. Ganti URL di atas dengan URL baru
// 4. Rebuild APK: eas build --platform android --profile preview
//    ATAU untuk development: expo start --clear