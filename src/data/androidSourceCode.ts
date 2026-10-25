import { AndroidSourceFile } from '../types';

export const ANDROID_FILES: AndroidSourceFile[] = [
  {
    name: 'AndroidManifest.xml',
    path: 'app/src/main/AndroidManifest.xml',
    language: 'xml',
    description: 'Declares required permissions, Foreground Service, InCallService, and receivers',
    content: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools"
    package="com.callvibe.guard">

    <!-- Telephony & Call State Permissions -->
    <uses-permission android:name="android.permission.READ_PHONE_STATE" />
    <uses-permission android:name="android.permission.READ_CALL_LOG" />
    <uses-permission android:name="android.permission.CALL_PHONE" />
    <uses-permission android:name="android.permission.MANAGE_OWN_CALLS" />
    
    <!-- Audio & Hardware Control Permissions -->
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    
    <!-- Background Service & Reliability -->
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_PHONE_CALL" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" />

    <application
        android:name=".CallVibeApplication"
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.CallVibeGuard">

        <!-- Main Configuration & Companion Activity -->
        <activity
            android:name=".ui.MainActivity"
            android:exported="true"
            android:theme="@style/Theme.CallVibeGuard">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <!-- Foreground Service monitoring call state -->
        <service
            android:name=".service.CallConnectService"
            android:enabled="true"
            android:exported="false"
            android:foregroundServiceType="phoneCall" />

        <!-- Optional Telecom InCallService for millisecond-accurate answer detection -->
        <service
            android:name=".service.CallVibeInCallService"
            android:permission="android.permission.BIND_INCALL_SERVICE"
            android:exported="true">
            <intent-filter>
                <action android:name="android.telecom.InCallService" />
            </intent-filter>
            <meta-data
                android:name="android.telecom.IN_CALL_SERVICE_UI"
                android:value="false" />
            <meta-data
                android:name="android.telecom.IN_CALL_SERVICE_RINGING"
                android:value="false" />
        </service>

        <!-- Broadcast Receiver for Call State Broadcasts -->
        <receiver
            android:name=".receiver.CallStateReceiver"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.PHONE_STATE" />
                <action android:name="android.intent.action.NEW_OUTGOING_CALL" />
            </intent-filter>
        </receiver>

        <!-- Boot Receiver for Auto-start -->
        <receiver
            android:name=".receiver.BootReceiver"
            android:enabled="true"
            android:exported="false">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED" />
                <action android:name="android.intent.action.QUICKBOOT_POWERON" />
            </intent-filter>
        </receiver>

    </application>
</manifest>`,
  },
  {
    name: 'CallAudioVibrateController.kt',
    path: 'app/src/main/java/com/callvibe/guard/controller/CallAudioVibrateController.kt',
    language: 'kotlin',
    description: 'Core controller: executes simultaneous 250ms vibration and mic mute guard with auto-unmute',
    content: `package com.callvibe.guard.controller

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
}`,
  },
  {
    name: 'CallVibeInCallService.kt',
    path: 'app/src/main/java/com/callvibe/guard/service/CallVibeInCallService.kt',
    language: 'kotlin',
    description: 'Telecom InCallService for instant sub-millisecond answer state detection on Android 10-15',
    content: `package com.callvibe.guard.service

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
}`,
  },
  {
    name: 'CallStateReceiver.kt',
    path: 'app/src/main/java/com/callvibe/guard/receiver/CallStateReceiver.kt',
    language: 'kotlin',
    description: 'BroadcastReceiver fallback for TelephonyManager call state transitions',
    content: `package com.callvibe.guard.receiver

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
}`,
  },
  {
    name: 'CallConnectService.kt',
    path: 'app/src/main/java/com/callvibe/guard/service/CallConnectService.kt',
    language: 'kotlin',
    description: 'Persistent Foreground Service ensuring the call detector runs continuously without OEM task killing',
    content: `package com.callvibe.guard.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.callvibe.guard.R
import com.callvibe.guard.ui.MainActivity

/**
 * CallConnectService
 * 
 * Foreground Service that keeps CallVibe Guard alive in the background
 * across Samsung OneUI, Xiaomi MIUI/HyperOS, OnePlus OxygenOS, and Pixel.
 */
class CallConnectService : Service() {

