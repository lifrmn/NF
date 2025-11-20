// ============================================================================
// IMPORTS - Library dan Helper Functions
// ============================================================================
// Import 3 fungsi dari simpleBackend.ts:
// - connectBackend(): Untuk koneksi ke server backend
// - callAPI(): Untuk panggil endpoint API
// - getBackendStatus(): Untuk cek status dan URL backend
import { connectBackend, callAPI, getBackendStatus } from './simpleBackend';

// ============================================================================
// CLASS: SimpleAPI
// ============================================================================
// API Client untuk berkomunikasi dengan backend server
// Class ini adalah "wrapper" yang mempermudah panggilan API
// Menyediakan method: get(), post(), put(), delete()
export class SimpleAPI {
  // =========================================================================
  // CLASS PROPERTIES
  // =========================================================================
  private baseUrl = '';     // URL backend (contoh: http://192.168.137.1:4000)
  private token = '';       // JWT token untuk authentication (setelah login)
  
  // =========================================================================
  // METHOD: init()
  // =========================================================================
  // Inisialisasi API client saat aplikasi pertama kali jalan
  // WAJIB dipanggil sebelum pakai method lain (get/post/put/delete)
  // Return: true jika berhasil connect ke backend, false jika gagal
  async init(): Promise<boolean> {
    console.log('🔗 Initializing API...');
    
    // STEP 1: Coba connect ke backend
    // connectBackend() akan coba ping server untuk cek apakah online
    const connected = await connectBackend();
    
    // STEP 2: Kalau berhasil connect, ambil base URL
    if (connected) {
      // getBackendStatus() return object: { baseUrl, connected, timestamp }
      const status = await getBackendStatus();
      
      // Simpan base URL untuk dipakai di semua API call
      this.baseUrl = status.baseUrl;
      
      console.log('✅ API ready:', this.baseUrl);
    }
    
    return connected;
  }

  // =========================================================================
  // METHOD: setToken()
  // =========================================================================
  // Set JWT token setelah user login
  // Token ini akan ditambahkan ke header Authorization di setiap API call
  // Format header: Authorization: Bearer <token>
  setToken(token: string): void {
    this.token = token;
  }

  // =========================================================================
  // METHOD: get()
  // =========================================================================
  // HTTP GET request - Untuk mengambil data dari server
  // Digunakan untuk:
  // - Ambil list user: get('/api/users')
  // - Ambil profile: get('/api/users/1')
  // - Ambil transaksi: get('/api/transactions')
  // 
  // Input: endpoint (contoh: '/api/users')
  // Output: Response dari server (biasanya JSON)
  async get(endpoint: string): Promise<any> {
    // Panggil callAPI dengan method GET
    return await callAPI(endpoint, {
      // Tambahkan Authorization header kalau token ada
      headers: this.token ? { Authorization: `Bearer ${this.token}` } : {}
    });
  }

  // =========================================================================
  // METHOD: post()
  // =========================================================================
  // HTTP POST request - Untuk membuat/mengirim data baru ke server
  // Digunakan untuk:
  // - Login: post('/api/auth/login', { username, password })
  // - Daftar user baru: post('/api/users', { name, username, password })
  // - Kirim transaksi: post('/api/transactions', { senderId, receiverId, amount })
  // 
  // Input:
  //   - endpoint: URL path (contoh: '/api/auth/login')
  //   - data: Object yang akan dikirim (akan di-convert jadi JSON)
  // Output: Response dari server
  async post(endpoint: string, data: any): Promise<any> {
    return await callAPI(endpoint, {
      method: 'POST',                    // HTTP method
      body: JSON.stringify(data),        // Convert object → JSON string
      headers: {
        // Spread operator (...) untuk gabungkan multiple headers
        // Kalau ada token, tambahkan Authorization header
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {})
      }
    });
  }

  // =========================================================================
  // METHOD: put()
  // =========================================================================
  // HTTP PUT request - Untuk update data yang sudah ada di server
  // Digunakan untuk:
  // - Update profile: put('/api/users/1', { name, username })
  // - Update saldo: put('/api/admin/balance', { userId, newBalance })
  // 
  // Input:
  //   - endpoint: URL path (contoh: '/api/users/1')
  //   - data: Object dengan data yang mau diupdate
  // Output: Response dari server (biasanya data yang sudah diupdate)
  async put(endpoint: string, data: any): Promise<any> {
    return await callAPI(endpoint, {
      method: 'PUT',                     // HTTP method untuk update
      body: JSON.stringify(data),        // Convert object → JSON string
      headers: {
        // Tambahkan Authorization header kalau token ada
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {})
      }
    });
  }

  // =========================================================================
  // METHOD: delete()
  // =========================================================================
  // HTTP DELETE request - Untuk hapus data dari server
  // Digunakan untuk:
  // - Hapus user: delete('/api/users/1')
  // - Hapus transaksi: delete('/api/transactions/123')
  // 
  // Input: endpoint (contoh: '/api/users/1')
  // Output: Response dari server (biasanya success message)
  async delete(endpoint: string): Promise<any> {
    return await callAPI(endpoint, {
      method: 'DELETE',                  // HTTP method untuk delete
      // Tambahkan Authorization header kalau token ada
      headers: this.token ? { Authorization: `Bearer ${this.token}` } : {}
    });
  }

  // =========================================================================
  // METHOD: isReady()
  // =========================================================================
  // Cek apakah API client sudah siap dipakai
  // Return true jika init() sudah berhasil (baseUrl sudah di-set)
  // Return false jika belum init atau init gagal
  isReady(): boolean {
    // Kalau baseUrl bukan string kosong, berarti sudah ready
    return this.baseUrl !== '';
  }

  // =========================================================================
  // METHOD: getBaseUrl()
  // =========================================================================
  // Get base URL dari backend server
  // Digunakan untuk debugging atau display di UI
  // Contoh return: 'http://192.168.137.1:4000'
  getBaseUrl(): string {
    return this.baseUrl;
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================
// Export instance SimpleAPI yang sudah dibuat
// Menggunakan singleton pattern agar hanya ada 1 instance di seluruh app
// 
// Cara pakai di file lain:
// import { api } from './simpleAPI';
// await api.init();
// await api.post('/api/auth/login', { username, password });
export const api = new SimpleAPI();