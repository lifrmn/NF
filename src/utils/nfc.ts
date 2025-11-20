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
}

// ============================================================================
// CLASS: NFCService
// ============================================================================
// Service untuk handle semua operasi NFC (Near Field Communication)
// NFC digunakan untuk pembayaran phone-to-phone tanpa internet
// Cara kerja: Tempelkan 2 HP, data transfer via NFC tag
export class NFCService {
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
      // STEP 1: Request akses ke NFC technology (NDEF format)
      await NfcManager.requestTechnology(NfcTech.Ndef);
      
      // STEP 2: Ambil tag yang terdeteksi
      // getTag() akan return object tag dengan semua data
      const tag = await NfcManager.getTag();

      // STEP 3: Validasi tag
      // Cek apakah tag ada dan punya NDEF message
      if (!tag || !tag.ndefMessage) {
        console.warn('⚠️ No NFC tag data found');
        return null;
      }

      // STEP 4: Ambil NDEF record pertama
      // NDEF message bisa punya multiple records, kita ambil yang pertama
      const ndefRecord = tag.ndefMessage[0];
      if (!ndefRecord || !ndefRecord.payload) {
        console.warn('⚠️ Empty NFC payload');
        return null;
      }

      // STEP 5: Decode payload
      // Payload format NDEF text record:
      // - Byte 0: Status byte (encoding + language length)
      // - Byte 1-2: Language code (contoh: "en")
      // - Byte 3+: Actual text data (JSON string kita)
      const payload = ndefRecord.payload;
      
      // Skip 3 bytes pertama (status + language prefix)
      // Convert sisanya jadi string
      const text = String.fromCharCode(...payload.slice(3));
      
      // STEP 6: Parse JSON string jadi object
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
      await NfcManager.cancelTechnologyRequest();
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
      // STEP 1: Cek apakah ada interval yang jalan
      if ((this as any)._scanInterval) {
        // STEP 2: Clear interval untuk stop scanning loop
        clearInterval((this as any)._scanInterval);
        
        // STEP 3: Reset interval ID
        (this as any)._scanInterval = null;
        
        console.log('🛑 NFC Scanning stopped.');
      }
      
      // STEP 4: Cancel technology request (release NFC resource)
      await NfcManager.cancelTechnologyRequest();
      
    } catch (error) {
      console.log('Stop NFC Scanning Error:', error);
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
      NfcManager.cancelTechnologyRequest();
      
      console.log('🧹 NFC resources cleaned up.');
    } catch (error) {
      console.log('NFC Cleanup Error:', error);
    }
  }
}
