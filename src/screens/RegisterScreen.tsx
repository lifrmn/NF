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
import { registerUser } from '../utils/database';
import CustomButton from '../components/CustomButton';

interface RegisterScreenProps {
  onRegisterSuccess: () => void;
  onNavigateToLogin: () => void;
}

export default function RegisterScreen({ onRegisterSuccess, onNavigateToLogin }: RegisterScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    // Validasi input
    if (!username.trim() || !password.trim() || !confirmPassword.trim() || !name.trim()) {
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
      const newUser = await registerUser(username, password, name);
      if (newUser) {
        Alert.alert(
          'Berhasil',
          'Akun berhasil dibuat! Silakan login.',
          [{ text: 'OK', onPress: onRegisterSuccess }]
        );
      } else {
        Alert.alert('Error', 'Username sudah digunakan, silakan pilih username lain');
      }
    } catch (error: any) {
      let errorMessage = 'Terjadi kesalahan saat membuat akun';
      
      console.error('Registration error:', error);
      Alert.alert('Error', errorMessage);
      
      Alert.alert('Error', errorMessage);
      console.error('Register error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToLogin = () => {
    console.log('Navigate to login pressed');
    onNavigateToLogin();
  };

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
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />

              <TextInput
                style={styles.input}
                placeholder="Username"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoComplete="username"
              />
              
              <TextInput
                style={styles.input}
                placeholder="Password (min. 6 karakter)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password"
              />

              <TextInput
                style={styles.input}
                placeholder="Konfirmasi Password"
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
                hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
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
    borderWidth: 1,
    borderColor: '#ddd',
    minHeight: 50,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2.0,
    elevation: 2,
  },
  button: {
    backgroundColor: '#27ae60',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonDisabled: {
    backgroundColor: '#bdc3c7',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
  },
  linkButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginVertical: 8,
    backgroundColor: 'transparent',
    borderRadius: 8,
  },
  linkText: {
    textAlign: 'center',
    color: '#3498db',
    fontSize: 16,
    fontWeight: '600',
  },
  registerButton: {
    marginBottom: 20,
  },
  loginLink: {
    marginTop: 10,
  },
  loginLinkContainer: {
    paddingVertical: 20,
    paddingHorizontal: 30,
    marginTop: 10,
    marginBottom: 10,
    backgroundColor: 'transparent',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  loginLinkText: {
    textAlign: 'center',
    color: '#3498db',
    fontSize: 16,
    fontWeight: '600',
  },
});