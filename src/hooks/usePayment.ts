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
  // Receive Payment: Penerima (Penjual) scan kartu Pembeli untuk terima bayaran
  // Flow: Penerima (login) → Scan kartu Pembeli → Transfer otomatis
  // =========================================================================
  const processTapToPayTransfer = async (
    currentUserId: number,
    amount: number,
    onSuccess?: () => void
  ): Promise<boolean> => {
    setIsProcessing(true);

    try {
      // Step 1: Scan kartu PEMBELI (customer yang akan bayar)
      await new Promise<void>((resolve, reject) => {
        Alert.alert(
          '💳 Scan Kartu Pembeli',
          'Tempelkan kartu NFC PEMBELI ke HP Anda untuk menerima pembayaran',
          [
            { 
              text: 'Batal', 
              style: 'cancel',
              onPress: () => reject(new Error('USER_CANCELLED'))
            },
            { text: 'Siap', onPress: () => resolve() }
          ]
        );
      });

      const buyerCard = await NFCService.readPhysicalCard();
      
      if (!buyerCard) {
        Alert.alert('❌ Kartu Pembeli Tidak Terbaca', 'Coba lagi.');
        setIsProcessing(false);
        return false;
      }

      console.log('💳 Buyer card scanned:', buyerCard.id);

      // Validate buyer card
      const buyerCheck = await apiService.get(`/api/nfc-cards/info/${buyerCard.id}`);
      
      if (!buyerCheck.success) {
        Alert.alert(
          '📝 Kartu Pembeli Belum Terdaftar',
          'Kartu pembeli harus terdaftar di sistem terlebih dahulu.',
          [{ text: 'OK' }]
        );
        setIsProcessing(false);
        return false;
      }

      if (buyerCheck.card.cardStatus !== 'ACTIVE') {
        Alert.alert(
          '🚫 Kartu Pembeli Tidak Aktif',
          `Status: ${buyerCheck.card.cardStatus}\n\nPembeli harus mengaktifkan kartu.`,
          [{ text: 'OK' }]
        );
        setIsProcessing(false);
        return false;
      }

      // Check tidak terima bayaran dari kartu sendiri
      if (buyerCheck.card.userId === currentUserId) {
        Alert.alert(
          '⚠️ Tidak Dapat Menerima dari Kartu Sendiri',
          'Kartu pembeli tidak boleh sama dengan kartu Anda.',
          [{ text: 'OK' }]
        );
        setIsProcessing(false);
        return false;
      }

      // Validate balance pembeli - Gunakan saldo USER, bukan saldo kartu fisik
      const buyerBalance = buyerCheck.card.user?.balance || 0;
      if (buyerBalance < amount) {
        Alert.alert(
          '💰 Saldo Pembeli Tidak Cukup',
          `Saldo Pembeli: Rp ${buyerBalance.toLocaleString('id-ID')}\nJumlah bayar: Rp ${amount.toLocaleString('id-ID')}\n\nPembeli tidak memiliki saldo yang cukup.`,
          [{ text: 'OK' }]
        );
        setIsProcessing(false);
        return false;
      }
      
      console.log(`💰 Buyer balance: Rp ${buyerBalance.toLocaleString('id-ID')}`);

      // Step 2: Get kartu penerima (user yang login) dari database
      console.log('🔍 Getting receiver card info...');
      
      let receiverCardsResponse;
      try {
        // Ambil kartu aktif dari user yang login (penerima/penjual)
        receiverCardsResponse = await apiService.get(`/api/users/${currentUserId}/cards`);
        console.log('📥 Receiver cards response:', JSON.stringify(receiverCardsResponse));
      } catch (error: any) {
        console.error('❌ Failed to get receiver cards:', error);
        Alert.alert(
          '❌ Error Koneksi',
          `Gagal mengambil data kartu Anda.\n\nDetail: ${error?.message || 'Unknown error'}\n\nPastikan Anda sudah login dan koneksi internet stabil.`,
          [{ text: 'OK' }]
        );
        setIsProcessing(false);
        return false;
      }
      
      // Validate response structure
      if (!receiverCardsResponse || typeof receiverCardsResponse !== 'object') {
        console.error('❌ Invalid response structure:', receiverCardsResponse);
        Alert.alert(
          '❌ Error Response',
          'Format response dari server tidak valid. Hubungi admin.',
          [{ text: 'OK' }]
        );
        setIsProcessing(false);
        return false;
      }
      
      if (!receiverCardsResponse.success || !receiverCardsResponse.cards || !Array.isArray(receiverCardsResponse.cards) || receiverCardsResponse.cards.length === 0) {
        console.log('⚠️ No cards found for user:', currentUserId);
        Alert.alert(
          '📝 Anda Belum Punya Kartu Terdaftar',
          'Daftarkan kartu Anda terlebih dahulu di menu "Daftar Kartu" sebelum menerima pembayaran.',
          [{ text: 'OK' }]
        );
        setIsProcessing(false);
        return false;
      }

      // Ambil kartu aktif pertama sebagai kartu penerima
      const receiverCard = receiverCardsResponse.cards.find((c: any) => c.cardStatus === 'ACTIVE');
      
      if (!receiverCard) {
        const totalCards = receiverCardsResponse.cards.length;
        const cardStatuses = receiverCardsResponse.cards.map((c: any) => c.cardStatus).join(', ');
        console.log(`⚠️ User has ${totalCards} cards but none are ACTIVE. Statuses: ${cardStatuses}`);
        Alert.alert(
          '🚫 Tidak Ada Kartu Aktif',
          `Anda memiliki ${totalCards} kartu terdaftar, tapi tidak ada yang aktif.\n\nStatus kartu: ${cardStatuses}\n\nAktifkan kartu Anda terlebih dahulu untuk menerima pembayaran.`,
          [{ text: 'OK' }]
        );
        setIsProcessing(false);
        return false;
      }

      console.log('📥 Receiver card (auto-detected):', receiverCard.cardId);

      // Step 3: Process payment to BACKEND
      console.log('💸 Processing payment...');
      console.log('📤 Payment data:', {
        buyerCardId: buyerCard.id,
        receiverCardId: receiverCard.cardId,
        amount: amount,
        buyerUserId: buyerCheck.card.userId,
        receiverUserId: currentUserId
      });
      
      let paymentResult;
      try {
        paymentResult = await apiService.post('/api/nfc-cards/payment', {
          cardId: buyerCard.id,
          receiverCardId: receiverCard.cardId,
          amount: amount,
          deviceId: 'unknown',
          description: 'Merchant payment (receive)'
        });
        console.log('📥 Payment result:', JSON.stringify(paymentResult));
      } catch (paymentError: any) {
        console.error('❌ Payment API error:', paymentError);
        Alert.alert(
          '❌ Pembayaran Gagal',
          `Terjadi kesalahan saat memproses pembayaran.\n\nDetail: ${paymentError?.message || 'Unknown error'}`,
          [{ text: 'OK' }]
        );
        setIsProcessing(false);
        return false;
      }

      if (paymentResult && paymentResult.success) {
        // Refresh balance setelah transaksi berhasil
        if (onSuccess) {
          try {
            await onSuccess();
          } catch (refreshError) {
            console.error('⚠️ Balance refresh failed:', refreshError);
            // Don't block success flow if refresh fails
          }
        }
        
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
            '✅ Pembayaran Diterima (Review)',
            `✅ Anda menerima Rp ${amount.toLocaleString('id-ID')} dari:\n💳 ${buyerCheck.card.userName}\n\n⚠️ Transaksi akan direview sistem (Fraud Score: ${fraudScore}%).\n\n💰 Saldo Anda Sekarang: Rp ${paymentResult.transaction?.receiverBalance?.toLocaleString('id-ID')}`,
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            '✅ Pembayaran Berhasil Diterima! 🎉',
            `✅ Anda menerima Rp ${amount.toLocaleString('id-ID')} dari:\n💳 ${buyerCheck.card.userName}\n\n💰 Saldo Anda Sekarang: Rp ${paymentResult.transaction?.receiverBalance?.toLocaleString('id-ID')}\n💳 Saldo Pembeli: Rp ${paymentResult.transaction?.senderBalance?.toLocaleString('id-ID')}`,
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
      
      // Handle user cancellation
      if (error?.message === 'USER_CANCELLED') {
        Alert.alert('🚫 Transfer Dibatalkan', 'Transfer telah dibatalkan.', [{ text: 'OK' }]);
        setIsProcessing(false);
        return false;
      }
      
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
