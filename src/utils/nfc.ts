// ============================================================================
// IMPORTS - Library yang dibutuhkan
// ============================================================================
// react-native-nfc-manager: Library untuk handle NFC di React Native
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';
// Platform: Untuk deteksi OS (Android/iOS)
import { Platform } from 'react-native';

// ============================================================================
// INTERFACE: NFCData
// ============================================================================
// Struktur data yang akan ditulis/dibaca dari NFC tag
// Data ini di-encode jadi JSON dan disimpan di tag NFC
export interface NFCData {
  userId: number;                      // ID user yang punya tag NFC ini
  username: string;                    // Username untuk identifikasi
  action: 'payment' | 'receive';       // Aksi: bayar atau terima uang
  amount?: number;                     // Jumlah uang (optional, bisa di-set later)
  cardId?: string;                     // UID dari physical NFC card (NTag215)
  cardType?: 'virtual' | 'physical';   // Tipe kartu: virtual (phone) atau physical (NTag215)
}

// ============================================================================
// INTERFACE: NFCCardInfo
// ============================================================================
// Informasi dari physical NFC card (NTag215)
export interface NFCCardInfo {
  id: string;                          // UID kartu (hex string)
  type: string;                        // Tag type (NTag215, Mifare, dll)
  techTypes: string[];                 // Technology types supported
  maxSize: number;                     // Ukuran memory (bytes)
  isWritable: boolean;                 // Apakah bisa ditulis
  manufacturer: string;                // Manufacturer (NXP untuk NTag215)
}

// ============================================================================
// CLASS: NFCService
// ============================================================================
// Service untuk handle semua operasi NFC (Near Field Communication)
// NFC digunakan untuk pembayaran phone-to-phone tanpa internet
// Cara kerja: Tempelkan 2 HP, data transfer via NFC tag
export class NFCService {
  // Flag to track if NFC request is active
  private static isRequestActive = false;
  // =========================================================================
  // METHOD: initNFC()
  // =========================================================================
  // Inisialisasi NFC service saat aplikasi pertama kali jalan
  // Return: true jika NFC berhasil diinit, false jika tidak support/error
  static async initNFC(): Promise<boolean> {
    try {
      // STEP 1: Cek apakah running di Expo Go atau development mode
      // Expo Go tidak support native NFC, jadi return false
      if (__DEV__ && !Platform.select({ android: true, ios: true })) {
        console.log('📱 NFC not available in Expo Go - using manual payment mode');
        return false;
      }

      // STEP 2: Periksa apakah device support NFC hardware
      // Tidak semua HP punya chip NFC (terutama HP murah)
      const supported = await NfcManager.isSupported().catch(() => false);
      if (!supported) {
        console.log('📱 NFC not supported on this device - using manual payment mode');
        return false;
      }

      // STEP 3: Coba start NFC manager
      try {
        // Start NFC service
        await NfcManager.start();
        
        // STEP 4: Cek apakah NFC enabled di settings device
        // User bisa matikan NFC di settings Android/iOS
        const enabled = await NfcManager.isEnabled().catch(() => false);
        
        if (!enabled) {
          console.log('⚠️ NFC is disabled in device settings');
          return false;
        }
        
        console.log('✅ NFC Initialized successfully');
        return true;
        
      } catch (startError: any) {
        // Error saat start (biasa terjadi di emulator atau Expo Go)
        console.log('⚠️ NFC start failed (Expo Go/Emulator):', startError?.message || 'Not available');
        return false;
      }
      
    } catch (error: any) {
      // Catch all error lainnya
      console.log('❌ NFC Init Error:', error?.message || 'Not available in development mode');
      return false;
    }
  }

  // =========================================================================
  // METHOD: checkNFCEnabled()
  // =========================================================================
  // Cek apakah NFC sedang aktif di device
  // Digunakan sebelum melakukan operasi NFC (read/write)
  // Return: true jika enabled, false jika disabled
  static async checkNFCEnabled(): Promise<boolean> {
    try {
      // Query status NFC dari device
      const enabled = await NfcManager.isEnabled();
      return !!enabled;  // Convert ke boolean (!! = double negation)
    } catch (error) {
      // Kalau ada error (misal device tidak support NFC), return false
      console.log('NFC Check Error:', error);
      return false;
    }
  }

