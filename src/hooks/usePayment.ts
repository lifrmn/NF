// ============================================================================
// CUSTOM HOOK: usePayment
// ============================================================================
// Hook untuk handle payment logic dengan physical card
// Terpisah dari UI agar lebih mudah di-maintain
// ============================================================================

import { useState } from 'react';
import { Alert } from 'react-native';
import { NFCService } from '../utils/nfc';
import { apiService } from '../utils/apiService';

export const usePayment = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  // =========================================================================
  // Tap-to-Pay Transfer: Scan sender → receiver → auto transfer
  // =========================================================================
  const processTapToPayTransfer = async (
    currentUserId: number,
    amount: number
  ): Promise<boolean> => {
    setIsProcessing(true);

    try {
      // Step 1: Scan SENDER card (kartu user yang login)
      Alert.alert(
        '📱 Step 1/2: Scan Kartu Anda',
        'Tempelkan kartu NFC ANDA ke belakang HP',
        [{ text: 'Siap', onPress: () => {} }]
      );

      const senderCard = await NFCService.readPhysicalCard();
      
      if (!senderCard) {
        Alert.alert('❌ Kartu Pengirim Tidak Terbaca', 'Coba lagi.');
        setIsProcessing(false);
        return false;
      }

      console.log('📤 Sender card scanned:', senderCard.id);

      // Validate sender card
      const senderCheck = await apiService.get(`/api/nfc-cards/info/${senderCard.id}`);
      
      if (!senderCheck.success) {
        Alert.alert(
          '📝 Kartu Belum Terdaftar',
          'Daftarkan kartu Anda terlebih dahulu di menu "Daftar Kartu".',
          [{ text: 'OK' }]
        );
        setIsProcessing(false);
        return false;
      }

      if (senderCheck.card.cardStatus !== 'ACTIVE') {
        Alert.alert(
          '🚫 Kartu Tidak Aktif',
          `Status: ${senderCheck.card.cardStatus}\n\nHubungi admin.`,
          [{ text: 'OK' }]
        );
        setIsProcessing(false);
        return false;
      }

      // Check ownership
      if (senderCheck.card.userId !== currentUserId) {
        Alert.alert(
          '⚠️ Kartu Ini Bukan Milik Anda',
          'Gunakan kartu yang terdaftar atas nama Anda.',
          [{ text: 'OK' }]
        );
        setIsProcessing(false);
        return false;
      }

      // Validate balance - Gunakan saldo USER, bukan saldo kartu fisik
      const userBalance = senderCheck.card.user?.balance || 0;
      if (userBalance < amount) {
        Alert.alert(
          '💰 Saldo Tidak Cukup',
          `Saldo Anda: Rp ${userBalance.toLocaleString('id-ID')}\nJumlah transfer: Rp ${amount.toLocaleString('id-ID')}\n\nSaldo tidak mencukupi untuk transfer.`,
          [{ text: 'OK' }]
        );
        setIsProcessing(false);
        return false;
      }
      
      console.log(`💰 User balance: Rp ${userBalance.toLocaleString('id-ID')}`);

      // Step 2: Scan RECEIVER card
      await new Promise(resolve => setTimeout(resolve, 1000)); // Delay 1s

      Alert.alert(
        '📱 Step 2/2: Scan Kartu Penerima',
        'Tempelkan kartu NFC TEMAN ke belakang HP',
        [{ text: 'Siap', onPress: () => {} }]
      );

      const receiverCard = await NFCService.readPhysicalCard();
      
      if (!receiverCard) {
        Alert.alert('❌ Kartu Penerima Tidak Terbaca', 'Coba lagi.');
        setIsProcessing(false);
        return false;
      }

      console.log('📥 Receiver card scanned:', receiverCard.id);

      // Validate receiver card
      const receiverCheck = await apiService.get(`/api/nfc-cards/info/${receiverCard.id}`);
      
      if (!receiverCheck.success) {
        Alert.alert(
          '📝 Kartu Penerima Belum Terdaftar',
          'Penerima harus mendaftar kartu terlebih dahulu.',
          [{ text: 'OK' }]
        );
        setIsProcessing(false);
        return false;
      }

      if (receiverCheck.card.cardStatus !== 'ACTIVE') {
        Alert.alert(
          '🚫 Kartu Penerima Tidak Aktif',
          `Status: ${receiverCheck.card.cardStatus}`,
          [{ text: 'OK' }]
        );
        setIsProcessing(false);
        return false;
      }

      // Check tidak transfer ke kartu sendiri
      if (receiverCard.id === senderCard.id) {
        Alert.alert(
          '⚠️ Tidak Dapat Transfer ke Kartu Sendiri',
          '',
          [{ text: 'OK' }]
        );
        setIsProcessing(false);
        return false;
      }

      // Step 3: Process payment to BACKEND
      console.log('💸 Processing payment...');
      const paymentResult = await apiService.post('/api/nfc-cards/payment', {
        cardId: senderCard.id,
        receiverCardId: receiverCard.id,
        amount: amount,
        deviceId: 'unknown',
        description: 'Tap-to-pay transfer'
      });

      if (paymentResult.success) {
        // Check fraud score
        const fraudScore = paymentResult.transaction?.fraudScore || 0;
        
        if (fraudScore > 60) {
          Alert.alert(
            '⚠️ Transaksi Diblokir',
            `Terdeteksi mencurigakan.\nFraud Score: ${fraudScore}%\n\nHubungi admin.`,
            [{ text: 'OK' }]
          );
        } else if (fraudScore > 40) {
          Alert.alert(
            '✅ Transaksi Berhasil (Review)',
            `Transfer Rp ${amount.toLocaleString('id-ID')} berhasil!\n\nPenerima: ${receiverCheck.card.userName}\n\n⚠️ Akan direview sistem (Fraud Score: ${fraudScore}%).`,
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            '✅ Transaksi Berhasil',
            `Transfer Rp ${amount.toLocaleString('id-ID')} berhasil!\n\nPenerima: ${receiverCheck.card.userName}\nBalance: Rp ${paymentResult.transaction?.balanceAfter.toLocaleString('id-ID')}`,
            [{ text: 'OK' }]
          );
        }
        
        setIsProcessing(false);
        return true;
      } else {
        Alert.alert('❌ Pembayaran Gagal', paymentResult.error || 'Terjadi kesalahan');
        setIsProcessing(false);
        return false;
      }

    } catch (error: any) {
      console.error('Payment error:', error);
      
      // Handle rate limit error gracefully
      if (error?.message?.includes('429')) {
        Alert.alert(
          '⏱️ Terlalu Banyak Request',
          'Tunggu sebentar dan coba lagi.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('❌ Error', error?.message || 'Gagal memproses pembayaran');
      }
      
      setIsProcessing(false);
      return false;
    }
  };

  return {
    isProcessing,
    processTapToPayTransfer
  };
};
