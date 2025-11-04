# 📱 CARA MEMBUAT APK DENGAN NFC SUPPORT

## 🚀 Method 1: EAS Build (Recommended)

1. **Login/Buat akun Expo:**
   ```bash
   eas login
   ```

2. **Build APK:**
   ```bash
   eas build --platform android --profile preview
   ```

3. **Download APK** dan install di Android

## 🔧 Method 2: Android Studio

1. **Install Android Studio** dan Java JDK
2. **Setup Android SDK**
3. **Connect Android device dengan USB debugging**
4. **Run:**
   ```bash
   npx expo run:android
   ```

## 📦 Method 3: Expo Development Build

1. **Install Expo Dev Client:**
   ```bash
   npx expo install expo-dev-client
   ```

2. **Build development APK:**
   ```bash
   eas build --profile development --platform android
   ```

## ✅ Yang Sudah Siap:

- ✅ **NFC Permissions** sudah ditambah
- ✅ **Android package** name set
- ✅ **Build configuration** ready
- ✅ **NFC detection code** improved

## 🎯 Hasil Akhir:

Setelah APK terinstall di Android:
- ✅ **NFC akan terdeteksi** dengan benar
- ✅ **Read/Write NFC tags** berfungsi
- ✅ **Payment via NFC** aktif
- ✅ **Database persistent** di device

## 📞 Next Steps:

1. Pilih method build (EAS recommended)
2. Build APK 
3. Install di Android
4. Test NFC functionality