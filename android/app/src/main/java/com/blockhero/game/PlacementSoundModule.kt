package com.blockhero.game

import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.SoundPool
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import kotlin.math.max
import kotlin.math.min

class PlacementSoundModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
  private data class PendingPlay(
    val volume: Float,
    val cooldownMs: Long,
    val allowOverlap: Boolean,
  )

  private data class SoundEntry(
    val path: String,
    val soundId: Int,
    var loaded: Boolean = false,
    var lastPlayAt: Long = 0L,
    var pendingPlay: PendingPlay? = null,
  )

  private val mainHandler = Handler(Looper.getMainLooper())
  private val audioAttributes = AudioAttributes.Builder()
    .setUsage(AudioAttributes.USAGE_GAME)
    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
    .build()
  private val soundPool: SoundPool = SoundPool.Builder()
    .setMaxStreams(8)
    .setAudioAttributes(audioAttributes)
    .build()
  private val soundEntriesByPath = LinkedHashMap<String, SoundEntry>()
  private val soundEntriesById = HashMap<Int, SoundEntry>()
  private val blockPlaceSoundId: Int
  private var blockPlaceLoaded = false
  private var blockPlaceLastPlayAt = 0L

  private var bgmPlayer: MediaPlayer? = null
  private var bgmPath: String? = null
  private var bgmBaseVolume = 0f

  init {
    blockPlaceSoundId = soundPool.load(reactContext, R.raw.block_place, 1)
    soundPool.setOnLoadCompleteListener { _, sampleId, status ->
      if (sampleId == blockPlaceSoundId && status == 0) {
        blockPlaceLoaded = true
        return@setOnLoadCompleteListener
      }

      val entry = soundEntriesById[sampleId] ?: return@setOnLoadCompleteListener
      if (status == 0) {
        entry.loaded = true
        entry.pendingPlay?.let { pending ->
          playLoadedEntry(entry, pending.volume, pending.cooldownMs, pending.allowOverlap)
        }
      }
      entry.pendingPlay = null
    }
  }

  override fun getName(): String = "PlacementSound"

  private fun clamp01(value: Double): Float {
    return min(1.0, max(0.0, value)).toFloat()
  }

  private fun normalizeFilePath(uri: String?): String? {
    val raw = uri?.trim() ?: return null
    if (raw.isEmpty()) return null
    return raw.removePrefix("file://")
  }

  private fun trimSoundCacheIfNeeded() {
    while (soundEntriesByPath.size > 24) {
      val firstKey = soundEntriesByPath.keys.firstOrNull() ?: return
      val entry = soundEntriesByPath.remove(firstKey) ?: return
      soundEntriesById.remove(entry.soundId)
      soundPool.unload(entry.soundId)
    }
  }

  private fun getOrLoadSound(path: String): SoundEntry? {
    if (!File(path).exists()) {
      return null
    }

    soundEntriesByPath[path]?.let { return it }
    trimSoundCacheIfNeeded()
    val soundId = soundPool.load(path, 1)
    val entry = SoundEntry(path = path, soundId = soundId)
    soundEntriesByPath[path] = entry
    soundEntriesById[soundId] = entry
    return entry
  }

  private fun playLoadedEntry(
    entry: SoundEntry,
    volume: Float,
    cooldownMs: Long,
    allowOverlap: Boolean,
  ) {
    val now = SystemClock.elapsedRealtime()
    if (cooldownMs > 0L && now - entry.lastPlayAt < cooldownMs) {
      return
    }
    if (!allowOverlap && now - entry.lastPlayAt < 160L) {
      return
    }

    entry.lastPlayAt = now
    soundPool.play(entry.soundId, volume, volume, 1, 0, 1.0f)
  }

  @ReactMethod
  fun playBlockPlace() {
    val now = SystemClock.elapsedRealtime()
    if (!blockPlaceLoaded || now - blockPlaceLastPlayAt < 35L) {
      return
    }

    blockPlaceLastPlayAt = now
    soundPool.play(blockPlaceSoundId, 0.8f, 0.8f, 1, 0, 1.0f)
  }

  @ReactMethod
  fun playSound(uri: String?, volume: Double, cooldownMs: Double, allowOverlap: Boolean) {
    val path = normalizeFilePath(uri)
    if (path == null) {
      playBlockPlace()
      return
    }

    val entry = getOrLoadSound(path) ?: return
    val nextVolume = clamp01(volume)
    val nextCooldownMs = max(0.0, cooldownMs).toLong()
    if (entry.loaded) {
      playLoadedEntry(entry, nextVolume, nextCooldownMs, allowOverlap)
    } else {
      entry.pendingPlay = PendingPlay(nextVolume, nextCooldownMs, allowOverlap)
    }
  }

  @ReactMethod
  fun playBgm(uri: String?, volume: Double, loop: Boolean, fadeInMs: Double) {
    val path = normalizeFilePath(uri)
    if (path == null || !File(path).exists()) {
      stopBgm(300.0)
      return
    }

    val nextVolume = clamp01(volume)
    if (bgmPath == path && bgmPlayer != null) {
      bgmBaseVolume = nextVolume
      bgmPlayer?.isLooping = loop
      bgmPlayer?.setVolume(nextVolume, nextVolume)
      return
    }

    releaseBgmPlayer()

    val player = MediaPlayer()
    bgmPlayer = player
    bgmPath = path
    bgmBaseVolume = nextVolume

    try {
      player.setAudioAttributes(
        AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_GAME)
          .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
          .build(),
      )
      player.isLooping = loop
      player.setDataSource(path)
      player.setOnPreparedListener {
        if (it !== bgmPlayer) {
          try {
            it.release()
          } catch (_error: Exception) {
          }
          return@setOnPreparedListener
        }
        val fadeMs = max(0.0, fadeInMs).toLong()
        if (fadeMs > 0L) {
          it.setVolume(0f, 0f)
          it.start()
          fadeBgmTo(it, nextVolume, fadeMs, null)
        } else {
          it.setVolume(nextVolume, nextVolume)
          it.start()
        }
      }
      player.setOnErrorListener { mp, _, _ ->
        if (mp === bgmPlayer) {
          releaseBgmPlayer()
        }
        true
      }
      player.prepareAsync()
    } catch (_error: Exception) {
      releaseBgmPlayer()
    }
  }

  @ReactMethod
  fun setBgmVolume(volume: Double) {
    val nextVolume = clamp01(volume)
    bgmBaseVolume = nextVolume
    bgmPlayer?.setVolume(nextVolume, nextVolume)
  }

  @ReactMethod
  fun stopBgm(fadeOutMs: Double) {
    val player = bgmPlayer ?: return
    val fadeMs = max(0.0, fadeOutMs).toLong()
    if (fadeMs > 0L && player.isPlaying) {
      fadeBgmTo(player, 0f, fadeMs) {
        if (player === bgmPlayer) {
          releaseBgmPlayer()
        }
      }
    } else {
      releaseBgmPlayer()
    }
  }

  private fun fadeBgmTo(
    player: MediaPlayer,
    targetVolume: Float,
    durationMs: Long,
    onEnd: (() -> Unit)?,
  ) {
    val startAt = SystemClock.elapsedRealtime()
    val startVolume = if (targetVolume > 0f) 0f else bgmBaseVolume
    val steps = 12
    for (step in 0..steps) {
      mainHandler.postDelayed({
        if (player !== bgmPlayer && targetVolume > 0f) {
          return@postDelayed
        }
        val t = step.toFloat() / steps.toFloat()
        val volume = startVolume + (targetVolume - startVolume) * t
        try {
          player.setVolume(volume, volume)
        } catch (_error: Exception) {
          return@postDelayed
        }
        if (step == steps || SystemClock.elapsedRealtime() - startAt >= durationMs) {
          onEnd?.invoke()
        }
      }, durationMs * step / steps)
    }
  }

  private fun releaseBgmPlayer() {
    try {
      bgmPlayer?.stop()
    } catch (_error: Exception) {
    }
    try {
      bgmPlayer?.release()
    } catch (_error: Exception) {
    }
    bgmPlayer = null
    bgmPath = null
    bgmBaseVolume = 0f
  }

  override fun invalidate() {
    releaseBgmPlayer()
    soundPool.release()
    super.invalidate()
  }
}
