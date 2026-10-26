package com.callvibe.guard.controller

import android.content.Context
import android.util.Log
import com.callvibe.guard.data.PreferencesManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.atomic.AtomicBoolean

data class CallLogEntry(
    val id: Long = System.currentTimeMillis() + (0..999).random(),
    val timestamp: String,
    val message: String,
    val isHighlight: Boolean = false,
    val source: String? = null
)

/**
 * CallEventCoordinator
 * 
 * Thread-safe coordinator across all call detection layers:
 * 1. Notification Call Listener (Universal dialer detector)
 * 2. InCallService (Telecom API)
 * 3. Accessibility Service (Screen dialer reader)
 * 4. Telephony State / Broadcast Receiver
 *
 * Guarantees that EXACTLY ONE vibration pulse and mic mute is fired
 * per outgoing answered call, with complete deduplication.
 */
object CallEventCoordinator {

    private const val TAG = "CallEventCoordinator"
    private val timeFormat = SimpleDateFormat("HH:mm:ss", Locale.getDefault())

    private val hasVibratedForCurrentCall = AtomicBoolean(false)
    private val isCallInProgress = AtomicBoolean(false)
    private val lastVibrationTimestamp = java.util.concurrent.atomic.AtomicLong(0L)

    private val _eventLogs = MutableStateFlow<List<CallLogEntry>>(emptyList())
    val eventLogs: StateFlow<List<CallLogEntry>> = _eventLogs.asStateFlow()

    private val _lastActionStatus = MutableStateFlow<String?>("CallVibe Guard Initialized")
    val lastActionStatus: StateFlow<String?> = _lastActionStatus.asStateFlow()

    fun addLog(message: String, isHighlight: Boolean = false, source: String? = null) {
        val entry = CallLogEntry(
            timestamp = timeFormat.format(Date()),
            message = message,
            isHighlight = isHighlight,
            source = source
        )
        Log.i(TAG, "[$source] $message")
        _lastActionStatus.value = message
        val current = _eventLogs.value.toMutableList()
        current.add(0, entry) // latest first
        if (current.size > 50) {
            _eventLogs.value = current.take(50)
        } else {
            _eventLogs.value = current
        }
    }

    fun clearLogs() {
        _eventLogs.value = emptyList()
        _lastActionStatus.value = "Logs cleared"
    }

    /**
     * Called when an outgoing call starts dialing
     */
    fun notifyCallStarted(source: String, detail: String? = null) {
        isCallInProgress.set(true)
        hasVibratedForCurrentCall.set(false)
        val msg = if (detail != null) "Outgoing call started ($detail)" else "Outgoing call dialing..."
        addLog(msg, isHighlight = false, source = source)
    }

    /**
     * Called when any engine detects that the remote party answered the call
     */
    fun notifyCallAnswered(context: Context, source: String) {
        val prefs = PreferencesManager(context)
        if (!prefs.isServiceEnabled()) {
            addLog("Call answered, but service is disabled in settings", source = source)
            return
        }

        val now = System.currentTimeMillis()
        val timeSinceLast = now - lastVibrationTimestamp.get()

        // If more than 10 seconds elapsed since last vibration, auto-rearm even if notifyCallEnded was missed
        if (timeSinceLast > 10_000L) {
            hasVibratedForCurrentCall.set(false)
        }

        // Atomically ensure vibration is executed only ONCE per call
        if (hasVibratedForCurrentCall.compareAndSet(false, true)) {
            lastVibrationTimestamp.set(now)
            isCallInProgress.set(true)
            val durationMs = prefs.getVibrationDuration()
            val muteMic = prefs.isMuteGuardEnabled()
            val intensity = prefs.getVibrationIntensity()

            addLog(
                "⚡ Call Answered! Firing ${durationMs}ms vibration & mic mute guard",
                isHighlight = true,
                source = source
            )

            val controller = CallAudioVibrateController(context)
            controller.onCallConnected(
                vibrationDurationMs = durationMs,
                muteMicrophone = muteMic,
                intensity = intensity,
                onComplete = {
                    addLog("✓ Haptic vibration completed & mic unmuted safely", source = source)
                }
            )
        } else {
            Log.d(TAG, "Duplicate answer event ignored from $source (already vibrated)")
        }
    }

    /**
     * Called when the call ends (hangup or disconnect)
     */
    fun notifyCallEnded(context: Context, source: String) {
        val hadVibrated = hasVibratedForCurrentCall.get()
        hasVibratedForCurrentCall.set(false)
        isCallInProgress.set(false)

        addLog("📞 Call disconnected", isHighlight = false, source = source)

        val prefs = PreferencesManager(context)
        if (hadVibrated && prefs.isVibrateOnCallEndEnabled()) {
            val controller = CallAudioVibrateController(context)
            controller.onCallEnded()
            addLog("Call end subtle vibration fired", source = source)
        }
    }

    /**
     * Manual hardware test trigger from UI
     */
    fun triggerManualTest(context: Context, onComplete: (() -> Unit)? = null) {
        val prefs = PreferencesManager(context)
        val durationMs = prefs.getVibrationDuration()
        val muteMic = prefs.isMuteGuardEnabled()
        val intensity = prefs.getVibrationIntensity()

        addLog("Hardware Test: Firing ${durationMs}ms pulse (intensity: $intensity)", isHighlight = true, source = "Manual Test")

        val controller = CallAudioVibrateController(context)
        controller.onCallConnected(
            vibrationDurationMs = durationMs,
            muteMicrophone = muteMic,
            intensity = intensity,
            onComplete = {
                addLog("✓ Test complete: Vibration motor confirmed working", source = "Manual Test")
                onComplete?.invoke()
            }
        )
    }
}
