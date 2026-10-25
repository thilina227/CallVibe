package com.callvibe.guard.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.callvibe.guard.data.PreferencesManager
import com.callvibe.guard.service.CallConnectService

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED || intent.action == "android.intent.action.QUICKBOOT_POWERON") {
            val prefs = PreferencesManager(context)
            if (prefs.isServiceEnabled()) {
                Log.i("BootReceiver", "Device reboot detected: Starting CallConnectService")
                CallConnectService.startService(context)
            }
        }
    }
}
