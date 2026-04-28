
// src/screens/LoginScreen.tsx
/* ==================================================================================
 * 🔑 SCREEN: LoginScreen
 * ==================================================================================
 * 
 * Purpose:
 * Authentication screen untuk user login ke aplikasi.
 * Implement hybrid authentication: Backend API first, fallback ke SQLite offline.
 * 
 * User Flow:
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ 1. User buka app                                                       │
 * │ 2. LoginScreen muncul (default screen)                              │
 * │ 3. User input username & password                                   │
 * │ 4. User tap "Masuk" button                                          │
 * │ 5. System validate input (not empty)                                │
 * │ 6. System try login via Backend API                                 │
 * │    └─ Success: Get token + user data, save to AsyncStorage       │
 * │    └─ Failed: Fallback ke SQLite offline mode                     │
 * │ 7. onLogin callback called dengan user data                         │
 * │ 8. App.tsx navigate ke DashboardScreen                              │
 * └─────────────────────────────────────────────────────────────────────┘
 * 
 * Features:
 * 1. Hybrid Authentication:
 *    - Primary: Backend API with JWT token
 *    - Fallback: SQLite offline authentication
 *    - Seamless switch tanpa user aware
 * 
 * 2. Form Validation:
 *    - Check username & password not empty
 *    - Show error alert if validation failed
 * 
 * 3. Loading State:
 *    - Disable button saat processing
 *    - Show loading indicator
 *    - Prevent multiple concurrent requests
 * 
 * 4. Persistent Authentication:
 *    - Save JWT token ke AsyncStorage
 *    - Save userId ke AsyncStorage
 *    - Auto-restore session on next app launch
 * 
 * 5. Navigation:
 *    - Link to RegisterScreen ("Belum punya akun?")
 *    - Callback to parent (App.tsx) after success
 * 
 * 6. Keyboard Handling:
 *    - KeyboardAvoidingView untuk iOS/Android
 *    - Auto-adjust saat keyboard muncul
 *    - Prevent input tertutup keyboard
 * 
 * State Management:
 * - username: string - Input username dari user
 * - password: string - Input password dari user
 * - loading: boolean - Flag loading state (disable button + show spinner)
 * 
 * Props:
 * - onLogin: (user: any) => void - Callback saat login berhasil
 * - onNavigateToRegister: () => void - Callback untuk navigate ke RegisterScreen
 * 
 * ==================================================================================
 */

/* ==================================================================================
 * IMPORTS
 * ==================================================================================
 * React:
 * - useState: Hook untuk state management
 * 
 * React Native Core:
 * - View, Text: Basic UI components
 * - TextInput: Input field untuk username/password
 * - TouchableOpacity: Pressable area untuk register link
 * - KeyboardAvoidingView: Auto-adjust layout saat keyboard muncul
 * - Platform: Detect iOS/Android untuk keyboard behavior
 * - Alert: Native alert dialog untuk errors
 * - StyleSheet: Type-safe styling API
 * 
 * React Native Safe Area:
 * - SafeAreaView: Respect device safe area (notch, status bar)
 * 
 * AsyncStorage:
 * - Persistent storage untuk token & userId
 * - Key-value storage di native layer
 * 
 * Custom Components:
 * - CustomButton: Reusable button dengan loading state
 * 
 * Utils:
 * - loginUser: Offline login via SQLite (from database.ts)
 * - apiService: HTTP client untuk backend API (from apiService.ts)
 * ==================================================================================
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomButton from '../components/CustomButton';
import { loginUser } from '../utils/database';
import { apiService } from '../utils/apiService';

/* ==================================================================================
 * TYPE DEFINITIONS
 * ==================================================================================
 * LoginScreenProps:
 * - onLogin: Callback function yang dipanggil saat login berhasil
 *   Parameter: user object dengan data user (id, username, email, balance, etc)
 *   Use case: Parent component (App.tsx) akan set currentUser state
 * 
 * - onNavigateToRegister: Callback function untuk navigate ke RegisterScreen
 *   No parameters
 *   Use case: User tap "Belum punya akun? Daftar di sini"
 * ==================================================================================
 */
