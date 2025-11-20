import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator, StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerRootComponent } from 'expo';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  AppState,
  AppStateStatus,
  Platform,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

// ==================== Screens ====================
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import NFCScreen from './src/screens/NFCScreen';

// ==================== Utils ====================
import { getUserById, initDatabase } from './src/utils/database';
import { connectBackend } from './src/utils/simpleBackend';
import { NFCService } from './src/utils/nfc';
import { apiService } from './src/utils/apiService';
// Removed - now using apiService

// ==================== Navigation Types ====================
export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Dashboard: undefined;
  NFC: undefined;
};

export type NavigationProp = StackNavigationProp<RootStackParamList>;
const Stack = createStackNavigator<RootStackParamList>();

// ==================== Types ====================
type AuthState = 'loading' | 'signedIn' | 'signedOut';
type AppScreen = 'login' | 'register' | 'dashboard' | 'nfc';

interface AppUser {
  id: number;
  name: string;
  username: string;
  balance: number;
  email?: string;
}

// ==================== MAIN APP ====================
export default function App() {
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  console.log('🚀 App.tsx rendered, authState:', authState);

  // ========================================================
  // Initialization
  // ========================================================
  useEffect(() => {
    // Set timeout untuk paksa ke login jika loading > 20 detik
    const forceLoginTimeout = setTimeout(() => {
      if (authState === 'loading') {
        console.warn('⚠️ Loading timeout, paksa ke login screen');
        setAuthState('signedOut');
      }
    }, 20000);

    initializeApp();
    
    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      clearTimeout(forceLoginTimeout);
      sub?.remove?.();
      NFCService.cleanup();
    };
  }, []);

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      console.log('📱 App aktif kembali, sync status device...');
      try {
        const deviceId =
          (await AsyncStorage.getItem('deviceId')) || `device_${Date.now()}`;
        const deviceInfo = {
          deviceId,
          platform: Platform.OS,
          appVersion: '1.0.0',
          timestamp: new Date().toISOString(),
        };

        const userData = currentUser
          ? {
              userId: currentUser.id,
              username: currentUser.username || currentUser.email?.split('@')[0] || `user_${currentUser.id}`,
              balance: currentUser.balance,
            }
          : undefined;

        await apiService.registerDevice(deviceInfo);
        console.log('✅ Device status tersinkron ke backend');
      } catch (err) {
        console.log('⚠️ Gagal sync device status:', err);
      }
    }
  };

  const initializeApp = async () => {
    try {
      setError(null);
      console.log('🚀 Memulai inisialisasi aplikasi...');

      // === 1️⃣ Init Local DB (SQLite / Backend Proxy)
      console.log('1️⃣ Inisialisasi database...');
      await Promise.race([
        initDatabase(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Database timeout')), 10000))
      ]);
      console.log('✅ Database ready');

      // === 2️⃣ Init Backend API (Restore token + Base URL)
      console.log('2️⃣ Inisialisasi Backend API...');
      await Promise.race([
        apiService.initialize(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Backend API timeout')), 10000))
      ]);
      console.log('✅ Backend API ready');

      // === 3️⃣ Connect to Backend (Health check)
      console.log('3️⃣ Koneksi ke backend server...');
      const connected = await Promise.race([
        connectBackend(),
        new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 10000))
      ]);
      
      if (!connected) {
        console.warn('⚠️ Backend tidak terhubung, mode offline');
        // Jangan throw error, lanjutkan ke auth check
      } else {
        console.log('✅ Backend connected');
      }

      // === 4️⃣ Register Device ke Admin System (optional)
      try {
        console.log('4️⃣ Register device...');
        const deviceId =
          (await AsyncStorage.getItem('deviceId')) || `device_${Date.now()}`;
        await AsyncStorage.setItem('deviceId', deviceId);

        const deviceInfo = {
          deviceId,
          platform: Platform.OS,
          appVersion: '1.0.0',
          timestamp: new Date().toISOString(),
        };

        // Start API service monitoring
        apiService.startConnectionMonitoring();
        await Promise.race([
          apiService.registerDevice(deviceInfo),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Sync timeout')), 3000))
        ]);
        console.log('✅ Device registered ke admin system');
      } catch (err) {
        console.warn('⚠️ Device sync failed, continue:', err);
        // Tidak fatal, lanjutkan
      }

      // === 5️⃣ Cek Auth State
      console.log('5️⃣ Cek authentication...');
      await checkAuthState();

      console.log('✅ Aplikasi siap digunakan!');
    } catch (err: any) {
      console.error('❌ Initialization error:', err);
      // Tetap lanjutkan ke login screen
      setAuthState('signedOut');
    }
  };

  // ========================================================
  // Authentication Handling
  // ========================================================
  const checkAuthState = async () => {
    try {
      const storedUserId = await AsyncStorage.getItem('userId');
      if (storedUserId) {
        const user = await getUserById(Number(storedUserId));
        if (user) {
          const appUser: AppUser = {
            id: user.id,
            name: user.name,
            username: user.username,
            email: `${user.username}@nfcpay.com`,
            balance: user.balance || 0,
          };
          setCurrentUser(appUser);
          setAuthState('signedIn');
          console.log('✅ User authenticated:', appUser.name);
          return;
        }
      }
      setAuthState('signedOut');
    } catch (err) {
      console.error('Error checking authentication:', err);
      setAuthState('signedOut');
    }
  };

  const handleLogin = async (userData: {
    id: number;
    name: string;
    username: string;
    balance?: number;
  }) => {
    try {
      const appUser: AppUser = {
        id: userData.id,
        name: userData.name,
        username: userData.username,
        email: `${userData.username}@nfcpay.com`,
        balance: userData.balance || 0,
      };
      await AsyncStorage.setItem('userId', appUser.id.toString());
      setCurrentUser(appUser);
      setAuthState('signedIn');

      navigationRef.current?.reset({
        index: 0,
        routes: [{ name: 'Dashboard' }],
      });
      console.log('✅ Login success:', appUser.name);
    } catch (err) {
      console.error('Login error:', err);
      setError('Gagal login, silakan coba lagi.');
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('userId');
      setCurrentUser(null);
      setAuthState('signedOut');
      NFCService.cleanup();

      navigationRef.current?.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
      console.log('✅ Logout success');
    } catch (err) {
      console.error('Logout error:', err);
      setError('Logout gagal. Coba lagi.');
    }
  };

  // ========================================================
  // Navigation Shortcuts
  // ========================================================
  const navigateToScreen = useCallback((screen: AppScreen) => {
    if (!navigationRef.current) return;
    try {
      navigationRef.current.navigate(
        screen === 'register'
          ? 'Register'
          : screen === 'dashboard'
          ? 'Dashboard'
          : screen === 'nfc'
          ? 'NFC'
          : 'Login'
      );
      console.log(`✅ Navigasi ke: ${screen}`);
    } catch (err) {
      console.error('Navigation error:', err);
    }
  }, []);

  // ========================================================
  // Loading & Error Screens
  // ========================================================
  if (authState === 'loading') {
    // Auto fallback to signedOut after 10 seconds
    setTimeout(() => {
      if (authState === 'loading') {
        console.warn('⚠️ Loading timeout, forcing to login screen');
        setAuthState('signedOut');
      }
    }, 10000);
    
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Memuat aplikasi NFC Payment...</Text>
        <Text style={styles.loadingSubtext}>Mohon tunggu...</Text>
      </SafeAreaView>
    );
  }

  if (error && authState === 'signedOut') {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Terjadi Kesalahan</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Text
          style={styles.retryText}
          onPress={() => {
            setError(null);
            initializeApp();
          }}
        >
          Coba lagi
        </Text>
      </SafeAreaView>
    );
  }

  // ========================================================
  // Main App Navigation
  // ========================================================
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            gestureEnabled: true,
            animationEnabled: true,
          }}
          initialRouteName={authState === 'signedOut' ? 'Login' : 'Dashboard'}
        >
          <Stack.Screen name="Login" options={{ headerShown: false }}>
            {() => (
              <LoginScreen
                onLogin={handleLogin}
                onNavigateToRegister={() => navigateToScreen('register')}
              />
            )}
          </Stack.Screen>

          <Stack.Screen name="Register" options={{ headerShown: false }}>
            {() => (
              <RegisterScreen
                onRegisterSuccess={() => navigateToScreen('login')}
                onNavigateToLogin={() => navigateToScreen('login')}
              />
            )}
          </Stack.Screen>

          <Stack.Screen name="Dashboard" options={{ headerShown: false }}>
            {() => (
              <DashboardScreen
                user={currentUser}
                onLogout={handleLogout}
                onNavigateToNFC={() => navigateToScreen('nfc')}
              />
            )}
          </Stack.Screen>

          <Stack.Screen name="NFC" options={{ headerShown: false }}>
            {() => (
              <NFCScreen
                user={currentUser}
                onBack={() => navigateToScreen('dashboard')}
              />
            )}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

// ========================================================
// Styles
// ========================================================
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 20,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#b91c1c',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 15,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 12,
  },
  retryText: {
    fontSize: 16,
    color: '#1d4ed8',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

// Register the main component with Expo
registerRootComponent(App);
