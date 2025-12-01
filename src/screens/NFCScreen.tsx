import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NFCService } from '../utils/nfc';
import { useNFCScanner } from '../hooks/useNFCScanner';
import { usePayment } from '../hooks/usePayment';

interface NFCScreenProps {
  user: any;
  onBack: () => void;
}

export default function NFCScreen({ user, onBack }: NFCScreenProps) {
  const [nfcEnabled, setNfcEnabled] = useState(false);
  const [amount, setAmount] = useState('');
  
  const { isProcessing, processTapToPayTransfer } = usePayment();

  useEffect(() => {
    checkNFC();
    return () => {
      NFCService.cleanup();
    };
  }, []);

  const checkNFC = async () => {
    const supported = await NFCService.initNFC();
    if (supported) {
      const enabled = await NFCService.checkNFCEnabled();
      setNfcEnabled(enabled);
    }
  };

  const handleSendMoney = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'User tidak valid. Silakan login ulang.');
      return;
    }

    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      Alert.alert('Error', 'Masukkan jumlah yang valid');
      return;
    }

    if (amountNum < 1000) {
      Alert.alert('Error', 'Minimal transfer Rp 1.000');
      return;
    }

    // Langsung transfer dengan tap kartu sender ke receiver
    const success = await processTapToPayTransfer(user.id, amountNum);
    
    if (success) {
      setAmount('');
    }
  };

  if (!nfcEnabled) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>📡 NFC Tidak Aktif</Text>
          <Text style={styles.infoText}>
            Untuk menggunakan pembayaran NFC, aktifkan NFC di HP Anda:
          </Text>
          <View style={styles.instructionBox}>
            <Text style={styles.instructionText}>
              1. Buka Pengaturan HP{'\n'}
              2. Cari menu "Koneksi Perangkat" atau "NFC"{'\n'}
              3. Aktifkan toggle NFC{'\n'}
              4. Kembali ke aplikasi ini
            </Text>
          </View>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>Kembali</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backText}>← Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.title}>💳 NFC Payment</Text>
        <View style={{ width: 70 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* User Info */}
        <View style={styles.userCard}>
          <Text style={styles.userName}>👤 {user?.name}</Text>
          <Text style={styles.userBalance}>
            Balance: Rp {user?.balance?.toLocaleString('id-ID') || '0'}
          </Text>
        </View>

        {/* Info Card */}
        <View style={styles.instructionCard}>
          <Text style={styles.instructionTitle}>📖 Cara Transfer NFC:</Text>
          <Text style={styles.instructionText}>
            1. Masukkan jumlah transfer{'\n'}
            2. Tekan tombol "Kirim Uang"{'\n'}
            3. Tempelkan kartu NFC Anda ke HP{'\n'}
            4. Tempelkan kartu NFC teman ke HP{'\n'}
            5. Saldo teman otomatis bertambah! ✅
          </Text>
        </View>

        {/* Amount Input */}
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>💰 Jumlah Transfer:</Text>
          <TextInput
            style={styles.input}
            placeholder="Contoh: 50000"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
            editable={!isProcessing}
          />
          <Text style={styles.inputHint}>Minimal Rp 1.000</Text>
        </View>

        {/* Send Money Button */}
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.sendButton,
            (!amount || isProcessing) && styles.disabledButton
          ]}
          onPress={handleSendMoney}
          disabled={!amount || isProcessing}
        >
          {isProcessing ? (
            <>
              <ActivityIndicator color="white" />
              <Text style={styles.actionButtonText}>  Processing...</Text>
            </>
          ) : (
            <>
              <Text style={styles.actionButtonText}>� Kirim Uang</Text>
              <Text style={styles.actionButtonSubtext}>
                Tap & tempelkan ke kartu penerima
              </Text>
            </>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backText: { color: '#3498db', fontSize: 16, width: 70 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#2c3e50' },
  content: { flex: 1 },
  contentContainer: { padding: 20 },
  errorText: { fontSize: 18, color: '#e74c3c', textAlign: 'center', marginBottom: 30 },
  infoText: { fontSize: 14, color: '#7f8c8d', textAlign: 'center', marginBottom: 20 },
  instructionBox: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginVertical: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
  },
  instructionText: { fontSize: 14, color: '#2c3e50', lineHeight: 22 },
  backButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  userCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userName: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50', marginBottom: 8 },
  userBalance: { fontSize: 16, color: '#27ae60', fontWeight: '600' },
  warningCard: {
    backgroundColor: '#fff3cd',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#f39c12',
  },
  warningText: { fontSize: 14, color: '#856404', textAlign: 'center' },
  instructionCard: {
    backgroundColor: '#e3f2fd',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  instructionTitle: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#1565c0', 
    marginBottom: 12,
    textAlign: 'center'
  },
  cardStatusCard: {
    backgroundColor: '#d4edda',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#27ae60',
  },
  cardStatusTitle: { fontSize: 16, fontWeight: 'bold', color: '#155724', marginBottom: 5 },
  cardStatusUid: {
    fontSize: 13,
    color: '#155724',
    fontFamily: 'monospace',
    marginBottom: 3,
  },
  cardStatusSubtext: { fontSize: 12, color: '#155724' },
  actionButton: {
    backgroundColor: '#3498db',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scanCardButton: { backgroundColor: '#9b59b6' },
  sendButton: { backgroundColor: '#27ae60' },
  disabledButton: { backgroundColor: '#95a5a6', opacity: 0.6 },
  actionButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  actionButtonSubtext: { color: 'rgba(255, 255, 255, 0.9)', fontSize: 14 },
  inputCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
  },
  inputLabel: { fontSize: 16, fontWeight: '600', color: '#2c3e50', marginBottom: 10 },
  input: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  inputHint: { fontSize: 12, color: '#7f8c8d', marginTop: 5 },
});
