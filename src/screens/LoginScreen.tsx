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
import { apiService } from '../utils/apiService'; // 🔥 unified API service

interface LoginScreenProps {
  onLogin: (user: any) => void;
  onNavigateToRegister: () => void;
}

export default function LoginScreen({ onLogin, onNavigateToRegister }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // ======================================================
  // Login Handler
  // ======================================================
  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Username dan password harus diisi');
      return;
    }

    setLoading(true);
    try {
      console.log('🔐 Attempting login for:', username);

      // 1️⃣ Coba login via BACKEND API
      try {
        const response = await apiService.login({ username, password });

        if (response?.token && response?.user) {
          const userData = response.user;
          await AsyncStorage.setItem('token', response.token);
          await AsyncStorage.setItem('userId', userData.id.toString());
          console.log('✅ Login success (backend):', userData.username);
          onLogin(userData);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.log('⚠️ Backend unavailable, using offline mode');
      }

      // 2️⃣ Fallback ke SQLite lokal
      const localUser = await loginUser(username, password);
      if (localUser) {
        console.log('✅ Login success (offline):', localUser.username);
        onLogin(localUser);
      } else {
        Alert.alert('Gagal', 'Username atau password salah');
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      Alert.alert('Error', 'Terjadi kesalahan saat login');
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToRegister = () => {
    onNavigateToRegister();
  };

  // ======================================================
  // Render UI
  // ======================================================
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <Text style={styles.title}>NFC Payment</Text>
          <Text style={styles.subtitle}>Masuk ke akun Anda</Text>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor="#95a5a6"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoComplete="username"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#95a5a6"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
            />

            <CustomButton
              title={loading ? 'Masuk...' : 'Masuk'}
              onPress={handleLogin}
              disabled={loading}
              loading={loading}
              variant="primary"
              size="large"
              style={styles.loginButton}
            />

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

// ======================================================
// Styles
// ======================================================
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
