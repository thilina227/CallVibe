package com.callvibe.guard.ui

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.provider.Settings
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import com.callvibe.guard.controller.CallEventCoordinator
import com.callvibe.guard.controller.CallLogEntry
import com.callvibe.guard.data.PreferencesManager
import com.callvibe.guard.service.CallConnectService

class MainActivity : ComponentActivity() {

    private lateinit var prefs: PreferencesManager

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val allGranted = permissions.entries.all { it.value }
        if (allGranted) {
            CallConnectService.startService(this)
            CallEventCoordinator.addLog("Standard phone & audio permissions granted", source = "Permissions")
            Toast.makeText(this, "Permissions granted! Guard ready.", Toast.LENGTH_SHORT).show()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        prefs = PreferencesManager(this)

        requestRequiredPermissions()

        setContent {
            MaterialTheme {
                MainScreen(
                    prefs = prefs,
                    onRequestPermissions = { requestRequiredPermissions() },
                    onOpenNotificationAccess = { openNotificationListenerSettings() },
                    onOpenBatteryOptimization = { openBatteryOptimizationSettings() },
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

    override fun onResume() {
        super.onResume()
        // Refresh state when returning from system settings screens
        if (prefs.isServiceEnabled()) {
            CallConnectService.startService(this)
        }
    }

    private fun requestRequiredPermissions() {
        val permissions = mutableListOf(
            Manifest.permission.READ_PHONE_STATE,
            Manifest.permission.VIBRATE,
            Manifest.permission.MODIFY_AUDIO_SETTINGS,
            Manifest.permission.RECORD_AUDIO
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

    private fun openNotificationListenerSettings() {
        try {
            val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                Intent(Settings.ACTION_NOTIFICATION_LISTENER_DETAIL_SETTINGS).apply {
                    putExtra("android.provider.extra.NOTIFICATION_LISTENER_COMPONENT_NAME", "$packageName/com.callvibe.guard.service.CallNotificationListenerService")
                }
            } else {
                Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
            }
            startActivity(intent)
        } catch (e: Exception) {
            try {
                startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
            } catch (ex: Exception) {
                Toast.makeText(this, "Please open Settings -> Notification Access", Toast.LENGTH_LONG).show()
            }
        }
    }

    @SuppressLint("BatteryLife")
    private fun openBatteryOptimizationSettings() {
        try {
            val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                data = Uri.parse("package:$packageName")
            }
            startActivity(intent)
        } catch (e: Exception) {
            try {
                startActivity(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))
            } catch (ex: Exception) {
                Toast.makeText(this, "Please allow unrestricted battery in Settings", Toast.LENGTH_SHORT).show()
            }
        }
    }
}

fun isNotificationAccessGranted(context: Context): Boolean {
    val pkgName = context.packageName
    val flat = Settings.Secure.getString(context.contentResolver, "enabled_notification_listeners")
    return flat?.contains(pkgName) == true
}

fun isBatteryOptimizationIgnored(context: Context): Boolean {
    val pm = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
    return pm?.isIgnoringBatteryOptimizations(context.packageName) ?: false
}

fun arePhonePermissionsGranted(context: Context): Boolean {
    val hasPhone = ContextCompat.checkSelfPermission(context, Manifest.permission.READ_PHONE_STATE) == PackageManager.PERMISSION_GRANTED
    val hasVibrate = ContextCompat.checkSelfPermission(context, Manifest.permission.VIBRATE) == PackageManager.PERMISSION_GRANTED
    return hasPhone && hasVibrate
}

@Composable
fun MainScreen(
    prefs: PreferencesManager,
    onRequestPermissions: () -> Unit,
    onOpenNotificationAccess: () -> Unit,
    onOpenBatteryOptimization: () -> Unit,
    onToggleService: (Boolean) -> Unit
) {
    val context = LocalContext.current
    var isEnabled by remember { mutableStateOf(prefs.isServiceEnabled()) }
    var vibrationDuration by remember { mutableFloatStateOf(prefs.getVibrationDuration().toFloat()) }
    var vibrationIntensity by remember { mutableFloatStateOf(prefs.getVibrationIntensity().toFloat()) }
    var muteGuard by remember { mutableStateOf(prefs.isMuteGuardEnabled()) }
    var vibrateOnEnd by remember { mutableStateOf(prefs.isVibrateOnCallEndEnabled()) }

    var hasNotificationAccess by remember { mutableStateOf(isNotificationAccessGranted(context)) }
    var hasBatteryExemption by remember { mutableStateOf(isBatteryOptimizationIgnored(context)) }
    var hasPhonePerms by remember { mutableStateOf(arePhonePermissionsGranted(context)) }

    val eventLogs by CallEventCoordinator.eventLogs.collectAsState()
    val lastStatus by CallEventCoordinator.lastActionStatus.collectAsState()

    var isSimulatingCall by remember { mutableStateOf(false) }

    // Re-check permission status whenever composable updates
    LaunchedEffect(Unit) {
        hasNotificationAccess = isNotificationAccessGranted(context)
        hasBatteryExemption = isBatteryOptimizationIgnored(context)
        hasPhonePerms = arePhonePermissionsGranted(context)
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0B0F19))
            .padding(horizontal = 20.dp, vertical = 24.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp)
    ) {
        // App Header
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "CallVibe Guard",
                        fontSize = 26.sp,
                        color = Color.White,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Haptic Answer & Acoustic Mic Mute Guard",
                        fontSize = 13.sp,
                        color = Color(0xFF94A3B8)
                    )
                }

