import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiService } from '../utils/apiService';

interface MyCardsScreenProps {
  user: any;
  onBack: () => void;
  onRegisterNew?: () => void;
}

interface NFCCard {
  id: number;
  cardId: string;
  cardType: string;
  frequency: string;
  cardStatus: string;
  balance: number;
  lastUsed: string | null;
  createdAt: string;
  user?: {
    id: number;
    name: string;
    username: string;
  };
}

export default function MyCardsScreen({ user, onBack, onRegisterNew }: MyCardsScreenProps) {
  const [cards, setCards] = useState<NFCCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    console.log('🎴 MyCardsScreen mounted');
    console.log('👤 User:', JSON.stringify(user, null, 2));
    loadMyCards();
  }, []);

  const loadMyCards = async () => {
    if (!user?.id) {
      console.error('❌ User ID not available');
      Alert.alert('Error', 'User ID tidak valid. Silakan login ulang.');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      console.log(`📋 Loading cards for userId: ${user.id}`);
      
      const response = await apiService.get(`/api/nfc-cards/list?userId=${user.id}`);
      
      console.log('📥 Cards response:', JSON.stringify(response, null, 2));

      if (response.success) {
        const userCards = response.cards || [];
        console.log(`✅ Loaded ${userCards.length} card(s)`);
        setCards(userCards);
        
        if (userCards.length === 0) {
          console.log('ℹ️ No cards found for this user');
        }
      } else {
        console.error('❌ Failed to load cards:', response.error);
        Alert.alert('Error', response.error || 'Gagal memuat daftar kartu');
      }
    } catch (error: any) {
      console.error('❌ Load cards error:', error);
      
      // Better error handling
      if (error.message?.includes('404')) {
        console.log('ℹ️ No cards registered yet');
        setCards([]);
      } else if (error.message?.includes('401') || error.message?.includes('403')) {
        Alert.alert('Error', 'Sesi Anda telah berakhir. Silakan login ulang.');
      } else {
        Alert.alert('Error', 'Gagal memuat daftar kartu. Periksa koneksi internet Anda.');
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMyCards();
    setRefreshing(false);
  };

  const handleBlockCard = (cardId: string) => {
    Alert.alert(
      '🚫 Nonaktifkan Kartu?',
      'Kartu akan diblokir dan tidak dapat digunakan untuk transaksi.\n\nIni berguna jika kartu hilang atau dicuri.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, Blokir',
          style: 'destructive',
          onPress: () => blockCard(cardId),
        },
      ]
    );
  };

  const blockCard = async (cardId: string) => {
    try {
      console.log(`🚫 Blocking card: ${cardId}`);
      
      const response = await apiService.put('/api/nfc-cards/status', {
        cardId,
        status: 'BLOCKED',
        reason: 'Blocked by user (lost/stolen)'
      });

      console.log('📥 Block response:', response);

      if (response.success) {
        Alert.alert('✅ Sukses', 'Kartu berhasil diblokir dan tidak dapat digunakan untuk transaksi.');
        await loadMyCards(); // Refresh list
      } else {
        Alert.alert('Error', response.error || 'Gagal memblokir kartu');
      }
    } catch (error: any) {
      console.error('❌ Block card error:', error);
      Alert.alert('Error', error.message || 'Gagal memblokir kartu. Periksa koneksi internet.');
    }
  };

  const handleActivateCard = (cardId: string) => {
    Alert.alert(
      '✅ Aktifkan Kartu?',
      'Kartu akan diaktifkan kembali dan dapat digunakan untuk transaksi.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, Aktifkan',
          onPress: () => activateCard(cardId),
        },
      ]
    );
  };

  const activateCard = async (cardId: string) => {
    try {
      console.log(`✅ Activating card: ${cardId}`);
      
      const response = await apiService.put('/api/nfc-cards/status', {
        cardId,
        status: 'ACTIVE'
      });

      console.log('📥 Activate response:', response);

      if (response.success) {
        Alert.alert('✅ Sukses', 'Kartu berhasil diaktifkan dan siap digunakan untuk transaksi.');
        await loadMyCards(); // Refresh list
      } else {
        Alert.alert('Error', response.error || 'Gagal mengaktifkan kartu');
      }
    } catch (error: any) {
      console.error('❌ Activate card error:', error);
      Alert.alert('Error', error.message || 'Gagal mengaktifkan kartu. Periksa koneksi internet.');
    }
  };



  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return '#27ae60';
      case 'BLOCKED': return '#e74c3c';
      case 'LOST': return '#95a5a6';
      case 'EXPIRED': return '#f39c12';
      default: return '#95a5a6';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE': return '✅';
      case 'BLOCKED': return '🚫';
      case 'LOST': return '❌';
      case 'EXPIRED': return '⚠️';
      default: return '❓';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'Aktif';
      case 'BLOCKED': return 'Diblokir';
      case 'LOST': return 'Hilang';
      case 'EXPIRED': return 'Kadaluarsa';
      default: return status;
    }
  };

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
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack}>
            <Text style={styles.backText}>← Kembali</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Kartu Saya</Text>
          <View style={{ width: 70 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Memuat kartu...</Text>
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
        <Text style={styles.title}>Kartu Saya</Text>
        <View style={{ width: 70 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Cards List - 1 kartu per orang */}
        {cards.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎴</Text>
            <Text style={styles.emptyTitle}>Belum Ada Kartu</Text>
            <Text style={styles.emptyText}>
              Anda belum mendaftarkan kartu NFC.{'\n'}
              Setiap pengguna hanya dapat mendaftarkan 1 kartu.
            </Text>
            {onRegisterNew && (
              <TouchableOpacity
                style={styles.registerButtonInline}
                onPress={onRegisterNew}
              >
                <Text style={styles.registerButtonText}>➕ Daftarkan Kartu</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          cards.slice(0, 1).map((card) => (
            <View key={card.id} style={styles.cardItem}>
              {/* Card Header */}
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Text style={styles.cardId}>🎴 Kartu NFC Saya</Text>
                  <Text style={styles.cardUid}>{card.cardId}</Text>
                  <Text style={styles.cardType}>{card.cardType} • {card.frequency}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(card.cardStatus) }]}>
                  <Text style={styles.statusBadgeText}>
                    {getStatusIcon(card.cardStatus)} {getStatusText(card.cardStatus)}
                  </Text>
                </View>
              </View>

              {/* Card Body */}
              <View style={styles.cardBody}>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardInfoLabel}>💰 Saldo:</Text>
                  <Text style={[styles.cardInfoValue, styles.balanceValue]}>{formatCurrency(card.balance)}</Text>
                </View>
                
                <View style={styles.cardDivider} />
                
                <View style={styles.cardInfo}>
                  <Text style={styles.cardInfoLabel}>📅 Terdaftar:</Text>
                  <Text style={styles.cardInfoValue}>{formatDate(card.createdAt)}</Text>
                </View>

                {card.lastUsed && (
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardInfoLabel}>🕐 Terakhir Digunakan:</Text>
                    <Text style={styles.cardInfoValue}>
                      {new Date(card.lastUsed).toLocaleString('id-ID')}
                    </Text>
                  </View>
                )}
                
                {!card.lastUsed && (
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardInfoLabel}>ℹ️ Status:</Text>
                    <Text style={styles.cardInfoValue}>Belum pernah digunakan</Text>
                  </View>
                )}
              </View>

              {/* Card Actions */}
              <View style={styles.cardActions}>
                {card.cardStatus === 'ACTIVE' ? (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.blockButton]}
                    onPress={() => handleBlockCard(card.cardId)}
                  >
                    <Text style={styles.actionButtonText}>🚫 Blokir Kartu</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.activateButton]}
                    onPress={() => handleActivateCard(card.cardId)}
                  >
                    <Text style={styles.actionButtonText}>✅ Aktifkan Kartu</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}

        {/* Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>ℹ️ Informasi</Text>
          <Text style={styles.infoText}>
            • Kartu yang diblokir tidak dapat digunakan untuk transaksi{'\n'}
            • Anda dapat mengaktifkan kembali kartu yang diblokir{'\n'}
            • Top-up balance dapat dilakukan melalui admin{'\n'}
            • Hubungi admin jika kartu hilang atau dicuri
          </Text>
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
    width: 70,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#7f8c8d',
  },
  registerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyState: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 15,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  registerButtonInline: {
    backgroundColor: '#e91e63',
    borderRadius: 12,
    padding: 15,
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  cardItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flex: 1,
  },
  cardId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 6,
  },
  cardUid: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#7f8c8d',
    marginBottom: 4,
  },
  cardType: {
    fontSize: 12,
    color: '#95a5a6',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardBody: {
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  cardInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardInfoLabel: {
    fontSize: 13,
    color: '#7f8c8d',
  },
  cardInfoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2c3e50',
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#ecf0f1',
    marginVertical: 8,
  },
  cardActions: {
    marginTop: 8,
  },
  actionButton: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  blockButton: {
    backgroundColor: '#e74c3c',
  },
  activateButton: {
    backgroundColor: '#27ae60',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
  },
  infoCard: {
    backgroundColor: '#e8f4f8',
    borderRadius: 12,
    padding: 15,
    marginTop: 10,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 13,
    color: '#34495e',
    lineHeight: 20,
  },
});
