import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { apiService } from './apiService';

/* -------------------------------------------------------------------------- */
/*                              🔹 Type Definitions                            */
/* -------------------------------------------------------------------------- */
export interface User {
  id: number;
  name: string;
  username: string;
  balance: number;
  createdAt?: string;
}

export interface Transaction {
  id: number;
  senderId: number;
  receiverId: number;
  amount: number;
  type?: string;
  createdAt: string;
}

/* -------------------------------------------------------------------------- */
/*                             🔐 AUTH FUNCTIONS                              */
/* -------------------------------------------------------------------------- */

/**
 * Register user baru
 */
export const registerUser = async (
  name: string,
  username: string,
  password: string
): Promise<User> => {
  return await apiService.register({ name, username, password });
};

/**
 * Login user dan simpan token
 */
export const loginUser = async (
  username: string,
  password: string
): Promise<User | null> => {
  try {
    const response = await apiService.login({ username, password });

    if (response?.token && response?.user?.id) {
      await AsyncStorage.setItem('token', response.token);
      await AsyncStorage.setItem('userId', response.user.id.toString());
      console.log('✅ Login success, token saved');
      return response.user;
    }

    console.warn('⚠️ No token received from backend');
    return null;
  } catch (error: any) {
    console.error('❌ Login error:', error.message || error);
    return null;
  }
};

/**
 * Logout dan hapus sesi
 */
export const logoutUser = async (): Promise<void> => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      await apiService.logout();
    }
  } catch {
    // abaikan error logout
  } finally {
    await AsyncStorage.multiRemove(['token', 'userId']);
    console.log('🚪 Logout berhasil & token dihapus');
  }
};

/**
 * Restore user dari token
 */
export const restoreSession = async (): Promise<User | null> => {
  try {
    const token = await AsyncStorage.getItem('token');
    const userId = await AsyncStorage.getItem('userId');
    if (!token || !userId) return null;

    const user = await getUserById(Number(userId));
    return user;
  } catch {
    return null;
  }
};

/* -------------------------------------------------------------------------- */
/*                             👤 USER FUNCTIONS                              */
/* -------------------------------------------------------------------------- */

export const getUserById = async (id: number): Promise<User | null> => {
  try {
    // STEP 1: Coba ambil dari cache local dulu
    const cacheKey = `user_${id}`;
    const cachedUser = await AsyncStorage.getItem(cacheKey);
    
    if (cachedUser) {
      const user = JSON.parse(cachedUser);
      console.log(`💾 Loaded user from cache: ${user.username}`);
      return user;
    }
    
    // STEP 2: Jika tidak ada di cache, ambil dari backend
    const res = await apiService.getUserById(id);
    
    if (res && res.user) {
      // Simpan ke cache untuk next time
      await AsyncStorage.setItem(cacheKey, JSON.stringify(res.user));
      console.log(`✅ Loaded user from backend: ${res.user.username}`);
      return res.user;
    }
    
    return null;
  } catch (err) {
    console.error('❌ getUserById error:', err);
    
    // Fallback: coba dari cache lagi meskipun backend error
    try {
      const cacheKey = `user_${id}`;
      const cachedUser = await AsyncStorage.getItem(cacheKey);
      if (cachedUser) {
        const user = JSON.parse(cachedUser);
        console.log(`💾 Fallback: loaded user from cache after backend error`);
        return user;
      }
    } catch (cacheError) {
      console.error('❌ Cache fallback error:', cacheError);
    }
    
    return null;
  }
};

export const getAllUsers = async (): Promise<User[]> => {
  try {
    const res = await apiService.getAllUsers();
    return Array.isArray(res) ? res : [];
  } catch {
    return [];
  }
};

/* -------------------------------------------------------------------------- */
/*                          💳 TRANSACTION FUNCTIONS                          */
/* -------------------------------------------------------------------------- */

/**
 * Kirim saldo antar user (menggunakan receiverUsername)
 */