interface LoginScreenProps {
  onLogin: (user: any) => void;
  onNavigateToRegister: () => void;
}

/* ==================================================================================
 * COMPONENT: LoginScreen
 * ==================================================================================
 * Functional component dengan React hooks untuk state management.
 * 
 * PARAMS:
 * @param onLogin - Callback saat login berhasil
 * @param onNavigateToRegister - Callback untuk navigate ke RegisterScreen
 * ==================================================================================
 */
export default function LoginScreen({ onLogin, onNavigateToRegister }: LoginScreenProps) {
  // STATE 1: username input
  // Pattern controlled component: value={username} onChangeText={setUsername}
  // Artinya: TextInput selalu menampilkan value dari state, dan perubahan langsung update state
  const [username, setUsername] = useState(''); // Nilai awal: string kosong
  
  // STATE 2: password input
  // Sama seperti username, tapi dengan secureTextEntry untuk masking karakter
  const [password, setPassword] = useState(''); // Nilai awal: string kosong
  
  // STATE 3: loading flag untuk mencegah double-tap dan menampilkan spinner
  // Saat true: tombol login dinonaktifkan dan menampilkan spinner
  // Saat false: tombol login aktif kembali
  const [loading, setLoading] = useState(false); // Nilai awal: false (tombol aktif)

  /* ================================================================================
   * FUNCTION: handleLogin
   * ================================================================================
   * Main login handler dengan hybrid authentication strategy.
   * 
   * FLOW:
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ STEP 1: Validate Input                                              │
   * │         └─ Check username & password not empty                     │
   * ├─────────────────────────────────────────────────────────────────────┤
   * │ STEP 2: Set loading = true                                          │
   * ├─────────────────────────────────────────────────────────────────────┤
   * │ STEP 3: Try Backend API Login                                      │
   * │         └─ API: POST /api/auth/login                             │
   * │         └─ Success: Save token + userId to AsyncStorage         │
   * │         └─ Failed: Catch error, continue to Step 4             │
   * ├─────────────────────────────────────────────────────────────────────┤
   * │ STEP 4: Fallback to SQLite Offline Login                           │
   * │         └─ Query local database untuk validate credentials       │
   * │         └─ Success: Call onLogin callback                        │
   * │         └─ Failed: Show error alert                              │
   * ├─────────────────────────────────────────────────────────────────────┤
   * │ STEP 5: Set loading = false (finally block)                        │
   * └─────────────────────────────────────────────────────────────────────┘
   * 
   * Kenapa Hybrid Approach?
   * - Online: Full features, sync data, centralized authentication
   * - Offline: Basic features, cached data, local authentication
   * - Seamless: User tidak perlu tahu mode apa yang aktif
   * - Resilient: App tetap bisa digunakan meski backend down
   * ================================================================================
   */
  const handleLogin = async () => {
    // STEP 1: Validasi input - pastikan tidak ada field yang kosong
    // trim() menghapus spasi di awal/akhir string
    // Jika salah satu kosong, tampilkan alert dan hentikan proses
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Username dan password harus diisi'); // Alert native Android/iOS
      return; // Berhenti di sini, tidak lanjut ke proses login
    }

    // STEP 2: Aktifkan loading state supaya UI merespons
    // Efek: tombol login jadi disabled, muncul spinner, user tidak bisa tap lagi
    setLoading(true); // State berubah dari false → true, trigger re-render komponen
    
    try {
      console.log('🔐 Attempting login for:', username); // Log untuk debugging di console

      // STEP 3: Coba login melalui backend API terlebih dahulu (metode utama)
      // Jika backend offline atau error, kita akan fallback ke database lokal
      try {
        // Memanggil API login ke backend server
        // Backend akan cek username/password di database, lalu kirim token JWT jika valid
        const response = await apiService.login({ username, password }); // Await karena ini operasi async

        // VALIDASI 3.1: Pastikan respons dari server mengandung token dan data user
        // Operator ?. artinya: akses property hanya jika object tidak null/undefined
        if (response?.token && response?.user) {
          const userData = response.user; // Ekstrak data user dari respons
          
          // STEP 3.2: Simpan token dan userId ke penyimpanan lokal agar sesi tetap ada
          // AsyncStorage = seperti localStorage di web tapi async dan native
          // Data ini akan dipakai lagi saat app dibuka kembali (auto-login)
          await AsyncStorage.setItem('token', response.token); // Simpan JWT token
          await AsyncStorage.setItem('userId', userData.id.toString()); // Simpan user ID (harus string)
          
          console.log('✅ Login success (backend):', userData.username); // Log sukses ke console
          
          // STEP 3.3: Panggil callback onLogin yang diberikan oleh parent (App.tsx)
          // Callback ini akan meng-update state di App.tsx dan pindah ke Dashboard
          onLogin(userData); // Kirim data user ke parent component
          
          // STEP 3.4: Matikan loading state dan keluar dari function
          setLoading(false); // Loading selesai, tombol aktif kembali
          return; // Keluar dari function karena login berhasil, tidak perlu lanjut ke offline mode
        }
      } catch (err) {
        // Jika backend tidak merespons atau ada error jaringan
        // Kita tidak throw error lagi, tapi lanjut ke mode offline di bawah
        console.log('⚠️ Backend unavailable, using offline mode'); // Log peringatan
      }

      // STEP 4: Mode offline sebagai fallback jika backend gagal
      // Coba login menggunakan database lokal (SQLite)
      // Function loginUser akan cek username/password di database lokal
      const localUser = await loginUser(username, password); // Query ke SQLite
      
      if (localUser) {
        // Jika data user ditemukan di database lokal, login berhasil
        console.log('✅ Login success (offline):', localUser.username);
        
        // Panggil callback onLogin dengan data dari database lokal
        // Catatan: mode offline tidak punya token, jadi fitur sync backend tidak aktif
        onLogin(localUser); // Kirim data user offline ke parent
      } else {
        // Jika username/password tidak cocok di database lokal juga
        Alert.alert('Gagal', 'Username atau password salah'); // Tampilkan pesan error
      }
    } catch (error) {
      // Handler error global yang menangkap error tak terduga
      // Misalnya error saat akses AsyncStorage atau database corrupt
      console.error('❌ Login error:', error); // Log detail error ke console
      Alert.alert('Error', 'Terjadi kesalahan saat login'); // Tampilkan pesan umum ke user
    } finally {
      // Block finally selalu dijalankan, baik sukses maupun error
      // Penting untuk reset loading state agar UI tidak stuck
      setLoading(false); // Pastikan loading state kembali ke false
    }
  };

  /* ================================================================================
   * FUNCTION: handleNavigateToRegister
   * ================================================================================
   * Simple callback wrapper untuk navigate ke RegisterScreen.
   * Call onNavigateToRegister prop yang diberikan dari parent (App.tsx).
   * 
   * Use case:
   * - User tap "Belum punya akun? Daftar di sini" link
   * - Navigate to RegisterScreen untuk create new account
   * ================================================================================
   */
  const handleNavigateToRegister = () => {
    onNavigateToRegister();
  };

  /* ================================================================================
   * RENDER: UI Components
   * ================================================================================
   * Render login form dengan React Native components.
   * 
   * Component Hierarchy:
   * <SafeAreaView>                      - Respect device safe area (notch, status bar)
   *   <KeyboardAvoidingView>            - Auto-adjust saat keyboard muncul
   *     <View style={content}>          - Main content container
   *       <Text>NFC Payment</Text>      - App title
   *       <Text>Masuk ke akun Anda</Text> - Subtitle
   *       <View style={form}>           - Form container
   *         <TextInput username />      - Username input (controlled)
   *         <TextInput password />      - Password input (controlled, secure)
   *         <CustomButton />            - Login button dengan loading state
   *         <TouchableOpacity>         - Register link (pressable)
   *           <Text>Belum punya akun?  - Link text
   * 
   * Controlled Components Pattern:
   * - value={username} - Bind state to TextInput value
   * - onChangeText={setUsername} - Update state on user type
   * - Result: Single source of truth (state)
   * 
   * Keyboard Handling:
   * - KeyboardAvoidingView dengan behavior based on Platform
   * - iOS: 'padding' - Add padding saat keyboard muncul
   * - Android: 'height' - Adjust height saat keyboard muncul
   * - Prevent input tertutup keyboard
   * ================================================================================
   */
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* App Title */}
          <Text style={styles.title}>NFC Payment</Text>
          <Text style={styles.subtitle}>Masuk ke akun Anda</Text>

          <View style={styles.form}>
            {/* Username Input */}
            {/* TextInput controlled component: value + onChangeText */}
            {/* autoCapitalize="none": Prevent auto-capitalize untuk username */}
            {/* autoComplete="username": OS suggestion untuk autofill */}
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor="#95a5a6"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoComplete="username"
            />
            
            {/* Password Input */}
            {/* secureTextEntry: Mask password dengan bullets */}
            {/* autoComplete="password": OS suggestion untuk autofill */}
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#95a5a6"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
            />

            {/* Login Button */}
            {/* CustomButton component dengan loading state */}
            {/* title: Change text saat loading */}
            {/* disabled: Disable saat loading (prevent double-tap) */}
            {/* loading: Show spinner saat loading */}
            {/* variant="primary": Blue button style */}
            {/* size="large": Large button untuk easy tap */}
            <CustomButton
              title={loading ? 'Masuk...' : 'Masuk'}
              onPress={handleLogin}
              disabled={loading}
              loading={loading}
              variant="primary"
              size="large"
              style={styles.loginButton}
            />

            {/* Register Link */}
            {/* TouchableOpacity: Pressable dengan opacity feedback */}
            {/* activeOpacity: 0.7 = slightly transparent saat pressed */}
            <TouchableOpacity
              style={styles.registerLinkContainer}
              onPress={handleNavigateToRegister}
              activeOpacity={0.7}
            >
              <Text style={styles.registerLinkText}>
                Belum punya akun? Daftar di sini
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ==================================================================================
 * STYLES
 * ==================================================================================
 * StyleSheet.create() untuk type-safe styling.
 * 
 * Design System:
 * - Color Palette:
 *   * Background: #f5f5f5 (light gray)
 *   * Text primary: #2c3e50 (dark blue)
 *   * Text secondary: #7f8c8d (gray)
 *   * Link: #3498db (blue)
 *   * Input border: #ddd (light gray)
 * 
 * - Typography:
 *   * Title: 32px bold
 *   * Subtitle: 16px normal
 *   * Input: 16px normal
 *   * Link: 16px semibold
 * 
 * - Spacing:
 *   * Container padding: 20px
 *   * Input margin: 16px
 *   * Button margin: 20px
 * 
 * - Border Radius:
 *   * Inputs: 12px (rounded corners)
 * 
 * - Shadows:
 *   * Inputs: subtle shadow untuk depth
 * ==================================================================================
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#2c3e50',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    color: '#7f8c8d',
  },
  form: {
    width: '100%',
  },
  input: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
    fontSize: 16,
    color: '#2c3e50',
    borderWidth: 1,
    borderColor: '#ddd',
    minHeight: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  loginButton: {
    marginBottom: 20,
  },
  registerLinkContainer: {
    paddingVertical: 20,
    marginTop: 10,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  registerLinkText: {
    textAlign: 'center',
    color: '#3498db',
    fontSize: 16,
    fontWeight: '600',
  },
});
