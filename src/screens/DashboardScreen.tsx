import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getUserById, getUserTransactions } from '../utils/database';

interface DashboardScreenProps {
  user: any;
  onLogout: () => void;
  onNavigateToNFC: () => void;
}

export default function DashboardScreen({ user, onLogout, onNavigateToNFC }: DashboardScreenProps) {
  const [currentUser, setCurrentUser] = useState(user);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshData = async () => {
    if (!user || !user.id) {
      console.log('⚠️ No valid user for refresh data');
      return;
    }
    
    setLoading(true);
    try {
      // Refresh user data
      const updatedUser = await getUserById(user.id);
      if (updatedUser) {
        setCurrentUser(updatedUser);
      }

      // Refresh transactions
      const userTransactions = await getUserTransactions(user.id);
      setTransactions(userTransactions);
    } catch (error) {
      console.error('Error refreshing data:', error);
      Alert.alert('Error', 'Gagal memuat data terbaru');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

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

  const handleLogout = () => {
    console.log('🔘 Logout button pressed');
    Alert.alert(
      'Logout',
      'Apakah Anda yakin ingin keluar?',
      [
        { 
          text: 'Batal', 
          style: 'cancel',
          onPress: () => console.log('❌ Logout cancelled')
        },
        { 
          text: 'Keluar', 
          onPress: () => {
            console.log('✅ Logout confirmed, calling onLogout');
            onLogout();
          }, 
          style: 'destructive' 
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refreshData} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Selamat datang,</Text>
            <Text style={styles.userName}>{currentUser.name}</Text>
          </View>
          <TouchableOpacity 
            style={styles.logoutButton} 
            onPress={handleLogout}
            activeOpacity={0.7}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Text style={styles.logoutText}>Keluar</Text>
          </TouchableOpacity>
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Saldo Anda</Text>
          <Text style={styles.balanceAmount}>
            {formatCurrency(currentUser.balance)}
          </Text>
          <Text style={styles.balanceSubtext}>
            Username: {currentUser.username}
          </Text>
        </View>

        {/* NFC Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={styles.nfcButton}
            onPress={onNavigateToNFC}
          >
            <Text style={styles.nfcButtonText}>💳 NFC Payment</Text>
            <Text style={styles.nfcButtonSubtext}>
              Kirim atau terima pembayaran melalui NFC
            </Text>
          </TouchableOpacity>
        </View>

        {/* Transaction History */}
        <View style={styles.transactionsContainer}>
          <Text style={styles.sectionTitle}>Riwayat Transaksi</Text>
          
          {transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                Belum ada transaksi
              </Text>
            </View>
          ) : (
            transactions.map((transaction, index) => {
              const isReceiver = transaction.receiverId === currentUser.id;
              const otherUser = isReceiver ? transaction.sender : transaction.receiver;
              
              return (
                <View key={index} style={styles.transactionItem}>
                  <View style={styles.transactionInfo}>
                    <Text style={styles.transactionType}>
                      {isReceiver ? '📥 Diterima dari' : '📤 Dikirim ke'}
                    </Text>
                    <Text style={styles.transactionUser}>
                      {otherUser.name} (@{otherUser.username})
                    </Text>
                    <Text style={styles.transactionDate}>
                      {formatDate(transaction.createdAt)}
                    </Text>
                  </View>
                  <Text style={[
                    styles.transactionAmount,
                    isReceiver ? styles.positiveAmount : styles.negativeAmount
                  ]}>
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
});