    companion object {
        const val CHANNEL_ID = "call_vibe_guard_service"
        const val NOTIFICATION_ID = 1001

        fun startService(context: Context) {
            val intent = Intent(context, CallConnectService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stopService(context: Context) {
            val intent = Intent(context, CallConnectService::class.java)
            context.stopService(intent)
        }
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        val notification = buildForegroundNotification()
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_PHONE_CALL
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

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
            .setContentText("1/4s Call answer vibration with acoustic mute protection enabled")
            .setSmallIcon(android.R.drawable.stat_sys_phone_call)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }
}`,
  },
  {
    name: 'PreferencesManager.kt',
    path: 'app/src/main/java/com/callvibe/guard/data/PreferencesManager.kt',
    language: 'kotlin',
    description: 'Stores settings like vibration duration (250ms), mute guard, call end haptics',
    content: `package com.callvibe.guard.data

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

    fun isMuteGuardEnabled(): Boolean =
        sharedPrefs.getBoolean(KEY_MUTE_GUARD_ENABLED, true) // Enabled by default

    fun setMuteGuardEnabled(enabled: Boolean) =
        sharedPrefs.edit().putBoolean(KEY_MUTE_GUARD_ENABLED, enabled).apply()

    fun isVibrateOnCallEndEnabled(): Boolean =
        sharedPrefs.getBoolean(KEY_VIBRATE_CALL_END, false)

    fun setVibrateOnCallEndEnabled(enabled: Boolean) =
        sharedPrefs.edit().putBoolean(KEY_VIBRATE_CALL_END, enabled).apply()
}`,
  },
  {
    name: 'MainActivity.kt',
    path: 'app/src/main/java/com/callvibe/guard/ui/MainActivity.kt',
    language: 'kotlin',
    description: 'Jetpack Compose configuration UI with live test triggers, permission management, and settings sliders',
    content: `package com.callvibe.guard.ui

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import com.callvibe.guard.controller.CallAudioVibrateController
import com.callvibe.guard.data.PreferencesManager
import com.callvibe.guard.service.CallConnectService

class MainActivity : ComponentActivity() {

    private lateinit var prefs: PreferencesManager
    private lateinit var controller: CallAudioVibrateController

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val allGranted = permissions.entries.all { it.value }
        if (allGranted) {
            CallConnectService.startService(this)
            Toast.makeText(this, "Permissions granted! Guard active.", Toast.LENGTH_SHORT).show()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        prefs = PreferencesManager(this)
        controller = CallAudioVibrateController(this)

        requestRequiredPermissions()

        setContent {
            MaterialTheme {
                MainScreen(
                    prefs = prefs,
                    onTestTrigger = {
                        controller.onCallConnected(
                            vibrationDurationMs = prefs.getVibrationDuration(),
                            muteMicrophone = prefs.isMuteGuardEnabled()
                        )
                        Toast.makeText(this, "Simulated 250ms answer vibration + mic mute", Toast.LENGTH_SHORT).show()
                    },
                    onToggleService = { enabled ->
                        prefs.setServiceEnabled(enabled)
                        if (enabled) {
                            CallConnectService.startService(this)
                        } else {
                            CallConnectService.stopService(this)
                        }
                    }
                )
            }
        }
    }

    private fun requestRequiredPermissions() {
        val permissions = mutableListOf(
            Manifest.permission.READ_PHONE_STATE,
            Manifest.permission.VIBRATE,
            Manifest.permission.MODIFY_AUDIO_SETTINGS
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.POST_NOTIFICATIONS)
        }
        val missing = permissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        if (missing.isNotEmpty()) {
            permissionLauncher.launch(missing.toTypedArray())
        } else {
            CallConnectService.startService(this)
        }
    }
}

