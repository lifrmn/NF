import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator, StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  View, 
  ActivityIndicator, 
  StyleSheet, 
  Text, 
  Alert,
  AppState,
  AppStateStatus 
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'; // ✅ Tambahan penting

// Screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import NFCScreen from './src/screens/NFCScreen';

// Utils
import { getUserById, initializeDatabase, updateUserBalance } from './src/utils/database';
import { NFCService } from './src/utils/nfc';

// Navigation types
export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Dashboard: undefined;
  NFC: undefined;
};

export type NavigationProp = StackNavigationProp<RootStackParamList>;

const Stack = createStackNavigator();

type AuthState = 'loading' | 'signedIn' | 'signedOut';
type AppScreen = 'login' | 'register' | 'dashboard' | 'nfc';

interface AppUser {
  id: number;
  name: string;
  email: string;
  balance: number;
}

interface AppContextType {
  user: AppUser | null;
  authState: AuthState;
  currentScreen: AppScreen;
  setCurrentScreen: (screen: AppScreen) => void;
  refreshUser: () => Promise<void>;
}

export default function App() {
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('login');
  const [isNFCSupported, setIsNFCSupported] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  useEffect(() => {
    initializeApp();
    setupAppStateListener();
    return () => {
      NFCService.cleanup();
    };
  }, []);

  const setupAppStateListener = () => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background') {
        NFCService.stopNFCScanning();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  };

  const initializeApp = async () => {
    try {
      setError(null);
      
      // Initialize database
      await initializeDatabase();
      
      // Check NFC support (non-blocking)
      try {
        const nfcSupported = await NFCService.initNFC();
        setIsNFCSupported(nfcSupported);
        
        if (!nfcSupported) {
          console.log('⚠️ NFC not supported - app will continue without NFC features');
          // Don't show alert for emulator/Expo Go - just log
          if (!__DEV__) {
            Alert.alert(
              'NFC Not Supported',
              'This device does not support NFC functionality. Some features may be limited.',
              [{ text: 'OK' }]
            );
          }
        } else {
          console.log('✅ NFC supported and initialized');
        }
      } catch (nfcError) {
        console.log('⚠️ NFC initialization failed:', nfcError);
        setIsNFCSupported(false);
      }

      await checkAuthState();
    } catch (error) {
      console.error('App initialization error:', error);
      setError('Failed to initialize app. Please restart the application.');
      setAuthState('signedOut');
    }
  };

  const checkAuthState = async () => {
    try {
      const storedUserId = await AsyncStorage.getItem('userId');
      if (storedUserId) {
        const user = await getUserById(Number(storedUserId));
        if (user) {
          const appUser: AppUser = {
            id: user.id,
            name: user.name,
            email: `${user.username}@nfcpay.com`,
            balance: user.balance || 0
          };
          setCurrentUser(appUser);
          setAuthState('signedIn');
          setCurrentScreen('dashboard');
          return;
        }
      }
      setAuthState('signedOut');
      setCurrentScreen('login');
    } catch (error) {
      console.error('Error checking authentication:', error);
      setError('Authentication check failed');
      setAuthState('signedOut');
      setCurrentScreen('login');
    }
  };

  const refreshUser = useCallback(async () => {
    if (currentUser) {
      try {
        const user = await getUserById(currentUser.id);
        if (user) {
          const appUser: AppUser = {
            id: user.id,
            name: user.name,
            email: `${user.username}@nfcpay.com`,
            balance: user.balance || 0
          };
          setCurrentUser(appUser);
        }
      } catch (error) {
        console.error('Error refreshing user:', error);
      }
    }
  }, [currentUser]);

  const handleLogin = async (userData: { id: number; name: string; username: string; balance?: number }) => {
    try {
      setError(null);
      const appUser: AppUser = {
        id: userData.id,
        name: userData.name,
        email: `${userData.username}@nfcpay.com`,
        balance: userData.balance || 0
      };
      
      await AsyncStorage.setItem('userId', appUser.id.toString());
      setCurrentUser(appUser);
      setAuthState('signedIn');
      setCurrentScreen('dashboard');
      
      // Navigate to Dashboard using React Navigation
      if (navigationRef.current) {
        try {
          console.log('🔄 Navigating to Dashboard after login');
          navigationRef.current.reset({
            index: 0,
            routes: [{ name: 'Dashboard' }],
          });
          console.log('✅ Navigation to Dashboard successful');
        } catch (navError) {
          console.error('❌ Navigation error:', navError);
        }
      } else {
        console.log('⚠️ Navigation ref not available');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Login failed. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      console.log('🚪 Logout initiated');
      await AsyncStorage.removeItem('userId');
      setCurrentUser(null);
      setAuthState('signedOut');
      setCurrentScreen('login');
      NFCService.cleanup();
      
      // Navigate to Login screen using React Navigation
      if (navigationRef.current) {
        try {
          console.log('🔄 Navigating to Login after logout');
          navigationRef.current.navigate('Login');
          console.log('✅ Successfully navigated to Login');
        } catch (navError) {
          console.error('❌ Navigation error during logout:', navError);
        }
      }
      
      console.log('✅ Logout completed successfully');
    } catch (error) {
      console.error('Logout error:', error);
      setError('Logout failed. Please try again.');
    }
  };

  const navigateToScreen = useCallback((screen: AppScreen) => {
    console.log('🔄 Navigating to screen:', screen);
    
    // Use actual React Navigation for navigation
    if (navigationRef.current) {
      try {
        console.log('🚀 Attempting React Navigation to:', screen);
        if (screen === 'register') {
          navigationRef.current.navigate('Register');
          console.log('✅ Navigate to Register called');
        } else if (screen === 'login') {
          navigationRef.current.navigate('Login');
          console.log('✅ Navigate to Login called');
        } else if (screen === 'dashboard') {
          navigationRef.current.navigate('Dashboard');
          console.log('✅ Navigate to Dashboard called');
        } else if (screen === 'nfc') {
          navigationRef.current.navigate('NFC');
          console.log('✅ Navigate to NFC called');
        }
      } catch (error) {
        console.error('❌ Navigation error:', error);
      }
    } else {
      console.error('❌ NavigationRef not available!');
    }
  }, []);

  if (authState === 'loading') {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Initializing NFC Payment App...</Text>
        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}
      </SafeAreaView>
    );
  }

  if (error && authState === 'signedOut') {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Application Error</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Text 
          style={styles.retryText} 
          onPress={() => {
            setError(null);
            initializeApp();
          }}
        >
          Tap to retry
        </Text>
      </SafeAreaView>
    );
  }

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
          <Stack.Screen 
            name="Login"
            options={{ headerShown: false }}
          >
            {() => (
              <LoginScreen
                onLogin={handleLogin}
                onNavigateToRegister={() => navigateToScreen('register')}
              />
            )}
          </Stack.Screen>

          <Stack.Screen 
            name="Register"
            options={{ headerShown: false }}
          >
            {() => (
              <RegisterScreen
                onRegisterSuccess={() => navigateToScreen('login')}
                onNavigateToLogin={() => navigateToScreen('login')}
              />
            )}
          </Stack.Screen>

          <Stack.Screen 
            name="Dashboard"
            options={{ headerShown: false }}
          >
            {() => (
              <DashboardScreen
                user={currentUser}
                onLogout={handleLogout}
                onNavigateToNFC={() => navigateToScreen('nfc')}
              />
            )}
          </Stack.Screen>

          <Stack.Screen 
            name="NFC"
            options={{ headerShown: false }}
          >
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

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  retryText: {
    fontSize: 16,
    color: '#007bff',
    fontWeight: '600',
    textDecorationLine: 'underline',
    padding: 10,
  },
});
