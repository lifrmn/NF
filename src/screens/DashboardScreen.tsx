// src/screens/DashboardScreen.tsx
/* ==================================================================================
 * 🏠 SCREEN: DashboardScreen
 * ==================================================================================
 * 
 * Purpose:
 * Main home screen aplikasi NFC Payment setelah user login.
 * Hub pusat untuk: display balance, navigate to features, view transaction history.
 * 
 * User Flow:
 * ┌────────────────────────────────────────────────────────────────────┐
 * │ LOGIN SUCCESS → DashboardScreen                                    │
 * │                                                                     │
 * │ Screen Features:                                                    │
 * │ 1. Header: Greeting + Logout button                                │
 * │ 2. Balance Card: Current balance + sync status                     │
 * │ 3. Action Buttons:                                                  │
 * │    - 💳 NFC Payment (merchant receive payment)                     │
 * │    - 📇 Register Card (link new NFC card)                          │
 * │    - 🎴 My Cards (manage existing cards)                           │
 * │ 4. Transaction History: Recent transactions (scrollable)            │
 * │                                                                     │
 * │ Navigation Options:                                                 │
 * │ - Tap "💳 NFC Payment" → NFCScreen                                 │
 * │ - Tap "📇 Register Card" → RegisterCardScreen                      │
 * │ - Tap "🎴 My Cards" → MyCardsScreen                                │
 * │ - Tap "Logout" → LoginScreen                                       │
 * └────────────────────────────────────────────────────────────────────┘
 * 
 * Key Features:
 * 
 * 1. Auto-Refresh Balance:
 *    - useFocusEffect: Refresh balance setiap screen focused
 *    - syncBalanceFromBackend: Sync dari backend API
 *    - Fallback to SQLite: Jika backend offline
 * 
 * 2. Pull-to-Refresh:
 *    - Swipe down untuk manual refresh
 *    - RefreshControl component
 *    - Load user data + transactions
 * 
 * 3. Backend Health Check:
 *    - Auto-check setiap 90 detik
 *    - Rate limit handling (prevent spam)
 *    - Show connection status (connected/offline)
 * 
 * 4. Transaction History:
 *    - Display 10 recent transactions
 *    - Color coding: Green (received), Red (sent)
 *    - Relative time display (e.g., "2 jam yang lalu")
 *    - Empty state: "Belum ada transaksi"
 * 
 * 5. Hybrid Data Source:
 *    - Primary: SQLite cache (fast, offline-first)
 *    - Secondary: Backend API (sync latest data)
 *    - Strategy: Cache-first, background sync
 * 
 * State Management:
 * - currentUser: Latest user data dari database
 * - transactions: Array of recent transactions
 * - loading: Boolean untuk RefreshControl
 * - backendStatus: String status message
 * - connectionStatus: 'connecting' | 'connected' | 'offline'
 * - lastSyncTime: Date last successful sync
 * - syncStatus: 'success' | 'failed' | 'never'
 * 
 * Props:
 * - user: Current user object (from App.tsx)
 * - onLogout: Callback untuk logout
 * - onNavigateToNFC: Navigate ke NFCScreen
 * - onNavigateToRegisterCard: Navigate ke RegisterCardScreen
 * - onNavigateToMyCards: Navigate ke MyCardsScreen
 * 
 * ==================================================================================
 */

import React, { useState, useEffect } from 'react';

/* ==================================================================================
 * IMPORTS
 * ==================================================================================
 * React Navigation:
 * - useFocusEffect: Hook untuk run code setiap screen focused
 *   Use case: Auto-refresh balance saat user kembali ke dashboard
 * 
 * React Native Core:
 * - View, Text, TouchableOpacity: Basic UI components
 * - ScrollView: Scrollable container untuk transaction history
 * - Alert: Confirmation dialogs (e.g., logout confirmation)
 * - RefreshControl: Pull-to-refresh functionality
 * - SafeAreaView: Respect device safe area (notch, status bar)
 * 
 * AsyncStorage:
 * - Persistent storage untuk token dan user session
 * 
 * Utils:
 * - database.ts: SQLite functions (getUserById, getUserTransactions, syncBalanceFromBackend)
 * - apiService.ts: HTTP client untuk backend API
 * ==================================================================================
 */
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserById, getUserTransactions, syncBalanceFromBackend } from '../utils/database';
import { apiService } from '../utils/apiService';

/* ==================================================================================
 * TYPE DEFINITIONS
 * ==================================================================================
 * DashboardScreenProps:
 * - user: Current logged-in user object (id, name, username, balance)
 * - onLogout: Callback function untuk logout (clear session, navigate to LoginScreen)
 * - onNavigateToNFC: Navigate to NFCScreen untuk merchant payment
 * - onNavigateToRegisterCard: Optional callback untuk RegisterCardScreen
 * - onNavigateToMyCards: Optional callback untuk MyCardsScreen
 * ==================================================================================
 */
