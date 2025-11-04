import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';
import { Platform } from 'react-native';

export interface NFCData {
  userId: number;
  username: string;
  action: 'payment' | 'receive';
  amount?: number;
}

export class NFCService {
  static async initNFC(): Promise<boolean> {
    try {
      // Check if running in Expo Go or development mode
      if (__DEV__ && !Platform.select({ android: true, ios: true })) {
        console.log('📱 NFC not available in Expo Go - using manual payment mode');
        return false;
      }

      // Periksa dukungan NFC terlebih dahulu
      const supported = await NfcManager.isSupported().catch(() => false);
      if (!supported) {
        console.log('📱 NFC not supported on this device - using manual payment mode');
        return false;
      }

      // Coba inisialisasi NFC dengan error handling yang aman
      try {
        await NfcManager.start();
        const enabled = await NfcManager.isEnabled().catch(() => false);
        
        if (!enabled) {
          console.log('⚠️ NFC is disabled in device settings');
          return false;
        }
        
        console.log('✅ NFC Initialized successfully');
        return true;
      } catch (startError: any) {
        console.log('⚠️ NFC start failed (Expo Go/Emulator):', startError?.message || 'Not available');
        return false;
      }
    } catch (error: any) {
      console.log('❌ NFC Init Error:', error?.message || 'Not available in development mode');
      return false;
    }
  }

  static async checkNFCEnabled(): Promise<boolean> {
    try {
      const enabled = await NfcManager.isEnabled();
      return !!enabled;
    } catch (error) {
      console.log('NFC Check Error:', error);
      return false;
    }
  }

  static async writeNFCData(data: NFCData): Promise<boolean> {
    try {
      await NfcManager.requestTechnology(NfcTech.Ndef);
      const bytes = Ndef.encodeMessage([Ndef.textRecord(JSON.stringify(data))]);

      if (bytes) {
        await NfcManager.ndefHandler.writeNdefMessage(bytes);
        console.log('✅ NFC Data written:', data);
        return true;
      }
      console.warn('⚠️ NFC encodeMessage returned empty bytes');
      return false;
    } catch (error) {
      console.log('NFC Write Error:', error);
      return false;
    } finally {
      await NfcManager.cancelTechnologyRequest();
    }
  }

  static async readNFCData(): Promise<NFCData | null> {
    try {
      await NfcManager.requestTechnology(NfcTech.Ndef);
      const tag = await NfcManager.getTag();

      if (!tag || !tag.ndefMessage) {
        console.warn('⚠️ No NFC tag data found');
        return null;
      }

      const ndefRecord = tag.ndefMessage[0];
      if (!ndefRecord || !ndefRecord.payload) {
        console.warn('⚠️ Empty NFC payload');
        return null;
      }

      // Decode payload (skip language prefix byte)
      const payload = ndefRecord.payload;
      const text = String.fromCharCode(...payload.slice(3));
      const data: NFCData = JSON.parse(text);

      console.log('✅ NFC Tag Read:', data);
      return data;
    } catch (error) {
      console.log('NFC Read Error:', error);
      return null;
    } finally {
      await NfcManager.cancelTechnologyRequest();
    }
  }

  static async startNFCScanning(
    onTagDetected: (data: NFCData | null) => void,
    onError?: (error: any) => void
  ): Promise<void> {
    try {
      const scanForTag = async () => {
        try {
          const data = await this.readNFCData();
          if (data) onTagDetected(data);
        } catch (error) {
          console.log('Error reading NFC data:', error);
        }
      };

      const interval = setInterval(scanForTag, 1500);
      (this as any)._scanInterval = interval;
      console.log('✅ NFC Scanning started...');
    } catch (error) {
      console.log('NFC Scanning Error:', error);
      if (onError) onError(error);
    }
  }

  static async stopNFCScanning(): Promise<void> {
    try {
      if ((this as any)._scanInterval) {
        clearInterval((this as any)._scanInterval);
        (this as any)._scanInterval = null;
        console.log('🛑 NFC Scanning stopped.');
      }
      await NfcManager.cancelTechnologyRequest();
    } catch (error) {
      console.log('Stop NFC Scanning Error:', error);
    }
  }

  static async enableP2P(): Promise<void> {
    try {
      await NfcManager.requestTechnology([NfcTech.Ndef, NfcTech.IsoDep]);
      console.log('✅ P2P mode enabled.');
    } catch (error) {
      console.log('Enable P2P Error:', error);
    }
  }

  static cleanup(): void {
    try {
      if ((this as any)._scanInterval) {
        clearInterval((this as any)._scanInterval);
        (this as any)._scanInterval = null;
      }
      NfcManager.cancelTechnologyRequest();
      console.log('🧹 NFC resources cleaned up.');
    } catch (error) {
      console.log('NFC Cleanup Error:', error);
    }
  }
}
