# CallVibe Guard - Android Call Connect Vibration & Mic Mute

An Android utility application that triggers a **1/4-second (250ms) tactile vibration** the instant an outgoing phone call is answered by the remote party, while **simultaneously muting the microphone** so the receiver hears zero motor buzz or disturbance.

---

## ⚡ Why Was Vibration Not Firing & How It Is Solved

On modern Android devices (Android 10 through Android 15), detecting when an outgoing call is answered and vibrating during an active call requires three specific platform implementations:

1. **Android In-Call Vibration Suppression Bypass**:
   - When an Android phone enters in-call mode (`MODE_IN_CALL` or `MODE_IN_COMMUNICATION`), Android's OS `VibratorService` **silently drops** vibrations that lack explicit communication signaling flags.
   - **Fix implemented**: CallVibe now targets `VibrationAttributes.USAGE_COMMUNICATION_REQUEST` (Android 13+) and `AudioAttributes.USAGE_VOICE_COMMUNICATION_SIGNALLING` with `FLAG_AUDIBILITY_ENFORCED` (Android 8–12), ensuring the 250ms pulse triggers through the hardware motor even while a call is live.

2. **Universal Call Answer Detection (Notification Monitor)**:
   - Android Telecom restricts `InCallService` bindings for third-party non-default dialers unless granted special companion roles.
   - **Fix implemented**: CallVibe now includes a universal `CallNotificationListenerService`. During outgoing calls, your system dialer (Google Phone, Samsung OneUI Phone, Xiaomi, OnePlus, Motorola) creates an in-call notification. The instant the remote party picks up, the dialer updates this notification with `EXTRA_SHOW_CHRONOMETER = true` or starts the duration timer (`00:01`). CallVibe catches this sub-second state change and triggers the vibration instantly!

3. **In-App Hardware Test & Diagnostics**:
   - Open CallVibe Guard on your phone.
   - Tap **"Test 1/4s Vibration & Mic Mute Now"** to immediately verify your phone's vibration motor.
   - Follow the **Readiness Checklist** in the app to enable **Notification Access** (which allows CallVibe to watch the dialer connection state without replacing your default phone app).

---

## ✨ Features & Capabilities

1. **1/4-Second (250ms) Haptic Pulse**:
   - The exact moment the other person answers your call, your phone gives a crisp 250ms buzz.
   - No need to keep the phone pressed to your ear while listening to ringing tones.

2. **Simultaneous Microphone Mute Guard**:
   - Silences the microphone (`AudioManager.setMicrophoneMute(true)`) simultaneously during the 250ms vibration.
   - Completely eliminates mechanical motor buzz (150Hz–220Hz resonance) from leaking into the call audio.
   - Automatically un-mutes at 280ms for seamless conversation.

3. **Multi-Engine Call Detection Architecture**:
   - **Notification Call Monitor**: 100% compatible with Google Phone, Samsung OneUI, Xiaomi HyperOS, and OxygenOS without replacing your dialer.
   - **Telecom InCallService**: Direct Telecom framework hooks for devices configured with companion dialer roles.
   - **Accessibility Screen Observer**: Optional fallback reading dialer timer transitions.
   - **Strict Deduplication**: `CallEventCoordinator` guarantees that exactly one vibration fires per answered call.

4. **Live Activity & Diagnostics Feed**:
   - Real-time logging directly inside the app showing call start, connection detection, and haptic firing timestamps.

---

## 🚀 Building & Releasing the APK

### Automated Cloud Build & Release (GitHub Actions)
This repository includes `.github/workflows/release-apk.yml`.

1. **Trigger via Git Tag**:
   ```bash
   git tag v1.0.1
   git push origin v1.0.1
   ```
2. **Trigger Manually via GitHub UI**:
   - Go to the **Actions** tab on your GitHub repository.
   - Select **Build & Release Android APK** on the left.
   - Click **Run workflow**, enter your tag (e.g. `v1.0.1`), and click **Run workflow**.
3. Download the compiled `CallVibeGuard-v1.0.1.apk` from the **Releases** tab on GitHub!

---

## 📱 Quick Setup On Your Device

1. Install the APK on your Android device and open **CallVibe Guard**.
2. Tap **"📳 Test 1/4s Vibration & Mic Mute Now"** to confirm the motor vibrates firmly.
3. In the **Readiness Checklist**:
   - Tap **Enable** next to **Notification Access** and toggle on **CallVibe Guard**.
   - Tap **Grant** for Phone & Audio permissions if prompted.
   - (Optional) Tap **Exempt** to prevent battery saver from pausing the service in the background.
4. Place an outgoing call to any phone — feel the crisp 250ms vibration the moment they answer!
