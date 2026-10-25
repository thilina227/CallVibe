# CallVibe Guard - Android Call Connect Vibration & Mic Mute

An Android utility application that triggers a **1/4-second (250ms) tactile vibration** the instant an outgoing phone call is answered by the remote party, while **simultaneously muting the microphone** so the receiver hears zero motor buzz or disturbance.

---

## ✨ Features & Innovation

1. **1/4-Second (250ms) Haptic Pulse**:
   - The moment the remote party answers (`Call.STATE_ACTIVE` / `CALL_STATE_OFFHOOK`), your device vibrates for exactly 250ms.
   - Eliminates the need to hold the phone to your ear while listening to dial tones or ringing tones.

2. **Simultaneous Microphone Mute Guard**:
   - Automatically silences the microphone (`AudioManager.setMicrophoneMute(true)`) simultaneously during the 250ms vibration window.
   - Prevents the vibration motor's mechanical rumble (150Hz–220Hz acoustic vibration) from transmitting into the receiver's earpiece.
   - Unmutes automatically at 280ms so your speech flows naturally and without delays.

3. **Background Reliability (Android 10 - 15)**:
   - Uses an official Telecom `InCallService` paired with a lightweight `ForegroundService` to ensure the call monitor runs reliably without being killed by OEM task killers (Samsung OneUI, Xiaomi HyperOS, OnePlus OxygenOS, Google Pixel).

---

## 🚀 Building & Exporting the APK

### Method 1: Automated Cloud Build & Release (GitHub Actions)
This repository includes `.github/workflows/release-apk.yml`.

1. **Trigger via Git Tag**:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
2. **Trigger Manually via GitHub UI**:
   - Go to the **Actions** tab on your GitHub repository.
   - Select **Build & Release Android APK** on the left.
   - Click **Run workflow**, enter your tag (e.g. `v1.0.0`), and click Run.
3. Once the workflow turns green, navigate to the **Releases** tab on GitHub to download your installable `CallVibeGuard-v1.0.0.apk`!

### Method 2: Android Studio
1. Open **Android Studio** (Ladybug, Iguana, Koala, Hedgehog, or newer).
2. Click **File > Open…** and choose this repository root folder.
3. Let Gradle sync dependencies.
4. Click **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
5. Find the output APK at `app/build/outputs/apk/debug/app-debug.apk`.

### Method 3: Command Line
```bash
# On Linux / macOS:
chmod +x gradlew
./gradlew assembleRelease

# On Windows:
gradlew.bat assembleRelease
```

---

## 📋 Project Structure
```text
├── app/
│   ├── build.gradle.kts
│   └── src/main/
│       ├── AndroidManifest.xml
│       ├── java/com/callvibe/guard/
│       │   ├── CallVibeApplication.kt
│       │   ├── controller/CallAudioVibrateController.kt
│       │   ├── data/PreferencesManager.kt
│       │   ├── receiver/CallStateReceiver.kt
│       │   ├── receiver/BootReceiver.kt
│       │   ├── service/CallConnectService.kt
│       │   ├── service/CallVibeInCallService.kt
│       │   └── ui/MainActivity.kt
│       └── res/values/
│           ├── strings.xml
│           └── themes.xml
├── gradle/
│   ├── libs.versions.toml
│   └── wrapper/gradle-wrapper.properties
├── .github/workflows/
│   └── release-apk.yml
├── build.gradle.kts
├── settings.gradle.kts
├── gradle.properties
├── gradlew
├── gradlew.bat
└── README.md
```
