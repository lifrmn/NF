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
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomButton from '../components/CustomButton';
import { registerUser } from '../utils/database';
import { callAPI } from '../utils/simpleBackend';
import { API_URL } from '@/utils/configuration';

interface RegisterScreenProps {
  onRegisterSuccess: () => void;
  onNavigateToLogin: () => void;
}

export default function RegisterScreen({ onRegisterSuccess, onNavigateToLogin }: RegisterScreenProps) {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // ======================================================
  // 🔐 Handle Register (online + offline fallback)
  // ======================================================
  const handleRegister = async () => {
    if (!name.trim() || !username.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Semua field harus diisi');
      return;
    }
    if (username.length < 3) {
      Alert.alert('Error', 'Username minimal 3 karakter');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password minimal 6 karakter');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Password dan konfirmasi password tidak sama');
      return;
    }

    setLoading(true);

    try {
      console.log('📝 Attempting registration for:', username);
      
      // 🌐 Coba ke backend online
      try {
        const response = await fetch(`${API_URL}/api/auth/register`, {
          method: 'POST',
          headers : { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, username, password }),
        });

        const responseData = await response.json();

        if (responseData?.user) {
          console.log('✅ Registration success (backend):', responseData.user.username);

          if (responseData.token) await AsyncStorage.setItem('token', responseData.token);
          if (responseData.user?.id) await AsyncStorage.setItem('userId', responseData.user.id.toString());

          Alert.alert('Berhasil', 'Akun berhasil dibuat! Silakan login.', [
            { text: 'OK', onPress: onRegisterSuccess },
          ]);
          return;
        }
      } catch (err) {
        console.log('⚠️ Backend unavailable, using offline mode');
      }

    } catch (error) {
      console.error('❌ Register error:', error);
      Alert.alert('Error', 'Terjadi kesalahan saat membuat akun');
    } finally {
      setLoading(false);
    }
  };

  // ======================================================
  // 🔁 Navigasi ke Login
  // ======================================================
  const handleNavigateToLogin = () => {
    onNavigateToLogin();
  };

  // ======================================================
  // 🧱 Render UI
  // ======================================================
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.content}>
            <Text style={styles.title}>Daftar Akun</Text>
            <Text style={styles.subtitle}>Buat akun baru untuk menggunakan NFC Payment</Text>

            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Nama Lengkap"
                placeholderTextColor="#95a5a6"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
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
                placeholder="Password (min. 6 karakter)"
                placeholderTextColor="#95a5a6"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password"
              />
              <TextInput
                style={styles.input}
                placeholder="Konfirmasi Password"
                placeholderTextColor="#95a5a6"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoComplete="password"
              />

              <CustomButton
                title={loading ? 'Membuat Akun...' : 'Daftar'}
                onPress={handleRegister}
                disabled={loading}
                loading={loading}
                variant="secondary"
                size="large"
                style={styles.registerButton}
              />

              <TouchableOpacity
                style={styles.loginLinkContainer}
                onPress={handleNavigateToLogin}
                activeOpacity={0.7}
              >
                <Text style={styles.loginLinkText}>
                  Sudah punya akun? Masuk di sini
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ======================================================
// 🎨 Styles
// ======================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  keyboardView: { flex: 1 },
  scrollContainer: { flexGrow: 1, justifyContent: 'center' },
  content: { padding: 20 },
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
  form: { width: '100%' },
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
  registerButton: { marginBottom: 20 },
  loginLinkContainer: {
    paddingVertical: 20,
    marginTop: 10,
    alignItems: 'center',
  },
  loginLinkText: {
    color: '#3498db',
    fontSize: 16,
    fontWeight: '600',
  },
});
