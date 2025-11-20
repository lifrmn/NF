// ============================================================================
// DASHBOARD SCREEN - LAYAR UTAMA APLIKASI
// ============================================================================
// File ini menampilkan:
// 1. Informasi saldo user
// 2. Status koneksi backend
// 3. Tombol NFC Payment
// 4. Riwayat transaksi
// ============================================================================

// Import React hooks untuk state management
import React, { useState, useEffect } from 'react';

// Import komponen UI dari React Native
import {
  View,              // Container dasar
  Text,              // Untuk menampilkan teks
  TouchableOpacity,  // Button yang bisa diklik
  StyleSheet,        // Untuk styling
  ScrollView,        // Container yang bisa di-scroll
  Alert,             // Untuk popup konfirmasi
  RefreshControl,    // Untuk pull-to-refresh
} from 'react-native';

// SafeAreaView: Container yang aman dari notch iPhone dan navigation bar
import { SafeAreaView } from 'react-native-safe-area-context';

// AsyncStorage: Local storage untuk menyimpan data di device
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import fungsi database lokal (SQLite) dan sync balance
import { getUserById, getUserTransactions, syncBalanceFromBackend } from '../utils/database';

// Import fungsi untuk koneksi ke backend
import { connectBackend, getBackendStatus } from '../utils/simpleBackend';

// ============================================================================
// INTERFACE - TIPE DATA UNTUK PROPS
// ============================================================================
// Props adalah data yang dikirim dari parent component (App.tsx)
interface DashboardScreenProps {
  user: any;                     // Data user yang sedang login
  onLogout: () => void;          // Fungsi untuk logout (dari App.tsx)
  onNavigateToNFC: () => void;   // Fungsi untuk pindah ke NFC Screen
}

