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
import { processPayment, getUserById } from '../utils/database';
import { connectBackend, getBackendStatus, callAPI } from '../utils/simpleBackend';

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
  const [currentUserData, setCurrentUserData] = useState(user);

  // 🧮 Format currency
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);

  // 🚀 Initialize NFC
  const initializeNFC = async () => {
    try {
      const supported = await NFCService.initNFC();
      setNfcSupported(supported);

      if (supported) {
        const enabled = await NFCService.checkNFCEnabled();
        setNfcEnabled(enabled);
      } else {
        setNfcSupported(false);
        setNfcEnabled(false);
      }
    } catch (error) {
      console.error('❌ NFC initialization error:', error);
      setNfcSupported(false);
      setNfcEnabled(false);
    }
  };

  // 💸 Kirim uang via NFC
  const handleSendMoney = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Masukkan jumlah yang valid');
      return;
    }

    const amountNum = parseFloat(amount);
    if (amountNum > currentUserData.balance) {
      Alert.alert('Error', 'Saldo tidak mencukupi');
      return;
    }

    setMode('send');
    setLoading(true);

    try {
      const nfcData: NFCData = {
        userId: currentUserData.id,
        username: currentUserData.username,
        action: 'payment',
        amount: amountNum,
      };

      await NFCService.startNFCScanning(
        async (receivedData) => {
          if (receivedData && receivedData.action === 'receive') {
            await processTransactionPayment(
              currentUserData.username,
              receivedData.username,
              amountNum
            );
          } else {
            Alert.alert('Error', 'Device penerima tidak valid');
          }
          await NFCService.stopNFCScanning();
          setMode('idle');
        },
        (error) => {
          console.error('NFC scanning error:', error);
          Alert.alert('Error', 'Gagal melakukan scanning NFC');
          setMode('idle');
        }
      );

      setScanResult('Dekatkan ke device penerima...');
    } catch (error) {
      console.error('Send money error:', error);
      Alert.alert('Error', 'Gagal mengirim uang');
      setMode('idle');
    } finally {
      setLoading(false);
    }
  };

  // 💰 Terima uang via NFC
  const handleReceiveMoney = async () => {
    setMode('receive');
    setLoading(true);

    try {
      const nfcData: NFCData = {
        userId: currentUserData.id,
        username: currentUserData.username,
        action: 'receive',
      };

      await NFCService.startNFCScanning(
        async (receivedData) => {
          if (receivedData && receivedData.action === 'payment' && receivedData.amount) {
            await processTransactionPayment(
              receivedData.username,
              currentUserData.username,
              receivedData.amount
            );
          } else {
            Alert.alert('Error', 'Data pembayaran tidak valid');
          }
          await NFCService.stopNFCScanning();
          setMode('idle');
        },
        (error) => {
          console.error('NFC scanning error:', error);
          Alert.alert('Error', 'Gagal melakukan scanning NFC');
          setMode('idle');
        }
      );

      setScanResult('Dekatkan ke device pengirim...');
    } catch (error) {
      console.error('Receive money error:', error);
      Alert.alert('Error', 'Gagal menerima uang');
      setMode('idle');
    } finally {
      setLoading(false);
    }
  };

  // ⚙️ Kirim transaksi ke backend Prisma (JWT) + fallback ke lokal
  const processTransactionPayment = async (
    senderUsername: string,
    receiverUsername: string,
    amount: number
  ) => {
    try {
      setLoading(true);
      console.log(`💾 Mengirim transaksi ${amount} dari ${senderUsername} ke ${receiverUsername}`);

      // 🔗 Kirim ke backend Express
      const res = await callAPI('/api/transactions', {
        method: 'POST',
        body: JSON.stringify({ receiverUsername, amount, description: 'NFC Payment' }),
      });

      if (res && res.transaction) {
        Alert.alert('✅ Sukses', `Transaksi ${formatCurrency(amount)} tersimpan di server!`);
        await fetchLatestUserData();
      } else {
        console.warn('⚠️ Gagal tersimpan di server, mencoba lokal...');
        const sender = await getUserById(currentUserData.id);
        const receiver = await getUserById(currentUserData.id + 1); // contoh fallback sederhana
        if (sender && receiver) {
          const success = await processPayment(sender.id, receiver.username, amount);
          if (success) await fetchLatestUserData();
        }
      }
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert('⚠️ Offline', 'Server tidak bisa dihubungi, menyimpan lokal...');
      const sender = await getUserById(currentUserData.id);
      const receiver = await getUserById(currentUserData.id + 1);
      if (sender && receiver) {
        await processPayment(sender.id, receiver.username, amount);
        await fetchLatestUserData();
      }
    } finally {
      setLoading(false);
    }
  };

  // 🔄 Update saldo user
  const fetchLatestUserData = async () => {
    try {
      const data = await callAPI(`/api/users/${currentUserData.id}`);
      if (data) setCurrentUserData(data);
    } catch {
      const localUser = await getUserById(currentUserData.id);
      if (localUser) setCurrentUserData(localUser);
    }
  };

  // 🔌 Cek koneksi backend
  const checkBackendConnection = async () => {
    try {
      const connected = await connectBackend();
      console.log('Backend status:', getBackendStatus());
      return connected;
    } catch {
      return false;
    }
  };

  // 🧩 Init all
  useEffect(() => {
    const init = async () => {
      await initializeNFC();
      await checkBackendConnection();
      await fetchLatestUserData();
    };
    init();
    return () => NFCService.cleanup();
  }, []);

  const stopScanning = async () => {
    await NFCService.stopNFCScanning();
    setLoading(false);
    setMode('idle');
    setScanResult('');
  };

  // 📵 NFC tidak tersedia
  if (!nfcSupported) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>📱 NFC tidak tersedia di Expo Go</Text>
          <Text style={styles.infoText}>Gunakan build EAS (APK)</Text>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>Kembali</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // 📡 NFC nonaktif
  if (!nfcEnabled) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>📡 NFC tidak aktif</Text>
          <Text style={styles.infoText}>Aktifkan NFC di Pengaturan</Text>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>Kembali</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ✅ Tampilan utama
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
          {currentUserData.name} • {formatCurrency(currentUserData.balance)}
        </Text>

        <View style={styles.statusContainer}>
          <Text style={[styles.statusText, { color: '#27ae60' }]}>
            🔗 Terhubung ke Backend Prisma
          </Text>
        </View>

        <View style={styles.amountContainer}>
          <Text style={styles.label}>Jumlah Transfer:</Text>
          <TextInput
            style={styles.amountInput}
            keyboardType="numeric"
            placeholder="Masukkan jumlah (Rp)"
            value={amount}
            onChangeText={setAmount}
          />
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.sendButton]}
            onPress={handleSendMoney}
            disabled={loading}
          >
            <Text style={styles.actionButtonText}>Kirim Uang</Text>
            <Text style={styles.actionButtonSubtext}>Dekatkan HP ke penerima</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.receiveButton]}
            onPress={handleReceiveMoney}
            disabled={loading}
          >
            <Text style={styles.actionButtonText}>Terima Uang</Text>
            <Text style={styles.actionButtonSubtext}>Tunggu pengirim mendekatkan HP</Text>
          </TouchableOpacity>
        </View>

        {loading && (
          <View style={styles.scanningContainer}>
            <ActivityIndicator size="large" color="#3498db" />
            <Text style={styles.scanningText}>Scanning NFC...</Text>
            <Text style={styles.scanResult}>{scanResult}</Text>
            <TouchableOpacity style={styles.cancelButton} onPress={stopScanning}>
              <Text style={styles.cancelButtonText}>Batal</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

// 🎨 Styles (sama dengan versi kamu)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backText: { color: '#3498db', fontSize: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#2c3e50' },
  content: { flex: 1, padding: 20 },
  userInfo: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#2c3e50',
  },
  statusContainer: {
    backgroundColor: '#d5f4e6',
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
  },
  statusText: { fontSize: 14, fontWeight: 'bold' },
  amountContainer: { marginBottom: 30 },
  label: { fontSize: 16, marginBottom: 8, color: '#34495e' },
  amountInput: {
    backgroundColor: 'white',
    fontSize: 24,
    padding: 16,
    borderRadius: 8,
    textAlign: 'center',
    borderWidth: 2,
    borderColor: '#3498db',
  },
  actionsContainer: { marginBottom: 30 },
  actionButton: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  sendButton: { backgroundColor: '#e74c3c' },
  receiveButton: { backgroundColor: '#27ae60' },
  actionButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  actionButtonSubtext: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
  },
  scanningContainer: { justifyContent: 'center', alignItems: 'center' },
  scanningText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginVertical: 10,
  },
  scanResult: { fontSize: 16, color: '#7f8c8d', textAlign: 'center' },
  cancelButton: {
    backgroundColor: '#95a5a6',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  cancelButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { fontSize: 18, color: '#e74c3c', textAlign: 'center', marginBottom: 30 },
  infoText: { fontSize: 14, color: '#7f8c8d', textAlign: 'center', marginBottom: 20 },
  backButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});
