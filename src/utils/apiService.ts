// src/utils/apiService.ts
/* ==================================================================================
 * 🚀 UNIFIED API SERVICE - HTTP CLIENT UNTUK MOBILE APP
 * ==================================================================================
 * 
 * Tujuan File:
 * File ini adalah "jembatan" antara aplikasi mobile dengan backend server.
 * Semua komunikasi HTTP (login, payment, NFC, admin) dilakukan melalui class ini.
 * 
 * Pattern yang Digunakan:
 * - Singleton Pattern: Hanya ada 1 instance APIService di seluruh aplikasi
 * - Token-Based Authentication: JWT token disimpan dan dikirim otomatis di header
 * - Auto-Retry: Jika request gagal, token auto-refresh
 * - Error Handling: Menangani Ngrok errors, timeout, network errors
 * 
 * Struktur Class:
 * 1. Initialization: Load token dari AsyncStorage saat startup
 * 2. HTTP Request Handler: Core function untuk semua API calls
 * 3. Authentication Methods: login, register, logout
 * 4. User Methods: getUserById, updateBalance, dll
 * 5. Transaction Methods: createTransaction, getTransactions
 * 6. NFC Payment Methods: processNFCPayment, validateNFCReceiver
 * 7. Fraud Detection Methods: checkFraudRisk, reportFraudulent
 * 8. Admin Methods: dashboard, blockUser, getAllUsers
 * 9. Device Methods: registerDevice, syncDeviceData
 * 
 * ==================================================================================
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { API_URL } from './configuration';

/* ==================================================================================
 * 🔹 APISERVICE CLASS - SINGLETON PATTERN
 * ==================================================================================
 * 
 * Apa itu Singleton Pattern?
 * Pattern di mana hanya ada 1 instance class di seluruh aplikasi.
 * 
 * Kenapa Singleton?
 * - Agar token dan userId tidak hilang saat class dipanggil dari file berbeda
 * - Menghindari multiple initialization (lebih efisien)
 * - Consistency: Semua file menggunakan connection yang sama
 * 
 * Cara Pakai:
 * const api = APIService.getInstance(); // Selalu return instance yang sama
 * 
 * ==================================================================================
 */
export class APIService {
  // STEP 1: Deklarasi properties untuk Singleton Pattern
  // private static instance: Menyimpan 1 instance tunggal class ini
  private static instance: APIService;
  
  // STEP 2: Deklarasi properties untuk authentication
  // token: JWT token dari backend (untuk validasi user di setiap request)
  // userId: ID user yang sedang login (untuk tracking)
  private token: string | null = null;
  private userId: string | null = null;
  
  // STEP 3: Base URL untuk backend API (dari configuration.ts)
  // Semua endpoint akan digabung dengan baseUrl ini
  // Contoh: baseUrl + '/api/auth/login' = 'https://xyz.ngrok-free.dev/api/auth/login'
  private baseUrl = API_URL;

  /* ================================================================================
   * METHOD: getInstance()
   * ================================================================================
   * TUJUAN:
   * Mendapatkan instance tunggal dari APIService (Singleton Pattern).
   * Jika belum ada instance, buat baru. Jika sudah ada, return yang lama.
   * 
   * CARA KERJA:
   * - Check: Apakah APIService.instance sudah ada?
   * - Jika BELUM: Buat instance baru dengan new APIService()
   * - Jika SUDAH: Langsung return instance yang sudah ada
   * - Result: Semua file mendapat instance yang sama (shared state)
   * ================================================================================
   */
  static getInstance(): APIService {
    // STEP 1: Check apakah instance sudah dibuat sebelumnya
    // Jika belum (undefined/null), buat instance baru
    if (!APIService.instance) {
      APIService.instance = new APIService();
      console.log('✅ APIService instance created (Singleton)');
    }
    
    // STEP 2: Return instance yang sudah ada
    // Instance ini shared oleh semua file yang memanggil getInstance()
    return APIService.instance;
  }

  /* ================================================================================
   * METHOD: initialize()
   * ================================================================================
   * TUJUAN:
   * Inisialisasi APIService saat aplikasi startup.
   * Load token dan userId dari AsyncStorage (persistent storage di device).
   * 
   * KENAPA PERLU INITIALIZE?
   * - Token user disimpan di AsyncStorage agar tidak hilang saat app ditutup
   * - Saat app dibuka lagi, token perlu di-load kembali dari storage
   * - Jika token ada, user otomatis login (tidak perlu login lagi)
   * 
   * RETURN:
   * - true: Initialization berhasil (token loaded atau tidak ada token)
   * - false: Initialization gagal (error reading AsyncStorage)
   * ================================================================================
   */
  async initialize(): Promise<boolean> {
    try {
      // STEP 1: Load token dari AsyncStorage
      // AsyncStorage = persistent key-value storage di React Native
      // Seperti localStorage di web, tapi async
      // Token disimpan saat login berhasil (lihat method login() di bawah)
      this.token = await AsyncStorage.getItem('token');
      
      // STEP 2: Load userId dari AsyncStorage
      // userId digunakan untuk tracking user behavior dan fraud detection
      this.userId = await AsyncStorage.getItem('userId');
      
      // STEP 3: Log untuk debugging
      // Menampilkan apakah token loaded atau tidak
      console.log('🔧 API Service initialized');
      console.log('📡 Backend URL:', this.baseUrl);
      console.log('🔑 Token loaded:', this.token ? 'Yes' : 'No'); // Jangan print token lengkap (security risk)
      console.log('👤 User ID loaded:', this.userId || 'No user');
      
      // STEP 4: Return success
      return true;
      
    } catch (error) {
      // STEP 5: Handle error jika AsyncStorage gagal
      // Error ini jarang terjadi, biasanya karena permission device atau storage penuh
      console.error('❌ API Service initialization failed:', error);
      return false;
    }
  }