  // =========================================================================
  // METHOD: writeNFCData()
  // =========================================================================
  // Menulis data ke NFC tag (untuk mode "Terima Uang")
  // User yang mau terima uang akan write data dirinya ke NFC tag
  // Lalu yang bayar akan scan tag ini
  // 
  // Input: NFCData (userId, username, action, amount)
  // Output: true jika berhasil write, false jika gagal
  static async writeNFCData(data: NFCData): Promise<boolean> {
    try {
      // STEP 1: Request akses ke NFC technology (NDEF format)
      // NDEF = NFC Data Exchange Format (standar format data NFC)
      await NfcManager.requestTechnology(NfcTech.Ndef);
      
      // STEP 2: Encode data jadi NDEF message
      // - Convert object jadi JSON string
      // - Wrap dalam text record NDEF
      // - Encode jadi bytes untuk ditulis ke tag
      const bytes = Ndef.encodeMessage([Ndef.textRecord(JSON.stringify(data))]);

      // STEP 3: Cek apakah encoding berhasil
      if (bytes) {
        // STEP 4: Tulis bytes ke NFC tag
        // User harus menempelkan HP ke tag NFC saat proses ini
        await NfcManager.ndefHandler.writeNdefMessage(bytes);
        console.log('✅ NFC Data written:', data);
        return true;
      }
      
      // Kalau bytes kosong, berarti encoding gagal
      console.warn('⚠️ NFC encodeMessage returned empty bytes');
      return false;
      
    } catch (error) {
      // Error bisa terjadi karena:
      // - Tag tidak compatible (read-only tag)
      // - Tag tidak ditempel cukup lama
      // - Tag rusak
      console.log('NFC Write Error:', error);
      return false;
      
    } finally {
      // STEP 5: Selalu cancel technology request setelah selesai
      // Ini penting untuk release NFC resource
      await NfcManager.cancelTechnologyRequest();
    }
  }

  // =========================================================================
  // METHOD: readNFCData()
  // =========================================================================
  // Membaca data dari NFC tag (untuk mode "Bayar")
  // User yang mau bayar akan scan tag NFC dari penerima
  // Data penerima (userId, username) akan diambil dari tag
  // 
  // Output: NFCData jika berhasil read, null jika gagal/kosong
  static async readNFCData(): Promise<NFCData | null> {
    try {
      // Check if another request is active
      if (this.isRequestActive) {
        console.log('⚠️ NFC request already in progress');
        return null;
      }

      this.isRequestActive = true;

      // STEP 1: Cancel any previous request first
      try {
        await NfcManager.cancelTechnologyRequest();
      } catch (e) {
        // Ignore if no request to cancel
      }

      // STEP 2: Request akses ke NFC technology (NDEF format)
      await NfcManager.requestTechnology(NfcTech.Ndef, {
        alertMessage: 'Dekatkan HP ke NFC tag...'
      });
      
      // STEP 3: Ambil tag yang terdeteksi
      // getTag() akan return object tag dengan semua data
      const tag = await NfcManager.getTag();

      // STEP 4: Validasi tag
      // Cek apakah tag ada dan punya NDEF message
      if (!tag || !tag.ndefMessage) {
        console.warn('⚠️ No NFC tag data found');
        return null;
      }

      // STEP 5: Ambil NDEF record pertama
      // NDEF message bisa punya multiple records, kita ambil yang pertama
      const ndefRecord = tag.ndefMessage[0];
      if (!ndefRecord || !ndefRecord.payload) {
        console.warn('⚠️ Empty NFC payload');
        return null;
      }

      // STEP 6: Decode payload
      // Payload format NDEF text record:
      // - Byte 0: Status byte (encoding + language length)
      // - Byte 1-2: Language code (contoh: "en")
      // - Byte 3+: Actual text data (JSON string kita)
      const payload = ndefRecord.payload;
      
      // Skip 3 bytes pertama (status + language prefix)
      // Convert sisanya jadi string
      const text = String.fromCharCode(...payload.slice(3));
      
      // STEP 7: Parse JSON string jadi object
      const data: NFCData = JSON.parse(text);

      console.log('✅ NFC Tag Read:', data);
      return data;
      
    } catch (error) {
      // Error bisa terjadi karena:
      // - Tag tidak punya data NDEF
      // - Data corrupt/tidak valid JSON
      // - Tag tidak ditempel cukup lama
      console.log('NFC Read Error:', error);
      return null;
      
    } finally {
      // STEP 7: Selalu cancel technology request
      try {
        await NfcManager.cancelTechnologyRequest();
      } catch (cancelError) {
        // Ignore cancel errors
      }
      this.isRequestActive = false;
    }
  }

