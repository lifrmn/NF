import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NFCService, NFCData } from '../utils/nfc';
import { getUserById, processPayment } from '../utils/database';

interface NFCScreenProps {
  user: any;
  onBack: () => void;
}

type NFCMode = 'idle' | 'send' | 'receive' | 'scanning';

export default function NFCScreen({ user, onBack }: NFCScreenProps) {
  const [nfcSupported, setNfcSupported] = useState(false);
  const [nfcEnabled, setNfcEnabled] = useState(false);
  const [mode, setMode] = useState<NFCMode>('idle');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState<string>('');

  // Helper function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  useEffect(() => {
    initializeNFC();
    return () => {
      NFCService.cleanup();
    };
  }, []);

  const initializeNFC = async () => {
    try {
      console.log('🔍 Initializing NFC...');
      const supported = await NFCService.initNFC();
      setNfcSupported(supported);
      
      if (supported) {
        const enabled = await NFCService.checkNFCEnabled();
        setNfcEnabled(enabled);
        console.log('✅ NFC is available and enabled');
      } else {
        console.log('❌ NFC not available - This is expected in Expo Go');
        setNfcSupported(false);
        setNfcEnabled(false);
      }
    } catch (error) {
      console.error('❌ NFC initialization error:', error);
      setNfcSupported(false);
      setNfcEnabled(false);
    }
  };

  const handleSendMoney = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Masukkan jumlah yang valid');
      return;
    }

    const amountNum = parseFloat(amount);
    if (amountNum > user.balance) {
      Alert.alert('Error', 'Saldo tidak mencukupi');
      return;
    }

    setMode('send');
    setLoading(true);

    try {
      const nfcData: NFCData = {
        userId: user.id,
        username: user.username,
        action: 'payment',
        amount: amountNum,
      };

      // Start scanning for receiver
      await NFCService.startNFCScanning(
        async (receivedData) => {
          if (receivedData && receivedData.action === 'receive') {
            await processTransactionPayment(user.id, receivedData.userId, amountNum);
          } else {
            Alert.alert('Error', 'Device penerima tidak valid');
          }
          setLoading(false);
          setMode('idle');
          await NFCService.stopNFCScanning();
        },
        (error) => {
          console.error('NFC scanning error:', error);
          Alert.alert('Error', 'Gagal melakukan scanning NFC');
          setLoading(false);
          setMode('idle');
        }
      );

      setScanResult('Dekatkan ke device penerima...');
    } catch (error) {
      console.error('Send money error:', error);
      Alert.alert('Error', 'Gagal mengirim uang');
      setLoading(false);
      setMode('idle');
    }
  };

  const handleReceiveMoney = async () => {
    setMode('receive');
    setLoading(true);

    try {
      const nfcData: NFCData = {
        userId: user.id,
        username: user.username,
        action: 'receive',
      };

      // Start scanning for sender
      await NFCService.startNFCScanning(
        async (receivedData) => {
          if (receivedData && receivedData.action === 'payment' && receivedData.amount) {
            await processTransactionPayment(receivedData.userId, user.id, receivedData.amount);
          } else {
            Alert.alert('Error', 'Data pembayaran tidak valid');
          }
          setLoading(false);
          setMode('idle');
          await NFCService.stopNFCScanning();
        },
        (error) => {
          console.error('NFC scanning error:', error);
          Alert.alert('Error', 'Gagal melakukan scanning NFC');
          setLoading(false);
          setMode('idle');
        }
      );

      setScanResult('Dekatkan ke device pengirim...');
    } catch (error) {
      console.error('Receive money error:', error);
      Alert.alert('Error', 'Gagal menerima uang');
      setLoading(false);
      setMode('idle');
    }
  };

  const processTransactionPayment = async (senderId: number, receiverId: number, amount: number) => {
    try {
      // Verify sender has enough balance
      const sender = await getUserById(senderId);
      if (!sender || sender.balance < amount) {
        Alert.alert('Error', 'Saldo pengirim tidak mencukupi');
        return;
      }

      // Create transaction 
      try {
        const result = await processPayment(senderId, receiverId, amount);
        console.log('✅ Payment result:', result);
        
        // Check if payment was successful (processPayment should return boolean)
        Alert.alert(
          'Berhasil',
          `Transaksi sebesar ${formatCurrency(amount)} berhasil!`,
          [{ text: 'OK', onPress: onBack }]
        );
      } catch (paymentError) {
        console.error('Payment processing error:', paymentError);
        Alert.alert('Error', 'Gagal memproses pembayaran');
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      Alert.alert('Error', 'Gagal memproses pembayaran');
    }
  };

  const stopScanning = async () => {
    try {
      await NFCService.stopNFCScanning();
      setLoading(false);
      setMode('idle');
      setScanResult('');
    } catch (error) {
      console.error('Stop scanning error:', error);
    }
  };

  if (!nfcSupported) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>
            📱 NFC tidak tersedia di Expo Go
          </Text>
          <Text style={styles.infoText}>
            Untuk menggunakan NFC, aplikasi harus di-build sebagai APK standalone
          </Text>
          <Text style={styles.infoText}>
            Gunakan: eas build --platform android
          </Text>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>Kembali</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!nfcEnabled) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>
            📡 NFC tidak aktif
          </Text>
          <Text style={styles.infoText}>
            Silakan aktifkan NFC di Pengaturan → Koneksi → NFC
          </Text>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>Kembali</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backText}>← Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.title}>NFC Payment</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.userInfo}>
          {user.name} • {formatCurrency(user.balance)}
        </Text>

        {mode === 'idle' && (
          <>
            <View style={styles.amountContainer}>
              <Text style={styles.label}>Jumlah Transfer (Untuk Mengirim)</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0"
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={[styles.actionButton, styles.sendButton]}
                onPress={handleSendMoney}
                disabled={loading}
              >
                <Text style={styles.actionButtonText}>💸 Kirim Uang</Text>
                <Text style={styles.actionButtonSubtext}>
                  Dekatkan ke device penerima
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.receiveButton]}
                onPress={handleReceiveMoney}
                disabled={loading}
              >
                <Text style={styles.actionButtonText}>💰 Terima Uang</Text>
                <Text style={styles.actionButtonSubtext}>
                  Dekatkan ke device pengirim
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {(mode === 'send' || mode === 'receive') && (
          <View style={styles.scanningContainer}>
            <ActivityIndicator size="large" color="#3498db" />
            <Text style={styles.scanningText}>
              {mode === 'send' ? '💸 Mode Kirim' : '💰 Mode Terima'}
            </Text>
            <Text style={styles.scanResult}>{scanResult}</Text>
            
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={stopScanning}
            >
              <Text style={styles.cancelButtonText}>Batal</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>� NFC Payment System</Text>
          <Text style={styles.infoText}>
            1. Untuk mengirim: Masukkan jumlah, tap "Kirim Uang", lalu dekatkan ke device penerima
          </Text>
          <Text style={styles.infoText}>
            2. Untuk menerima: Tap "Terima Uang", lalu dekatkan ke device pengirim
          </Text>
          <Text style={styles.infoText}>
            3. Pastikan kedua device memiliki NFC aktif dan aplikasi terbuka
          </Text>
          <Text style={styles.warningText}>
            ⚠️ NFC hanya berfungsi di APK build, tidak di Expo Go
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backText: {
    color: '#3498db',
    fontSize: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  userInfo: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#2c3e50',
  },
  amountContainer: {
    marginBottom: 30,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#34495e',
  },
  amountInput: {
    backgroundColor: 'white',
    fontSize: 24,
    padding: 16,
    borderRadius: 8,
    textAlign: 'center',
    borderWidth: 2,
    borderColor: '#3498db',
  },
  actionsContainer: {
    marginBottom: 30,
  },
  actionButton: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  sendButton: {
    backgroundColor: '#e74c3c',
  },
  receiveButton: {
    backgroundColor: '#27ae60',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  actionButtonSubtext: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
  },
  scanningContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanningText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 20,
    marginBottom: 10,
  },
  scanResult: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 30,
  },
  cancelButton: {
    backgroundColor: '#95a5a6',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
    lineHeight: 20,
  },
  warningText: {
    fontSize: 14,
    color: '#e74c3c',
    marginTop: 8,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#e74c3c',
    textAlign: 'center',
    marginBottom: 30,
  },
  backButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});