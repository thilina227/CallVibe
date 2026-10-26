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
 * The instant the remote party picks up:
 * 1. EXTRA_SHOW_CHRONOMETER becomes true, OR
 * 2. An elapsed timer pattern (e.g. "0:01", "00:01") appears in text/subtext, OR
 * 3. In-call actions (Mute, Speaker, Hold, Keypad) appear, OR
 * 4. Status text transitions to "in call" / "connected".
 *
 * This listener catches that exact update and triggers the 250ms vibration
 * and simultaneous microphone mute guard immediately.
 */
class CallNotificationListenerService : NotificationListenerService() {

    companion object {
        private const val TAG = "CallNotifListener"

        // Pattern matching call duration timers (e.g., "0:01", "00:01", "0:05", "1:23:45") anywhere in text
        private val DURATION_PATTERN = Pattern.compile("(?<!\\d)([0-9]{1,2}:)?[0-9]{1,2}:[0-9]{2}(?!\\d)")

        // Dialing indicators in multiple languages
        private val DIALING_KEYWORDS = listOf(
            "calling", "dialing", "connecting", "ringing",
            "appel", "anruf", "llamando", "chamando", "вызов", "拨号", "発信"
        )

        // Keywords appearing exclusively in in-call control actions or active call status
        private val ACTIVE_CALL_KEYWORDS = listOf(
            "ongoing", "in call", "connected", "call connected",
            "en cours", "verbunden", "em chamada", "en llamada", "chiamata attiva"
        )

        // Known dialer package names
        private val DIALER_PACKAGES = setOf(
            "com.google.android.dialer",
            "com.samsung.android.incallui",
            "com.samsung.android.dialer",
            "com.samsung.android.app.telephonyui",
            "com.android.dialer",
            "com.android.phone",
            "com.android.server.telecom",
            "com.android.incallui",
            "com.miui.voiceassist",
            "com.oplus.dialer",
            "com.vivo.phone",
            "com.asus.contacts",
            "com.transsion.phone",
            "com.motorola.mobiledialer"
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

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        if (sbn == null) return
        val notification = sbn.notification ?: return
        val packageName = sbn.packageName ?: ""
        val category = notification.category

        val isCallCategory = (category == Notification.CATEGORY_CALL)
        val isDialerPkg = DIALER_PACKAGES.contains(packageName) ||
                packageName.contains("dialer", ignoreCase = true) ||
                packageName.contains("incall", ignoreCase = true) ||
                packageName.contains("phone", ignoreCase = true) ||
                packageName.contains("telecom", ignoreCase = true) ||
                packageName.contains("telephony", ignoreCase = true)

        if (!isCallCategory && !isDialerPkg) {
            return
        }

        val extras = notification.extras ?: return
        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()?.trim() ?: ""
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()?.trim() ?: ""
        val subText = extras.getCharSequence(Notification.EXTRA_SUB_TEXT)?.toString()?.trim() ?: ""
        val isChronometer = extras.getBoolean(Notification.EXTRA_SHOW_CHRONOMETER, false)
        val combinedContent = "$title $text $subText".lowercase()

        // Inspect notification action buttons (Dialers add Mute / Speaker / Hold only when connected)
        val actions = notification.actions
        val hasInCallAction = actions?.any { action ->
            val label = action?.title?.toString()?.lowercase() ?: ""
            label.contains("mute") || label.contains("mic") ||
            label.contains("speaker") || label.contains("hold") ||
            label.contains("keypad") || label.contains("silence") ||
            label.contains("haut-parleur") || label.contains("altavoz")
        } ?: false

        val key = sbn.key
        val callInfo = activeCallNotifications.getOrPut(key) {
            CallStateInfo()
        }

        val containsDialingWord = DIALING_KEYWORDS.any { combinedContent.contains(it) }
        val matchesTimer = DURATION_PATTERN.matcher(text).find() || DURATION_PATTERN.matcher(subText).find()
        val containsOngoingWord = ACTIVE_CALL_KEYWORDS.any { combinedContent.contains(it) }

        Log.d(TAG, "Call Notification [pkg=$packageName, chrono=$isChronometer, timer=$matchesTimer, inCallAction=$hasInCallAction, text='$text', title='$title']")

        // If the notification indicates dialing state
        if (containsDialingWord && !callInfo.isAnswered && !hasInCallAction) {
            callInfo.isDialing = true
            CallEventCoordinator.notifyCallStarted("Notification: $packageName", title.ifEmpty { "Dialing" })
            return
        }

        // Check if call answered indicators are present:
        // 1. Chronometer active
        // 2. Or duration timer appeared (e.g., "0:01", "00:01")
        // 3. Or text transitioned from dialing to ongoing/connected
        // 4. Or in-call control buttons (Mute/Speaker/Hold) are now present
        val hasAnsweredIndicators = isChronometer || matchesTimer || containsOngoingWord || hasInCallAction
        val wasDialingOrNew = callInfo.isDialing || !callInfo.isAnswered

        if (hasAnsweredIndicators && wasDialingOrNew && !callInfo.isAnswered) {
            callInfo.isAnswered = true
            callInfo.isDialing = false
            val triggerReason = when {
                isChronometer -> "Chronometer active"
                matchesTimer -> "Call timer active"
                hasInCallAction -> "In-call controls active"
                else -> "Call status connected"
            }
            Log.i(TAG, ">>> Outgoing call answered detected ($triggerReason)! pkg=$packageName, text=$text <<<")
            CallEventCoordinator.notifyCallAnswered(this, "Notification Monitor ($triggerReason)")
        }
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        val key = sbn?.key ?: return
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