  // =========================================================================
  // METHOD: startNFCScanning()
  // =========================================================================
  // Start continuous NFC scanning (loop terus sampai tag terdeteksi)
  // Digunakan di screen "Bayar" untuk terus scan tag penerima
  // 
  // Input:
  //   - onTagDetected: Callback function yang dipanggil saat tag terdeteksi
  //   - onError: Callback untuk handle error (optional)
  static async startNFCScanning(
    onTagDetected: (data: NFCData | null) => void,
    onError?: (error: any) => void
  ): Promise<void> {
    try {
      // STEP 1: Define function untuk scan tag
      const scanForTag = async () => {
        try {
          // Coba baca NFC tag
          const data = await this.readNFCData();
          
          // Kalau ada data, panggil callback
          if (data) onTagDetected(data);
        } catch (error) {
          console.log('Error reading NFC data:', error);
        }
      };

      // STEP 2: Setup interval untuk scan berulang
      // Scan setiap 1.5 detik (1500ms)
      // Tidak terlalu cepat (hemat battery) tapi cukup responsive
      const interval = setInterval(scanForTag, 1500);
      
      // STEP 3: Simpan interval ID untuk bisa di-stop nanti
      // Simpan di class property (hack dengan type any)
      (this as any)._scanInterval = interval;
      
      console.log('✅ NFC Scanning started...');
      
    } catch (error) {
      console.log('NFC Scanning Error:', error);
      
      // Kalau ada error callback, panggil
      if (onError) onError(error);
    }
  }

  // =========================================================================
  // METHOD: stopNFCScanning()
  // =========================================================================
  // Stop continuous NFC scanning
  // Dipanggil saat user keluar dari screen atau transaksi selesai
  static async stopNFCScanning(): Promise<void> {
    try {
      console.log('🛑 Stopping NFC scanning...');
      
      // STEP 1: Cek apakah ada interval yang jalan
      if ((this as any)._scanInterval) {
        // STEP 2: Clear interval untuk stop scanning loop
        clearInterval((this as any)._scanInterval);
        
        // STEP 3: Reset interval ID
        (this as any)._scanInterval = null;
        
        console.log('✅ NFC scan interval cleared');
      }
      
      // STEP 4: Cancel technology request (release NFC resource)
      try {
        await NfcManager.cancelTechnologyRequest();
        console.log('✅ NFC technology request cancelled');
      } catch (cancelError) {
        // Ignore cancel errors (might not be active)
        console.log('ℹ️ No active NFC request to cancel');
      }

      // STEP 5: Reset request active flag
      this.isRequestActive = false;
      
      console.log('✅ NFC scanning stopped successfully');
      
    } catch (error) {
      console.log('⚠️ Stop NFC Scanning Error:', error);
      // Force reset flag even on error
      this.isRequestActive = false;
    }
  }

  // =========================================================================
  // METHOD: enableP2P()
  // =========================================================================
  // Enable Peer-to-Peer mode untuk NFC
  // P2P = Phone-to-Phone communication (tanpa tag fisik)
  // NOTE: Fitur ini advanced, untuk skripsi mungkin tidak perlu dipakai
  static async enableP2P(): Promise<void> {
    try {
      // Request 2 technology sekaligus:
      // - Ndef: Untuk data exchange
      // - IsoDep: Untuk communication protocol
      await NfcManager.requestTechnology([NfcTech.Ndef, NfcTech.IsoDep]);
      console.log('✅ P2P mode enabled.');
    } catch (error) {
      console.log('Enable P2P Error:', error);
    }
  }

  // =========================================================================
  // METHOD: readPhysicalCard()
  // =========================================================================
  // Membaca informasi dari physical NFC card (NTag215 13.56MHz)
  // Method ini membaca UID dan tag info untuk identifikasi kartu fisik
  // 
  // Output: NFCCardInfo dengan UID dan detail kartu
  static async readPhysicalCard(): Promise<NFCCardInfo | null> {
    try {
      // Check if another request is active
      if (this.isRequestActive) {
        console.log('⚠️ NFC request already in progress');
        return null;
      }

      this.isRequestActive = true;

      // Cancel any previous request first
      try {
        await NfcManager.cancelTechnologyRequest();
      } catch (e) {
        // Ignore
      }

      // Request NFC technology (NfcA untuk NTag215)
      // NTag215 menggunakan ISO14443A protocol
      await NfcManager.requestTechnology(NfcTech.NfcA, {
        alertMessage: 'Dekatkan kartu NFC ke HP...'
      });
      
      // Get tag info with 30 second timeout
      const tag = await Promise.race([
        NfcManager.getTag(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('NFC_TIMEOUT')), 30000)
        )
      ]) as any;