  /* ================================================================================
   * METHOD: makeRequest() - CORE HTTP REQUEST HANDLER
   * ================================================================================
   * TUJUAN:
   * Method ini adalah "mesin utama" untuk SEMUA API calls ke backend.
   * Semua method lain (login, payment, dll) akan memanggil makeRequest() ini.
   * 
   * FITUR:
   * 1. Automatic Token Injection: Token JWT otomatis ditambahkan ke header
   * 2. Timeout Handling: Request dibatalkan jika lebih dari 15 detik (slow network)
   * 3. Ngrok Headers: Menambahkan header khusus untuk bypass Ngrok warning page
   * 4. Auto-Logout: Jika token invalid (401/403), auto logout user
   * 5. Error Handling: Menangani semua error (network, timeout, HTTP errors)
   * 6. Response Parsing: Otomatis parse JSON atau text response
   * 
   * PARAMETER:
   * - endpoint: API endpoint (contoh: '/api/auth/login')
   * - options: { method, body, headers } - configuration untuk HTTP request
   * 
   * RETURN:
   * - Success: Response body (JSON object atau text)
   * - Error: Throw exception dengan pesan error
   * ================================================================================
   */
  private async makeRequest(endpoint: string, options: any = {}): Promise<any> {
    // STEP 1: Build full URL dengan menggabungkan baseUrl + endpoint
    // Contoh: 'https://xyz.ngrok-free.dev' + '/api/auth/login'
    // Result: 'https://xyz.ngrok-free.dev/api/auth/login'
    // 
    // endpoint.startsWith('/') checks if endpoint already has / at the beginning
    // Jika sudah ada /, langsung concat. Jika belum, tambahkan /.
    const fullUrl = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    
    try {
      // STEP 2: Setup Timeout dengan AbortController
      // AbortController adalah Web API untuk membatalkan fetch request
      // Kenapa perlu timeout?
      // - Network lambat bisa membuat request hang selamanya
      // - User experience buruk jika loading terlalu lama
      // - 15 detik adalah balance antara slow network dan user patience
      const controller = new AbortController();
      
      // setTimeout akan trigger abort() setelah 15 detik (15000ms)
      // Jika request belum selesai dalam 15 detik, auto dibatalkan
      const timeout = setTimeout(() => controller.abort(), 15000);
      
      // STEP 3: Build request configuration
      // Ini adalah konfigurasi untuk fetch() API
      const requestConfig = {
        // METHOD: GET, POST, PUT, DELETE
        // Default: GET jika tidak dispesifikasi
        method: options.method || 'GET',
        
        // HEADERS: Metadata request yang dikirim ke backend
        headers: {
          // Content-Type: Memberitahu backend bahwa kita kirim JSON
          'Content-Type': 'application/json',
          
          // Accept: Memberitahu backend bahwa kita expect JSON response
          'Accept': 'application/json',
          
          // ngrok-skip-browser-warning: Header khusus Ngrok
          // Tanpa ini, Ngrok akan redirect ke warning page (bukan API response)
          // Warning page Ngrok muncul karena free tier protection
          'ngrok-skip-browser-warning': 'true',
          
          // User-Agent: Identitas aplikasi yang melakukan request
          // Berguna untuk logging dan analytics di backend
          'User-Agent': 'NFC-Payment-Mobile',
          
          // Spread custom headers dari options (jika ada)
          // Ini memungkinkan caller untuk override atau menambah headers
          ...(options.headers || {}),
          
          // Authorization Header: JWT Token untuk authentication
          // Format: "Bearer <token>" adalah standar OAuth 2.0
          // Hanya ditambahkan jika token ada (user sudah login)
          // Operator ternary: condition ? true : false
          // Spread operator: ...(object) unpacks object properties
          ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
          
          // X-User-Id Header: Custom header untuk user identification
          // Digunakan backend untuk tracking dan fraud detection
          // Hanya ditambahkan jika userId ada
          ...(this.userId ? { 'x-user-id': this.userId } : {}),
        },
        
        // BODY: Data yang dikirim ke backend (untuk POST/PUT)
        // Hanya ditambahkan jika options.body ada
        // JSON.stringify() converts JavaScript object → JSON string
        // Backend akan parse JSON string ini kembali jadi object
        body: options.body ? JSON.stringify(options.body) : undefined,
        
        // SIGNAL: Hubungkan dengan AbortController untuk timeout
        // Jika controller.abort() dipanggil, fetch akan throw AbortError
        signal: controller.signal,
      };

      // STEP 4: Log request untuk debugging
      // Memudahkan tracking API calls saat development
      console.log(`📱 API Call: ${options.method || 'GET'} ${fullUrl}`);
      
      // STEP 5: Execute HTTP request dengan fetch() API
      // fetch() adalah native JavaScript API untuk HTTP requests
      // Similar to axios, but built-in (no external library needed)
      // fetch() returns Promise<Response>
      const response = await fetch(fullUrl, requestConfig);
      
      // STEP 6: Cancel timeout setelah response diterima
      // Jika tidak di-cancel, timeout akan tetap jalan dan trigger abort nanti
      // clearTimeout() membatalkan setTimeout() yang sudah dibuat
      clearTimeout(timeout);
      
      // STEP 7: Log response status untuk debugging
      // Status codes: 200 (OK), 201 (Created), 400 (Bad Request), 401 (Unauthorized), dll
      console.log(`📥 Response: ${response.status}`);

      // STEP 8: Handle error responses (status code bukan 2xx)
      // response.ok = true jika status 200-299
      // response.ok = false jika status 400+ (client/server error)
      if (!response.ok) {
        // SUBSTEP 8a: Extract error message dari response body
        // await response.text() reads body as plain text (karena mungkin bukan JSON)
        // .catch(() => '') fallback jika gagal read body
        const errorText = await response.text().catch(() => '');
        
        // SUBSTEP 8b: Handle authentication errors (401 Unauthorized, 403 Forbidden)
        // 401: Token invalid atau expired
        // 403: Token valid tapi user tidak punya permission
        // Solusi: Logout user dan clear token, paksa login ulang
        if (response.status === 401 || response.status === 403) {
          console.warn('🚪 Authentication error, logging out...');
          await this.logout(); // Clear token dan userId dari storage
        }
        
        // SUBSTEP 8c: Parse error text sebagai JSON (jika mungkin)
        // Backend biasanya kirim error dalam format JSON: { error: "message" }
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          // Jika parsing gagal (bukan JSON), gunakan text mentah
          errorData = { error: errorText };
        }
        
        // SUBSTEP 8d: Create detailed error message dan throw exception
        // Format: "API Error 400: {"error":"Invalid credentials"}"
        const errorMessage = `API Error ${response.status}: ${JSON.stringify(errorData)}`;
        throw new Error(errorMessage);
      }

      // STEP 9: Parse response berdasarkan Content-Type
      // response.headers.get('content-type') returns MIME type (contoh: 'application/json')
      const contentType = response.headers.get('content-type') || '';
      
      // SUBSTEP 9a: Jika response adalah JSON, parse sebagai JSON
      if (contentType.includes('application/json')) {
        const result = await response.json(); // Parse JSON string → JavaScript object
        
        // SUBSTEP 9b: Check apakah response mengandung token baru
        // Backend bisa kirim token baru saat login atau refresh token
        // Jika ada token, save ke memory dan AsyncStorage
        if (result?.token) {
          this.token = result.token; // Save ke memory (untuk request berikutnya)
          await AsyncStorage.setItem('token', result.token); // Save ke storage (persistent)
          console.log('🔑 New token saved');
        }
        
        return result; // Return parsed JSON
      }

      // SUBSTEP 9c: Jika bukan JSON, return sebagai plain text
      return await response.text();
      
    } catch (error: any) {
      // STEP 10: Handle semua errors (network error, timeout, dll)
      // error.name === 'AbortError': Request timeout (lebih dari 15 detik)
      // error.message: Error message lainnya (network down, DNS error, dll)
      console.error('❌ API Request failed:', error.message);
      
      // Re-throw error agar caller bisa handle (misal tampilkan error ke user)
      throw error;
    }
  }

  /* ================================================================================
   * HTTP METHOD SHORTCUTS - WRAPPER FUNCTIONS
   * ================================================================================
   * TUJUAN:
   * Method-method ini adalah shortcut untuk makeRequest() agar lebih mudah dipakai.
   * Instead of: makeRequest('/api/users', { method: 'GET' })
   * We can write: get('/api/users')
   * 
   * Ini adalah coding pattern yang disebut "Convenience Methods" atau "Helper Methods".
   * Makes code cleaner and more readable.
   * ================================================================================
   */

  // GET Request: Untuk mengambil data dari backend
  // Contoh: await api.get('/api/users/123') → fetch user dengan ID 123
  async get(endpoint: string) {
    return await this.makeRequest(endpoint, { method: 'GET' });
  }

  // POST Request: Untuk membuat data baru di backend
  // Contoh: await api.post('/api/auth/login', { username, password })
  async post(endpoint: string, body?: any) {
    return await this.makeRequest(endpoint, { method: 'POST', body });
  }

  // PUT Request: Untuk update data yang sudah ada
  // Contoh: await api.put('/api/users/123/balance', { balance: 100000 })
  async put(endpoint: string, body?: any) {
    return await this.makeRequest(endpoint, { method: 'PUT', body });
  }

  // DELETE Request: Untuk hapus data dari backend
  // Contoh: await api.delete('/api/nfc/cards/123')
  async delete(endpoint: string) {
    return await this.makeRequest(endpoint, { method: 'DELETE' });
  }

  /* ================================================================================
   * AUTHENTICATION METHODS - LOGIN, REGISTER, LOGOUT
   * ================================================================================
   * TUJUAN:
   * Method-method untuk user authentication (login masuk ke aplikasi).
   * 
   * Authentication Flow:
   * 1. User input username & password
   * 2. App call api.login(credentials)
   * 3. Backend validate credentials dan generate JWT token
   * 4. App save token ke AsyncStorage (persistent storage)
   * 5. All subsequent requests automatically include token in headers
   * 6. When user logout, token deleted from storage
   * ================================================================================
   */

  /* ================================================================================
   * METHOD: login()
   * ================================================================================
   * TUJUAN:
   * Login user dengan username dan password.
   * Jika berhasil, save token ke storage dan return user object.
   * 
   * FLOW:
   * 1. Send POST request ke backend /api/auth/login dengan credentials
   * 2. Backend validate username & password di database
   * 3. Jika valid, backend generate JWT token dan return { token, user }
   * 4. App save token dan userId ke AsyncStorage
   * 5. Token auto di-include di semua request berikutnya (lihat makeRequest())
   * 
   * PARAMETER:
   * - credentials: { username: string, password: string }
   * 
   * RETURN:
   * - Success: { token: string, user: { id, name, username, balance } }
   * - Error: Throw exception dengan error message dari backend
   * ================================================================================
   */
  async login(credentials: { username: string; password: string }) {
    // STEP 1: Send POST request ke backend auth endpoint
    // makeRequest() akan handle semua HTTP logic (headers, timeout, dll)
    const response = await this.makeRequest('/api/auth/login', {
      method: 'POST',
      body: credentials, // { username: "john", password: "secret123" }
    });
    
    // STEP 2: Check apakah response mengandung token
    // Backend response format: { success: true, token: "eyJhbGc...", user: {...} }
    if (response?.token) {
      // SUBSTEP 2a: Save token ke memory (untuk dipakai di request berikutnya)
      this.token = response.token;
      
      // SUBSTEP 2b: Save userId ke memory
      // userId.toString() convert number → string (AsyncStorage hanya terima string)
      this.userId = response.user.id.toString();
      
      // SUBSTEP 2c: Save token ke AsyncStorage (persistent storage)
      // Persistent = data tidak hilang saat app ditutup
      // Saat app dibuka lagi, token di-load dari storage (lihat initialize())
      await AsyncStorage.setItem('token', response.token);
      
      // SUBSTEP 2d: Save userId ke AsyncStorage
      await AsyncStorage.setItem('userId', response.user.id.toString());
      
      console.log('✅ Login successful, token saved');
    }
    
    // STEP 3: Return full response object
    // Caller bisa akses response.user untuk informasi user (name, balance, dll)
    return response;
  }

  /* ================================================================================
   * METHOD: register()
   * ================================================================================
   * TUJUAN:
   * Register user baru dengan name, username, dan password.
   * 
   * FLOW:
   * 1. Send POST request ke backend /api/auth/register dengan user data
   * 2. Backend validate data (username unique, password strength, dll)
   * 3. Backend hash password dengan bcrypt
   * 4. Backend save user ke database Prisma
   * 5. Backend return user object (tanpa password tentu saja!)
   * 
   * PARAMETER:
   * - userData: { name: string, username: string, password: string }
   * 
   * RETURN:
   * - Success: { success: true, user: { id, name, username, balance } }
   * - Error: Throw exception (contoh: "Username already exists")
   * ================================================================================
   */
  async register(userData: { name: string; username: string; password: string }) {
    // STEP 1: Send POST request ke backend register endpoint
    // Backend akan validate dan save user ke database
    return await this.makeRequest('/api/auth/register', {
      method: 'POST',
      body: userData, // { name: "John Doe", username: "john", password: "secret123" }
    });
    
    // NOTE: Register tidak otomatis login user
    // Setelah register berhasil, user harus login manual (call login() method)
  }

  /* ================================================================================
   * METHOD: logout()
   * ================================================================================
   * TUJUAN:
   * Logout user dan hapus semua authentication data dari storage.
   * 
   * FLOW:
   * 1. Clear token dan userId dari memory (this.token = null)
   * 2. Clear token dan userId dari AsyncStorage (persistent storage)
   * 3. All subsequent requests akan tidak punya Authorization header
   * 4. Backend akan reject requests dengan error 401 Unauthorized
   * 
   * RETURN: void (tidak return apa-apa)
   * ================================================================================
   */
  async logout() {
    // STEP 1: Clear token dan userId dari memory
    // Setting ke null agar makeRequest() tidak include Authorization header
    this.token = null;
    this.userId = null;
    
    // STEP 2: Clear token dan userId dari AsyncStorage (persistent storage)
    // multiRemove() adalah efficient way untuk delete multiple keys sekaligus
    // Alternative: await AsyncStorage.removeItem('token'); await AsyncStorage.removeItem('userId');
    await AsyncStorage.multiRemove(['token', 'userId']);
    
    console.log('🚪 User logged out, session cleared');
  }

  /* ================================================================================
   * USER METHODS - OPERASI TERKAIT DATA USER
   * ================================================================================
   * TUJUAN:
   * Method-method untuk get dan update informasi user (balance, profile, dll).
   * 
   * User Data Flow:
   * 1. App request user data dari backend
   * 2. Backend query database Prisma
   * 3. Backend return user object
   * 4. App display di UI atau save ke local cache
   * ================================================================================
   */

  /* ================================================================================
   * METHOD: getUserById()
   * ================================================================================
   * TUJUAN:
   * Mengambil data user berdasarkan ID user.
   * Uses public endpoint (tidak perlu authentication).
   * 
   * USE CASE:
   * - Ambil data penerima saat akan transfer uang
   * - Ambil data user setelah login (untuk display di Dashboard)
   * - Sync balance dari backend setelah transaksi
   * 
   * PARAMETER:
   * - id: number - User ID yang ingin diambil datanya
   * 
   * RETURN:
   * - { id, name, username, balance, createdAt }
   * ================================================================================
   */
  async getUserById(id: number) {
    // STEP 1: Call public endpoint (no authentication required)
    // Endpoint: GET /api/users/{id}/public
    // Public endpoint allows mobile app to get user info without token
    // Kenapa perlu public endpoint? Karena saat belum login, user bisa lihat data penerima
    const response = await this.makeRequest(`/api/users/${id}/public`);
    
    // STEP 2: Extract user object dari response
    // Backend response format: { success: true, user: {...} }
    // Jika response.user tidak ada, fallback ke response langsung
    return response?.user || response;
  }

  /* ================================================================================
   * METHOD: getCurrentUser()
   * ================================================================================
   * TUJUAN:
   * Mengambil data user yang sedang login (current logged-in user).
   * Uses authenticated endpoint (memerlukan token).
   * 
   * USE CASE:
   * - Get balance user yang sedang login
   * - Display user profile di settings page
   * - Refresh user data setelah top-up atau payment
   * 
   * RETURN:
   * - { id, name, username, balance, createdAt }
   * ================================================================================
   */
  async getCurrentUser() {
    // STEP 1: Call authenticated endpoint
    // Endpoint: GET /api/users/me
    // Token akan auto di-include di header (lihat makeRequest())
    // Backend akan decode token → extract userId → query database
    const response = await this.makeRequest('/api/users/me');
    
    // STEP 2: Extract user object
    // Backend response format: { success: true, user: {...} }
    console.log('📥 getCurrentUser raw response:', response);
    return response?.user || response;
  }

  /* ================================================================================
   * METHOD: updateUserBalance()
   * ================================================================================
   * TUJUAN:
   * Update balance user di backend (digunakan oleh admin atau setelah transaksi).
   * 
   * USE CASE:
   * - Admin top-up saldo user
   * - Sync balance setelah NFC payment
   * - Adjust balance jika terjadi error transaksi
   * 
   * PARAMETER:
   * - userId: number - ID user yang balance-nya akan diupdate
   * - newBalance: number - Balance baru (bukan delta/increment!)
   * 
   * RETURN:
   * - { success: true, user: {...} } jika berhasil
   * ================================================================================
   */
  async updateUserBalance(userId: number, newBalance: number) {
    // STEP 1: Send PUT request ke balance endpoint
    // Endpoint: PUT /api/users/{userId}/balance
    // Body: { balance: 100000 } ← Balance baru (bukan increment!)
    return await this.makeRequest(`/api/users/${userId}/balance`, {
      method: 'PUT',
      body: { balance: newBalance },
    });
  }

  /* ================================================================================
   * TRANSACTION METHODS - OPERASI TRANSAKSI KEUANGAN
   * ================================================================================
   * TUJUAN:
   * Method-method untuk create transaksi dan get transaction history.
   * 
   * Transaction Flow:
   * 1. User initiate payment (input amount, select receiver)
   * 2. App call createTransaction() atau processNFCPayment()
   * 3. Backend validate (balance cukup, fraud check, dll)
   * 4. Backend create transaction record di database
   * 5. Backend update balance sender dan receiver (atomic transaction)
   * 6. Backend return transaction result
   * 7. App display success/error message ke user
   * ================================================================================
   */

  /* ================================================================================
   * METHOD: getUserTransactions()
   * ================================================================================
   * TUJUAN:
   * Mengambil semua transaksi user tertentu (sent + received transactions).
   * 
   * USE CASE:
   * - Display transaction history di Dashboard
   * - Calculate statistics (total spent, frequency, dll)
   * - Fraud detection (analyze transaction patterns)
   * 
   * PARAMETER:
   * - userId: number - ID user yang ingin diambil transaksinya
   * 
   * RETURN:
   * - Array of transactions: [{ id, senderId, receiverId, amount, createdAt }, ...]
   * ================================================================================
   */
  async getUserTransactions(userId: number) {
    // STEP 1: Call transaction history endpoint
    // Endpoint: GET /api/transactions/user/{userId}
    // Backend akan query semua transaksi where senderId = userId OR receiverId = userId
    return await this.makeRequest(`/api/transactions/user/${userId}`);
  }

  /* ================================================================================
   * METHOD: getTransactionHistory()
   * ================================================================================
   * TUJUAN:
   * Mengambil transaction history untuk current logged-in user.
   * 
   * USE CASE:
   * - Display "My Transactions" page
   * - Show recent transactions di Dashboard
   * 
   * RETURN:
   * - Array of transactions dengan detail sender/receiver
   * ================================================================================
   */
  async getTransactionHistory() {
    // STEP 1: Call authenticated transaction history endpoint
    // Endpoint: GET /api/transactions/history
    // Token di-decode di backend → extract userId → query transactions
    return await this.makeRequest('/api/transactions/history');
  }

  /* ================================================================================
   * METHOD: createTransaction()
   * ================================================================================
   * TUJUAN:
   * Membuat transaksi baru (transfer uang dari sender ke receiver).
   * 
   * FLOW:
   * 1. App send transaction data ke backend
   * 2. Backend validate:
   *    - Balance sender cukup?
   *    - Receiver exists?
   *    - Amount valid? (> 0, not too large)
   *    - Fraud risk acceptable?
   * 3. Backend create transaction dengan Prisma $transaction (atomic)
   * 4. Backend update balance sender (decrease) dan receiver (increase)
   * 5. Backend return transaction result
   * 
   * PARAMETER:
   * - transactionData: {
   *     senderId: number,
   *     receiverId: number,
   *     amount: number,
   *     description?: string,
   *     location?: { latitude, longitude }
   *   }
   * 
   * RETURN:
   * - { success: true, transaction: {...} } jika berhasil
   * - Throw error jika gagal (insufficient balance, fraud detected, dll)
   * ================================================================================
   */
  async createTransaction(transactionData: {
    senderId: number;
    receiverId: number;
    amount: number;
    description?: string;
    location?: any;
  }) {
    // STEP 1: Send POST request ke transaction endpoint
    // Endpoint: POST /api/transactions
    // Backend akan process transaction dengan atomic database operation
    return await this.makeRequest('/api/transactions', {
      method: 'POST',
      body: transactionData,
    });
  }

  /* ================================================================================
   * NFC PAYMENT METHODS - OPERASI PEMBAYARAN VIA NFC
   * ================================================================================
   * TUJUAN:
   * Method-method khusus untuk pembayaran menggunakan NFC (contactless payment).
   * 
   * NFC Payment Flow:
   * 1. User tap phone ke kartu NFC atau phone lain
   * 2. App read NFC data (userId, cardId, dll)
   * 3. App validate NFC data dengan backend
   * 4. User input amount dan confirm payment
   * 5. App send payment data ke backend
   * 6. Backend process payment (sama seperti regular transaction + fraud check)
   * 7. Backend update balance dan create transaction record
   * 8. App display success message
   * ================================================================================
   */

  /* ================================================================================
   * METHOD: processNFCPayment()
   * ================================================================================
   * TUJUAN:
   * Process pembayaran via NFC (phone-to-phone atau phone-to-card).
   * 
   * FLOW:
   * 1. App read NFC data dari receiver
   * 2. User input amount
   * 3. App call processNFCPayment()
   * 4. Backend:
   *    - Validate NFC data (user exists, card linked, dll)
   *    - Run fraud detection
   *    - Create transaction
   *    - Update balances
   *    - Create audit log
   * 5. Return success/error
   * 
   * PARAMETER:
   * - paymentData: {
   *     receiverNFCData: any, // Data dari NFC tag (userId, cardId, dll)
   *     amount: number,
   *     description?: string,
   *     location?: { latitude, longitude }
   *   }
   * 
   * RETURN:
   * - { success: true, transaction: {...} } jika berhasil
   * - Throw error jika fraud detected atau validation failed
   * ================================================================================
   */
  async processNFCPayment(paymentData: {
    receiverNFCData: any;
    amount: number;
    description?: string;
    location?: { latitude: number; longitude: number };
  }) {
    // STEP 1: Send POST request ke NFC payment endpoint
    // Endpoint: POST /api/nfc/payment
    // Backend akan validate NFC data, check fraud, dan process payment
    return await this.makeRequest('/api/nfc/payment', {
      method: 'POST',
      body: paymentData,
    });
  }

  /* ================================================================================
   * METHOD: validateNFCReceiver()
   * ================================================================================
   * TUJUAN:
   * Validate NFC data receiver sebelum payment (pre-validation).
   * 
   * USE CASE:
   * - Check apakah NFC tag valid sebelum user input amount
   * - Display receiver info (name, username) sebelum confirm payment
   * - Prevent payment ke invalid atau blocked user
   * 
   * PARAMETER:
   * - nfcData: any - Data yang dibaca dari NFC tag
   * 
   * RETURN:
   * - { valid: boolean, user: {...} } jika NFC valid
   * - Throw error jika NFC invalid atau user blocked
   * ================================================================================
   */
  async validateNFCReceiver(nfcData: any) {
    // STEP 1: Send POST request ke NFC validate endpoint
    // Endpoint: POST /api/nfc/validate
    // Backend akan check apakah user exists, not blocked, card linked properly
    return await this.makeRequest('/api/nfc/validate', {
      method: 'POST',
      body: { nfcData },
    });
  }

  /* ================================================================================
   * FRAUD DETECTION METHODS - OPERASI DETEKSI ANOMALI DAN FRAUD
   * ================================================================================
   * TUJUAN:
   * Method-method untuk check fraud risk dan report suspicious transactions.
   * 
   * Fraud Detection System:
   * - Uses Z-Score algorithm untuk deteksi anomali statistik
   * - Analyze velocity, amount, frequency, behavior patterns
   * - Generate risk score (0-100) dan risk level (LOW, MEDIUM, HIGH, CRITICAL)
   * - Auto-block transaksi jika risk score terlalu tinggi
   * - Create fraud alerts untuk admin review
   * ================================================================================
   */

  /* ================================================================================
   * METHOD: checkFraudRisk()
   * ================================================================================
   * TUJUAN:
   * Check fraud risk untuk transaksi sebelum diproses (pre-transaction validation).
   * 
   * USE CASE:
   * - Validate transaksi sebelum payment diproses
   * - Display warning ke user jika transaksi berisiko
   * - Block transaksi otomatis jika risk critical
   * 
   * PARAMETER:
   * - transactionData: {
   *     senderId: number,
   *     receiverId: number,
   *     amount: number,
   *     location?: any
   *   }
   * 
   * RETURN:
   * - {
   *     riskScore: number (0-100),
   *     riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
   *     decision: 'ALLOW' | 'REVIEW' | 'BLOCK',
   *     reasons: string[]
   *   }
   * ================================================================================
   */
  async checkFraudRisk(transactionData: {
    senderId: number;
    receiverId: number;
    amount: number;
    location?: any;
  }) {
    // STEP 1: Send POST request ke fraud check endpoint
    // Endpoint: POST /api/fraud/check
    // Backend akan run Z-Score algorithm dan return risk assessment
    return await this.makeRequest('/api/fraud/check', {
      method: 'POST',
      body: transactionData,
    });
  }

  /* ================================================================================
   * METHOD: reportFraudulent()
   * ================================================================================
   * TUJUAN:
   * Report transaksi sebagai fraudulent (user-reported fraud).
   * 
   * USE CASE:
   * - User tidak recognize transaksi (kemungkinan account compromised)
   * - User menerima uang dari sumber mencurigakan
   * - Admin review transaksi dan mark as fraudulent
   * 
   * PARAMETER:
   * - transactionId: number - ID transaksi yang dilaporkan
   * - reason: string - Alasan report (contoh: "Unauthorized transaction")
   * 
   * RETURN:
   * - { success: true, message: "Fraud report submitted" }
   * ================================================================================
   */
  async reportFraudulent(transactionId: number, reason: string) {
    // STEP 1: Send POST request ke fraud report endpoint
    // Endpoint: POST /api/fraud/report
    // Backend akan create fraud alert dan notify admin
    return await this.makeRequest('/api/fraud/report', {
      method: 'POST',
      body: { transactionId, reason },
    });
  }

  /* ================================================================================
   * ADMIN METHODS - OPERASI UNTUK ADMIN DASHBOARD
   * ================================================================================
   * TUJUAN:
   * Method-method khusus untuk admin operations (memerlukan admin role).
   * 
   * Admin Capabilities:
   * - View dashboard statistics (total users, transactions, balance)
   * - View all users dan all transactions
   * - Block/unblock users
   * - Top-up user balance
   * - Clear fraud alerts
   * - Monitor system health
   * ================================================================================
   */

  /* ================================================================================
   * METHOD: getAdminDashboard()
   * ================================================================================
   * TUJUAN:
   * Mengambil statistik dashboard untuk admin page.
   * 
   * RETURN:
   * - {
   *     totalUsers: number,
   *     totalTransactions: number,
   *     totalBalance: number,
   *     activeUsers: number,
   *     recentTransactions: Transaction[],
   *     fraudAlerts: FraudAlert[]
   *   }
   * ================================================================================
   */
  async getAdminDashboard() {
    // STEP 1: Call admin dashboard endpoint
    // Endpoint: GET /api/admin/dashboard
    // Requires admin token (backend validates role)
    return await this.makeRequest('/api/admin/dashboard');
  }

  /* ================================================================================
   * METHOD: getAllUsers()
   * ================================================================================
   * TUJUAN:
   * Mengambil semua users untuk admin management.
   * 
   * RETURN:
   * - Array of users dengan balance dan status
   * ================================================================================
   */
  async getAllUsers() {
    // STEP 1: Call admin users endpoint
    // Endpoint: GET /api/admin/users
    // Returns all users termasuk blocked users
    return await this.makeRequest('/api/admin/users');
  }

  /* ================================================================================
   * METHOD: getAllTransactions()
   * ================================================================================
   * TUJUAN:
   * Mengambil semua transactions untuk monitoring dan audit.
   * 
   * RETURN:
   * - Array of all transactions with sender/receiver details
   * ================================================================================
   */
  async getAllTransactions() {
    // STEP 1: Call admin transactions endpoint
    // Endpoint: GET /api/admin/transactions
    // Returns all transactions in system
    return await this.makeRequest('/api/admin/transactions');
  }

  /* ================================================================================
   * METHOD: blockUser()
   * ================================================================================
   * TUJUAN:
   * Block user (suspend account) karena fraud atau violation.
   * 
   * PARAMETER:
   * - userId: number - ID user yang akan diblock
   * - reason: string - Alasan block (untuk audit log)
   * 
   * RETURN:
   * - { success: true, message: "User blocked" }
   * ================================================================================
   */
  async blockUser(userId: number, reason: string) {
    // STEP 1: Send PUT request ke block endpoint
    // Endpoint: PUT /api/admin/users/{userId}/block
    // Backend akan set user.blocked = true dan record reason
    return await this.makeRequest(`/api/admin/users/${userId}/block`, {
      method: 'PUT',
      body: { reason },
    });
  }

  /* ================================================================================
   * METHOD: unblockUser()
   * ================================================================================
   * TUJUAN:
   * Unblock user yang sebelumnya diblock.
   * 
   * PARAMETER:
   * - userId: number - ID user yang akan di-unblock
   * 
   * RETURN:
   * - { success: true, message: "User unblocked" }
   * ================================================================================
   */
  async unblockUser(userId: number) {
    // STEP 1: Send PUT request ke unblock endpoint
    // Endpoint: PUT /api/admin/users/{userId}/unblock
    // Backend akan set user.blocked = false
    return await this.makeRequest(`/api/admin/users/${userId}/unblock`, {
      method: 'PUT',
    });
  }

  /* ================================================================================
   * DEVICE METHODS - OPERASI UNTUK DEVICE MANAGEMENT
   * ================================================================================
   * TUJUAN:
   * Method-method untuk register dan sync device information.
   * 
   * Device Tracking:
   * - Track device yang digunakan untuk setiap transaksi
   * - Detect suspicious login dari device baru
   * - Sync data antar devices (multi-device support)
   * ================================================================================
   */

  /* ================================================================================
   * METHOD: registerDevice()
   * ================================================================================
   * TUJUAN:
   * Register device baru ke backend (first-time device setup).
   * 
   * PARAMETER:
   * - deviceInfo: {
   *     deviceId: string,
   *     deviceName: string,
   *     platform: string, // 'ios' | 'android'
   *     appVersion: string
   *   }
   * 
   * RETURN:
   * - { success: true, device: {...} }
   * ================================================================================
   */
  async registerDevice(deviceInfo: {
    deviceId: string;
    deviceName: string;
    platform: string;
    appVersion: string;
  }) {
    // STEP 1: Send POST request ke device register endpoint
    // Endpoint: POST /api/devices/register
    // Backend akan save device info untuk tracking
    return await this.makeRequest('/api/devices/register', {
      method: 'POST',
      body: deviceInfo,
    });
  }

  /* ================================================================================
   * METHOD: syncDeviceData()
   * ================================================================================
   * TUJUAN:
   * Sync data dari backend ke device (pull latest data).
   * 
   * USE CASE:
   * - Sync balance after offline mode
   * - Update transaction history
   * - Get latest fraud alerts
   * 
   * RETURN:
   * - { balance, transactions, settings }
   * ================================================================================
   */
  async syncDeviceData() {
    // STEP 1: Get device ID dari storage atau generate baru
    const deviceId = await this.getDeviceId();
    
    // STEP 2: Call device sync endpoint
    // Endpoint: GET /api/devices/{deviceId}/sync
    // Backend akan return latest data untuk device ini
    return await this.makeRequest(`/api/devices/${deviceId}/sync`);
  }

  /* ================================================================================
   * UTILITY METHODS - HELPER FUNCTIONS
   * ================================================================================
   * TUJUAN:
   * Method-method utility untuk health check, connection status, dll.
   * ================================================================================
   */

  /* ================================================================================
   * METHOD: healthCheck()
   * ================================================================================
   * TUJUAN:
   * Check apakah backend server online dan responsive.
   * 
   * USE CASE:
   * - Check connection saat app startup
   * - Periodic health check untuk monitoring
   * - Display "Server Offline" message jika backend down
   * 
   * RETURN:
   * - { status: 'ok', timestamp: Date } jika server online
   * - Throw error jika server offline atau unreachable
   * ================================================================================
   */
  async healthCheck() {
    // STEP 1: Call health check endpoint
    // Endpoint: GET /api/health
    // Backend akan return status dan timestamp
    // Endpoint ini selalu public (no authentication required)
    return await this.makeRequest('/api/health');
  }

  /* ================================================================================
   * METHOD: getConnectionStatus()
   * ================================================================================
   * TUJUAN:
   * Get current connection status (URL, auth state, userId).
   * 
   * USE CASE:
   * - Display connection info di settings page
   * - Debug connection issues
   * - Check apakah user authenticated
   * 
   * RETURN:
   * - {
   *     url: string,
   *     authenticated: boolean,
   *     userId: string | null
   *   }
   * ================================================================================
   */
  getConnectionStatus() {
    // STEP 1: Return current connection state
    // Ini adalah synchronous method (tidak hit backend)
    return {
      url: this.baseUrl,                    // Backend URL yang sedang digunakan
      authenticated: !!this.token,          // Boolean: apakah user punya token
      userId: this.userId,                  // Current logged-in user ID
    };
  }

  /* ================================================================================
   * METHOD: getDeviceId() - PRIVATE HELPER
   * ================================================================================
   * TUJUAN:
   * Get atau generate unique device ID untuk tracking.
   * 
   * FLOW:
   * 1. Check apakah device ID sudah ada di AsyncStorage
   * 2. Jika sudah ada, return yang lama
   * 3. Jika belum, generate ID baru dan save ke storage
   * 
   * RETURN:
   * - string: Unique device ID (contoh: "ios_ABC123...")
   * ================================================================================
   */
  private async getDeviceId(): Promise<string> {
    try {
      // STEP 1: Check apakah device ID sudah tersimpan
      let deviceId = await AsyncStorage.getItem('deviceId');
      
      // STEP 2: Jika belum ada, generate device ID baru
      if (!deviceId) {
        // Generate format: {platform}_{expoDeviceId atau random}
        // Platform.OS = 'ios' atau 'android'
        // Constants.deviceId = unique ID dari Expo
        // Math.random().toString(36) = generate random string
        deviceId = Platform.OS + '_' + Constants.deviceId || Math.random().toString(36);
        
        // Save ke AsyncStorage agar persistent
        await AsyncStorage.setItem('deviceId', deviceId);
        console.log('📱 New device ID generated:', deviceId);
      }
      
      return deviceId;
      
    } catch (error) {
      // STEP 3: Fallback jika error (generate temporary ID)
      // Format: {platform}_unknown_{timestamp}
      console.error('❌ Error getting device ID:', error);
      return Platform.OS + '_unknown_' + Date.now();
    }
  }

  /* ================================================================================
   * METHOD: destroy()
   * ================================================================================
   * TUJUAN:
   * Cleanup method untuk destroy instance (logout dan clear semua data).
   * 
   * USE CASE:
   * - App shutdown atau force logout
   * - Clear all cached data
   * - Reset APIService ke state awal
   * 
   * RETURN: void
   * ================================================================================
   */
  destroy(): void {
    // STEP 1: Clear token dan userId dari memory
    this.token = null;
    this.userId = null;
    
    console.log('🧹 API Service destroyed and cleaned up');
  }
}

