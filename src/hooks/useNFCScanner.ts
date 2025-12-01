// ============================================================================
// CUSTOM HOOK: useNFCScanner
// ============================================================================
// Hook untuk handle NFC scanning & validation
// Memisahkan logic dari UI agar lebih mudah dipahami
// ============================================================================

import { useState } from 'react';
import { Alert } from 'react-native';
import { NFCService } from '../utils/nfc';
import { apiService } from '../utils/apiService';

export const useNFCScanner = (currentUserId: number) => {
  const [lastScannedCard, setLastScannedCard] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);

  // =========================================================================
  // Scan Physical Card & Validate
  // =========================================================================
  const scanAndValidateCard = async (): Promise<string | null> => {
    if (isScanning) {
      Alert.alert('Error', 'Scan sudah berjalan');
      return null;
    }

    setIsScanning(true);

    try {
      // Read physical card
      const cardInfo = await NFCService.readPhysicalCard();

      if (!cardInfo) {
        Alert.alert(
          '❌ Kartu Tidak Terbaca',
          'Pastikan:\n• Kartu NFC dekat dengan HP\n• Kartu dalam kondisi baik\n• NFC aktif di Pengaturan',
          [{ text: 'OK' }]
        );
        return null;
      }

      // Validate card via backend
      const checkResult = await apiService.get(`/api/nfc-cards/info/${cardInfo.id}`);

      if (!checkResult.success) {
        Alert.alert(
          '📝 Kartu Belum Terdaftar',
          `UID: ${cardInfo.id.slice(0, 16)}...\n\nDaftar kartu di menu "Daftar Kartu" terlebih dahulu.`,
          [{ text: 'OK' }]
        );
        return null;
      }

      const cardData = checkResult.card;

      // Validate ownership
      if (cardData.userId !== currentUserId) {
        Alert.alert(
          '⚠️ Kartu Milik Akun Lain',
          `Kartu ini terdaftar atas nama: ${cardData.user?.name || 'User lain'}\n\nAnda tidak dapat menggunakan kartu ini.`,
          [{ text: 'OK' }]
        );
        return null;
      }

      // Check card status
      if (cardData.cardStatus !== 'ACTIVE') {
        Alert.alert(
          '🚫 Kartu Tidak Aktif',
          `Status: ${cardData.cardStatus}\n\nAktifkan kartu di menu "Kartu Saya".`,
          [{ text: 'OK' }]
        );
        return null;
      }

      // Log tap to backend
      await apiService.post('/api/nfc-cards/tap', {
        cardId: cardInfo.id,
        deviceId: 'unknown',
        signalStrength: 'strong',
        readTime: Date.now()
      });

      setLastScannedCard(cardInfo.id);

      Alert.alert(
        '✅ Kartu Terdeteksi',
        `UID: ${cardInfo.id.slice(0, 16)}...\nStatus: ${cardData.cardStatus}\nBalance: Rp ${cardData.balance.toLocaleString('id-ID')}`,
        [{ text: 'OK' }]
      );

      return cardInfo.id;

    } catch (error: any) {
      console.error('Scan error:', error);
      Alert.alert('❌ Gagal Scan Kartu', error?.message || 'Terjadi kesalahan');
      return null;
    } finally {
      setIsScanning(false);
    }
  };

  // =========================================================================
  // Reset Scanner
  // =========================================================================
  const resetScanner = () => {
    setLastScannedCard('');
  };

  return {
    lastScannedCard,
    isScanning,
    scanAndValidateCard,
    resetScanner
  };
};