interface DashboardScreenProps {
  user: any;
  onLogout: () => void;
  onNavigateToNFC: () => void;
  onNavigateToRegisterCard?: () => void;
  onNavigateToMyCards?: () => void;
}

/* ==================================================================================
 * COMPONENT: DashboardScreen
 * ==================================================================================
 * Main home screen dengan balance display, action buttons, dan transaction history.
 * 
 * PARAMS:
 * @param user - Current user object
 * @param onLogout - Logout callback
 * @param onNavigateToNFC - Navigate to NFC payment screen
 * @param onNavigateToRegisterCard - Navigate to register card screen
 * @param onNavigateToMyCards - Navigate to my cards screen
 * ==================================================================================
 */
export default function DashboardScreen({ user, onLogout, onNavigateToNFC, onNavigateToRegisterCard, onNavigateToMyCards }: DashboardScreenProps) {
  
  /* ================================================================================
   * STATE MANAGEMENT (7 states)
   * ================================================================================
   */
  
  // STATE 1: currentUser
  // Latest user data dari database (includes updated balance)
  // Initial: user dari props (could be stale)
  // Updated: After refreshData() call
  const [currentUser, setCurrentUser] = useState(user || null);
  
  // STATE 2: transactions
  // Array of user transactions (recent 10)
  // Initial: empty array
  // Updated: After getUserTransactions() call
  const [transactions, setTransactions] = useState<any[]>([]);
  
  // STATE 3: loading
  // Boolean flag untuk RefreshControl (pull-to-refresh animation)
  // true: Show spinner while refreshing
  // false: Hide spinner
  const [loading, setLoading] = useState(false);
  
  // STATE 4: backendStatus
  // String message untuk backend connection status
  // Values: "Connecting...", "Backend Online ✅", "Backend Offline ❌", etc.
  const [backendStatus, setBackendStatus] = useState('Connecting...');
  
  // STATE 5: connectionStatus
  // Enum untuk connection state
  // 'connecting': Initial state, checking backend
  // 'connected': Backend reachable
  // 'offline': Backend tidak reachable
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'offline'>('connecting');
  
  // STATE 6: lastSyncTime
  // Timestamp last successful balance sync
  // null: Never synced
  // Date: Last sync time (displayed as relative time)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  
  // STATE 7: syncStatus
  // Result of last sync attempt
  // 'never': No sync attempted yet
  // 'success': Last sync succeeded
  // 'failed': Last sync failed
  const [syncStatus, setSyncStatus] = useState<'success' | 'failed' | 'never'>('never');

  /* ================================================================================
   * FUNCTION: refreshData
   * ================================================================================
   * Reload user data dan transactions dari database + sync balance dari backend.
   * 
   * FLOW:
   * 1. Load user data dari SQLite (fast, cache-first)
   * 2. Load transactions dari SQLite
   * 3. Sync balance dari backend (background update)
   * 4. Handle sync success/fail status
   * 
   * Why Cache-First Strategy?
   * - SQLite read sangat cepat (~1ms)
   * - Backend API bisa lambat atau offline
   * - Better UX: Show cached data immediately, update in background
   * 
   * Called By:
   * - Pull-to-refresh (RefreshControl)
   * - useFocusEffect (screen focus)
   * - useEffect (component mount)
   * ================================================================================
   */
  const refreshData = async () => {
    if (!user || !user.id) {
      console.log('⚠️ No valid user for refresh data');
      return;
    }
    
    setLoading(true);
    try {
      // Ambil data user dari database lokal terlebih dahulu (cepat)
      const updatedUser = await getUserById(user.id);
      if (updatedUser) {
        setCurrentUser(updatedUser);
        console.log('💾 Loaded user from local DB');
      }

      // Ambil riwayat transaksi dari lokal
      const userTransactions = await getUserTransactions(user.id);
      setTransactions(userTransactions || []);

      // Sync balance dari backend (optional, hanya jika koneksi bagus)
      try {
        console.log('💰 Syncing balance from backend...');
        const syncedBalance = await syncBalanceFromBackend(user.id);
        if (syncedBalance !== null && typeof syncedBalance === 'number' && updatedUser) {
          updatedUser.balance = syncedBalance;
          setCurrentUser(updatedUser);
          setLastSyncTime(new Date());
          setSyncStatus('success');
          console.log(`✅ Updated user balance from backend: ${syncedBalance}`);
        }
      } catch (syncError: any) {
        setSyncStatus('failed');
        // Silent fail untuk rate limit errors
        if (syncError.message?.includes('429')) {
          console.log('⏱️ Rate limited, using cached balance');
        } else {
          console.warn('⚠️ Balance sync failed, using local data:', syncError.message);
        }
      }
      
    } catch (error) {
      console.error('Error refreshing data:', error);
      if (!currentUser || !currentUser.id) {
        Alert.alert('Error', 'Gagal memuat data terbaru');
      }
    } finally {
      setLoading(false);
    }
  };

  // checkBackendStatus: Cek koneksi ke backend server (health check)
  const checkBackendStatus = async () => {
    try {
      setConnectionStatus('connecting');
      const healthCheck = await apiService.healthCheck();
      const status = apiService.getConnectionStatus();
      
      console.log('🔍 Health check response:', healthCheck);
      
      if (healthCheck && (healthCheck.status === 'ok' || healthCheck.status === 'OK')) {
        console.log('✅ Backend connected:', status.url);
        setBackendStatus(`Connected: ${status.url || 'Backend Server'}`);
        setConnectionStatus('connected');
      } else {
        console.log('⚠️ Backend response invalid:', healthCheck);
        setBackendStatus('Offline Mode');
        setConnectionStatus('offline');
      }
    } catch (error: any) {
      // Handle rate limiting gracefully
      if (error.message?.includes('429')) {
        console.log('⏱️ Rate limited, backend status unknown');
        setBackendStatus('Rate Limited - Using Cache');
        setConnectionStatus('offline');
      } else {
        console.log('❌ Backend connection check failed:', error);
        setBackendStatus('Offline Mode');
        setConnectionStatus('offline');
      }
    }
  };

  // useEffect: Load data awal dan auto-check backend setiap 90 detik (dikurangi untuk prevent rate limit)
  useEffect(() => {
    refreshData();
    // Delay health check untuk prevent simultaneous requests
    const initialHealthCheck = setTimeout(() => checkBackendStatus(), 3000);
    // Auto-check setiap 90 detik (reduced from 30s untuk prevent Ngrok rate limit)
    const statusInterval = setInterval(checkBackendStatus, 90000);
    return () => {
      clearTimeout(initialHealthCheck);
      clearInterval(statusInterval);
    };
  }, []);

  // useFocusEffect: Auto-refresh saldo setiap kali screen aktif (kembali dari NFCScreen)
  useFocusEffect(
    React.useCallback(() => {
      console.log('📱 Dashboard focused - refreshing balance...');
      refreshData();
    }, [user])
  );

  // Utility: Format angka ke Rupiah (100000 → Rp100.000)
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Utility: Format tanggal ke format Indonesia (dd/mm/yyyy, hh:mm)
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Utility: Format waktu relatif (2 menit lalu, 1 jam lalu)
  const formatTimeSince = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'baru saja';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} menit lalu`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} jam lalu`;
    const days = Math.floor(hours / 24);
    return `${days} hari lalu`;
  };

  // handleLogout: Tampilkan konfirmasi logout
  const handleLogout = () => {
    console.log('🔘 Logout button pressed');
    Alert.alert(
      'Logout',
      'Apakah Anda yakin ingin keluar?',
      [
        { text: 'Batal', style: 'cancel', onPress: () => console.log('❌ Logout cancelled') },
        { text: 'Keluar', onPress: () => { console.log('✅ Logout confirmed, calling onLogout'); onLogout(); }, style: 'destructive' },
      ]
    );
  };

  // Safety check: Early return jika currentUser tidak ada
  if (!currentUser) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading user data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refreshData} />}
      >
        {/* SECTION 1: Header - Greeting + Logout */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Selamat datang,</Text>
            <Text style={styles.userName}>{currentUser?.name || 'User'}</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.7} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
            <Text style={styles.logoutText}>Keluar</Text>
          </TouchableOpacity>
        </View>

        {/* SECTION 2: Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceLabel}>Saldo Anda</Text>
            <TouchableOpacity style={styles.refreshButton} onPress={refreshData} activeOpacity={0.7}>
              <Text style={styles.refreshButtonText}>🔄</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.balanceAmount}>{formatCurrency(currentUser?.balance || 0)}</Text>
          <Text style={styles.balanceSubtext}>Username: {currentUser?.username || 'Loading...'}</Text>
          {lastSyncTime && syncStatus === 'success' && (
            <Text style={styles.lastSyncSuccess}>
              ✅ Sync berhasil • {formatTimeSince(lastSyncTime)}
            </Text>
          )}
          {syncStatus === 'failed' && (
            <Text style={styles.lastSyncFailed}>
              ⚠️ Sync gagal • Menggunakan data cache
            </Text>
          )}
          {syncStatus === 'never' && (
            <Text style={styles.syncInfo}>Pull ke bawah atau klik 🔄 untuk sync saldo</Text>
          )}
        </View>

        {/* SECTION 3: Connection Status - HIDDEN */}
        {/* <View style={styles.connectionCard}>
          <View style={styles.connectionHeader}>
            <Text style={styles.connectionTitle}>Status Koneksi</Text>
            <TouchableOpacity style={styles.reconnectButton} onPress={checkBackendStatus} activeOpacity={0.7}>
              <Text style={styles.reconnectText}>🔄</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.connectionRow}>
            <View style={[styles.statusDot, {
              backgroundColor: connectionStatus === 'connected' ? '#27ae60' : connectionStatus === 'connecting' ? '#f39c12' : '#e74c3c'
            }]} />
            <Text style={styles.connectionText}>
              {connectionStatus === 'connected' ? 'Terhubung' : connectionStatus === 'connecting' ? 'Menghubungkan...' : 'Offline'}
            </Text>
          </View>
          <Text style={styles.connectionSubtext}>{backendStatus || 'Loading...'}</Text>
          {connectionStatus === 'offline' && (
            <Text style={styles.attemptsText}>Mode offline aktif - Data tersimpan lokal</Text>
          )}
        </View> */}

        {/* SECTION 4: Action Buttons - Menu utama */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.nfcButton} onPress={onNavigateToNFC}>
            <Text style={styles.nfcButtonText}>💳 NFC Payment</Text>
            <Text style={styles.nfcButtonSubtext}>Kirim atau terima pembayaran melalui NFC</Text>
          </TouchableOpacity>
          
          {/* Info: 1 USER = 1 CARD Policy */}
          <View style={styles.cardPolicyInfo}>
            <Text style={styles.cardPolicyText}>📌 Kebijakan: 1 USER = 1 CARD</Text>
            <Text style={styles.cardPolicySubtext}>Setiap user hanya dapat mendaftarkan satu kartu NFC</Text>
          </View>
          
          <View style={styles.cardButtonsRow}>
            <TouchableOpacity style={styles.cardButton} onPress={onNavigateToRegisterCard || (() => {})}>
              <Text style={styles.cardButtonIcon}>➕</Text>
              <Text style={styles.cardButtonText}>Daftar Kartu</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.cardButton, styles.myCardsButton]} 
              onPress={() => {
                console.log('🎴 My Cards button pressed');
                if (onNavigateToMyCards) {
                  onNavigateToMyCards();
                } else {
                  console.warn('⚠️ onNavigateToMyCards is not defined');
                }
              }}
            >
              <Text style={styles.cardButtonIcon}>🎴</Text>
              <Text style={styles.cardButtonText}>Kartu Saya</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* SECTION 5: Transaction History */}
        <View style={styles.transactionsContainer}>
          <Text style={styles.sectionTitle}>Riwayat Transaksi</Text>
          {transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Belum ada transaksi</Text>
            </View>
          ) : (
            transactions.map((transaction, index) => {
              if (!currentUser?.id) return null;
              const isReceiver = transaction.receiverId === currentUser.id;
              const otherUser = isReceiver ? transaction.sender : transaction.receiver;
              if (!otherUser) return null;
              
              return (
                <View key={index} style={styles.transactionItem}>
                  <View style={styles.transactionInfo}>
                    <Text style={styles.transactionType}>
                      {isReceiver ? '📥 Diterima dari' : '📤 Dikirim ke'}
                    </Text>
                    <Text style={styles.transactionUser}>
                      {(otherUser?.name || 'Unknown')} (@{otherUser?.username || 'unknown'})
                    </Text>
                    <Text style={styles.transactionDate}>
                      {formatDate(transaction.createdAt || new Date().toISOString())}
                    </Text>
                  </View>
                  <Text style={[styles.transactionAmount, isReceiver ? styles.positiveAmount : styles.negativeAmount]}>
                    {isReceiver ? '+' : '-'}{formatCurrency(transaction.amount || 0)}
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
    marginBottom: 12,
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
  cardButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cardButton: {
    flex: 1,
    backgroundColor: '#e91e63',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  myCardsButton: {
    backgroundColor: '#9c27b0',
  },
  cardButtonIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  cardButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
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
  lastSyncSuccess: {
    fontSize: 11,
    color: '#28a745',
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '500',
  },
  lastSyncFailed: {
    fontSize: 11,
    color: '#ffc107',
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '500',
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
  cardPolicyInfo: {
    backgroundColor: '#fff3cd',
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  cardPolicyText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 4,
  },
  cardPolicySubtext: {
    fontSize: 12,
    color: '#856404',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});