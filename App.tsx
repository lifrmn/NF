// App.tsx
/* ==================================================================================
 * 🎉 MAIN APPLICATION ENTRY POINT
 * ==================================================================================
 * 
 * Purpose:
 * Root component untuk NFC Payment System mobile app.
 * Handle navigation, authentication, initialization, dan session management.
 * Main orchestrator untuk seluruh aplikasi.
 * 
 * Application Flow:
 * ┌────────────────────────────────────────────────────────────────────┐
 * │ APP STARTUP SEQUENCE                                                │
 * │                                                                     │
 * │ 1. Show Loading Screen (⏳ loading state)                          │
 * │ 2. Initialize Database (SQLite init)                               │
 * │ 3. Initialize Backend API (restore token, base URL)                │
 * │ 4. Health Check Backend (optional, non-blocking)                   │
 * │ 5. Register Device (track device ID)                               │
 * │ 6. Check Auth State (restore session from AsyncStorage)            │
 * │ 7. Determine Initial Screen:                                        │
 * │    - If authenticated → Dashboard                                  │
 * │    - If not authenticated → Login                                  │
 * │                                                                     │
 * │ Timeout Protection:                                                 │
 * │ - Force to login screen after 20 seconds if stuck loading          │
 * └────────────────────────────────────────────────────────────────────┘
 * 
 * Navigation Structure:
 * ┌────────────────────────────────────────────────────────────────────┐
 * │                       SCREEN NAVIGATION                            │
 * ├────────────────────────────────────────────────────────────────────┤
 * │                                                                     │
 * │  LoginScreen ↔ RegisterScreen                                    │
 * │       ↓                                                            │
 * │  DashboardScreen (main hub)                                        │
 * │       ├─→ NFCScreen (merchant payment)                          │
 * │       ├─→ RegisterCardScreen (link NFC card)                    │
 * │       └─→ MyCardsScreen (card management)                       │
 * │                                                                     │
 * └────────────────────────────────────────────────────────────────────┘
 * 
 * Key Features:
 * 
 * 1. Stack Navigation:
 *    - React Navigation Stack Navigator
 *    - No header (custom headers per screen)
 *    - Gesture navigation enabled
 *    - Animation enabled for smooth transitions
 * 
 * 2. Authentication State Management:
 *    - 3 states: 'loading' | 'signedIn' | 'signedOut'
 *    - Persistent session via AsyncStorage
 *    - Auto-restore session on app launch
 *    - Clean logout with session clear
 * 
 * 3. Initialization Sequence:
 *    - Database initialization (SQLite)
 *    - Backend API setup (restore token)
 *    - Health check (non-blocking)
 *    - Device registration
 *    - Auth state check
 * 
 * 4. App State Management:
 *    - Listen to app state changes (active/background)
 *    - Auto-sync device status when app becomes active
 *    - NFC cleanup on app pause
 * 
 * 5. Error Handling:
 *    - Timeout protection (20s max loading)
 *    - Error screen with retry option
 *    - Non-blocking initialization (continue on backend offline)
 * 
 * 6. Device Tracking:
 *    - Unique device ID generation
 *    - Platform detection (Android/iOS)
 *    - Device registration to admin system
 *    - Track app version
 * 
 * State Variables:
 * - authState: Current auth state (loading/signedIn/signedOut)
 * - currentUser: Logged-in user object (null if not authenticated)
 * - error: Error message string (null if no error)
 * - navigationRef: React Navigation ref untuk programmatic navigation
 * 
 * Key Methods:
 * - initializeApp(): Main initialization sequence
 * - checkAuthState(): Restore session from AsyncStorage
 * - handleLogin(): Process login success
 * - handleLogout(): Clear session and navigate to login
 * - navigateToScreen(): Programmatic navigation helper
 * - handleAppStateChange(): Sync device status on app resume
 * 
 * TypeScript Types:
 * - RootStackParamList: Navigation screen params
 * - AuthState: 'loading' | 'signedIn' | 'signedOut'
 * - AppScreen: Screen name enum
 * - AppUser: User object interface
 * 
 * Dependencies:
 * - React Navigation: Navigation framework
 * - AsyncStorage: Persistent storage
 * - Expo: Mobile app framework
 * - SafeAreaProvider: Handle device safe areas (notch, status bar)
 * 
 * ==================================================================================
 */

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

/* ==================================================================================
 * IMPORTS: Screens
 * ==================================================================================
 * All screen components untuk navigation stack.
 * ==================================================================================
 */
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import NFCScreen from './src/screens/NFCScreen';
import RegisterCardScreen from './src/screens/RegisterCardScreen';
import MyCardsScreen from './src/screens/MyCardsScreen';

/* ==================================================================================
 * IMPORTS: Utils
 * ==================================================================================
 * Utility functions untuk database, NFC, dan API operations.
 * ==================================================================================
 */