@Composable
fun MainScreen(
    prefs: PreferencesManager,
    onTestTrigger: () -> Unit,
    onToggleService: (Boolean) -> Unit
) {
    var isEnabled by remember { mutableStateOf(prefs.isServiceEnabled()) }
    var vibrationDuration by remember { mutableFloatStateOf(prefs.getVibrationDuration().toFloat()) }
    var muteGuard by remember { mutableStateOf(prefs.isMuteGuardEnabled()) }
    var vibrateOnEnd by remember { mutableStateOf(prefs.isVibrateOnCallEndEnabled()) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0F172A))
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp)
    ) {
        // App Header
        Text(
            text = "CallVibe Guard",
            fontSize = 28.sp,
            color = Color.White,
            fontWeight = androidx.compose.ui.text.font.FontWeight.Bold
        )
        Text(
            text = "Vibrates 1/4 second when the other party answers, automatically muting the mic to protect them from vibration buzz.",
            fontSize = 14.sp,
            color = Color(0xFF94A3B8)
        )

        // Main Service Switch Card
        Card(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text("Call Answer Vibration", color = Color.White, fontSize = 18.sp)
                    Text("Active in background", color = Color(0xFF10B981), fontSize = 13.sp)
                }
                Switch(
                    checked = isEnabled,
                    onCheckedChange = {
                        isEnabled = it
                        onToggleService(it)
                    }
                )
            }
        }

        // Test Simulation Trigger Button
        Button(
            onClick = onTestTrigger,
            shape = RoundedCornerShape(12.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
            modifier = Modifier.fillMaxWidth().height(52.dp)
        ) {
            Text("Test 1/4 Second Vibration & Mute Now", color = Color.White, fontSize = 16.sp)
        }

        // Settings Section
        Card(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Text("Settings & Tuning", color = Color.White, fontSize = 16.sp)

                // Slider for duration
                Column {
                    Text(
                        "Vibration Duration: \${vibrationDuration.toInt()} ms (\${(vibrationDuration / 1000).toString().take(4)}s)",
                        color = Color(0xFFCBD5E1),
                        fontSize = 14.sp
                    )
                    Slider(
                        value = vibrationDuration,
                        onValueChange = {
                            vibrationDuration = it
                            prefs.setVibrationDuration(it.toLong())
                        },
                        valueRange = 100f..500f,
                        steps = 7
                    )
                }

                // Mute Guard Toggle
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Microphone Mute Guard", color = Color.White, fontSize = 14.sp)
                        Text("Silences mic during vibration so the receiver hears no motor noise", color = Color(0xFF64748B), fontSize = 12.sp)
                    }
                    Switch(
                        checked = muteGuard,
                        onCheckedChange = {
                            muteGuard = it
                            prefs.setMuteGuardEnabled(it)
                        }
                    )
                }

                // Call End Vibration Toggle
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Call Ended Vibration", color = Color.White, fontSize = 14.sp)
                        Text("Gentle 120ms pulse when remote party hangs up", color = Color(0xFF64748B), fontSize = 12.sp)
                    }
                    Switch(
                        checked = vibrateOnEnd,
                        onCheckedChange = {
                            vibrateOnEnd = it
                            prefs.setVibrateOnCallEndEnabled(it)
                        }
                    )
                }
            }
        }
    }
}`,
  },
  {
    name: 'build.gradle.kts',
    path: 'app/build.gradle.kts',
    language: 'groovy',
    description: 'Gradle configuration with Kotlin, Jetpack Compose, and Android SDK targets (minSdk 26, targetSdk 34/35)',
    content: `plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.compose.compiler)
}

android {
    namespace = "com.callvibe.guard"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.callvibe.guard"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        compose = true
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
    implementation("androidx.activity:activity-compose:1.9.3")
    implementation(platform("androidx.compose:compose-bom:2024.10.01"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
}
`,
  },
  {
    name: 'CallVibeApplication.kt',
    path: 'app/src/main/java/com/callvibe/guard/CallVibeApplication.kt',
    language: 'kotlin',
    description: 'Application class initializing background services and notification channels',
    content: `package com.callvibe.guard

import android.app.Application
import android.util.Log

class CallVibeApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        Log.i("CallVibeApp", "CallVibe Guard Application Initialized")
    }
}`,
  },
  {
    name: 'strings.xml',
    path: 'app/src/main/res/values/strings.xml',
    language: 'xml',
    description: 'App name and localized string resources',
    content: `<resources>
    <string name="app_name">CallVibe Guard</string>
    <string name="channel_name">Call Connection Monitor</string>
    <string name="channel_description">Persistent foreground service for call answer vibration</string>
</resources>`,
  },
  {
    name: 'themes.xml',
    path: 'app/src/main/res/values/themes.xml',
    language: 'xml',
    description: 'Theme configuration for Material 3 and Jetpack Compose',
    content: `<resources xmlns:tools="http://schemas.android.com/tools">
    <style name="Theme.CallVibeGuard" parent="android:Theme.Material.NoActionBar">
        <item name="android:statusBarColor">@android:color/black</item>
        <item name="android:navigationBarColor">@android:color/black</item>
    </style>
</resources>`,
  },
  {
    name: 'gradle.properties',
    path: 'gradle.properties',
    language: 'xml',
    description: 'JVM and AndroidX configuration for Gradle builds',
    content: `org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
android.nonTransitiveRClass=true
kotlin.code.style=official`,
  },
  {
    name: 'gradle-wrapper.properties',
    path: 'gradle/wrapper/gradle-wrapper.properties',
    language: 'xml',
    description: 'Gradle wrapper configuration pointing to Gradle 8.9',
    content: `distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-8.9-bin.zip
networkTimeout=10000
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists`,
  },
  {
    name: 'libs.versions.toml',
    path: 'gradle/libs.versions.toml',
    language: 'xml',
    description: 'Version catalog specifying Gradle Plugin, Kotlin, Compose, and Android SDK library versions',
    content: `[versions]
agp = "8.6.0"
kotlin = "2.0.20"
coreKtx = "1.15.0"
lifecycleRuntimeKtx = "2.8.7"
activityCompose = "1.9.3"
composeBom = "2024.10.01"

