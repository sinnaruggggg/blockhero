package com.blockhero.game

import android.content.pm.ActivityInfo
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class ScreenOrientationModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "ScreenOrientationModule"

  @ReactMethod
  fun allowFullSensor() {
    reactApplicationContext.currentActivity?.requestedOrientation =
      ActivityInfo.SCREEN_ORIENTATION_FULL_SENSOR
  }

  @ReactMethod
  fun lockPortrait() {
    reactApplicationContext.currentActivity?.requestedOrientation =
      ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
  }
}
