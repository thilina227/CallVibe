package com.callvibe.guard.data

import android.content.Context
import android.content.SharedPreferences

/**
 * PreferencesManager
 * Handles persistence of user configuration for CallVibe Guard.
 */
class PreferencesManager(context: Context) {

    companion object {
        private const val PREFS_NAME = "call_vibe_preferences"
        private const val KEY_SERVICE_ENABLED = "key_service_enabled"
        private const val KEY_VIBRATION_DURATION = "key_vibration_duration_ms"
        private const val KEY_VIBRATION_INTENSITY = "key_vibration_intensity"
        private const val KEY_MUTE_GUARD_ENABLED = "key_mute_guard_enabled"
        private const val KEY_VIBRATE_CALL_END = "key_vibrate_call_end"
    }

    private val sharedPrefs: SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun isServiceEnabled(): Boolean =
        sharedPrefs.getBoolean(KEY_SERVICE_ENABLED, true)

    fun setServiceEnabled(enabled: Boolean) =
        sharedPrefs.edit().putBoolean(KEY_SERVICE_ENABLED, enabled).apply()

    fun getVibrationDuration(): Long =
        sharedPrefs.getLong(KEY_VIBRATION_DURATION, 250L) // Default 250ms (1/4 second)

    fun setVibrationDuration(durationMs: Long) =
        sharedPrefs.edit().putLong(KEY_VIBRATION_DURATION, durationMs).apply()

    fun getVibrationIntensity(): Int =
        sharedPrefs.getInt(KEY_VIBRATION_INTENSITY, 255) // Default max strength (1-255)

    fun setVibrationIntensity(intensity: Int) =
        sharedPrefs.edit().putInt(KEY_VIBRATION_INTENSITY, intensity).apply()

    fun isMuteGuardEnabled(): Boolean =
        sharedPrefs.getBoolean(KEY_MUTE_GUARD_ENABLED, true) // Enabled by default

    fun setMuteGuardEnabled(enabled: Boolean) =
        sharedPrefs.edit().putBoolean(KEY_MUTE_GUARD_ENABLED, enabled).apply()

    fun isVibrateOnCallEndEnabled(): Boolean =
        sharedPrefs.getBoolean(KEY_VIBRATE_CALL_END, false)

    fun setVibrateOnCallEndEnabled(enabled: Boolean) =
        sharedPrefs.edit().putBoolean(KEY_VIBRATE_CALL_END, enabled).apply()
}