[libraries]
androidx-core-ktx = { group = "androidx.core", name = "core-ktx", version.ref = "coreKtx" }
androidx-lifecycle-runtime-ktx = { group = "androidx.lifecycle", name = "lifecycle-runtime-ktx", version.ref = "lifecycleRuntimeKtx" }
androidx-activity-compose = { group = "androidx.activity", name = "activity-compose", version.ref = "activityCompose" }
androidx-compose-bom = { group = "androidx.compose", name = "compose-bom", version.ref = "composeBom" }
androidx-ui = { group = "androidx.compose.ui", name = "ui" }
androidx-ui-graphics = { group = "androidx.compose.ui", name = "ui-graphics" }
androidx-ui-tooling-preview = { group = "androidx.compose.ui", name = "ui-tooling-preview" }
androidx-material3 = { group = "androidx.compose.material3", name = "material3" }

[plugins]
android-application = { id = "com.android.application", version.ref = "agp" }
kotlin-android = { id = "org.jetbrains.kotlin.android", version.ref = "kotlin" }
compose-compiler = { id = "org.jetbrains.kotlin.plugin.compose", version.ref = "kotlin" }`,
  },
  {
    name: 'build-apk.yml',
    path: '.github/workflows/build-apk.yml',
    language: 'xml',
    description: 'GitHub Actions workflow to automatically compile and export APK in the cloud',
    content: `name: Build Android APK

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Source Code
        uses: actions/checkout@v4

      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'

      - name: Setup Android SDK
        uses: android-actions/setup-android@v3

      - name: Grant Execute Permission for Gradle Wrapper
        run: chmod +x gradlew || true

      - name: Build Debug APK
        run: ./gradlew assembleDebug --stacktrace

      - name: Upload Debug APK Artifact
        uses: actions/upload-artifact@v4
        with:
          name: CallVibeGuard-Debug-APK
          path: app/build/outputs/apk/debug/app-debug.apk
          retention-days: 14`,
  },
  {
    name: 'README.md',
    path: 'README.md',
    language: 'xml',
    description: 'Step-by-step instructions to compile and export the APK via Android Studio, CLI, or GitHub Actions',
    content: `# CallVibe Guard - Android Call Connect Vibration & Mic Mute

A specialized Android utility that triggers a **1/4-second (250ms) tactile vibration** the instant an outgoing phone call is answered by the remote party, while **simultaneously muting the microphone** so the receiver hears zero motor buzz or disturbance.

---

## 🚀 How to Export & Build the APK

You can build and export the \`.apk\` using any of the following 3 methods:

### Method 1: Using Android Studio (Recommended / Easiest GUI)
1. Download and extract \`CallVibeGuard-AndroidProject.zip\`.
2. Open **Android Studio** (Ladybug, Iguana, Hedgehog, or newer).
3. Click **File > Open...** and select the unzipped \`CallVibeGuard\` folder.
4. Wait for Gradle to finish syncing (takes ~1-2 minutes on first run).
5. From the top menu bar, click:
   **Build > Build Bundle(s) / APK(s) > Build APK(s)**
6. Once compilation finishes, a popup appears in the bottom right corner:
   *"APK(s) generated successfully for 1 module: locate"*
7. Click **locate**. Your compiled file is ready at:
   \`app/build/outputs/apk/debug/app-debug.apk\`
8. Connect your phone via USB and run \`adb install app/build/outputs/apk/debug/app-debug.apk\`, or simply send/upload the \`.apk\` to your phone and tap to install!

---

### Method 2: Command Line (Fastest)
If you have Android SDK and Java 17 installed:
\`\`\`bash
# On macOS / Linux:
./gradlew assembleDebug

# On Windows:
gradlew.bat assembleDebug
\`\`\`
The compiled APK will be created at:
\`app/build/outputs/apk/debug/app-debug.apk\`

---

### Method 3: Cloud Build via GitHub (No Android Studio Required!)
If you do not have Android Studio installed on your computer:
1. Create a free repository on [GitHub](https://github.com).
2. Upload/push this unzipped project to your repository.
3. The included \`.github/workflows/build-apk.yml\` will automatically trigger on GitHub Actions.
4. Click the **Actions** tab on your repository.
5. In ~2 minutes, the build will complete.
6. Click the workflow run and scroll down to **Artifacts** to download \`CallVibeGuard-Debug-APK\` (.zip containing the ready-to-install \`.apk\`).

---

## ⚙️ Required Permissions & Setup
When installed on Android 10, 11, 12, 13, 14, or 15:
- **Phone State & Audio**: The app requests \`READ_PHONE_STATE\` and \`MODIFY_AUDIO_SETTINGS\` to detect call connection and silence the mic during vibration.
- **Battery Optimization**: On Samsung (OneUI), Xiaomi (HyperOS/MIUI), or OnePlus (OxygenOS), exclude CallVibe Guard from battery optimization so background services stay active.
`,
  },
];
