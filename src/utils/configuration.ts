// ========================================
// NGROK CONFIGURATION (UPDATE SETIAP RESTART)
// ========================================
// Jalankan: ngrok http 4000
// Copy URL yang muncul dan paste di bawah
export const API_URL = 'https://unbellicose-troublesomely-miley.ngrok-free.dev';

// Cara update URL:
// 1. Jalankan ngrok di terminal: ngrok http 4000
// 2. Copy URL yang muncul (misal: https://abc123.ngrok-free.dev)
// 3. Ganti URL di atas dengan URL baru
// 4. Rebuild APK: eas build --platform android --profile preview