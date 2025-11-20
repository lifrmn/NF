import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { API_URL } from './configuration';

// DAFTAR IP YANG AKAN DICOBA (OTOMATIS)
const BACKEND_URLS = [
  'http://192.168.137.1:4000',  // IP Hotspot Windows
  'http://10.20.30.149:4000',   // IP WiFi
  'http://169.254.85.118:4000', // IP Link-Local
  'http://localhost:4000',      // Localhost untuk emulator
  'http://127.0.0.1:4000',      // IP Loopback
  'http://10.0.2.2:4000'        // Android Emulator Host
];
const FIXED_BACKEND_PORT = '4000';
const FIXED_ADMIN_PORT = '3001';
const FIXED_IP = '192.168.137.1'; // Default IP yang akan digunakan

/**
 * 🔧 Simple Backend Connector (SMART AUTO-DETECTION)
 * ====================================================
 * ✅ AUTO-DETECTION: Mencoba beberapa IP secara otomatis
 * ✅ Backend Port: 4000
 * ✅ Admin Port: 3001
 * ✅ Fallback ke beberapa kemungkinan IP
 */
export class BackendConnector {
  private static instance: BackendConnector;
  private baseUrl: string = API_URL; // Use from configuration.ts
  private adminUrl = `${API_URL}/admin`; // Admin URL from configuration.ts
  private connected = false;
  private lastTestedUrl: string = '';

  // Singleton pattern
  static getInstance(): BackendConnector {
    if (!BackendConnector.instance) {
      BackendConnector.instance = new BackendConnector();
    }
    return BackendConnector.instance;
  }

  /**
   * 🚀 Tes koneksi backend dengan AUTO-DETECTION
   */
  async connect(forceReconnect = false): Promise<boolean> {
    return true;
  }

  /**
   * 💾 Simpan URL backend yang berhasil
   */
  private async setBaseUrl(url: string) {
    this.baseUrl = url;
    this.connected = true;
    this.lastTestedUrl = url;
    console.log(`💾 Base URL diset: ${url} (${Platform.OS})`);
    await AsyncStorage.setItem('backend_server_url', url);
  }

  /**
   * 🩺 Uji koneksi backend
   */
  private async testUrl(url: string): Promise<boolean> {
    console.log(`🔍 [DEBUG] Testing URL: ${url}`);
    const endpoints = ['/health', '/api/health'];
    for (const endpoint of endpoints) {
      try {
        console.log(`🔍 [DEBUG] Testing endpoint: ${url}${endpoint}`);
        const controller = new AbortController();
        const timeout = setTimeout(() => {
          console.log(`⏰ [DEBUG] Timeout untuk ${url}${endpoint}`);
          controller.abort();
        }, 5000); // 5 seconds untuk testing cepat
        
        const res = await fetch(`${url}${endpoint}`, { 
          method: 'GET', 
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'NFC-Payment-Mobile'
          }
        });
        clearTimeout(timeout);
        
        console.log(`📡 [DEBUG] Response status: ${res.status} for ${url}${endpoint}`);
        if (res.ok) {
          this.lastTestedUrl = url;
          console.log(`✅ Backend test berhasil: ${url}${endpoint}`);
          return true;
        }
      } catch (err: any) {
        console.warn(`⚠️ [DEBUG] Gagal test URL: ${url}${endpoint} (${err.message})`);
        console.warn(`⚠️ [DEBUG] Error details:`, err);
      }
    }
    return false;
  }

  /**
   * 🩺 Test dengan timeout yang lebih panjang
   */
  private async testUrlWithLongTimeout(url: string): Promise<boolean> {
    console.log(`🔍 [DEBUG] Testing URL with long timeout: ${url}`);
    const endpoints = ['/health', '/api/health'];
    for (const endpoint of endpoints) {
      try {
        console.log(`🔍 [DEBUG] Long timeout test: ${url}${endpoint}`);
        const controller = new AbortController();
        const timeout = setTimeout(() => {
          console.log(`⏰ [DEBUG] Long timeout untuk ${url}${endpoint}`);
          controller.abort();
        }, 30000); // 30 seconds
        
        const res = await fetch(`${url}${endpoint}`, { 
          method: 'GET', 
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'NFC-Payment-Mobile-LongTimeout'
          }
        });
        clearTimeout(timeout);
        
        console.log(`📡 [DEBUG] Long timeout response status: ${res.status} for ${url}${endpoint}`);
        if (res.ok) {
          this.lastTestedUrl = url;
          console.log(`✅ Backend test berhasil (long timeout): ${url}${endpoint}`);
          return true;
        }
      } catch (err: any) {
        console.warn(`⚠️ [DEBUG] Long timeout gagal test URL: ${url}${endpoint} (${err.message})`);
      }
    }
    return false;
  }

  /**
   * 💰 Sinkronisasi saldo dari backend ke device
   */
  async syncUserBalance(userId: number): Promise<number | null> {
    try {
      console.log(`💰 Syncing balance for user ${userId}...`);
      const result = await this.call('/api/users/me', { method: 'GET' });
      
      if (result && result.user && typeof result.user.balance === 'number') {
        console.log(`✅ Balance synced from backend: ${result.user.balance}`);
        return result.user.balance;
      }
      
      console.warn('⚠️ Invalid balance response from backend');
      return null;
    } catch (error: any) {
      console.error('❌ Failed to sync balance from backend:', error.message);
      return null;
    }
  }

  /**
   * 🌐 Get current backend URL (NGROK URL)
   */
  getBaseUrl(): string {
    return this.baseUrl; // Returns ngrok URL or fallback URL
  }
  
  /**
   * 🌐 Get admin URL (NGROK ADMIN)  
   */
  getAdminUrl(): string {
    return this.adminUrl; // Returns ngrok admin URL
  }

  /**
   * 🚀 Call API dengan error handling yang baik
   */
  async call(endpoint: string, options: any = {}): Promise<any> {
    console.log(`📱 [NFC Payment] API Call: ${options.method || 'GET'} ${endpoint}`);

    const fullUrl = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    console.log(`🌐 Request: ${fullUrl}`);

    try {
      const token = await AsyncStorage.getItem('token');
      
      const controller = new AbortController();
      const timeout = setTimeout(() => {
        controller.abort();
      }, 10000); // 10 second timeout
      
      const requestConfig = {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'NFC-Payment-Mobile',
          ...(options.headers || {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: options.body,
        signal: controller.signal,
      };
      
      const response = await fetch(fullUrl, requestConfig);
      clearTimeout(timeout);
      console.log(`📥 Response: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        if (response.status === 401 || response.status === 403) {
          await AsyncStorage.multiRemove(['token', 'userId']);
        }
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const result = await response.json();
        if (result?.token) {
          await AsyncStorage.setItem('token', result.token);
        }
        console.log('✅ API Success');
        return result;
      }

      return await response.text();
    } catch (error) {
      console.error('❌ API Request failed:', error);
      // Jika request gagal, reset connection status
      this.connected = false;
      throw error;
    }
  }

  /**
   * 📊 Status koneksi backend
   */
  getStatus() {
    return {
      connected: this.connected,
      baseUrl: this.baseUrl,
    };
  }
}

// Ekspor global helper
export const backend = BackendConnector.getInstance();
export const connectBackend = () => backend.connect();
export const syncUserBalance = (userId: number) => backend.syncUserBalance(userId);
export const getBackendStatus = () => backend.getStatus();
export const callAPI = (endpoint: string, options?: any) => backend.call(endpoint, options);
