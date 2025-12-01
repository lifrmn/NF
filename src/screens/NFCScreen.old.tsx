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
import { apiService } from '../utils/apiService';

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
  const [currentUserData, setCurrentUserData] = useState(user || null);
  const [backendConnected, setBackendConnected] = useState(false);
  const [usePhysicalCard, setUsePhysicalCard] = useState(true); // Toggle untuk kartu fisik
  const [lastScannedCard, setLastScannedCard] = useState<string>(''); // UID kartu terakhir
  const isScanning = React.useRef(false);

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

  // 🎴 Scan Physical Card
  const handleScanPhysicalCard = async () => {
    if (isScanning.current) {
      Alert.alert('Error', 'Scan sudah berjalan');
      return;
    }

    setLoading(true);
    isScanning.current = true;
    setScanResult('📱 Tempelkan kartu di belakang HP...\n\nPastikan kartu berada di posisi antena NFC (biasanya di tengah bagian atas HP)');

    try {
      // Read physical card dengan data
      const result = await NFCService.readPhysicalCardWithData();

      if (!result) {
        Alert.alert(
          '❌ Kartu Tidak Terbaca',
          '• Pastikan kartu NFC dekat dengan HP\n• Coba geser posisi kartu di belakang HP\n• Periksa apakah kartu dalam kondisi baik\n• Pastikan NFC aktif di Pengaturan',
          [{ text: 'OK' }]
        );
        return;
      }

      const { cardInfo, nfcData } = result;
      
      // Cek kartu terdaftar di backend
      let cardData: any = null;
      try {
        const checkResult = await apiService.get(`/nfc-cards/info/${cardInfo.id}`);
        if (checkResult.success) {
          cardData = checkResult.card;
          
          // Validasi ownership
          if (cardData.userId !== currentUserData.id) {
            Alert.alert(
              '⚠️ Kartu Milik Akun Lain',
              `Kartu ini terdaftar atas nama: ${cardData.user?.name || 'User lain'}\n\nAnda tidak dapat menggunakan kartu ini.`,
              [{ text: 'OK' }]
            );
            setLastScannedCard('');
            return;
          }

          // Cek status kartu
          if (cardData.cardStatus !== 'ACTIVE') {
            Alert.alert(
              '🚫 Kartu Tidak Aktif',
              `Status kartu: ${cardData.cardStatus}\n\nKartu ini tidak dapat digunakan untuk transaksi.\n${cardData.cardStatus === 'BLOCKED' ? 'Aktifkan kembali kartu di menu Kartu Saya.' : ''}`,
              [{ text: 'OK' }]
            );
            setLastScannedCard('');
            return;
          }

          setLastScannedCard(cardInfo.id);
          
          // Log ke backend
          await apiService.post('/nfc-cards/tap', {
            cardId: cardInfo.id,
            deviceId: currentUserData.deviceId || 'unknown',
            signalStrength: 'strong',
            readTime: Date.now()
          });

          Alert.alert(
            '✅ Kartu Terdeteksi',
            `UID: ${cardInfo.id.slice(0, 16)}...\nStatus: ${cardData.cardStatus}\nBalance: ${formatCurrency(cardData.balance)}\nTipe: ${cardInfo.type}`,
            [{ text: 'OK' }]
          );
        }
      } catch (backendError: any) {
        console.warn('⚠️ Backend check failed:', backendError);
        
        // Kartu belum terdaftar
        if (backendError?.message?.includes('tidak ditemukan') || backendError?.status === 404) {
          Alert.alert(
            '📝 Kartu Belum Terdaftar',
            `UID: ${cardInfo.id.slice(0, 16)}...\nTipe: ${cardInfo.type}\n\nKartu ini belum terdaftar ke akun Anda.\n\nSilakan daftar kartu di menu "Daftar Kartu" terlebih dahulu.`,
            [{ text: 'OK' }]
          );
          setLastScannedCard('');
          return;
        }
      }

      setScanResult(`✅ Kartu: ${cardInfo.id.slice(0, 12)}...`);

    } catch (error: any) {
      console.error('Scan card error:', error);
      
      if (error?.message?.includes('cancelled') || error?.message?.includes('timeout')) {
        Alert.alert('⏱️ Timeout', 'Waktu scan habis. Silakan coba lagi.');
      } else {
        Alert.alert(
          '❌ Gagal Scan Kartu',
          error?.message || 'Terjadi kesalahan saat membaca kartu.\n\nPastikan:\n• NFC aktif\n• Kartu dekat dengan HP\n• Kartu dalam kondisi baik',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setLoading(false);
      isScanning.current = false;
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

    if (amountNum < 1000) {
      Alert.alert('Error', 'Minimum transfer Rp 1.000');
      return;
    }

    // Prevent multiple NFC requests
    if (isScanning.current) {
      Alert.alert('Error', 'NFC scan sudah berjalan');
      return;
    }

    setMode('send');
    setLoading(true);
    isScanning.current = true;

    try {
      if (usePhysicalCard) {
        // Validasi: pastikan sender card sudah di-scan
        if (!lastScannedCard) {
          Alert.alert(
            '⚠️ Scan Kartu Anda Dulu',
            'Sebelum mengirim uang, Anda harus scan kartu Anda terlebih dahulu dengan tombol "Scan Kartu Fisik".',
            [{ text: 'OK' }]
          );
          await NFCService.stopNFCScanning();
          isScanning.current = false;
          setMode('idle');
          setLoading(false);
          return;
        }

        // Validasi: cek apakah sender card masih valid dan ACTIVE
        try {
          const senderCheck = await apiService.get(`/nfc-cards/info/${lastScannedCard}`);
          if (!senderCheck.success || senderCheck.card.cardStatus !== 'ACTIVE') {
            Alert.alert(
              '🚫 Kartu Anda Tidak Valid',
              'Kartu Anda tidak aktif atau tidak dapat digunakan.\n\nSilakan scan ulang kartu Anda atau periksa status kartu di menu "Kartu Saya".',
              [{ text: 'OK' }]
            );
            setLastScannedCard('');
            await NFCService.stopNFCScanning();
            isScanning.current = false;
            setMode('idle');
            setLoading(false);
            return;
          }

          // Validasi balance
          if (senderCheck.card.balance < amountNum) {
            Alert.alert(
              '💰 Saldo Kartu Tidak Cukup',
              `Balance kartu: ${formatCurrency(senderCheck.card.balance)}\nJumlah transfer: ${formatCurrency(amountNum)}\n\nTop-up kartu Anda melalui admin untuk menambah balance.`,
              [{ text: 'OK' }]
            );
            await NFCService.stopNFCScanning();
            isScanning.current = false;
            setMode('idle');
            setLoading(false);
            return;
          }
        } catch (validationError: any) {
          console.error('Sender validation error:', validationError);
          Alert.alert('Error', 'Gagal memvalidasi kartu Anda. Silakan scan ulang kartu.');
          setLastScannedCard('');
          await NFCService.stopNFCScanning();
          isScanning.current = false;
          setMode('idle');
          setLoading(false);
          return;
        }

        // Mode Physical Card: Baca kartu receiver
        setScanResult('📱 Tempelkan ke kartu penerima...\n\nPosisikan kartu penerima di belakang HP Anda');
        
        const result = await NFCService.readPhysicalCardWithData();
        
        if (!result || !result.cardInfo) {
          Alert.alert(
            '❌ Kartu Penerima Tidak Terbaca',
            '• Pastikan kartu penerima dekat dengan HP\n• Coba geser posisi kartu\n• Pastikan kartu dalam kondisi baik',
            [{ text: 'OK' }]
          );
          await NFCService.stopNFCScanning();
          isScanning.current = false;
          setMode('idle');
          setLoading(false);
          return;
        }

        const { cardInfo, nfcData } = result;

        // Validasi receiver card terdaftar
        try {
          const receiverCheck = await apiService.get(`/nfc-cards/info/${cardInfo.id}`);
          if (!receiverCheck.success) {
            Alert.alert(
              '📝 Kartu Penerima Belum Terdaftar',
              `Kartu dengan UID ${cardInfo.id.slice(0, 16)}... belum terdaftar di sistem.\n\nPenerima harus mendaftar kartu terlebih dahulu.`,
              [{ text: 'OK' }]
            );
            await NFCService.stopNFCScanning();
            isScanning.current = false;
            setMode('idle');
            setLoading(false);
            return;
          }

          if (receiverCheck.card.cardStatus !== 'ACTIVE') {
            Alert.alert(
              '🚫 Kartu Penerima Tidak Aktif',
              `Status kartu penerima: ${receiverCheck.card.cardStatus}\n\nKartu ini tidak dapat menerima transaksi.`,
              [{ text: 'OK' }]
            );
            await NFCService.stopNFCScanning();
            isScanning.current = false;
            setMode('idle');
            setLoading(false);
            return;
          }

          // Cek tidak transfer ke kartu sendiri
          if (cardInfo.id === lastScannedCard) {
            Alert.alert(
              '⚠️ Tidak Dapat Transfer ke Kartu Sendiri',
              'Anda tidak dapat mengirim uang ke kartu Anda sendiri.',
              [{ text: 'OK' }]
            );
            await NFCService.stopNFCScanning();
            isScanning.current = false;
            setMode('idle');
            setLoading(false);
            return;
          }
        } catch (receiverValidationError: any) {
          console.error('Receiver validation error:', receiverValidationError);
          if (receiverValidationError?.status === 404) {
            Alert.alert(
              '📝 Kartu Penerima Belum Terdaftar',
              'Kartu penerima belum terdaftar di sistem.',
              [{ text: 'OK' }]
            );
          } else {
            Alert.alert('Error', 'Gagal memvalidasi kartu penerima.');
          }
          await NFCService.stopNFCScanning();
          isScanning.current = false;
          setMode('idle');
          setLoading(false);
          return;
        }

        // Process payment to physical card
        try {
          const paymentResult = await apiService.post('/nfc-cards/payment', {
            cardId: lastScannedCard, // Sender card
            receiverCardId: cardInfo.id, // Receiver card
            amount: amountNum,
            deviceId: currentUserData.deviceId || 'unknown',
            description: `Payment from ${currentUserData.username}`
          });

          if (paymentResult.success) {
            // Cek fraud detection result
            if (paymentResult.transaction?.fraudScore && paymentResult.transaction.fraudScore > 60) {
              Alert.alert(
                '⚠️ Transaksi Diblokir',
                `Transaksi ini terdeteksi mencurigakan oleh sistem fraud detection.\n\nFraud Score: ${paymentResult.transaction.fraudScore}%\n\nSilakan hubungi admin untuk verifikasi.`,
                [{ text: 'OK' }]
              );
            } else if (paymentResult.transaction?.fraudScore && paymentResult.transaction.fraudScore > 40) {
              Alert.alert(
                '✅ Transaksi Berhasil (Review)',
                `Transfer ${formatCurrency(amountNum)} ke kartu ${cardInfo.id.slice(0, 8)}... berhasil!\n\n⚠️ Transaksi ini akan direview oleh sistem karena terdeteksi pola yang tidak biasa (Fraud Score: ${paymentResult.transaction.fraudScore}%).`,
                [{ text: 'OK' }]
              );
            } else {
              Alert.alert(
                '✅ Transaksi Berhasil',
                `Transfer ${formatCurrency(amountNum)} ke kartu ${cardInfo.id.slice(0, 8)}... berhasil!\n\nBalance baru: ${formatCurrency(paymentResult.transaction?.balanceAfter || 0)}`,
                [{ text: 'OK' }]
              );
            }
            await fetchLatestUserData();
            setAmount(''); // Reset amount
          } else {
            Alert.alert('❌ Pembayaran Gagal', paymentResult.error || 'Terjadi kesalahan saat memproses pembayaran');
          }
        } catch (apiError: any) {
          Alert.alert('❌ Error', apiError?.message || 'Gagal memproses pembayaran');
        }

        await NFCService.stopNFCScanning();
        isScanning.current = false;
        setMode('idle');
        setLoading(false);
        
      } else {
        // Mode Virtual: Original phone-to-phone
        const nfcData: NFCData = {
          userId: currentUserData.id,
          username: currentUserData.username,
          action: 'payment',
          amount: amountNum,
          cardType: 'virtual'
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
            isScanning.current = false;
            setMode('idle');
          },
          (error) => {
            console.error('NFC scanning error:', error);
            Alert.alert('Error', 'Gagal melakukan scanning NFC');
            isScanning.current = false;
            setMode('idle');
          }
        );

        setScanResult('Dekatkan ke device penerima...');
      }
    } catch (error) {
      console.error('Send money error:', error);
      Alert.alert('Error', 'Gagal mengirim uang');
      isScanning.current = false;
      setMode('idle');
    } finally {
      setLoading(false);
    }
  };

  // 💰 Terima uang via NFC
  const handleReceiveMoney = async () => {
    // Prevent multiple NFC requests
    if (isScanning.current) {
      Alert.alert('Error', 'NFC scan sudah berjalan');
      return;
    }

    setMode('receive');
    setLoading(true);
    isScanning.current = true;

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
          isScanning.current = false;
          setMode('idle');
        },
        (error) => {
          console.error('NFC scanning error:', error);
          Alert.alert('Error', 'Gagal melakukan scanning NFC');
          isScanning.current = false;
          setMode('idle');
        }
      );

      setScanResult('Dekatkan ke device pengirim...');
    } catch (error) {
      console.error('Receive money error:', error);
      Alert.alert('Error', 'Gagal menerima uang');
      isScanning.current = false;
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

      // 🔗 Kirim ke backend Express menggunakan apiService
      try {
        // Cari receiver ID berdasarkan username (fallback jika tidak ada endpoint khusus)
        const transactionData = {
          senderId: currentUserData.id,
          receiverId: currentUserData.id + 1, // Placeholder - ideally should lookup by username
          amount,
          description: `NFC Payment from ${senderUsername} to ${receiverUsername}`
        };
        
        const res = await apiService.createTransaction(transactionData);

        if (res && res.transaction) {
          Alert.alert('✅ Sukses', `Transaksi ${formatCurrency(amount)} tersimpan di server!`);
          await fetchLatestUserData();
          return;
        }
      } catch (apiError) {
        console.warn('⚠️ Backend API gagal, mencoba fallback lokal...', apiError);
      }

      // Fallback ke local processing
      console.log('🔄 Menggunakan local processing...');
      const success = await processPayment(
        currentUserData.id,
        receiverUsername,
        amount
      );
      
      if (success) {
        Alert.alert('✅ Sukses', `Transaksi ${formatCurrency(amount)} disimpan lokal!`);
        await fetchLatestUserData();
      } else {
        Alert.alert('❌ Error', 'Gagal memproses transaksi');
      }
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert('⚠️ Error', 'Terjadi kesalahan saat memproses pembayaran');
    } finally {
      setLoading(false);
    }
  };

  // 🔄 Update saldo user
  const fetchLatestUserData = async () => {
    try {
      // Coba ambil dari backend terlebih dahulu
      try {
        const userData = await apiService.getCurrentUser();
        if (userData) {
          console.log('✅ Got user data from getCurrentUser:', userData.username, 'balance:', userData.balance);
          setCurrentUserData(userData);
          return;
        }
      } catch (backendError) {
        console.log('⚠️ Backend getCurrentUser failed, trying getUserById:', backendError);
        
        // Fallback ke getUserById
        try {
          const userData = await apiService.getUserById(currentUserData.id);
          if (userData) {
            console.log('✅ Got user data from getUserById:', userData.username, 'balance:', userData.balance);
            setCurrentUserData(userData);
            return;
          }
        } catch (getUserError) {
          console.log('⚠️ getUserById also failed:', getUserError);
        }
      }
    } catch (apiError) {
      console.log('⚠️ API unavailable, using local data:', apiError);
    }
    
    // Fallback ke local database
    try {
      const localUser = await getUserById(currentUserData.id);
      if (localUser) {
        console.log('✅ Got user data from local DB:', localUser.username, 'balance:', localUser.balance);
        setCurrentUserData(localUser);
      } else {
        console.warn('⚠️ Local user data is null/undefined - keeping current user data');
      }
    } catch (localError) {
      console.error('❌ Failed to fetch local user data:', localError);
      // Keep current user data if all fails
      console.log('⚠️ Keeping current user data:', currentUserData.username, 'balance:', currentUserData.balance);
    }
  };

  // 🔌 Cek koneksi backend
  const checkBackendConnection = async () => {
    try {
      // Try health check to verify backend is reachable
      const healthCheck = await apiService.healthCheck();
      const isConnected = healthCheck && (healthCheck.status === 'ok' || healthCheck.status === 'OK');
      console.log('Backend status:', isConnected ? 'connected' : 'offline', 'Response:', healthCheck);
      setBackendConnected(isConnected);
      return isConnected;
    } catch (error) {
      console.log('❌ Backend connection check failed:', error);
      setBackendConnected(false);
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
    
    // Cleanup on unmount
    return () => {
      if (isScanning.current) {
        NFCService.stopNFCScanning();
        isScanning.current = false;
      }
      NFCService.cleanup();
    };
  }, []);

  const stopScanning = async () => {
    await NFCService.stopNFCScanning();
    isScanning.current = false;
    setLoading(false);
    setMode('idle');
    setScanResult('');
  };

  // 📱 User data check
  if (!currentUserData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>Loading user data...</Text>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>Kembali</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
          {currentUserData?.name || 'User'} • {formatCurrency(currentUserData?.balance || 0)}
        </Text>

        <View style={styles.statusContainer}>
          <Text style={[styles.statusText, { 
            color: backendConnected ? '#27ae60' : '#e74c3c' 
          }]}>
            {backendConnected 
              ? '🔗 Terhubung ke Backend Server' 
              : '📱 Mode Offline - Data Lokal'
            }
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

        {/* Toggle Physical/Virtual Card */}
        <View style={styles.toggleContainer}>
          <Text style={styles.toggleLabel}>Mode Kartu:</Text>
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => setUsePhysicalCard(!usePhysicalCard)}
          >
            <Text style={styles.toggleText}>
              {usePhysicalCard ? '🎴 Kartu Fisik (NTag215)' : '📱 Virtual (Phone)'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Scan Physical Card Button */}
        {usePhysicalCard && (
          <View>
            {!lastScannedCard && (
              <View style={styles.warningCard}>
                <Text style={styles.warningText}>
                  ⚠️ Belum Ada Kartu Terdaftar{'\n'}
                  Scan kartu Anda terlebih dahulu untuk menggunakan pembayaran NFC
                </Text>
              </View>
            )}
            
            {lastScannedCard && (
              <View style={styles.cardStatusCard}>
                <Text style={styles.cardStatusTitle}>✅ Kartu Aktif</Text>
                <Text style={styles.cardStatusUid}>UID: {lastScannedCard.slice(0, 16)}...</Text>
                <Text style={styles.cardStatusSubtext}>Siap digunakan untuk transaksi</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.actionButton, styles.scanCardButton]}
              onPress={handleScanPhysicalCard}
              disabled={loading}
            >
              <Text style={styles.actionButtonText}>
                {lastScannedCard ? '🔄 Scan Ulang Kartu' : '🎴 Scan Kartu Fisik'}
              </Text>
              <Text style={styles.actionButtonSubtext}>
                Tempelkan kartu NTag215 di belakang HP
              </Text>
            </TouchableOpacity>

            <View style={styles.instructionCard}>
              <Text style={styles.instructionTitle}>📖 Cara Menggunakan Kartu NFC:</Text>
              <Text style={styles.instructionText}>
                1. Pastikan NFC aktif di HP Anda{'\n'}
                2. Tap tombol "Scan Kartu Fisik"{'\n'}
                3. Tempelkan kartu NTag215 di belakang HP{'\n'}
                4. Posisi kartu di area antena NFC (biasanya tengah atas){'\n'}
                5. Tunggu hingga kartu terdeteksi{'\n'}
                6. Masukkan jumlah transfer{'\n'}
                7. Tap "Kirim Uang" dan tempelkan ke kartu penerima
              </Text>
            </View>
          </View>
        )}

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.sendButton]}
            onPress={handleSendMoney}
            disabled={loading}
          >
            <Text style={styles.actionButtonText}>Kirim Uang</Text>
            <Text style={styles.actionButtonSubtext}>
              {usePhysicalCard ? 'Dekatkan ke kartu penerima' : 'Dekatkan HP ke penerima'}
            </Text>
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
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 12,
    color: '#34495e',
  },
  toggleButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  toggleText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
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
  scanCardButton: { backgroundColor: '#9b59b6' },
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
  instructionBox: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginVertical: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
  },
  backButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  warningCard: {
    backgroundColor: '#fff3cd',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#f39c12',
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
  },
  cardStatusCard: {
    backgroundColor: '#d4edda',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#27ae60',
  },
  cardStatusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#155724',
    marginBottom: 5,
  },
  cardStatusUid: {
    fontSize: 13,
    color: '#155724',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 3,
  },
  cardStatusSubtext: {
    fontSize: 12,
    color: '#155724',
  },
  instructionCard: {
    backgroundColor: '#e8f4f8',
    padding: 15,
    borderRadius: 8,
    marginTop: 15,
  },
  instructionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  instructionText: {
    fontSize: 13,
    color: '#34495e',
    lineHeight: 20,
  },
});
