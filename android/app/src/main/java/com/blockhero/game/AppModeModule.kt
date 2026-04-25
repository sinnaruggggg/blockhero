package com.blockhero.game

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class AppModeModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "AppModeModule"

  override fun getConstants(): MutableMap<String, Any> {
    return mutableMapOf(
      "isAdminApp" to BuildConfig.IS_ADMIN_APP,
      "appMode" to BuildConfig.APP_MODE,
      "adminAutoEmail" to BuildConfig.ADMIN_AUTO_EMAIL,
      "adminAutoAccessToken" to BuildConfig.ADMIN_AUTO_ACCESS_TOKEN,
      "adminAutoRefreshToken" to BuildConfig.ADMIN_AUTO_REFRESH_TOKEN,
    )
  }

  @ReactMethod
  fun noop() {
    // Constants-only bridge.
  }
}
