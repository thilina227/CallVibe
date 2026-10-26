package com.callvibe.guard.controller

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.VibrationAttributes
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log

/**
 * CallAudioVibrateController
 * 
 * Orchestrates the synchronized 1/4 second (250ms) haptic pulse
 * with simultaneous microphone muting.
 *
 * CRITICAL ANDROID OS HARDWARE RULE:
 * When an Android device is in a call (AudioMode IN_CALL / IN_COMMUNICATION),
 * the OS VibratorService suppresses any vibrations that do NOT explicitly declare
 * USAGE_VOICE_COMMUNICATION_SIGNALLING or USAGE_COMMUNICATION_REQUEST with audibility
 * enforcement flags. This controller properly sets these attributes to guarantee
 * vibration fires across Samsung OneUI, Google Pixel, Xiaomi, OnePlus, and Motorola.
 */
class CallAudioVibrateController(private val context: Context) {

    companion object {
        private const val TAG = "CallAudioVibrateCtrl"
        const val DEFAULT_VIBRATION_MS = 250L // Exactly 1/4 second
        const val SAFETY_MUTE_BUFFER_MS = 30L // Extra buffer to eliminate residual motor rattle
    }

    private val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    private val mainHandler = Handler(Looper.getMainLooper())
    private var isMuteActive = false

    private val vibrator: Vibrator by lazy {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vibratorManager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
            vibratorManager?.defaultVibrator ?: (context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator)
        } else {
            @Suppress("DEPRECATION")
            context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        }
    }

    /**
     * Trigger call answer notification:
     * 1. Simultaneously mute microphone to isolate motor acoustic leakage
     * 2. Trigger 250ms clean vibration pulse with call-signaling audio attributes
     * 3. Automatically unmute microphone once vibration stops
     */
    fun onCallConnected(
        vibrationDurationMs: Long = DEFAULT_VIBRATION_MS,
        muteMicrophone: Boolean = true,
        extraBufferMs: Long = SAFETY_MUTE_BUFFER_MS,
        intensity: Int = 255,
        onComplete: (() -> Unit)? = null
    ) {
        Log.i(TAG, "⚡ Initiating Call Answer Alert: duration=${vibrationDurationMs}ms, muteMic=$muteMicrophone, intensity=$intensity")

        // STEP 1: Immediate microphone mute
        if (muteMicrophone) {
            try {
                audioManager.isMicrophoneMute = true
                isMuteActive = true
                Log.d(TAG, "🔒 Microphone muted simultaneously to protect receiver from vibration noise")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to mute microphone", e)
            }
        }

        // STEP 2: Simultaneous 1/4 second haptic vibration pulse with call-signaling attributes
        performVibration(vibrationDurationMs, intensity)

        // STEP 3: Precise schedule to unmute microphone right when vibration stops
        val totalMuteDuration = vibrationDurationMs + (if (muteMicrophone) extraBufferMs else 0L)
        mainHandler.postDelayed({
            if (muteMicrophone && isMuteActive) {
                try {
                    audioManager.isMicrophoneMute = false
                    isMuteActive = false
                    Log.d(TAG, "🔓 Microphone unmuted: call audio fully restored for natural conversation")
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to unmute microphone", e)
                }
            }
            onComplete?.invoke()
        }, totalMuteDuration)
    }

    /**
     * Internal vibration execution with explicit call attributes to bypass Android in-call suppression.
     */
    private fun performVibration(durationMs: Long, intensity: Int) {
        try {
            if (!vibrator.hasVibrator()) {
                Log.w(TAG, "Device reports no physical vibrator present")
                return
            }

            val targetAmplitude = if (vibrator.hasAmplitudeControl()) {
                intensity.coerceIn(1, 255)
            } else {
                VibrationEffect.DEFAULT_AMPLITUDE
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val effect = VibrationEffect.createOneShot(durationMs, targetAmplitude)

                // Android AudioAttributes with VOICE_COMMUNICATION_SIGNALLING to bypass call suppression
                val audioAttributes = AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION_SIGNALLING)
                    .setFlags(AudioAttributes.FLAG_AUDIBILITY_ENFORCED)
                    .build()

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    try {
                        val vibrationAttributes = VibrationAttributes.Builder()
                            .setUsage(VibrationAttributes.USAGE_COMMUNICATION_REQUEST)
                            .build()
                        vibrator.vibrate(effect, vibrationAttributes)
                        Log.i(TAG, "📳 Vibrated using VibrationAttributes.USAGE_COMMUNICATION_REQUEST (${durationMs}ms)")
                        return
                    } catch (e: Exception) {
                        Log.w(TAG, "VibrationAttributes call failed, falling back to AudioAttributes", e)
                    }
                }

                // Standard Android 8.0 - 12 API with AudioAttributes
                vibrator.vibrate(effect, audioAttributes)
                Log.i(TAG, "📳 Vibrated using AudioAttributes.USAGE_VOICE_COMMUNICATION_SIGNALLING (${durationMs}ms)")
            } else {
                @Suppress("DEPRECATION")
                vibrator.vibrate(durationMs)
                Log.i(TAG, "📳 Vibrated using legacy API (${durationMs}ms)")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to execute vibration pulse", e)
            // Emergency fallback without attributes
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createOneShot(durationMs, VibrationEffect.DEFAULT_AMPLITUDE))
                } else {
                    @Suppress("DEPRECATION")
                    vibrator.vibrate(durationMs)
                }
            } catch (fallbackEx: Exception) {
                Log.e(TAG, "Emergency vibration fallback also failed", fallbackEx)
            }
        }
    }

    /**
     * Optional call termination vibration (subtle 120ms pulse)
     */
    fun onCallEnded() {
        performVibration(120L, 180)
    }

    /**
     * Safety clean up in case call drops during vibration
     */
    fun release() {
        if (isMuteActive) {
            try {
                audioManager.isMicrophoneMute = false
                isMuteActive = false
            } catch (e: Exception) {
                Log.e(TAG, "Failed to restore mic state on release", e)
            }
        }
        try {
            vibrator.cancel()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to cancel vibrator", e)
        }
    }
}
