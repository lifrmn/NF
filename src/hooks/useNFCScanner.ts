// src/hooks/useNFCScanner.ts
/* ==================================================================================
 * 🪝 CUSTOM HOOK: useNFCScanner
 * ==================================================================================
 * 
 * Tujuan Hook:
 * Custom React hook untuk handle NFC card scanning dan validation logic.
 * Memisahkan business logic dari UI components untuk better code organization.
 * 
 * What is a Custom Hook?
 * - Function yang menggunakan React hooks (useState, useEffect, dll)
 * - Prefix "use" adalah naming convention React
 * - Dapat dipanggil dari functional components
 * - Reusable logic yang bisa dipakai di multiple screens
 * 
 * Kenapa Pakai Custom Hook?
 * 1. Separation of Concerns: UI logic terpisah dari business logic
 * 2. Reusability: Logic bisa dipakai di berbagai screens
 * 3. Testability: Easier to test business logic tanpa UI
 * 4. Maintainability: Changes di logic tidak affect UI structure
 * 
 * Features:
 * 1. Physical Card Scanning: Read NFC card UID dari hardware
 * 2. Backend Validation: Check apakah card registered dan active
 * 3. Ownership Validation: Check apakah card milik current user
 * 4. Status Validation: Check apakah card status ACTIVE
 * 5. Tap Logging: Log setiap tap ke backend untuk analytics
 * 6. User Feedback: Alert messages untuk semua scenarios
 * 
 * State Management:
 * - lastScannedCard: Menyimpan UID card terakhir yang di-scan (untuk prevent duplicate)
 * - isScanning: Flag untuk prevent concurrent scans (locking mechanism)
 * 
 * Usage Example:
 * ```tsx
 * const { scanAndValidateCard, isScanning, lastScannedCard } = useNFCScanner(userId);
 * 
 * const handleScan = async () => {
 *   const cardId = await scanAndValidateCard();
 *   if (cardId) {
 *     // Card valid, proceed dengan payment
 *   }
 * };
 * ```
 * 
 * ==================================================================================
 */

import { useState } from 'react';
import { Alert } from 'react-native';
import { NFCService } from '../utils/nfc';
import { apiService } from '../utils/apiService';

/* ==================================================================================
 * HOOK: useNFCScanner
 * ==================================================================================
 * PARAMETER:
 * - currentUserId: number - ID user yang sedang login (untuk ownership validation)
 * 
 * RETURN:
 * - lastScannedCard: string - UID card terakhir yang di-scan
 * - isScanning: boolean - Flag apakah sedang scanning
 * - scanAndValidateCard: Function - Main function untuk scan dan validate
 * - resetScanner: Function - Reset scanner state
 * ==================================================================================
 */