                // Status Badge
                Surface(
                    color = if (isEnabled && hasNotificationAccess) Color(0xFF065F46) else Color(0xFF78350F),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.border(
                        1.dp,
                        if (isEnabled && hasNotificationAccess) Color(0xFF10B981) else Color(0xFFF59E0B),
                        RoundedCornerShape(12.dp)
                    )
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .clip(CircleShape)
                                .background(if (isEnabled && hasNotificationAccess) Color(0xFF34D399) else Color(0xFFFBBF24))
                        )
                        Text(
                            text = if (isEnabled && hasNotificationAccess) "GUARD ACTIVE" else "SETUP NEEDED",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = Color.White
                        )
                    }
                }
            }
        }

        // CRITICAL ACTION REQUIRED BANNER
        if (!hasNotificationAccess) {
            item {
                Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF7F1D1D)),
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(1.dp, Color(0xFFEF4444), RoundedCornerShape(16.dp))
                ) {
                    Column(
                        modifier = Modifier.padding(18.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text("⚠️", fontSize = 20.sp)
                            Text(
                                text = "Action Required: Grant Notification Access",
                                color = Color.White,
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                        Text(
                            text = "To detect the exact moment when an outgoing call connects, Android requires Notification Access so CallVibe can observe dialer events.",
                            color = Color(0xFFFCA5A5),
                            fontSize = 12.sp,
                            lineHeight = 17.sp
                        )
                        Button(
                            onClick = onOpenNotificationAccess,
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDC2626)),
                            modifier = Modifier.fillMaxWidth().height(44.dp)
                        ) {
                            Text("👉 Tap Here to Enable Notification Access", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        }
                    }
                }
            }
        }

        // Main Service Switch Card
        item {
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(18.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Call Answer Vibration Guard", color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                        Text(
                            text = if (isEnabled) "Active in background listening for outgoing call connections" else "Service is paused",
                            color = if (isEnabled) Color(0xFF34D399) else Color(0xFF94A3B8),
                            fontSize = 12.sp
                        )
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
        }

        // HARDWARE TEST SECTION
        item {
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF131D31)),
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, Color(0xFF3B82F6).copy(alpha = 0.4f), RoundedCornerShape(16.dp))
            ) {
                Column(
                    modifier = Modifier.padding(18.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text(
                        text = "Hardware & Motor Verification",
                        color = Color(0xFF60A5FA),
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Verify that your phone motor produces the clean 250ms pulse and acoustic mic mute guard:",
                        color = Color(0xFF94A3B8),
                        fontSize = 12.sp
                    )

                    Button(
                        onClick = {
                            CallEventCoordinator.triggerManualTest(context)
                            Toast.makeText(context, "📳 250ms Pulse + Mic Mute Executed!", Toast.LENGTH_SHORT).show()
                        },
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB)),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(50.dp)
                    ) {
                        Text("📳 Test 1/4s Vibration & Mic Mute Now", color = Color.White, fontSize = 15.sp, fontWeight = FontWeight.Bold)
                    }

                    OutlinedButton(
                        onClick = {
                            if (!isSimulatingCall) {
                                isSimulatingCall = true
                                CallEventCoordinator.notifyCallStarted("Simulation", "+1 (555) 019-2834")
                                Handler(Looper.getMainLooper()).postDelayed({
                                    CallEventCoordinator.notifyCallAnswered(context, "Simulation Engine")
                                    Handler(Looper.getMainLooper()).postDelayed({
                                        CallEventCoordinator.notifyCallEnded(context, "Simulation Engine")
                                        isSimulatingCall = false
                                    }, 3000)
                                }, 3000)
                            }
                        },
                        enabled = !isSimulatingCall,
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFF38BDF8)),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(44.dp)
                    ) {
                        Text(if (isSimulatingCall) "Simulating Call (Wait 3s)..." else "▶ Simulate Outgoing Call Cycle", fontSize = 13.sp)
                    }
                }
            }
        }

        // PERMISSION & SYSTEM SETUP CHECKLIST
        item {
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(18.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    Text(
                        text = "System Setup & Readiness Checklist",
                        color = Color.White,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.SemiBold
                    )

                    // 1. Notification Access (CRITICAL)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                Text("Notification Access", color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Medium)
                                Text(
                                    text = if (hasNotificationAccess) "✓ GRANTED" else "★ REQUIRED",
                                    color = if (hasNotificationAccess) Color(0xFF34D399) else Color(0xFFF87171),
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                            Text(
                                "Detects outgoing call answer across Google Phone, Samsung, Xiaomi, etc.",
                                color = Color(0xFF94A3B8),
                                fontSize = 11.sp
                            )
                        }
                        if (!hasNotificationAccess) {
                            Button(
                                onClick = onOpenNotificationAccess,
                                shape = RoundedCornerShape(8.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444)),
                                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                            ) {
                                Text("Enable", fontSize = 12.sp, color = Color.White)
                            }
                        }
                    }

                    HorizontalDivider(color = Color(0xFF334155), thickness = 0.5.dp)

                    // 2. Phone & Audio Permissions
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                Text("Phone & Audio Permissions", color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Medium)
                                Text(
                                    text = if (hasPhonePerms) "✓ GRANTED" else "MISSING",
                                    color = if (hasPhonePerms) Color(0xFF34D399) else Color(0xFFFBBF24),
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                            Text(
                                "Allows telephony observation and acoustic mic mute guard",
                                color = Color(0xFF94A3B8),
                                fontSize = 11.sp
                            )
                        }
                        if (!hasPhonePerms) {
                            Button(
                                onClick = onRequestPermissions,
                                shape = RoundedCornerShape(8.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF59E0B)),
                                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                            ) {
                                Text("Grant", fontSize = 12.sp, color = Color.White)
                            }
                        }
                    }

                    HorizontalDivider(color = Color(0xFF334155), thickness = 0.5.dp)

                    // 3. Battery Optimization
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                Text("Background Battery Saver", color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Medium)
                                Text(
                                    text = if (hasBatteryExemption) "✓ UNRESTRICTED" else "OPTIMIZED",
                                    color = if (hasBatteryExemption) Color(0xFF34D399) else Color(0xFF94A3B8),
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                            Text(
                                "Prevents Samsung/Xiaomi/Pixel from putting CallVibe to sleep",
                                color = Color(0xFF94A3B8),
                                fontSize = 11.sp
                            )
                        }
                        if (!hasBatteryExemption) {
                            OutlinedButton(
                                onClick = onOpenBatteryOptimization,
                                shape = RoundedCornerShape(8.dp),
                                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
                            ) {
                                Text("Exempt", fontSize = 12.sp, color = Color(0xFF38BDF8))
                            }
                        }
                    }
                }
            }
        }

        // TUNING & SETTINGS
        item {
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(18.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Text("Haptic & Audio Tuning", color = Color.White, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)

                    // Duration Slider
                    Column {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("Vibration Pulse Duration", color = Color(0xFFCBD5E1), fontSize = 13.sp)
                            Text(
                                "${vibrationDuration.toInt()} ms ${if (vibrationDuration.toInt() == 250) "(Standard 1/4s)" else ""}",
                                color = Color(0xFF38BDF8),
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
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

                    // Intensity Slider
                    Column {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("Motor Intensity", color = Color(0xFFCBD5E1), fontSize = 13.sp)
                            Text(
                                "${(vibrationIntensity / 255f * 100).toInt()}%",
                                color = Color(0xFF38BDF8),
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                        Slider(
                            value = vibrationIntensity,
                            onValueChange = {
                                vibrationIntensity = it
                                prefs.setVibrationIntensity(it.toInt())
                            },
                            valueRange = 50f..255f,
                            steps = 8
                        )
                    }

                    // Mic Mute Guard
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Microphone Mute Guard", color = Color.White, fontSize = 14.sp)
                            Text("Silences mic during vibration so the receiver hears no motor buzz", color = Color(0xFF64748B), fontSize = 12.sp)
                        }
                        Switch(
                            checked = muteGuard,
                            onCheckedChange = {
                                muteGuard = it
                                prefs.setMuteGuardEnabled(it)
                            }
                        )
                    }

                    // Call End Vibration
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Call Ended Vibration", color = Color.White, fontSize = 14.sp)
                            Text("Gentle 120ms pulse when the remote party hangs up", color = Color(0xFF64748B), fontSize = 12.sp)
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

        // LIVE ACTIVITY & DIAGNOSTIC LOG
        item {
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, Color(0xFF334155), RoundedCornerShape(16.dp))
            ) {
                Column(
                    modifier = Modifier.padding(18.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text("Live Call & Haptic Event Log", color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                            Text("Real-time stream of detected states", color = Color(0xFF64748B), fontSize = 11.sp)
                        }
                        TextButton(onClick = { CallEventCoordinator.clearLogs() }) {
                            Text("Clear", fontSize = 12.sp, color = Color(0xFF94A3B8))
                        }
                    }

                    if (eventLogs.isEmpty()) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 20.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text("No events recorded yet. Place a call or tap Test.", color = Color(0xFF64748B), fontSize = 12.sp)
                        }
                    } else {
                        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            eventLogs.take(8).forEach { entry ->
                                LogItemRow(entry)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun LogItemRow(entry: CallLogEntry) {
    Surface(
        color = if (entry.isHighlight) Color(0xFF1E3A8A).copy(alpha = 0.5f) else Color(0xFF1E293B).copy(alpha = 0.6f),
        shape = RoundedCornerShape(8.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 7.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = entry.timestamp,
                color = Color(0xFF94A3B8),
                fontSize = 11.sp,
                fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace
            )
            if (entry.source != null) {
                Surface(
                    color = Color(0xFF334155),
                    shape = RoundedCornerShape(4.dp)
                ) {
                    Text(
                        text = entry.source,
                        color = Color(0xFFCBD5E1),
                        fontSize = 10.sp,
                        modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                    )
                }
            }
            Text(
                text = entry.message,
                color = if (entry.isHighlight) Color(0xFF93C5FD) else Color(0xFFE2E8F0),
                fontSize = 12.sp,
                fontWeight = if (entry.isHighlight) FontWeight.Bold else FontWeight.Normal,
                modifier = Modifier.weight(1f)
            )
        }
    }
}