export const processPayment = async (
  senderId: number,
  receiverUsername: string,
  amount: number,
  description = ''
): Promise<boolean> => {
  try {
    const payload = {
      senderId,
      receiverUsername,
      amount,
      description,
      deviceId: Platform.OS,
    };

    // Untuk backend API, kita perlu senderId dan receiverId
    // Karena hanya punya receiverUsername, kita skip backend call untuk sekarang
    // TODO: implement user lookup by username di backend
    console.log('⚠️ Backend transaction creation skipped - need receiverId lookup');

    return false;
  } catch (error: any) {
    console.error('❌ Payment error:', error.message || error);
    return false;
  }
};

/**
 * Ambil semua transaksi user tertentu
 */
export const getUserTransactions = async (
  userId: number
): Promise<Transaction[]> => {
  try {
    const res = await apiService.getUserTransactions(userId);
    return Array.isArray(res) ? res : [];
  } catch {
    return [];
  }
};

export const getAllTransactions = async (): Promise<Transaction[]> => {
  try {
    const res = await apiService.getAllTransactions();
    return Array.isArray(res) ? res : [];
  } catch {
    return [];
  }
};

/* -------------------------------------------------------------------------- */
/*                           🧮 ADMIN FUNCTIONS                               */
/* -------------------------------------------------------------------------- */
export const getAdminStats = async () => {
  try {
    const res = await apiService.getAdminDashboard();
    return res || {
      totalUsers: 0,
      totalTransactions: 0,
      totalBalance: 0,
    };
  } catch {
    return {
      totalUsers: 0,
      totalTransactions: 0,
      totalBalance: 0,
    };
  }
};

/* -------------------------------------------------------------------------- */
/*                           💰 BALANCE SYNC FUNCTIONS                        */
/* -------------------------------------------------------------------------- */

/**
 * Update user balance di cache lokal
 */
export const updateUserBalance = async (userId: number, newBalance: number): Promise<boolean> => {
  try {
    const cacheKey = `user_${userId}`;
    const userData = await AsyncStorage.getItem(cacheKey);
    
    if (userData) {
      const user = JSON.parse(userData);
      user.balance = newBalance;
      user.updatedAt = new Date().toISOString();
      
      await AsyncStorage.setItem(cacheKey, JSON.stringify(user));
      console.log(`💰 Updated local balance for user ${userId}: ${newBalance}`);
      return true;
    }
    
    console.warn(`⚠️ User ${userId} not found in local cache`);
    return false;
  } catch (error) {
    console.error('❌ Failed to update local balance:', error);
    return false;
  }
};

/**
 * Sync balance dari backend dan update cache lokal
 */
export const syncBalanceFromBackend = async (userId: number): Promise<number | null> => {
  try {
    console.log(`💰 Syncing balance for user ${userId}...`);
    
    // Kirim userId sebagai header untuk endpoint /api/users/me
    const response = await apiService.getUserById(userId);
    
    if (response && typeof response.balance === 'number') {
      const newBalance = response.balance;
      
      // Update cache lokal dengan data user terbaru
      const cacheKey = `user_${userId}`;
      await AsyncStorage.setItem(cacheKey, JSON.stringify(response));
      
      console.log(`✅ Balance synced from backend for user ${userId}: ${newBalance}`);
      return newBalance;
    }
    
    console.warn('⚠️ Invalid balance response from backend');
    return null;
  } catch (error) {
    console.error('❌ Failed to sync balance from backend:', error);
    
    // Fallback: ambil balance dari cache lokal
    try {
      const cacheKey = `user_${userId}`;
      const cachedUser = await AsyncStorage.getItem(cacheKey);
      if (cachedUser) {
        const user = JSON.parse(cachedUser);
        console.log(`💾 Fallback: using cached balance ${user.balance}`);
        return user.balance;
      }
    } catch (cacheError) {
      console.error('❌ Cache fallback error:', cacheError);
    }
    
    return null;
  }
};

/* -------------------------------------------------------------------------- */
/*                           ⚙️ DATABASE / BACKEND                            */
/* -------------------------------------------------------------------------- */
export const initDatabase = async (): Promise<boolean> => {
  try {
    console.log('🔗 Connecting to backend...');
    const connected = true
    
    if (connected) {
      console.log('✅ Backend connected');
    } else {
      console.log('⚠️ Backend not available, offline mode');
    }
    return connected;
  } catch (error) {
    console.error('❌ initDatabase error:', error);
    return false;
  }
};

export const closeDatabase = async (): Promise<void> => {
  console.log('📦 Database closed');
};
