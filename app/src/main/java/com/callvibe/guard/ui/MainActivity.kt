package com.callvibe.guard.ui

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
                        "Vibration Duration: ${vibrationDuration.toInt()} ms (${(vibrationDuration / 1000).toString().take(4)}s)",
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
}
