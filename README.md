# CallVibe Guard - Android Call Connect Vibration & Mic Mute (v1.0.6)

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Release](https://img.shields.io/badge/Release-v1.0.6-emerald.svg)](https://github.com/)
[![Platform](https://img.shields.io/badge/Platform-Android_8.0+-orange.svg)](https://android.com)

An open-source Android utility that triggers a **1/4-second (250ms) tactile vibration** the instant an outgoing phone call is answered by the remote party, while **simultaneously muting the microphone** so the receiver hears zero motor buzz or disturbance.

---

## 🎯 Use Case: Why CallVibe Guard?

Have you ever made a phone call and had to hold your phone glued to your ear through endless ringing, waiting and wondering when the other person will finally pick up? Or stared at your screen waiting for the call timer to start?

**CallVibe Guard solves this completely:**

- **Dial & Rest Your Ear**: Place a call, keep the phone in your hand or rest it on your desk, and continue what you were doing.
- **Instant Haptic Notification**: The exact second the receiver picks up and the call duration timer begins (`00:01`), CallVibe fires a clean 250ms haptic buzz alerting you to bring the phone to your ear.
- **Acoustic Mic Mute Guard**: Vibration motors produce strong mechanical resonance (150Hz–220Hz). Normal dialer vibration tweaks cause a loud, jarring buzz in the receiver's ear the moment they say *"Hello?"*. CallVibe automatically silences the microphone for that exact quarter-second pulse and immediately unmutes at 280ms, giving the receiver crystal-clear silence.
- **Universal & Privacy-First**: Operates seamlessly alongside Google Phone (Pixel), Samsung One UI Phone, Xiaomi HyperOS, OnePlus, and Motorola without replacing your default dialer, without root, and without sensitive permissions like call audio recording, call logs, or accessibility services.

---

## 📥 Download

Pre-built APK binaries are available on the GitHub repository **Releases** page:

👉 **[Download CallVibeGuard-v1.0.6.apk](../../releases/latest)**

---

## 🔓 How to Allow "Restricted Settings" (Android 13, 14, 15 & 16)

Starting with **Android 13** and strictly enforced on **Android 14, 15, and 16** (including **Google Pixel 7 / 8 / 9 / 10 Pro**, Samsung Galaxy One UI 5/6/7, Xiaomi HyperOS, and OnePlus OxygenOS), Android automatically blocks sideloaded APKs from turning on sensitive system toggles like **Notification Access**.

When you try to turn on Notification Access for CallVibe Guard, you will likely see this system prompt:
> **"Restricted setting"**  
> *"For your security, this setting is currently unavailable."*

### 🛠️ 5-Step Solution: Unlocking the Toggle

```
App Info ➔ Top Right Menu (⋮) ➔ "Allow restricted settings" ➔ Authenticate (PIN/Fingerprint)
```

1. **Attempt the toggle first**:
   - Open **CallVibe Guard** and tap **"👉 Tap Here to Enable Notification Access"**.
   - Tap on **CallVibe Guard** in the list. You will see the *"Restricted setting: Unavailable"* message. Tap **OK**.  
   *(Note: Android requires at least one toggle attempt before it reveals the unlock option in system settings).*

2. **Open App Info for CallVibe Guard**:
   - In CallVibe Guard, tap **"⚙️ Open App Info (For 3-Dot ⋮ Menu)"** directly inside the app, or long-press the **CallVibe Guard** icon on your home screen and tap the **(i)** / **App info** icon.

3. **Tap the 3-Dot Menu**:
   - Look in the **top-right corner** of the screen for the **three vertical dots (⋮)** menu.
   - Tap the **(⋮)** menu icon.

4. **Select "Allow restricted settings"**:
   - Tap **"Allow restricted settings"**.
   - Authenticate with your phone's **Fingerprint, Face Unlock, PIN, or Pattern**.
   - You will see a confirmation toast: *"Restricted settings allowed for CallVibe Guard"*.

5. **Enable Notification Access**:
   - Return to **CallVibe Guard** and tap **"Enable Notification Access"** again.
   - Turn the switch **ON** and tap **Allow**.
   - The status badge in CallVibe Guard will immediately turn green: **GUARD ACTIVE**!

> **💡 Troubleshooting: Can't find the 3 dots (⋮)?**  
> If the 3 dots do not appear in the top-right corner of App Info:
> - You haven't attempted to toggle the permission yet. Open CallVibe Guard, tap Enable Notification Access, tap CallVibe Guard, and let the system trigger the "Unavailable" alert once. Then go back to App Info; the 3 dots will now be visible.
> - On some Samsung One UI devices, the option is located under **Settings ➔ Apps ➔ CallVibe Guard ➔ App permissions** or at the bottom of the App Info page.
> - On Xiaomi / HyperOS / MIUI, go to **Settings ➔ Apps ➔ Manage apps ➔ CallVibe Guard** and enable **"Autostart"** and **"Permissions"**.

---

## 🛡️ Sideloading & Google Play Protect Notice

When installing the APK on modern devices (especially Google Pixel):

1. **"App blocked to protect your device" or "Unrecognized app"**:
   - Tap **"More details"** (or dropdown arrow).
   - Tap **"Install anyway"**.
2. **Permissions & Security**:
   - CallVibe Guard contains zero ads, zero trackers, and zero telemetry. It only requests:
     - `VIBRATE` (for the 250ms haptic feedback)
     - `MODIFY_AUDIO_SETTINGS` (for the simultaneous mic mute guard)
     - `READ_PHONE_STATE` (for call state observation)
     - `POST_NOTIFICATIONS` (for foreground service keepalive)
     - `BIND_NOTIFICATION_LISTENER_SERVICE` (for detecting the instant call duration begins)
   - High-risk permissions (`RECORD_AUDIO`, `CALL_PHONE`, `READ_CALL_LOG`, `ACCESSIBILITY`) have been intentionally excluded so Play Protect will not flag the application.

---

## ⚡ How Call Answer Detection & Vibration Works

On modern Android devices (Android 10 through Android 16), detecting when an outgoing call is answered and vibrating during an active call requires two specific platform implementations:

1. **Sub-Second Chronometer State Detection**:
   - During an outgoing call, your default phone dialer (Google Phone, Samsung One UI, etc.) posts an ongoing call notification.
   - While the call is ringing, the notification displays *"Calling..."* or *"Ringing..."*.
   - The exact millisecond the remote party answers, the dialer activates the call duration chronometer (e.g. `00:01`, `0:01`).
   - CallVibe's `CallNotificationListenerService` detects this precise timer transition and triggers the haptic pulse without waiting for slow polling loops.

2. **Android In-Call Vibration Suppression Bypass**:
   - When an Android phone enters in-call mode (`MODE_IN_CALL`), the Android OS `VibratorService` silently suppresses normal application vibrations to avoid interfering with call audio.
   - CallVibe bypasses this suppression by targeting `VibrationAttributes.USAGE_COMMUNICATION_REQUEST` on Android 13+ and `AudioAttributes.USAGE_VOICE_COMMUNICATION_SIGNALLING` with `FLAG_AUDIBILITY_ENFORCED` on Android 8–12.

3. **Acoustic Mic Mute Guard**:
   - The vibration motor vibrates at 150Hz–220Hz. If the microphone were active, the person on the other end would hear an audible mechanical buzz.
   - CallVibe activates `AudioManager.setMicrophoneMute(true)` concurrently with the vibration pulse and unmutes automatically after 280ms, ensuring crystal-clear audio with zero hum.

---

## ✨ Features & Capabilities

1. **1/4-Second (250ms) Haptic Pulse**:
   - Crisp tactile feedback the moment the other party answers.
   - You don't need to keep the phone glued to your ear while waiting for someone to pick up.

2. **Simultaneous Microphone Mute Guard**:
   - Eliminates mechanical motor buzz from transmitting over the line.
   - Completely unnoticeable by the recipient.

3. **Zero-Permission Privacy Architecture**:
   - No call audio recording.
   - No call log access.
   - No accessibility service overhead.
   - Works seamlessly with Google Phone, Samsung Phone, Xiaomi, and OnePlus dialers.

4. **Hardware Diagnostic & Simulation Tools**:
   - Built-in motor test button (**"Test 1/4s Vibration & Mic Mute Now"**) to test hardware output.
   - Outgoing call cycle simulator to test state machine transitions without burning carrier minutes.
   - Real-time diagnostic activity log inside the app.

---

## 📱 Quick Setup On Your Device

1. Install `CallVibeGuard-v1.0.6.apk` on your Android device and open **CallVibe Guard**.
2. Tap **"📳 Test 1/4s Vibration & Mic Mute Now"** to confirm the motor vibrates firmly.
3. In the **Readiness Checklist**:
   - Tap **Enable** next to **Notification Access** and toggle on **CallVibe Guard**.
   - If grayed out, follow the [Allow Restricted Settings](#-how-to-allow-restricted-settings-android-13-14-15--16) steps above.
   - Tap **Grant** for Phone & Audio permissions if prompted.
   - Tap **Exempt** to prevent battery saver from pausing the service in the background.
4. Place an outgoing call to any phone — feel the crisp 250ms vibration the moment they answer!

---

## 🔋 Battery Optimization (Background Keepalive)

To ensure Android does not kill the listener service when your phone is in deep sleep:
1. Open phone **Settings** ➔ **Apps** ➔ **CallVibe Guard**.
2. Tap **App battery usage** (or **Battery**).
3. Select **Unrestricted** (or turn off **Put app to sleep**).

---

## 📄 License

This project is open-source software licensed under the **[Apache License, Version 2.0](LICENSE)**.
You may freely use, modify, distribute, and contribute to this project according to the terms of the Apache 2.0 license.
