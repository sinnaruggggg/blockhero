package com.blockhero.game

import android.media.AudioAttributes
import android.media.SoundPool
import android.os.SystemClock
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class PlacementSoundModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
  private val soundPool: SoundPool
  private val blockPlaceSoundId: Int
  private var blockPlaceLoaded = false
  private var lastPlayAt = 0L

  init {
    val attributes = AudioAttributes.Builder()
      .setUsage(AudioAttributes.USAGE_GAME)
      .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
      .build()

    soundPool = SoundPool.Builder()
      .setMaxStreams(4)
      .setAudioAttributes(attributes)
      .build()

    blockPlaceSoundId = soundPool.load(reactContext, R.raw.block_place, 1)
    soundPool.setOnLoadCompleteListener { _, sampleId, status ->
      if (sampleId == blockPlaceSoundId && status == 0) {
        blockPlaceLoaded = true
      }
    }
  }

  override fun getName(): String = "PlacementSound"

  @ReactMethod
  fun playBlockPlace() {
    val now = SystemClock.elapsedRealtime()
    if (!blockPlaceLoaded || now - lastPlayAt < 35L) {
      return
    }

    lastPlayAt = now
    soundPool.play(blockPlaceSoundId, 0.8f, 0.8f, 1, 0, 1.0f)
  }

  override fun invalidate() {
    soundPool.release()
    super.invalidate()
  }
}