import { getUserById, initDatabase } from './src/utils/database';
import { NFCService } from './src/utils/nfc';
import { apiService } from './src/utils/apiService';

/* ==================================================================================
 * TYPE DEFINITIONS: Navigation
 * ==================================================================================
 * TypeScript types untuk React Navigation.
 * 
 * RootStackParamList:
 * - Defines all screens in navigation stack
 * - Each screen key with undefined = no params required
 * 
 * NavigationProp:
 * - Type for navigation prop passed to screens
 * - Used for type-safe navigation calls
 * ==================================================================================
 */
export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Dashboard: undefined;
  NFC: undefined;
  RegisterCard: undefined;
  MyCards: undefined;
};

export type NavigationProp = StackNavigationProp<RootStackParamList>;
const Stack = createStackNavigator<RootStackParamList>();

/* ==================================================================================
 * TYPE DEFINITIONS: Application
 * ==================================================================================
 * AuthState: 3 possible authentication states
 * - 'loading': Initial state, checking session
 * - 'signedIn': User authenticated, show Dashboard
 * - 'signedOut': No session, show Login
 * 
 * AppScreen: Screen name enum untuk programmatic navigation
 * 
 * AppUser: User object structure
 * - id: Database primary key
 * - name: Full name
 * - username: Unique username
 * - balance: Current balance in Rupiah
 * - email: Optional email (generated from username)
 * ==================================================================================
 */
type AuthState = 'loading' | 'signedIn' | 'signedOut';
type AppScreen = 'login' | 'register' | 'dashboard' | 'nfc' | 'registerCard' | 'myCards';

interface AppUser {
  id: number;
  name: string;
  username: string;
  balance: number;
  email?: string;
}

/* ==================================================================================
 * COMPONENT: App
 * ==================================================================================
 * Main application component - entry point untuk entire app.
 * 
 * Responsibilities:
 * 1. Initialize database dan backend API
 * 2. Restore authentication session
 * 3. Setup navigation stack
 * 4. Handle app state changes
 * 5. Manage user authentication flow
 * ==================================================================================
 */
