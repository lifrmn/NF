import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { API_URL } from './configuration';

/**
 * 🚀 Unified API Service for NFC Payment System
 * ==============================================
 * Combines AdminConnector + BackendAPI functionality
 * - Backend monitoring & connection management
 * - All API calls for authentication, payments, admin
 * - NFC payment integration with fraud detection
 * - Compatible with Prisma backend & ngrok
 */

export class APIService {
  private static instance: APIService;
  private token: string | null = null;
  private userId: string | null = null;
  private baseUrl = API_URL;

  static getInstance(): APIService {
    if (!APIService.instance) {
      APIService.instance = new APIService();
    }
    return APIService.instance;
  }

  async initialize(): Promise<boolean> {
    try {
      this.token = await AsyncStorage.getItem('token');
      this.userId = await AsyncStorage.getItem('userId');
      console.log('🔧 API Service initialized');
      console.log('📡 Ngrok URL:', this.baseUrl);
      return true;
    } catch (error) {
      console.error('❌ API Service initialization failed:', error);
      return false;
    }
  }

  // ========================= HTTP REQUEST HANDLER =========================

  private async makeRequest(endpoint: string, options: any = {}): Promise<any> {
    const fullUrl = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      
      const requestConfig = {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'User-Agent': 'NFC-Payment-Mobile',
          ...(options.headers || {}),
          ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
          ...(this.userId ? { 'x-user-id': this.userId } : {}),
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      };

      console.log(`📱 API Call: ${options.method || 'GET'} ${fullUrl}`);
      
      const response = await fetch(fullUrl, requestConfig);
      clearTimeout(timeout);
      
      console.log(`📥 Response: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        
        // Handle authentication errors
        if (response.status === 401 || response.status === 403) {
          await this.logout();
        }
        
        // Parse error response to extract detailed error info
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        
        // Create detailed error message
        const errorMessage = `API Error ${response.status}: ${JSON.stringify(errorData)}`;
        throw new Error(errorMessage);
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const result = await response.json();
        if (result?.token) {
          this.token = result.token;
          await AsyncStorage.setItem('token', result.token);
        }
        return result;
      }

      return await response.text();
    } catch (error: any) {
      console.error('❌ API Request failed:', error.message);
      throw error;
    }
  }

  // ========================= HTTP METHOD SHORTCUTS =========================

  async get(endpoint: string) {
    return await this.makeRequest(endpoint, { method: 'GET' });
  }

  async post(endpoint: string, body?: any) {
    return await this.makeRequest(endpoint, { method: 'POST', body });
  }

  async put(endpoint: string, body?: any) {
    return await this.makeRequest(endpoint, { method: 'PUT', body });
  }

  async delete(endpoint: string) {
    return await this.makeRequest(endpoint, { method: 'DELETE' });
  }

  // ========================= AUTHENTICATION METHODS =========================

  async login(credentials: { username: string; password: string }) {
    const response = await this.makeRequest('/api/auth/login', {
      method: 'POST',
      body: credentials,
    });
    
    if (response?.token) {
      this.token = response.token;
      this.userId = response.user.id.toString();
      await AsyncStorage.setItem('token', response.token);
      await AsyncStorage.setItem('userId', response.user.id.toString());
    }
    
    return response;
  }

  async register(userData: { name: string; username: string; password: string }) {
    return await this.makeRequest('/api/auth/register', {
      method: 'POST',
      body: userData,
    });
  }

  async logout() {
    this.token = null;
    this.userId = null;
    await AsyncStorage.multiRemove(['token', 'userId']);
  }

  // ========================= USER METHODS =========================

  async getUserById(id: number) {
    const response = await this.makeRequest(`/api/users/${id}`);
    // Backend response: { success: true, user: {...} }
    return response?.user || response;
  }

  async getCurrentUser() {
    const response = await this.makeRequest('/api/users/me');
    // Backend response: { success: true, user: {...} }
    console.log('📥 getCurrentUser raw response:', response);
    return response?.user || response;
  }

  async updateUserBalance(userId: number, newBalance: number) {
    return await this.makeRequest(`/api/users/${userId}/balance`, {
      method: 'PUT',
      body: { balance: newBalance },
    });
  }

  // ========================= TRANSACTION METHODS =========================

  async getUserTransactions(userId: number) {
    return await this.makeRequest(`/api/transactions/user/${userId}`);
  }

  async getTransactionHistory() {
    return await this.makeRequest('/api/transactions/history');
  }

  async createTransaction(transactionData: {
    senderId: number;
    receiverId: number;
    amount: number;
    description?: string;
    location?: any;
  }) {
    return await this.makeRequest('/api/transactions', {
      method: 'POST',
      body: transactionData,
    });
  }

  // ========================= NFC PAYMENT METHODS =========================

  async processNFCPayment(paymentData: {
    receiverNFCData: any;
    amount: number;
    description?: string;
    location?: { latitude: number; longitude: number };
  }) {
    return await this.makeRequest('/api/nfc/payment', {
      method: 'POST',
      body: paymentData,
    });
  }

  async validateNFCReceiver(nfcData: any) {
    return await this.makeRequest('/api/nfc/validate', {
      method: 'POST',
      body: { nfcData },
    });
  }

  // ========================= FRAUD DETECTION METHODS =========================

  async checkFraudRisk(transactionData: {
    senderId: number;
    receiverId: number;
    amount: number;
    location?: any;
  }) {
    return await this.makeRequest('/api/fraud/check', {
      method: 'POST',
      body: transactionData,
    });
  }

  async reportFraudulent(transactionId: number, reason: string) {
    return await this.makeRequest('/api/fraud/report', {
      method: 'POST',
      body: { transactionId, reason },
    });
  }

  // ========================= ADMIN METHODS =========================

  async getAdminDashboard() {
    return await this.makeRequest('/api/admin/dashboard');
  }

  async getAllUsers() {
    return await this.makeRequest('/api/admin/users');
  }

  async getAllTransactions() {
    return await this.makeRequest('/api/admin/transactions');
  }

  async blockUser(userId: number, reason: string) {
    return await this.makeRequest(`/api/admin/users/${userId}/block`, {
      method: 'PUT',
      body: { reason },
    });
  }

  async unblockUser(userId: number) {
    return await this.makeRequest(`/api/admin/users/${userId}/unblock`, {
      method: 'PUT',
    });
  }

  // ========================= DEVICE METHODS =========================

  async registerDevice(deviceInfo: {
    deviceId: string;
    deviceName: string;
    platform: string;
    appVersion: string;
  }) {
    return await this.makeRequest('/api/devices/register', {
      method: 'POST',
      body: deviceInfo,
    });
  }

  async syncDeviceData() {
    const deviceId = await this.getDeviceId();
    return await this.makeRequest(`/api/devices/${deviceId}/sync`);
  }

  // ========================= UTILITY METHODS =========================

  async healthCheck() {
    return await this.makeRequest('/api/health');
  }

  getConnectionStatus() {
    return {
      url: this.baseUrl,
      authenticated: !!this.token,
      userId: this.userId,
    };
  }

  private async getDeviceId(): Promise<string> {
    try {
      let deviceId = await AsyncStorage.getItem('deviceId');
      if (!deviceId) {
        deviceId = Platform.OS + '_' + Constants.deviceId || Math.random().toString(36);
        await AsyncStorage.setItem('deviceId', deviceId);
      }
      return deviceId;
    } catch (error) {
      return Platform.OS + '_unknown_' + Date.now();
    }
  }

  // ========================= RESET & CLEANUP =========================

  destroy(): void {
    this.token = null;
    this.userId = null;
    console.log('🧹 API Service destroyed');
  }
}

// ========================= EXPORT SINGLETON =========================

export const apiService = APIService.getInstance();

// Legacy exports for backward compatibility
export const adminConnector = apiService;
export const backendAPI = apiService;

// Initialize on import
apiService.initialize();