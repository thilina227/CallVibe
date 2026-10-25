package com.callvibe.guard.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.telephony.PhoneStateListener
import android.telephony.TelephonyCallback
import android.telephony.TelephonyManager
import android.util.Log
import androidx.core.app.NotificationCompat
import com.callvibe.guard.controller.CallEventCoordinator
import com.callvibe.guard.ui.MainActivity

/**
 * CallConnectService
 * 
 * Foreground Service that keeps CallVibe Guard alive in the background
 * across Samsung OneUI, Xiaomi MIUI/HyperOS, OnePlus OxygenOS, and Pixel.
 *
 * Dynamically registers Telephony callbacks to avoid Android background restrictions.
 */
class CallConnectService : Service() {

    companion object {
        private const val TAG = "CallConnectService"
        const val CHANNEL_ID = "call_vibe_guard_service"
        const val NOTIFICATION_ID = 1001

        fun startService(context: Context) {
            val intent = Intent(context, CallConnectService::class.java)
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(intent)
                } else {
                    context.startService(intent)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to start CallConnectService", e)
            }
        }

        fun stopService(context: Context) {
            val intent = Intent(context, CallConnectService::class.java)
            try {
                context.stopService(intent)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to stop CallConnectService", e)
            }
        }
    }

    private var telephonyManager: TelephonyManager? = null
    private var telephonyCallback: TelephonyCallback? = null
    private var phoneStateListener: PhoneStateListener? = null
    private var dynamicReceiver: BroadcastReceiver? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        val notification = buildForegroundNotification()

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(
                    NOTIFICATION_ID,
                    notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_PHONE_CALL
                )
            } else {
                startForeground(NOTIFICATION_ID, notification)
            }
        } catch (e: Exception) {
            Log.e(TAG, "startForeground error", e)
        }

        CallEventCoordinator.addLog("CallVibe Guard active in background", isHighlight = true, source = "ForegroundService")
        setupTelephonyListeners()
    }

    private fun setupTelephonyListeners() {
        try {
            telephonyManager = getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val callback = object : TelephonyCallback(), TelephonyCallback.CallStateListener {
                    override fun onCallStateChanged(state: Int) {
                        handleCallState(state)
                    }
                }
                telephonyCallback = callback
                telephonyManager?.registerTelephonyCallback(mainExecutor, callback)
                Log.d(TAG, "Registered TelephonyCallback (API 31+)")
            } else {
                @Suppress("DEPRECATION")
                val listener = object : PhoneStateListener() {
                    @Deprecated("Deprecated in Java")
                    override fun onCallStateChanged(state: Int, phoneNumber: String?) {
                        handleCallState(state)
                    }
                }
                phoneStateListener = listener
                @Suppress("DEPRECATION")
                telephonyManager?.listen(listener, PhoneStateListener.LISTEN_CALL_STATE)
                Log.d(TAG, "Registered PhoneStateListener (API <31)")
            }

            // Register dynamic receiver for real-time broadcasts
            val filter = IntentFilter().apply {
                addAction(TelephonyManager.ACTION_PHONE_STATE_CHANGED)
                @Suppress("DEPRECATION")
                addAction(Intent.ACTION_NEW_OUTGOING_CALL)
            }
            val receiver = object : BroadcastReceiver() {
                override fun onReceive(context: Context, intent: Intent) {
                    val action = intent.action ?: return
                    @Suppress("DEPRECATION")
                    if (action == Intent.ACTION_NEW_OUTGOING_CALL) {
                        val num = intent.getStringExtra(Intent.EXTRA_PHONE_NUMBER)
                        CallEventCoordinator.notifyCallStarted("Dynamic Receiver", num ?: "Outgoing Call")
                    }
                }
            }
            dynamicReceiver = receiver
            registerReceiver(receiver, filter)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to register telephony listeners", e)
        }
    }

    private fun handleCallState(state: Int) {
        when (state) {
            TelephonyManager.CALL_STATE_OFFHOOK -> {
                Log.d(TAG, "Telephony OFFHOOK state observed")
                CallEventCoordinator.addLog("Radio OFFHOOK active", source = "TelephonyListener")
            }
            TelephonyManager.CALL_STATE_IDLE -> {
                Log.d(TAG, "Telephony IDLE state observed")
                CallEventCoordinator.notifyCallEnded(this, "TelephonyListener")
            }
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && telephonyCallback != null) {
                telephonyManager?.unregisterTelephonyCallback(telephonyCallback!!)
            } else if (phoneStateListener != null) {
                @Suppress("DEPRECATION")
                telephonyManager?.listen(phoneStateListener, PhoneStateListener.LISTEN_NONE)
            }
            if (dynamicReceiver != null) {
                unregisterReceiver(dynamicReceiver)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error cleaning up telephony listeners", e)
        }
        CallEventCoordinator.addLog("CallVibe Guard stopped", source = "ForegroundService")
        super.onDestroy()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Call Connection Guard Service",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Monitors outgoing call connection and triggers haptic answer alert"
                setShowBadge(false)
            }
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildForegroundNotification(): Notification {
        val launchIntent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            launchIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("CallVibe Guard Active")
            .setContentText("Monitoring outgoing calls • 250ms haptic answer pulse + mic mute")
            .setSmallIcon(android.R.drawable.stat_sys_phone_call)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }
}
