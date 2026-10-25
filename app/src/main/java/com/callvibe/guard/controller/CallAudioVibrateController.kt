package com.callvibe.guard.controller

import android.content.Context
import android.media.AudioManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log

/**
 * CallAudioVibrateController
 * 
 * Orchestrates the synchronized 1/4 second (250ms) haptic pulse
 * with simultaneous microphone muting. This prevents the vibration motor
 * acoustic resonance from transmitting to the receiver's ear, while instantly
 * informing the caller that the other party has answered.
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
            val vibratorManager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
            vibratorManager.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        }
    }

    /**
     * Trigger call answer notification:
     * 1. Simultaneously mute microphone to isolate motor acoustic leakage
     * 2. Trigger 250ms clean vibration pulse
     * 3. Automatically unmute microphone once vibration stops
     */
    fun onCallConnected(
        vibrationDurationMs: Long = DEFAULT_VIBRATION_MS,
        muteMicrophone: Boolean = true,
        extraBufferMs: Long = SAFETY_MUTE_BUFFER_MS,
        onComplete: (() -> Unit)? = null
    ) {
        Log.i(TAG, "⚡ Call Connected! Initiating simultaneous vibration ($vibrationDurationMs ms) & mute guard.")

        // STEP 1: Microsecond-immediate microphone mute
        if (muteMicrophone) {
            try {
                audioManager.isMicrophoneMute = true
                isMuteActive = true
                Log.d(TAG, "🔒 Microphone muted simultaneously to protect receiver from vibration noise")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to mute microphone", e)
            }
        }

        // STEP 2: Simultaneous 1/4 second haptic vibration pulse
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val vibrationEffect = VibrationEffect.createOneShot(
                    vibrationDurationMs,
                    VibrationEffect.DEFAULT_AMPLITUDE
                )
                vibrator.vibrate(vibrationEffect)
            } else {
                @Suppress("DEPRECATION")
                vibrator.vibrate(vibrationDurationMs)
            }
            Log.d(TAG, "📳 Vibration pulse started (duration: $vibrationDurationMs ms)")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to vibrate", e)
        }

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
     * Optional call termination vibration (subtle 120ms pulse)
     */
    fun onCallEnded() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createOneShot(120L, 100))
            } else {
                @Suppress("DEPRECATION")
                vibrator.vibrate(120L)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to vibrate on call end", e)
        }
    }

    /**
     * Safety clean up in case call drops during vibration
     */
    fun release() {
        if (isMuteActive) {
            audioManager.isMicrophoneMute = false
            isMuteActive = false
        }
        vibrator.cancel()
    }
}
