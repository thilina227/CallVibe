package com.callvibe.guard.service

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import com.callvibe.guard.controller.CallEventCoordinator
import java.util.concurrent.ConcurrentHashMap
import java.util.regex.Pattern

/**
 * CallNotificationListenerService
 * 
 * Millisecond-precise call connect detection across ALL Android dialers
 * (Google Phone, Samsung OneUI Phone, Xiaomi, OnePlus, Motorola, etc.).
 *
 * How it works:
 * During dialing: The system dialer creates an ongoing call notification with
 * text "Calling...", "Dialing..." and chronometer inactive.
 * The instant the remote party picks up: The dialer updates this notification,
 * setting EXTRA_SHOW_CHRONOMETER = true or changing the text to the elapsed timer
 * (e.g. 00:01). This listener catches that exact update and triggers the 250ms
 * vibration and simultaneous microphone mute guard immediately.
 */
class CallNotificationListenerService : NotificationListenerService() {

    companion object {
        private const val TAG = "CallNotifListener"

        // Pattern matching call duration timers (e.g., "00:01", "0:05", "1:23:45")
        private val DURATION_PATTERN = Pattern.compile("^([0-9]{1,2}:)?[0-9]{2}:[0-9]{2}$")

        // Dialing indicators in multiple languages
        private val DIALING_KEYWORDS = listOf(
            "calling", "dialing", "connecting", "ringing",
            "appel", "anruf", "llamando", "chamando", "вызов", "拨号", "発信"
        )

        // Known dialer package names
        private val DIALER_PACKAGES = setOf(
            "com.google.android.dialer",
            "com.samsung.android.incallui",
            "com.samsung.android.dialer",
            "com.android.dialer",
            "com.android.phone",
            "com.android.server.telecom",
            "com.android.incallui",
            "com.miui.voiceassist",
            "com.oplus.dialer",
            "com.vivo.phone",
            "com.asus.contacts",
            "com.transsion.phone"
        )
    }

    // Tracks known call notifications by key
    private val activeCallNotifications = ConcurrentHashMap<String, CallStateInfo>()

    data class CallStateInfo(
        var isDialing: Boolean = false,
        var isAnswered: Boolean = false,
        val startTime: Long = System.currentTimeMillis()
    )

    override fun onListenerConnected() {
        super.onListenerConnected()
        Log.i(TAG, "✓ CallNotificationListenerService connected to Android system")
        CallEventCoordinator.addLog("Notification Call Monitor active & listening", source = "NotificationMonitor")
    }

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        val notification = sbn.notification ?: return
        val packageName = sbn.packageName ?: ""
        val category = notification.category

        val isCallCategory = category == Notification.CATEGORY_CALL
        val isDialerPkg = DIALER_PACKAGES.contains(packageName) || packageName.contains("dialer") || packageName.contains("incall")

        if (!isCallCategory && !isDialerPkg) {
            return
        }

        val extras = notification.extras ?: return
        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()?.trim() ?: ""
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()?.trim() ?: ""
        val subText = extras.getCharSequence(Notification.EXTRA_SUB_TEXT)?.toString()?.trim() ?: ""
        val isChronometer = extras.getBoolean(Notification.EXTRA_SHOW_CHRONOMETER, false)
        val combinedContent = "$title $text $subText".lowercase()

        val key = sbn.key
        val callInfo = activeCallNotifications.getOrPut(key) {
            CallStateInfo()
        }

        val containsDialingWord = DIALING_KEYWORDS.any { combinedContent.contains(it) }
        val matchesTimer = DURATION_PATTERN.matcher(text).matches() || DURATION_PATTERN.matcher(subText).matches()
        val containsOngoingWord = combinedContent.contains("ongoing") ||
                combinedContent.contains("in call") ||
                combinedContent.contains("connected") ||
                combinedContent.contains("en cours") ||
                combinedContent.contains("verbunden")

        Log.d(TAG, "Call Notification [pkg=$packageName, chrono=$isChronometer, text='$text', title='$title']")

        if (containsDialingWord && !callInfo.isAnswered) {
            callInfo.isDialing = true
            CallEventCoordinator.notifyCallStarted("Notification: $packageName", title.ifEmpty { "Dialing" })
            return
        }

        // Check if call just answered:
        // 1. Chronometer active
        // 2. Or duration timer appeared (e.g., "00:01")
        // 3. Or text transitioned from dialing to ongoing/connected
        val hasAnsweredIndicators = isChronometer || matchesTimer || containsOngoingWord
        val wasDialingOrNew = callInfo.isDialing || !callInfo.isAnswered

        if (hasAnsweredIndicators && wasDialingOrNew && !callInfo.isAnswered) {
            callInfo.isAnswered = true
            callInfo.isDialing = false
            Log.i(TAG, ">>> Outgoing call answered detected! Chronometer=$isChronometer, text=$text <<<")
            CallEventCoordinator.notifyCallAnswered(this, "Notification Call Monitor")
        }
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification) {
        val key = sbn.key
        val info = activeCallNotifications.remove(key)
        if (info != null) {
            Log.d(TAG, "Call notification removed -> call ended")
            CallEventCoordinator.notifyCallEnded(this, "Notification Call Monitor")
        }
    }

    override fun onListenerDisconnected() {
        Log.w(TAG, "CallNotificationListenerService disconnected")
        CallEventCoordinator.addLog("Notification Call Monitor disconnected", source = "NotificationMonitor")
        super.onListenerDisconnected()
    }
}
