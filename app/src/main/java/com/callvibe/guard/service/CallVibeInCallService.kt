package com.callvibe.guard.service

import android.telecom.Call
import android.telecom.InCallService
import android.util.Log
import com.callvibe.guard.controller.CallAudioVibrateController
import com.callvibe.guard.data.PreferencesManager

/**
 * CallVibeInCallService
 * 
 * Provides official Android Telecom API hooks to detect the exact moment
 * an outgoing call transitions from DIALING / RINGING to ACTIVE (Answered).
 */
class CallVibeInCallService : InCallService() {

    companion object {
        private const val TAG = "CallVibeInCallService"
    }

    private lateinit var controller: CallAudioVibrateController
    private lateinit var prefs: PreferencesManager
    private var hasVibratedForCurrentCall = false
    private var isOutgoingCall = false

    override fun onCreate() {
        super.onCreate()
        controller = CallAudioVibrateController(this)
        prefs = PreferencesManager(this)
        Log.d(TAG, "CallVibeInCallService initialized")
    }

    override fun onCallAdded(call: Call) {
        super.onCallAdded(call)
        hasVibratedForCurrentCall = false
        
        // Check if call is outgoing (initiated by this phone)
        val state = call.state
        isOutgoingCall = (state == Call.STATE_DIALING || state == Call.STATE_CONNECTING)
        Log.d(TAG, "New call registered. Initial state: $state, isOutgoing: $isOutgoingCall")

        call.registerCallback(object : Call.Callback() {
            override fun onStateChanged(call: Call, newState: Int) {
                super.onStateChanged(call, newState)
                Log.d(TAG, "Call state changed -> $newState")

                when (newState) {
                    Call.STATE_DIALING, Call.STATE_CONNECTING -> {
                        isOutgoingCall = true
                    }
                    Call.STATE_ACTIVE -> {
                        // The other party just answered the call!
                        if (isOutgoingCall && !hasVibratedForCurrentCall) {
                            hasVibratedForCurrentCall = true
                            Log.i(TAG, ">>> Receiver answered outgoing call! Triggering 250ms pulse + mic mute <<<")
                            
                            val duration = prefs.getVibrationDuration()
                            val muteMic = prefs.isMuteGuardEnabled()
                            controller.onCallConnected(
                                vibrationDurationMs = duration,
                                muteMicrophone = muteMic
                            )
                        }
                    }
                    Call.STATE_DISCONNECTED -> {
                        if (prefs.isVibrateOnCallEndEnabled()) {
                            controller.onCallEnded()
                        }
                        hasVibratedForCurrentCall = false
                        isOutgoingCall = false
                    }
                }
            }
        })
    }

    override fun onCallRemoved(call: Call) {
        super.onCallRemoved(call)
        controller.release()
    }

    override fun onDestroy() {
        controller.release()
        super.onDestroy()
    }
}
