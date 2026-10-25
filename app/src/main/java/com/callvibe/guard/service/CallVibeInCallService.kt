package com.callvibe.guard.service

import android.telecom.Call
import android.telecom.InCallService
import android.util.Log
import com.callvibe.guard.controller.CallEventCoordinator

/**
 * CallVibeInCallService
 * 
 * Provides official Android Telecom API hooks to detect the exact moment
 * an outgoing call transitions from DIALING / RINGING to ACTIVE (Answered).
 * Bound when the app is selected as Call Companion or Default Phone App.
 */
class CallVibeInCallService : InCallService() {

    companion object {
        private const val TAG = "CallVibeInCallService"
    }

    override fun onCreate() {
        super.onCreate()
        Log.i(TAG, "CallVibeInCallService created")
        CallEventCoordinator.addLog("Telecom InCallService registered", source = "InCallService")
    }

    override fun onCallAdded(call: Call) {
        super.onCallAdded(call)
        val state = call.state
        val isOutgoing = (state == Call.STATE_DIALING || state == Call.STATE_CONNECTING)
        Log.d(TAG, "New call registered via Telecom API. State: $state, isOutgoing: $isOutgoing")

        if (isOutgoing) {
            CallEventCoordinator.notifyCallStarted("Telecom API", "Outgoing Dialing")
        }

        call.registerCallback(object : Call.Callback() {
            override fun onStateChanged(call: Call, newState: Int) {
                super.onStateChanged(call, newState)
                Log.d(TAG, "Telecom Call state changed -> $newState")

                when (newState) {
                    Call.STATE_DIALING, Call.STATE_CONNECTING -> {
                        CallEventCoordinator.notifyCallStarted("Telecom API", "Connecting")
                    }
                    Call.STATE_ACTIVE -> {
                        // The remote party answered the call
                        CallEventCoordinator.notifyCallAnswered(this@CallVibeInCallService, "Telecom API (InCallService)")
                    }
                    Call.STATE_DISCONNECTED -> {
                        CallEventCoordinator.notifyCallEnded(this@CallVibeInCallService, "Telecom API (InCallService)")
                    }
                }
            }
        })
    }

    override fun onCallRemoved(call: Call) {
        super.onCallRemoved(call)
        CallEventCoordinator.notifyCallEnded(this, "Telecom API (InCallService)")
    }
}
