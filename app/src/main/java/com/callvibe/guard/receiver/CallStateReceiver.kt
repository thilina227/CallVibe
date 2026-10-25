package com.callvibe.guard.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.telephony.TelephonyManager
import android.util.Log
import com.callvibe.guard.controller.CallEventCoordinator
import com.callvibe.guard.data.PreferencesManager

/**
 * CallStateReceiver
 * 
 * Monitors standard telephony broadcasts for outgoing calls.
 * Feeds call lifecycle changes into CallEventCoordinator.
 */
class CallStateReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "CallStateReceiver"
        private var lastState = TelephonyManager.CALL_STATE_IDLE
        private var isOutgoing = false
    }

    override fun onReceive(context: Context, intent: Intent) {
        val prefs = PreferencesManager(context)
        if (!prefs.isServiceEnabled()) return

        val action = intent.action ?: return

        @Suppress("DEPRECATION")
        if (action == Intent.ACTION_NEW_OUTGOING_CALL) {
            val phoneNumber = intent.getStringExtra(Intent.EXTRA_PHONE_NUMBER)
            isOutgoing = true
            Log.d(TAG, "Outgoing call broadcast initiated to: $phoneNumber")
            CallEventCoordinator.notifyCallStarted("Telephony Broadcast", phoneNumber ?: "Outgoing")
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
                        Log.d(TAG, "Telephony state changed to OFFHOOK (isOutgoing=$isOutgoing)")
                        if (isOutgoing) {
                            CallEventCoordinator.addLog("Radio OFFHOOK (Call line engaged)", source = "TelephonyReceiver")
                        }
                    }
                    TelephonyManager.CALL_STATE_IDLE -> {
                        Log.d(TAG, "Telephony state changed to IDLE")
                        if (isOutgoing) {
                            CallEventCoordinator.notifyCallEnded(context, "Telephony Broadcast")
                        }
                        isOutgoing = false
                    }
                }
                lastState = state
            }
        }
    }
}