      if (!tag || !tag.id) {
        console.warn('⚠️ No NFC card detected');
        return null;
      }

      // Extract UID dari tag
      // UID adalah unique identifier kartu (7-10 bytes untuk NTag215)
      const uidBytes = tag.id as any;
      const cardId = Array.isArray(uidBytes) ? this.bytesToHexString(uidBytes) : String(uidBytes);

      // Get tech types
      const techTypes = tag.techTypes || [];

      // Detect card type
      let cardType = 'Unknown';
      if (techTypes.includes('android.nfc.tech.NfcA') || 
          techTypes.includes('android.nfc.tech.MifareUltralight')) {
        cardType = 'NTag215'; // Most likely NTag215
      }

      // Get manufacturer from UID (first byte)
      const manufacturerId = typeof uidBytes[0] === 'number' ? uidBytes[0] : parseInt(uidBytes[0] as any);
      let manufacturer = 'Unknown';
      if (manufacturerId === 4) {
        manufacturer = 'NXP Semiconductors'; // NTag215 manufacturer
      }

      const cardInfo: NFCCardInfo = {
        id: cardId,
        type: cardType,
        techTypes,
        maxSize: tag.maxSize || 888, // NTag215 has 888 bytes
        isWritable: true, // Assume writable for NTag215
        manufacturer
      };