// ============================================================================
// MAIN COMPONENT FUNCTION
// ============================================================================
export default function DashboardScreen({ user, onLogout, onNavigateToNFC }: DashboardScreenProps) {
  
  // ==========================================================================
  // STATE VARIABLES - DATA YANG BERUBAH-UBAH DAN TRIGGER RE-RENDER
  // ==========================================================================
  
  // currentUser: Data user terbaru (bisa berubah saat refresh)
  // Contoh: { id: 1, username: 'budi', name: 'Budi', balance: 100000 }
  const [currentUser, setCurrentUser] = useState(user);
  
  // transactions: Array berisi riwayat transaksi user
  // Contoh: [{ id: 1, amount: 50000, sender: {...}, receiver: {...} }]
  const [transactions, setTransactions] = useState<any[]>([]);
  
  // loading: Status loading saat refresh data (true/false)
  const [loading, setLoading] = useState(false);
  
  // backendStatus: Teks status koneksi backend
  // Contoh: "Connected: http://192.168.137.1:4000" atau "Offline"
  const [backendStatus, setBackendStatus] = useState('Connecting...');
  
  // connectionStatus: Status koneksi dalam 3 kondisi
  // - 'connecting': Sedang mencoba connect
  // - 'connected': Berhasil connect
  // - 'offline': Tidak connect (mode offline)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'offline'>('connecting');

  // ==========================================================================
  // FUNGSI: refreshData()
  // ==========================================================================
  // Fungsi untuk memuat ulang data user dan transaksi
  // Dipanggil saat:
  // 1. Screen pertama kali dibuka (useEffect)
  // 2. User pull-to-refresh (tarik layar ke bawah)
  // 3. Setelah transaksi NFC selesai
  // ==========================================================================
  const refreshData = async () => {
    // Validasi: Cek apakah user valid
    if (!user || !user.id) {
      console.log('⚠️ No valid user for refresh data');
      return;
    }
    
    // Set loading = true (tampilkan loading spinner)
    setLoading(true);
    
    try {
      // STEP 1: Sinkronisasi saldo dari backend terlebih dahulu
      console.log('💰 Syncing balance from backend...');
      const syncedBalance = await syncBalanceFromBackend(user.id);
      
      // STEP 2: Ambil data user terbaru dari database lokal
      // Kenapa perlu refresh? Karena saldo bisa berubah setelah transaksi
      const updatedUser = await getUserById(user.id);
      if (updatedUser) {
        // Jika ada balance baru dari backend, gunakan itu
        if (syncedBalance !== null) {
          updatedUser.balance = syncedBalance;
          console.log(`✅ Updated user balance from backend: ${syncedBalance}`);
        }
        setCurrentUser(updatedUser);  // Update state dengan data terbaru
      }

      // STEP 2: Ambil riwayat transaksi user dari database lokal
      // getUserTransactions() return array transaksi (sent + received)
      const userTransactions = await getUserTransactions(user.id);
      setTransactions(userTransactions);

      // STEP 3: Cek status koneksi backend
      await checkBackendStatus();
      
    } catch (error) {
      // Jika ada error, tampilkan alert ke user
      console.error('Error refreshing data:', error);
      Alert.alert('Error', 'Gagal memuat data terbaru');
      
    } finally {
      // Set loading = false (sembunyikan loading spinner)
      // finally = dijalankan apapun hasilnya (sukses/error)
      setLoading(false);
    }
  };

  // ==========================================================================
  // FUNGSI: checkBackendStatus()
  // ==========================================================================
  // Fungsi untuk mengecek apakah backend server bisa diakses
  // Backend server biasanya di laptop dengan IP: http://192.168.137.1:4000
  // Dipanggil setiap 10 detik (auto-check) dan saat user klik tombol refresh
  // ==========================================================================
  const checkBackendStatus = async () => {
    try {
      // STEP 1: Coba connect ke backend
      // connectBackend() akan scan network dan cari backend server
      const connected = await connectBackend();
      
      // STEP 2: Ambil informasi status backend (baseUrl, etc)
      const status = await getBackendStatus();
      
      // STEP 3: Update UI berdasarkan hasil
      if (connected) {
        // Berhasil connect: Tampilkan URL backend
        setBackendStatus(`Connected: ${status.baseUrl}`);
        setConnectionStatus('connected');
      } else {
        // Gagal connect: Mode offline
        setBackendStatus('Offline');
        setConnectionStatus('offline');
      }
      
    } catch (error) {
      // Jika terjadi error: Set status offline
      setBackendStatus('Error');
      setConnectionStatus('offline');
    }
  };

  // ==========================================================================
  // USEEFFECT HOOK - DIJALANKAN SAAT COMPONENT PERTAMA KALI MUNCUL
  // ==========================================================================
  // useEffect dengan [] (empty dependency) = hanya dijalankan 1 kali saat mount
  // ==========================================================================
  useEffect(() => {
    // STEP 1: Load data awal (user + transactions)
    refreshData();
    
    // STEP 2: Cek koneksi backend
    checkBackendStatus();
    
    // STEP 3: Set interval untuk auto-check backend setiap 10 detik
    // Ini membuat status koneksi selalu update otomatis
    // setInterval = fungsi yang dijalankan berulang setiap X miliseconds
    const statusInterval = setInterval(checkBackendStatus, 10000);  // 10000ms = 10 detik
    
    // CLEANUP FUNCTION: Dijalankan saat component di-unmount (screen ditutup)
    // Penting untuk stop interval agar tidak memory leak
    return () => clearInterval(statusInterval);
    
  }, []);  // [] = tidak ada dependency, hanya run 1x saat mount

  // ==========================================================================
  // FUNGSI: formatCurrency()
  // ==========================================================================
  // Fungsi untuk format angka menjadi format Rupiah
  // Input: 100000 → Output: "Rp100.000"
  // Menggunakan Intl.NumberFormat (built-in JavaScript untuk format currency)
  // ==========================================================================
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {      // Locale Indonesia
      style: 'currency',                         // Format sebagai currency
      currency: 'IDR',                           // Mata uang: Indonesian Rupiah
      minimumFractionDigits: 0,                  // Tidak pakai desimal (.00)
    }).format(amount);
  };

  // ==========================================================================
  // FUNGSI: formatDate()
  // ==========================================================================
  // Fungsi untuk format tanggal menjadi format Indonesia
  // Input: "2024-01-15T10:30:00.000Z" → Output: "15/01/2024, 10:30"
  // ==========================================================================
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);           // Convert string ke Date object
    return date.toLocaleDateString('id-ID', {    // Format locale Indonesia
      day: '2-digit',      // Hari: 01, 02, ..., 31
      month: '2-digit',    // Bulan: 01, 02, ..., 12
      year: 'numeric',     // Tahun: 2024
      hour: '2-digit',     // Jam: 00, 01, ..., 23
      minute: '2-digit',   // Menit: 00, 01, ..., 59
    });
  };

  // ==========================================================================
  // FUNGSI: handleLogout()
  // ==========================================================================
  // Fungsi untuk logout dengan konfirmasi
  // Alert.alert = popup konfirmasi (seperti confirm dialog di web)
  // ==========================================================================
  const handleLogout = () => {
    console.log('🔘 Logout button pressed');
    
    // Tampilkan popup konfirmasi dengan 2 tombol
    Alert.alert(
      'Logout',                              // Title popup
      'Apakah Anda yakin ingin keluar?',     // Message popup
      [
        // TOMBOL 1: Batal (cancel logout)
        { 
          text: 'Batal', 
          style: 'cancel',                   // Style biru (default)
          onPress: () => console.log('❌ Logout cancelled')
        },
        
        // TOMBOL 2: Keluar (confirm logout)
        { 
          text: 'Keluar', 
          onPress: () => {
            console.log('✅ Logout confirmed, calling onLogout');
            // Panggil fungsi onLogout dari App.tsx
            // onLogout() akan clear AsyncStorage dan reset state di App.tsx
            onLogout();
          }, 
          style: 'destructive'               // Style merah (destructive action)
        },
      ]
    );
  };

  // ==========================================================================
  // RETURN JSX - UI YANG DITAMPILKAN DI LAYAR
  // ==========================================================================
  return (
    // SafeAreaView: Container yang aman dari notch iPhone (area atas/bawah)
    <SafeAreaView style={styles.container}>
      
      {/* ScrollView: Container yang bisa di-scroll */}
      {/* RefreshControl: Enable pull-to-refresh (tarik ke bawah untuk refresh) */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl 
            refreshing={loading}           // Tampilkan spinner jika loading=true
            onRefresh={refreshData}        // Fungsi yang dipanggil saat pull-to-refresh
          />
        }
      >
        
        {/* ================================================================ */}
        {/* SECTION 1: HEADER - Greeting + Logout Button */}
        {/* ================================================================ */}
        <View style={styles.header}>
          {/* Left side: Greeting text */}
          <View>
            <Text style={styles.greeting}>Selamat datang,</Text>
            <Text style={styles.userName}>{currentUser.name}</Text>
          </View>
          
          {/* Right side: Logout button */}
          <TouchableOpacity 
            style={styles.logoutButton} 
            onPress={handleLogout}       // Panggil fungsi handleLogout saat diklik
            activeOpacity={0.7}          // Opacity saat ditekan (0.7 = agak transparan)
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}  // Expand area klik
          >
            <Text style={styles.logoutText}>Keluar</Text>
          </TouchableOpacity>
        </View>

        {/* ================================================================ */}
        {/* SECTION 2: BALANCE CARD - Tampilkan saldo user */}
        {/* ================================================================ */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceLabel}>Saldo Anda</Text>
            {/* Tombol refresh saldo */}
            <TouchableOpacity 
              style={styles.refreshButton} 
              onPress={refreshData}
              activeOpacity={0.7}
            >
              <Text style={styles.refreshButtonText}>🔄</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.balanceAmount}>
            {/* Tampilkan saldo dengan format Rupiah */}
            {formatCurrency(currentUser.balance)}
          </Text>
          <Text style={styles.balanceSubtext}>
            Username: {currentUser.username}
          </Text>
          <Text style={styles.syncInfo}>
            Pull ke bawah atau klik 🔄 untuk sync saldo
          </Text>
        </View>

        {/* ================================================================ */}
        {/* SECTION 3: CONNECTION STATUS - Status koneksi ke backend */}
        {/* ================================================================ */}
        {/* Backend server diperlukan untuk:
             - Sync data ke database pusat (PostgreSQL)
             - Fraud detection dengan data history lengkap
             - Admin dashboard monitoring
             Mode offline tetap bisa untuk:
             - NFC payment (data tersimpan di local SQLite)
             - View balance dan transactions lokal
        */}
{/* ADMIN STATUS SECTION HIDDEN BY USER REQUEST */}

        {/* ================================================================ */}
        {/* SECTION 4: NFC BUTTON - Tombol untuk masuk ke NFC Screen */}
        {/* ================================================================ */}
        {/* NFC Payment:
             - Pembayaran tanpa internet (peer-to-peer)
             - Transfer uang dari HP ke HP menggunakan NFC
             - Data dikirim dalam format NDEF (NFC Data Exchange Format)
             - Fraud detection dijalankan secara real-time
        */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={styles.nfcButton}
            onPress={onNavigateToNFC}    // Navigate ke NFCScreen
          >
            <Text style={styles.nfcButtonText}>💳 NFC Payment</Text>
            <Text style={styles.nfcButtonSubtext}>
              Kirim atau terima pembayaran melalui NFC
            </Text>
          </TouchableOpacity>
        </View>

        {/* ================================================================ */}
        {/* SECTION 5: TRANSACTION HISTORY - Riwayat transaksi */}
        {/* ================================================================ */}
        <View style={styles.transactionsContainer}>
          <Text style={styles.sectionTitle}>Riwayat Transaksi</Text>
          
          {/* Conditional Rendering: Tampilkan empty state atau list */}
          {transactions.length === 0 ? (
            // CASE 1: Tidak ada transaksi
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                Belum ada transaksi
              </Text>
            </View>
          ) : (
            // CASE 2: Ada transaksi, tampilkan list
            // map() = loop array untuk render setiap item
            transactions.map((transaction, index) => {
              
              // Tentukan apakah user adalah penerima atau pengirim
              const isReceiver = transaction.receiverId === currentUser.id;
              
              // Ambil data user lawan (sender atau receiver)
              // Contoh: Jika user adalah receiver, maka otherUser = sender
              const otherUser = isReceiver ? transaction.sender : transaction.receiver;
              
              return (
                // key={index} penting untuk React list rendering
                <View key={index} style={styles.transactionItem}>
                  {/* Left side: Info transaksi */}
                  <View style={styles.transactionInfo}>
                    {/* Icon dan tipe transaksi */}
                    <Text style={styles.transactionType}>
                      {isReceiver ? '📥 Diterima dari' : '📤 Dikirim ke'}
                    </Text>
                    
                    {/* Nama dan username lawan transaksi */}
                    <Text style={styles.transactionUser}>
                      {otherUser.name} (@{otherUser.username})
                    </Text>
                    
                    {/* Tanggal transaksi */}
                    <Text style={styles.transactionDate}>
                      {formatDate(transaction.createdAt)}
                    </Text>
                  </View>
                  
                  {/* Right side: Amount dengan warna dinamis */}
                  <Text style={[
                    styles.transactionAmount,
                    // Style conditional: hijau untuk received, merah untuk sent
                    isReceiver ? styles.positiveAmount : styles.negativeAmount
                  ]}>
                    {/* Tampilkan + atau - sesuai tipe transaksi */}
                    {isReceiver ? '+' : '-'}{formatCurrency(transaction.amount)}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
  },
  greeting: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  logoutButton: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2.0,
    elevation: 2,
  },
  logoutText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  balanceCard: {
    backgroundColor: '#3498db',
    margin: 20,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  balanceLabel: {
    color: 'white',
    fontSize: 16,
    marginBottom: 8,
  },
  balanceAmount: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  balanceSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  actionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  nfcButton: {
    backgroundColor: '#27ae60',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  nfcButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  nfcButtonSubtext: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    textAlign: 'center',
  },
  transactionsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  emptyState: {
    backgroundColor: 'white',
    padding: 40,
    borderRadius: 8,
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#7f8c8d',
    fontSize: 16,
  },
  transactionItem: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionType: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  transactionUser: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: '#95a5a6',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  positiveAmount: {
    color: '#27ae60',
  },
  negativeAmount: {
    color: '#e74c3c',
  },
  // Connection status styles
  connectionCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  connectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  refreshButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshButtonText: {
    fontSize: 14,
    color: '#fff',
  },
  syncInfo: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  reconnectButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reconnectText: {
    fontSize: 14,
    color: '#fff',
  },
  connectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  connectionText: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '500',
  },
  connectionSubtext: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 4,
  },
  attemptsText: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
    fontStyle: 'italic',
  },
});