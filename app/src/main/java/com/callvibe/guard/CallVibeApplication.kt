package com.callvibe.guard

import android.app.Application
import android.util.Log

class CallVibeApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        Log.i("CallVibeApp", "CallVibe Guard Application Initialized")
    }
}