export default function App() {
  /* ================================================================================
   * STATE MANAGEMENT
   * ================================================================================
   * authState: Current authentication state
   * currentUser: Logged-in user data (null if not authenticated)
   * error: Error message for error screen
   * navigationRef: Ref untuk programmatic navigation
   * ================================================================================
   */
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  console.log('🚀 App.tsx rendered, authState:', authState);

  /* ================================================================================
   * EFFECT: App Initialization
   * ================================================================================
   * Run once on app mount.
   * 
   * FLOW:
   * 1. Set force login timeout (20s safety)
   * 2. Call initializeApp() - main initialization sequence
   * 3. Setup app state listener (active/background detection)
   * 4. Cleanup on unmount (clear timers, NFC cleanup)
   * 
   * Dependencies: [] = run once on mount
   * ================================================================================
   */
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

  /* ================================================================================
   * FUNCTION: handleAppStateChange
   * ================================================================================
   * Called when app state changes (active, background, inactive).
   * 
   * FLOW:
   * 1. Check if app becomes active (from background)
   * 2. Sync device status to backend
   * 3. Update device info (platform, version)
   * 4. Include user data if authenticated
   * 
   * Use Case:
   * - User switches back to app from background
   * - Admin can track active devices
   * - Keep device registry updated
   * ================================================================================
   */
  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      console.log('📱 App aktif kembali, sync status device...');
      try {
        const deviceId =
          (await AsyncStorage.getItem('deviceId')) || `device_${Date.now()}`;
        const deviceInfo = {
          deviceId,
          deviceName: `${Platform.OS}_device_${deviceId.slice(-6)}`,
          platform: Platform.OS,
          appVersion: '1.0.0',
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

  /* ================================================================================
   * FUNCTION: initializeApp
   * ================================================================================
   * Main initialization sequence dengan 5 steps.
   * 
   * INITIALIZATION STEPS:
   * 
   * 1️⃣ Initialize Database (SQLite)
   *    - Setup local database
   *    - Create tables if not exist
   *    - Timeout: 10s
   * 
   * 2️⃣ Initialize Backend API
   *    - Restore auth token from AsyncStorage
   *    - Setup base URL
   *    - Timeout: 10s
   * 
   * 3️⃣ Connect to Backend (Health Check)
   *    - Non-blocking (continue if offline)
   *    - Timeout: 5s
   *    - Fallback: Offline mode
   * 
   * 4️⃣ Register Device
   *    - Get or generate device ID
   *    - Send device info to admin system
   *    - Non-blocking (continue if failed)
   *    - Timeout: 3s
   * 
   * 5️⃣ Check Auth State
   *    - Restore session from AsyncStorage
   *    - Determine initial screen (Login vs Dashboard)
   * 
   * Error Handling:
   * - Steps 1-2: Critical (must succeed)
   * - Steps 3-4: Non-blocking (continue on failure)
   * - Step 5: Always runs (fallback to signedOut)
   * ================================================================================
   */
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
      let connected = false;
      try {
        await Promise.race([
          apiService.healthCheck(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
        ]);
        connected = true;
        console.log('✅ Backend connected');
      } catch (err) {
        console.warn('⚠️ Backend tidak terhubung, mode offline');
        // Jangan throw error, lanjutkan ke auth check
      }

      // === 4️⃣ Register Device ke Admin System (optional)
      try {
        console.log('4️⃣ Register device...');
        const deviceId =
          (await AsyncStorage.getItem('deviceId')) || `device_${Date.now()}`;
        await AsyncStorage.setItem('deviceId', deviceId);

        const deviceInfo = {
          deviceId,
          deviceName: `${Platform.OS}_device_${deviceId.slice(-6)}`,
          platform: Platform.OS,
          appVersion: '1.0.0',
        };

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

  /* ================================================================================
   * FUNCTION: checkAuthState
   * ================================================================================
   * Restore authentication session dari AsyncStorage.
   * 
   * FLOW:
   * 1. Get userId from AsyncStorage
   * 2. If exists, load user data from database
   * 3. If user found, set currentUser and authState = 'signedIn'
   * 4. If not found, set authState = 'signedOut'
   * 
   * Result:
   * - Success: Navigate to Dashboard
   * - Failure: Navigate to Login
   * ================================================================================
   */
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

  /* ================================================================================
   * FUNCTION: handleLogin
   * ================================================================================
   * Process successful login.
   * 
   * PARAMS:
   * @param userData - User data dari LoginScreen
   * 
   * FLOW:
   * 1. Create AppUser object dengan email generated
   * 2. Save userId to AsyncStorage (persistent session)
   * 3. Set currentUser state
   * 4. Set authState = 'signedIn'
   * 5. Navigate to Dashboard (reset navigation stack)
   * 
   * Navigation:
   * - Use reset() untuk clear login screen dari stack
   * - User can't go back to login with back button
   * ================================================================================
   */
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

  /* ================================================================================
   * FUNCTION: handleLogout
   * ================================================================================
   * Process user logout.
   * 
   * FLOW:
   * 1. Remove userId from AsyncStorage (clear session)
   * 2. Clear currentUser state
   * 3. Set authState = 'signedOut'
   * 4. Cleanup NFC resources
   * 5. Navigate to Login (reset navigation stack)
   * 
   * Security:
   * - Clear all persistent data
   * - Release hardware resources (NFC)
   * - Reset navigation to prevent back navigation
   * ================================================================================
   */
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

  /* ================================================================================
   * FUNCTION: navigateToScreen
   * ================================================================================
   * Programmatic navigation helper.
   * 
   * PARAMS:
   * @param screen - Target screen name (lowercase enum)
   * 
   * FLOW:
   * 1. Check navigationRef available
   * 2. Map screen name to Navigation screen key
   * 3. Call navigate() with screen key
   * 4. Log success/error
   * 
   * Screen Mapping:
   * - 'login' → 'Login'
   * - 'register' → 'Register'
   * - 'dashboard' → 'Dashboard'
   * - 'nfc' → 'NFC'
   * - 'registerCard' → 'RegisterCard'
   * - 'myCards' → 'MyCards'
   * 
   * Called By:
   * - Screen components via props (onBack, onNavigate*)
   * ================================================================================
   */
  const navigateToScreen = useCallback((screen: AppScreen) => {
    if (!navigationRef.current) {
      console.error('❌ Navigation ref not available');
      return;
    }
    try {
      const targetScreen = screen === 'register'
          ? 'Register'
          : screen === 'dashboard'
          ? 'Dashboard'
          : screen === 'nfc'
          ? 'NFC'
          : screen === 'registerCard'
          ? 'RegisterCard'
          : screen === 'myCards'
          ? 'MyCards'
          : 'Login';
      
      console.log(`🧭 Navigating from current to: ${targetScreen} (screen param: ${screen})`);
      navigationRef.current.navigate(targetScreen);
      console.log(`✅ Navigation completed: ${screen}`);
    } catch (err) {
      console.error('❌ Navigation error:', err);
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
                onNavigateToRegisterCard={() => navigateToScreen('registerCard')}
                onNavigateToMyCards={() => navigateToScreen('myCards')}
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

          <Stack.Screen name="RegisterCard" options={{ headerShown: false }}>
            {() => (
              <RegisterCardScreen
                user={currentUser}
                onBack={() => navigateToScreen('dashboard')}
                onSuccess={() => navigateToScreen('myCards')}
              />
            )}
          </Stack.Screen>

          <Stack.Screen name="MyCards" options={{ headerShown: false }}>
            {() => (
              <MyCardsScreen
                user={currentUser}
                onBack={() => navigateToScreen('dashboard')}
                onRegisterNew={() => navigateToScreen('registerCard')}
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