export const useNFCScanner = (currentUserId: number) => {
  // STATE 1: Menyimpan UID card terakhir yang di-scan
  // Use case: Prevent duplicate scans, display "last scanned" info
  const [lastScannedCard, setLastScannedCard] = useState<string>('');
  
  // STATE 2: Flag untuk prevent concurrent scans
  // Use case: Prevent multiple NFC operations berjalan bersamaan (race condition)
  const [isScanning, setIsScanning] = useState(false);

  /* ================================================================================
   * FUNCTION: scanAndValidateCard
   * ================================================================================
   * Main function untuk scan physical NFC card dan validate dengan backend.
   * 
   * FLOW DIAGRAM:
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ STEP 1: Check if already scanning (prevent concurrent)              │
   * │         └─ Return null jika isScanning = true                       │
   * ├─────────────────────────────────────────────────────────────────────┤
   * │ STEP 2: Set isScanning = true (lock scanner)                        │
   * ├─────────────────────────────────────────────────────────────────────┤
   * │ STEP 3: Read Physical Card UID                                      │
   * │         └─ Call NFCService.readPhysicalCard()                       │
   * │         └─ Return null jika gagal read                              │
   * ├─────────────────────────────────────────────────────────────────────┤
   * │ STEP 4: Backend Validation - Get Card Info                          │
   * │         └─ API: GET /api/nfc-cards/info/{cardId}                    │
   * │         └─ Check: card registered? ownership? status ACTIVE?        │
   * ├─────────────────────────────────────────────────────────────────────┤
   * │ STEP 5: Log Tap to Backend (Analytics)                              │
   * │         └─ API: POST /api/nfc-cards/tap                             │
   * │         └─ Track: cardId, timestamp, location                       │
   * ├─────────────────────────────────────────────────────────────────────┤
   * │ STEP 6: Show Success Alert with Card Info                           │
   * │         └─ Display: cardId, owner name, balance                     │
   * ├─────────────────────────────────────────────────────────────────────┤
   * │ STEP 7: Set isScanning = false (unlock scanner)                     │
   * │         └─ Return cardId for further processing                     │
   * └─────────────────────────────────────────────────────────────────────┘
   * 
   * RETURN: 
   * - string (cardId) jika success
   * - null jika gagal atau invalid
   * 
   * ERROR HANDLING:
   * - Card not registered → Alert "Kartu belum terdaftar"
   * - Wrong owner → Alert "Kartu ini bukan milik Anda"
   * - Card inactive → Alert "Kartu tidak aktif"
   * - NFC read error → Alert "Gagal membaca kartu"
   * - Network error → Alert error message
   * ================================================================================
   */
  const scanAndValidateCard = async (): Promise<string | null> => {
    // STEP 1: Check if already scanning
    // Guard clause untuk prevent multiple concurrent NFC operations
    // Kenapa penting? 
    // - NFC hardware hanya support 1 operation at a time
    // - Multiple operations will cause hardware conflict
    // - User might tap button multiple times accidentally
    if (isScanning) {
      Alert.alert('Error', 'Scan sudah berjalan');
      return null; // Guard clause: early return
    }

    // STEP 2: Lock scanner dengan set isScanning = true
    // Ini mencegah function ini dipanggil lagi sebelum selesai
    // Pattern: Locking mechanism untuk async operations
    setIsScanning(true);

    try {
      // STEP 3: Read Physical Card UID
      // Call NFCService.readPhysicalCard() untuk baca UID dari NFC chip
      // NFCService akan:
      // 1. Enable NFC hardware
      // 2. Wait for card detection (auto-detect mode)
      // 3. Read UID dari NDEF atau ISO15693 tag
      // 4. Return UID as string or null if failed
      const cardInfo = await NFCService.readPhysicalCard();

      // VALIDASI 3.1: Check apakah berhasil read UID
      // cardInfo akan null jika:
      // - User cancel scanning
      // - NFC hardware error
      // - Card tidak support (bukan NTag215)
      // - Timeout (user tidak dekatkan card dalam waktu yang ditentukan)
      if (!cardInfo) {
        Alert.alert(
          '❌ Kartu Tidak Terbaca',
          'Pastikan:\n• Kartu NFC dekat dengan HP\n• Kartu dalam kondisi baik\n• NFC aktif di Pengaturan',
          [{ text: 'OK' }]
        );
        return null; // Early return: gagal read hardware
      }

      // STEP 4: Backend Validation - Get Card Info
      // API Call: GET /api/nfc-cards/info/{cardId}
      // Backend akan:
      // 1. Query database: SELECT * FROM nfc_cards WHERE card_uid = cardId
      // 2. JOIN dengan users table untuk get user info
      // 3. Return card info + user info
      // 
      // Response format:
      // {
      //   success: boolean,
      //   card: {
      //     card_uid: string,
      //     card_number: string,
      //     cardStatus: 'ACTIVE' | 'BLOCKED' | 'SUSPENDED',
      //     userId: number,
      //     balance: number,
      //     user: {
      //       id: number,
      //       name: string,
      //       email: string
      //     }
      //   }
      // }
      const checkResult = await apiService.get(`/api/nfc-cards/info/${cardInfo.id}`);

      // VALIDASI 4.1: Check apakah card registered di database
      // success = false berarti:
      // - Card UID tidak ditemukan di tabel nfc_cards
      // - Card belum pernah didaftarkan oleh user manapun
      // User harus daftar card dulu di RegisterCardScreen
      if (!checkResult.success) {
        Alert.alert(
          '📝 Kartu Belum Terdaftar',
          `UID: ${cardInfo.id.slice(0, 16)}...\n\nDaftar kartu di menu "Daftar Kartu" terlebih dahulu.`,
          [{ text: 'OK' }]
        );
        return null; // Early return: card not registered
      }

      // Extract card data dari response
      // cardData berisi info lengkap card + user owner
      const cardData = checkResult.card;

      // VALIDASI 4.2: Check ownership - apakah card milik current user
      // Security check: Prevent user pakai card user lain
      // currentUserId = ID user yang login (dari parameter hook)
      // cardData.userId = ID user pemilik card (dari database)
      // Jika tidak match, berarti card milik user lain
      if (cardData.userId !== currentUserId) {
        Alert.alert(
          '⚠️ Kartu Milik Akun Lain',
          `Kartu ini terdaftar atas nama: ${cardData.user?.name || 'User lain'}\n\nAnda tidak dapat menggunakan kartu ini.`,
          [{ text: 'OK' }]
        );
        return null; // Early return: wrong owner
      }

      // VALIDASI 4.3: Check card status
      // Card harus dalam status ACTIVE untuk bisa digunakan
      // Status lain:
      // - BLOCKED: Card diblokir karena fraud atau admin action
      // - SUSPENDED: Card ditangguhkan sementara (pending verification)
      // - INACTIVE: Card belum diaktivasi setelah registrasi
      if (cardData.cardStatus !== 'ACTIVE') {
        Alert.alert(
          '🚫 Kartu Tidak Aktif',
          `Status: ${cardData.cardStatus}\n\nAktifkan kartu di menu "Kartu Saya".`,
          [{ text: 'OK' }]
        );
        return null; // Early return: card not active
      }

      // STEP 5: Log Tap to Backend (Analytics)
      // API Call: POST /api/nfc-cards/tap
      // Purpose: Track setiap card tap untuk analytics dan fraud detection
      // Backend akan:
      // 1. Create tap_logs entry untuk analytics
      // 2. Update last_tapped_at timestamp di nfc_cards table
      // 3. Update tap_count counter untuk fraud detection
      // 4. Check for fraud patterns (velocity, frequency)
      // 
      // Data yang dikirim:
      // - cardId: UID card yang di-tap
      // - deviceId: Identifier device (untuk detect multi-device fraud)
      // - signalStrength: Kekuatan sinyal NFC (untuk detect card cloning)
      // - readTime: Timestamp tap (untuk detect velocity attacks)
      await apiService.post('/api/nfc-cards/tap', {
        cardId: cardInfo.id,
        deviceId: 'unknown', // TODO: Get real device ID
        signalStrength: 'strong',
        readTime: Date.now()
      });

      // Save UID ke state untuk tracking last scan
      // Use case: Display "last scanned" info, prevent duplicate scan
      setLastScannedCard(cardInfo.id);

      // STEP 6: Show Success Alert with Card Info
      // Display info card yang berhasil di-scan
      // Info yang ditampilkan:
      // - UID: First 16 chars untuk identification (full UID terlalu panjang)
      // - Status: ACTIVE/BLOCKED/SUSPENDED
      // - Balance: Formatted dengan thousand separator
      // 
      // Alert.alert() adalah React Native API untuk show native dialog
      // Parameters: (title, message, buttons)
      Alert.alert(
        '✅ Kartu Terdeteksi',
        `UID: ${cardInfo.id.slice(0, 16)}...\nStatus: ${cardData.cardStatus}\nBalance: Rp ${cardData.balance.toLocaleString('id-ID')}`,
        [{ text: 'OK' }]
      );

      // STEP 7: Return cardId for further processing
      // Caller (screen component) bisa gunakan cardId ini untuk:
      // - Proceed dengan payment
      // - Display card details
      // - Log additional analytics
      return cardInfo.id;

    } catch (error: any) {
      // ERROR HANDLING: Catch semua unhandled errors
      // Possible errors:
      // - Network error: Backend tidak bisa diakses
      // - NFC hardware error: Hardware failure atau permission denied
      // - Timeout error: API call terlalu lama
      // - Parse error: Response format tidak sesuai
      console.error('Scan error:', error);
      
      // Display error ke user dengan Alert
      // error?.message akan extract error message jika ada
      // Fallback ke 'Terjadi kesalahan' jika error tidak punya message
      Alert.alert('❌ Gagal Scan Kartu', error?.message || 'Terjadi kesalahan');
      return null; // Return null untuk indicate failure
    } finally {
      // FINALLY BLOCK: Always executed
      // Reset isScanning flag untuk unlock scanner
      // Ini penting karena:
      // - Jika ada error, scanner harus di-unlock untuk retry
      // - finally block dijalankan meskipun ada return di try/catch
      // - Prevent scanner stuck di locked state
      setIsScanning(false);
    }
  };

  /* ================================================================================
   * FUNCTION: resetScanner
   * ================================================================================
   * Reset scanner state dengan clear lastScannedCard.
   * 
   * Use Cases:
   * 1. User ingin scan card baru (clear previous scan)
   * 2. Navigate ke screen baru (cleanup state)
   * 3. Error recovery (clear invalid scan)
   * 4. Logout (clear user data)
   * 
   * Simple function tapi penting untuk state management:
   * - Prevent showing stale data
   * - Allow fresh scan
   * - Clean component unmount
   * ================================================================================
   */
  const resetScanner = () => {
    // Clear lastScannedCard state
    // setLastScannedCard('') akan trigger re-render jika state berubah
    // Components yang subscribe ke lastScannedCard akan update UI
    setLastScannedCard('');
  };

  /* ================================================================================
   * HOOK RETURN OBJECT
   * ================================================================================
   * Return object dengan destructuring pattern.
   * 
   * Usage di component:
   * ```tsx
   * const { scanAndValidateCard, isScanning, lastScannedCard, resetScanner } = useNFCScanner(userId);
   * ```
   * 
   * Benefits destructuring:
   * 1. Caller hanya ambil yang diperlukan: const { scanAndValidateCard } = useNFCScanner()
   * 2. Clear naming: Variable names sudah explicit
   * 3. Order-independent: Tidak peduli urutan destructuring
   * 
   * Return values:
   * - lastScannedCard: string - UID terakhir yang di-scan (untuk display)
   * - isScanning: boolean - Flag scanning state (untuk disable button, show loading)
   * - scanAndValidateCard: Function - Main scan function (untuk onPress handler)
   * - resetScanner: Function - Reset function (untuk cleanup)
   * ================================================================================
   */
  return {
    lastScannedCard,    // State: Last scanned card UID
    isScanning,         // State: Is scanning in progress (loading indicator)
    scanAndValidateCard, // Action: Scan and validate card
    resetScanner        // Action: Reset scanner state
  };
};
