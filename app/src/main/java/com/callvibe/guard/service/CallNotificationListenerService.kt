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
 * (Google Phone on Pixel, Samsung OneUI Phone, Xiaomi, OnePlus, Motorola, etc.).
 *
 * Core requirement:
 * MUST NOT vibrate when the call is dialing or ringing the receiver.
 * ONLY vibrates the exact moment the receiver answers (when call duration count starts).
 */
class CallNotificationListenerService : NotificationListenerService() {

    companion object {
        private const val TAG = "CallNotifListener"

        // Pattern matching call duration timers (e.g., "0:00", "0:01", "00:01", "0:05", "1:23:45")
        private val DURATION_TIMER_PATTERN = Pattern.compile("\\b([0-9]{1,2}:)?[0-5]?[0-9]:[0-5][0-9]\\b")

        // Dialing & Ringing keywords across multiple languages.
        // As long as any of these are present and no timer is running, the call is strictly RINGING.
        private val DIALING_KEYWORDS = listOf(
            "calling", "dialing", "connecting", "ringing", "placing call",
            "llamando", "marcando", "sonando",
            "appel en cours", "numérotation", "sonnerie",
            "anruf", "wählt", "klingelt",
            "chamando", "discando", "a chamar",
            "chiamata in corso", "in attesa",
            "вызов", "набор", "соединение", "гудки", "звонок",
            "拨号", "正在呼叫", "呼叫中", "响铃",
            "発信中", "呼び出し中",
            "전화 거는 중", "연결 중"
        )

        // Keywords appearing exclusively when the remote party has answered and the call is live
        private val ACTIVE_CALL_KEYWORDS = listOf(
            "ongoing", "in call", "connected", "call connected", "active call",
            "en cours", "verbunden", "em chamada", "chamada em curso",
            "en llamada", "chiamata attiva", "связь установлена", "通话中", "通話中", "통화 중"
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
        CallEventCoordinator.addLog("Call Answer Monitor active & listening", source = "NotificationMonitor")
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
        val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()?.trim() ?: ""
        val infoText = extras.getCharSequence(Notification.EXTRA_INFO_TEXT)?.toString()?.trim() ?: ""
        val summaryText = extras.getCharSequence(Notification.EXTRA_SUMMARY_TEXT)?.toString()?.trim() ?: ""

        val combinedContent = "$title $text $subText $bigText $infoText $summaryText".lowercase()
        val secondaryContent = "$text $subText $bigText $infoText $summaryText"

        val isChronometer = extras.getBoolean(Notification.EXTRA_SHOW_CHRONOMETER, false)
        val containsDialingWord = DIALING_KEYWORDS.any { combinedContent.contains(it) }
        val matchesTimer = DURATION_TIMER_PATTERN.matcher(secondaryContent).find()
        val containsOngoingWord = ACTIVE_CALL_KEYWORDS.any { combinedContent.contains(it) }

        val key = sbn.key
        val callInfo = activeCallNotifications.getOrPut(key) {
            CallStateInfo()
        }

        Log.d(TAG, "Call Notification [pkg=$packageName, chrono=$isChronometer, timer=$matchesTimer, dialingWord=$containsDialingWord, text='$text', subText='$subText']")

        // STEP 1: DIALING / RINGING DETECTION
        // If the notification indicates dialing or ringing, and timer has NOT started:
        // Do NOT vibrate! We wait until the receiver picks up.
        if (containsDialingWord && !matchesTimer) {
            callInfo.isDialing = true
            callInfo.isAnswered = false
            CallEventCoordinator.notifyCallStarted("Notification: $packageName", "Ringing receiver ($text)")
            Log.d(TAG, "Call is dialing/ringing receiver (no vibration triggered)")
            return
        }

        // STEP 2: CALL ANSWER DETECTION
        // The call is answered when:
        // 1. The call duration timer started ("0:00", "0:01", "00:01", etc.)
        // 2. OR Android Chronometer is active and no dialing/ringing keywords exist
        // 3. OR Status text explicitly indicates connected/ongoing call without dialing words
        // 4. OR The call was previously dialing/ringing, and now dialing words are gone while call is ongoing
        val isAnsweredNow = !containsDialingWord && (
            matchesTimer ||
            isChronometer ||
            containsOngoingWord ||
            (callInfo.isDialing && (text.isNotEmpty() || isChronometer))
        )

        if (isAnsweredNow && !callInfo.isAnswered) {
            callInfo.isAnswered = true
            callInfo.isDialing = false

            val triggerReason = when {
                matchesTimer -> "Call duration count started ($secondaryContent)"
                isChronometer -> "Chronometer active"
                containsOngoingWord -> "Connected call status"
                else -> "Dialing ended -> Call connected"
            }

            Log.i(TAG, ">>> Outgoing call answered by receiver ($triggerReason)! Firing haptic pulse! <<<")
            CallEventCoordinator.notifyCallAnswered(this, "Call Answered ($triggerReason)")
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
        CallEventCoordinator.addLog("Call Answer Monitor disconnected", source = "NotificationMonitor")
        super.onListenerDisconnected()
    }
}