      console.log('✅ Physical Card Read:', cardInfo);
      return cardInfo;
      
    } catch (error) {
      console.log('Physical Card Read Error:', error);
      return null;
      
    } finally {
      try {
        await NfcManager.cancelTechnologyRequest();
      } catch (e) {
        // Ignore
      }
      this.isRequestActive = false;
    }
  }

  // =========================================================================
  // METHOD: readPhysicalCardWithData()
  // =========================================================================
  // Membaca UID dan NDEF data dari physical card sekaligus
  // Untuk kartu yang sudah ada datanya (sudah di-write sebelumnya)
  // 
  // Output: Object dengan cardInfo dan nfcData
  static async readPhysicalCardWithData(): Promise<{
    cardInfo: NFCCardInfo;
    nfcData: NFCData | null;
  } | null> {
    try {
      if (this.isRequestActive) {
        console.log('⚠️ NFC request already in progress');
        return null;
      }

      this.isRequestActive = true;

      try {
        await NfcManager.cancelTechnologyRequest();
      } catch (e) {
        // Ignore
      }

      // Request multiple technologies untuk read UID dan NDEF
      await NfcManager.requestTechnology([NfcTech.NfcA, NfcTech.Ndef], {
        alertMessage: 'Dekatkan kartu NFC ke HP...'
      });
      
      const tag = await NfcManager.getTag();

      if (!tag || !tag.id) {
        console.warn('⚠️ No NFC card detected');
        return null;
      }

      // Extract card info (UID, type, etc)
      const uidBytes = tag.id as any;
      const cardId = Array.isArray(uidBytes) ? this.bytesToHexString(uidBytes) : String(uidBytes);
      const techTypes = tag.techTypes || [];

      let cardType = 'Unknown';
      if (techTypes.includes('android.nfc.tech.NfcA') || 
          techTypes.includes('android.nfc.tech.MifareUltralight')) {
        cardType = 'NTag215';
      }

      const manufacturerId = typeof uidBytes[0] === 'number' ? uidBytes[0] : (Array.isArray(uidBytes) ? uidBytes[0] : 0);
      let manufacturer = 'Unknown';
      if (manufacturerId === 4) {
        manufacturer = 'NXP Semiconductors';
      }

      const cardInfo: NFCCardInfo = {
        id: cardId,
        type: cardType,
        techTypes,
        maxSize: tag.maxSize || 888,
        isWritable: true,
        manufacturer
      };

      // Try to read NDEF data
      let nfcData: NFCData | null = null;
      if (tag.ndefMessage && tag.ndefMessage.length > 0) {
        try {
          const ndefRecord = tag.ndefMessage[0];
          if (ndefRecord && ndefRecord.payload) {
            const payload = ndefRecord.payload;
            const text = String.fromCharCode(...payload.slice(3));
            nfcData = JSON.parse(text);
            
            // Add card ID to data
            if (nfcData) {
              nfcData.cardId = cardId;
              nfcData.cardType = 'physical';
            }
          }
        } catch (parseError) {
          console.warn('⚠️ Could not parse NDEF data:', parseError);
        }
      }

      console.log('✅ Physical Card with Data:', { cardInfo, nfcData });
      return { cardInfo, nfcData };
      
    } catch (error) {
      console.log('Physical Card Read Error:', error);
      return null;
      
    } finally {
      try {
        await NfcManager.cancelTechnologyRequest();
      } catch (e) {
        // Ignore
      }
      this.isRequestActive = false;
    }
  }

  // =========================================================================
  // METHOD: writePhysicalCard()
  // =========================================================================
  // Write data ke physical NFC card (NTag215)
  // Sama seperti writeNFCData() tapi dengan validasi tambahan untuk physical card
  // 
  // Input: NFCData yang akan ditulis ke kartu
  // Output: Object dengan success status dan card ID
  static async writePhysicalCard(data: NFCData): Promise<{
    success: boolean;
    cardId?: string;
    message?: string;
  }> {
    try {
      if (this.isRequestActive) {
        return {
          success: false,
          message: 'NFC request already in progress'
        };
      }

      this.isRequestActive = true;

      try {
        await NfcManager.cancelTechnologyRequest();
      } catch (e) {
        // Ignore
      }

      // Request Ndef technology untuk write
      await NfcManager.requestTechnology(NfcTech.Ndef, {
        alertMessage: 'Dekatkan kartu NFC untuk menulis data...'
      });
      
      // Get tag untuk ambil UID
      const tag = await NfcManager.getTag();
      const cardId = tag?.id ? (Array.isArray(tag.id) ? this.bytesToHexString(tag.id) : String(tag.id)) : undefined;

      // Add card info to data
      const dataToWrite = {
        ...data,
        cardId,
        cardType: 'physical' as const
      };

      // Encode and write
      const bytes = Ndef.encodeMessage([
        Ndef.textRecord(JSON.stringify(dataToWrite))
      ]);

      if (bytes) {
        await NfcManager.ndefHandler.writeNdefMessage(bytes);
        console.log('✅ Physical Card Written:', dataToWrite);
        
        return {
          success: true,
          cardId,
          message: 'Data berhasil ditulis ke kartu'
        };
      }

      return {
        success: false,
        message: 'Gagal encode data'
      };
      
    } catch (error: any) {
      console.log('Physical Card Write Error:', error);
      return {
        success: false,
        message: error?.message || 'Gagal menulis ke kartu'
      };
      
    } finally {
      try {
        await NfcManager.cancelTechnologyRequest();
      } catch (e) {
        // Ignore
      }
      this.isRequestActive = false;
    }
  }

  // =========================================================================
  // HELPER METHOD: bytesToHexString()
  // =========================================================================
  // Convert array of bytes ke hex string
  // Contoh: [0x04, 0xE1, 0x2A] => "04E12A"
  private static bytesToHexString(bytes: number[]): string {
    return bytes
      .map(byte => byte.toString(16).padStart(2, '0').toUpperCase())
      .join('');
  }

  // =========================================================================
  // METHOD: cleanup()
  // =========================================================================
  // Cleanup semua NFC resources
  // Dipanggil saat aplikasi unmount atau user logout
  // Penting untuk prevent memory leak!
  static cleanup(): void {
    try {
      // STEP 1: Stop scanning interval jika masih jalan
      if ((this as any)._scanInterval) {
        clearInterval((this as any)._scanInterval);
        (this as any)._scanInterval = null;
      }
      
      // STEP 2: Cancel technology request (release NFC resource)
      try {
        NfcManager.cancelTechnologyRequest();
      } catch (cancelError) {
        // Ignore cancel errors
      }

      // Reset request active flag
      this.isRequestActive = false;
      
      console.log('🧹 NFC resources cleaned up.');
    } catch (error) {
      console.log('NFC Cleanup Error:', error);
    }
  }
}
