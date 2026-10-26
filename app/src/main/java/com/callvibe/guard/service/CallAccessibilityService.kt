package com.callvibe.guard.service

import android.accessibilityservice.AccessibilityService
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import com.callvibe.guard.controller.CallEventCoordinator
import java.util.regex.Pattern

/**
 * CallAccessibilityService
 * 
 * Secondary fallback call answer detection directly reading the in-call screen.
 * Observes dialer window content changes and catches the initial timer ("00:00", "00:01").
 */
class CallAccessibilityService : AccessibilityService() {

    companion object {
        private const val TAG = "CallAccessibility"
        private val TIMER_REGEX = Pattern.compile("(?<!\\d)(00:0[0-5]|0:0[0-5])(?!\\d)")
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        Log.i(TAG, "CallAccessibilityService connected")
        CallEventCoordinator.addLog("Screen Call Detector active & connected", source = "ScreenDetector")
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return
        val packageName = event.packageName?.toString() ?: return

        // Only monitor dialer/incall screens
        if (!packageName.contains("dialer") &&
            !packageName.contains("incall") &&
            !packageName.contains("phone") &&
            !packageName.contains("telecom")
        ) {
            return
        }

        val rootNode = rootInActiveWindow ?: return
        checkNodeForCallAnswer(rootNode)
    }

    private fun checkNodeForCallAnswer(node: AccessibilityNodeInfo) {
        val text = node.text?.toString()?.trim()
        if (text != null && TIMER_REGEX.matcher(text).matches()) {
            Log.i(TAG, "Screen detector spotted call connect timer: $text")
            CallEventCoordinator.notifyCallAnswered(this, "Screen Call Detector")
            return
        }

        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            checkNodeForCallAnswer(child)
        }
    }

    override fun onInterrupt() {
        Log.w(TAG, "CallAccessibilityService interrupted")
    }
}
