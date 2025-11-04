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
import { loginUser } from '../utils/database';
import CustomButton from '../components/CustomButton';

interface LoginScreenProps {
  onLogin: (user: any) => void;
  onNavigateToRegister: () => void;
}

export default function LoginScreen({ onLogin, onNavigateToRegister }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    console.log('Login button pressed');
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Username dan password harus diisi');
      return;
    }

    setLoading(true);
    try {
      const user = await loginUser(username, password);
      if (user) {
        onLogin(user);
      } else {
        Alert.alert('Error', 'Username atau password salah');
      }
    } catch (error) {
      Alert.alert('Error', 'Terjadi kesalahan saat login');
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToRegister = () => {
    console.log('Navigate to register pressed');
    onNavigateToRegister();
  };

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
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoComplete="username"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Password"
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
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
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
    backgroundColor: '#3498db',
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
  loginButton: {
    marginBottom: 20,
  },
  registerLink: {
    marginTop: 10,
  },
  registerLinkContainer: {
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
  registerLinkText: {
    textAlign: 'center',
    color: '#3498db',
    fontSize: 16,
    fontWeight: '600',
  },
});