/* ==================================================================================
 * EXPORT SINGLETON INSTANCE
 * ==================================================================================
 * TUJUAN:
 * Export instance tunggal APIService agar bisa digunakan di file lain.
 * 
 * PATTERN:
 * - Create singleton instance saat module di-import
 * - Export instance (bukan class) agar caller tidak perlu getInstance()
 * - Legacy exports untuk backward compatibility
 * 
 * USAGE EXAMPLES:
 * ```typescript
 * import { apiService } from './apiService';
 * 
 * // Login
 * const result = await apiService.login({ username, password });
 * 
 * // Get user
 * const user = await apiService.getUserById(123);
 * 
 * // Process payment
 * await apiService.processNFCPayment({ receiverNFCData, amount });
 * ```
 * ==================================================================================
 */

// Export singleton instance (recommended usage)
// Instance ini sudah di-initialize dan ready to use
export const apiService = APIService.getInstance();

// Legacy exports untuk backward compatibility
// Dulu ada 2 class terpisah: adminConnector dan backendAPI
// Sekarang unified jadi 1 class: APIService
// Tapi untuk tidak break existing code, kita export dengan nama lama juga
export const adminConnector = apiService;
export const backendAPI = apiService;

/* ==================================================================================
 * AUTO-INITIALIZATION
 * ==================================================================================
 * Initialize APIService saat module pertama kali di-import.
 * Ini akan load token dari AsyncStorage jika ada.
 * ==================================================================================
 */
apiService.initialize();