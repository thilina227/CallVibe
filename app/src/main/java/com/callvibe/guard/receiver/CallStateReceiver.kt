package com.callvibe.guard.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.telephony.TelephonyManager
import android.util.Log
import com.callvibe.guard.controller.CallAudioVibrateController
import com.callvibe.guard.data.PreferencesManager

/**
 * CallStateReceiver
 * 
 * Monitors standard telephony broadcasts for outgoing calls and detects
 * the transition from OFFHOOK (dialing) to connected state.
 */
class CallStateReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "CallStateReceiver"
        private var lastState = TelephonyManager.CALL_STATE_IDLE
        private var isOutgoing = false
        private var callStartTime = 0L
    }

    override fun onReceive(context: Context, intent: Intent) {
        val prefs = PreferencesManager(context)
        if (!prefs.isServiceEnabled()) return

        val action = intent.action ?: return
        val controller = CallAudioVibrateController(context)

        if (action == Intent.ACTION_NEW_OUTGOING_CALL) {
            val phoneNumber = intent.getStringExtra(Intent.EXTRA_PHONE_NUMBER)
            isOutgoing = true
            callStartTime = System.currentTimeMillis()
            Log.d(TAG, "Outgoing call initiated to: $phoneNumber")
            return
        }

        if (action == TelephonyManager.ACTION_PHONE_STATE_CHANGED) {
            val stateStr = intent.getStringExtra(TelephonyManager.EXTRA_STATE)
            val state = when (stateStr) {
                TelephonyManager.EXTRA_STATE_RINGING -> TelephonyManager.CALL_STATE_RINGING
                TelephonyManager.EXTRA_STATE_OFFHOOK -> TelephonyManager.CALL_STATE_OFFHOOK
                TelephonyManager.EXTRA_STATE_IDLE -> TelephonyManager.CALL_STATE_IDLE
                else -> TelephonyManager.CALL_STATE_IDLE
            }

            if (state != lastState) {
                when (state) {
                    TelephonyManager.CALL_STATE_OFFHOOK -> {
                        // For outgoing calls, OFFHOOK transition triggers answer vibration
                        if (isOutgoing) {
                            Log.i(TAG, "Outgoing call connected -> triggering 1/4s vibration and mute guard")
                            controller.onCallConnected(
                                vibrationDurationMs = prefs.getVibrationDuration(),
                                muteMicrophone = prefs.isMuteGuardEnabled()
                            )
                        }
                    }
                    TelephonyManager.CALL_STATE_IDLE -> {
                        if (isOutgoing && prefs.isVibrateOnCallEndEnabled()) {
                            controller.onCallEnded()
                        }
                        isOutgoing = false
                    }
                }
                lastState = state
            }
        }
    }
}
