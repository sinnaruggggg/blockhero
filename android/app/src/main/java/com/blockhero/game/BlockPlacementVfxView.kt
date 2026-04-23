package com.blockhero.game

import android.content.Context
import android.graphics.BlendMode
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.PorterDuff
import android.graphics.PorterDuffXfermode
import android.graphics.RadialGradient
import android.graphics.Shader
import android.os.Build
import android.view.Choreographer
import android.view.View
import com.facebook.react.bridge.ReadableArray
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow
import kotlin.math.sin
import kotlin.random.Random

class BlockPlacementVfxView(context: Context) : View(context), Choreographer.FrameCallback {
  private data class CellInput(
    val col: Int,
    val row: Int,
    val x: Float,
    val y: Float,
    val w: Float,
    val h: Float,
    val color: Int,
  )

  private data class ShapeCell(
    val col: Int,
    val row: Int,
    val x: Float,
    val y: Float,
    val w: Float,
    val h: Float,
    val radius: Float,
    val color: Int,
    val tOffset: Float,
  )

  private data class ShapeEffect(
    val cells: List<ShapeCell>,
    var age: Float,
    val life: Float,
  )

  private data class Spark(
    var x: Float,
    var y: Float,
    var vx: Float,
    var vy: Float,
    var age: Float,
    val life: Float,
    val size: Float,
    val hue: Float,
  )

  private data class Smoke(
    var x: Float,
    var y: Float,
    val vx: Float,
    val vy: Float,
    var age: Float,
    val life: Float,
    val size: Float,
  )

  private data class Ring(
    val x: Float,
    val y: Float,
    var age: Float,
    val life: Float,
    val radius: Float,
    val maxRadius: Float,
  )

  private val density = max(1f, resources.displayMetrics.density)
  private val dpr = density.coerceIn(1f, 2f)
  private val shapeEffects = mutableListOf<ShapeEffect>()
  private val sparks = mutableListOf<Spark>()
  private val smoke = mutableListOf<Smoke>()
  private val rings = mutableListOf<Ring>()
  private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
  private val random = Random(System.nanoTime())

  private var shake = 0f
  private var lastFrameNanos = 0L
  private var running = false

  init {
    setWillNotDraw(false)
    setLayerType(LAYER_TYPE_HARDWARE, null)
  }

  fun play(cellsArray: ReadableArray?) {
    val cells = parseCells(cellsArray)
    if (cells.isEmpty()) return

    val life = 0.85f
    val sparkCount = 14
    val smokeCount = 3
    val shakePower = 4.5f * dpr
    val ringLife = 0.42f
    val origin = cells.first()

    val entries = cells.map { cell ->
      ShapeCell(
        col = cell.col,
        row = cell.row,
        x = cell.x,
        y = cell.y,
        w = cell.w,
        h = cell.h,
        radius = min(cell.w, cell.h) * 0.14f,
        color = cell.color,
        tOffset =
          (hypot(
            (cell.col - origin.col).toDouble(),
            (cell.row - origin.row).toDouble(),
          ) * 0.03 + rand(0f, 0.03f)).toFloat(),
      )
    }

    shapeEffects.add(ShapeEffect(entries, 0f, life))

    entries.forEachIndexed { index, cell ->
      repeat(sparkCount) {
        val angle = rand(0f, (PI * 2).toFloat())
        val speed = rand(80f, 240f) * dpr

        sparks.add(
          Spark(
            x = cell.x + cos(angle) * rand(0f, cell.w * 0.18f),
            y = cell.y + sin(angle) * rand(0f, cell.h * 0.18f),
            vx = cos(angle) * speed,
            vy = sin(angle) * speed - rand(15f, 80f) * dpr,
            age = index * 0.008f,
            life = rand(0.25f, 0.55f),
            size = rand(1.8f, 4.5f) * dpr,
            hue = rand(52f, 88f),
          ),
        )
      }

      repeat(smokeCount) {
        smoke.add(
          Smoke(
            x = cell.x + rand(-cell.w * 0.12f, cell.w * 0.12f),
            y = cell.y + rand(-cell.h * 0.12f, cell.h * 0.12f),
            vx = rand(-18f, 18f) * dpr,
            vy = rand(-30f, -10f) * dpr,
            age = index * 0.012f,
            life = rand(0.45f, 0.85f),
            size = rand(cell.w * 0.22f, cell.w * 0.42f),
          ),
        )
      }
    }

    val center = getShapeCenter(cells)
    val first = cells.first()
    rings.add(
      Ring(
        x = center.first,
        y = center.second,
        age = 0f,
        life = ringLife,
        radius = first.w * 0.7f,
        maxRadius = first.w * 2.7f,
      ),
    )

    shake = max(shake, shakePower)
    startLoop()
  }

  override fun doFrame(frameTimeNanos: Long) {
    if (lastFrameNanos == 0L) {
      lastFrameNanos = frameTimeNanos
    }

    val dt = min(0.033f, (frameTimeNanos - lastFrameNanos) / 1_000_000_000f)
    lastFrameNanos = frameTimeNanos
    update(dt)
    invalidate()

    if (hasActiveEffects()) {
      Choreographer.getInstance().postFrameCallback(this)
    } else {
      running = false
      lastFrameNanos = 0L
    }
  }

  override fun onDraw(canvas: Canvas) {
    super.onDraw(canvas)
    if (!hasActiveEffects()) return

    val sx = (random.nextFloat() - 0.5f) * shake
    val sy = (random.nextFloat() - 0.5f) * shake

    canvas.save()
    canvas.translate(sx, sy)
    drawSmoke(canvas)
    drawShapeEffects(canvas)
    drawRings(canvas)
    drawSparks(canvas)
    canvas.restore()
  }

  override fun onDetachedFromWindow() {
    Choreographer.getInstance().removeFrameCallback(this)
    running = false
    super.onDetachedFromWindow()
  }

  private fun parseCells(cellsArray: ReadableArray?): List<CellInput> {
    if (cellsArray == null) return emptyList()
    val result = mutableListOf<CellInput>()

    for (i in 0 until cellsArray.size()) {
      val item = cellsArray.getMap(i) ?: continue
      val densityScale = density
      val color = parseColor(item.getString("color"))
      val width = readDouble(item, "width", 16.0).toFloat() * densityScale
      val height = readDouble(item, "height", 16.0).toFloat() * densityScale

      result.add(
        CellInput(
          col = readDouble(item, "col", 0.0).toInt(),
          row = readDouble(item, "row", 0.0).toInt(),
          x = readDouble(item, "x", 0.0).toFloat() * densityScale,
          y = readDouble(item, "y", 0.0).toFloat() * densityScale,
          w = width,
          h = height,
          color = color,
        ),
      )
    }

    return result
  }

  private fun readDouble(map: com.facebook.react.bridge.ReadableMap, key: String, fallback: Double): Double {
    return if (map.hasKey(key) && !map.isNull(key)) map.getDouble(key) else fallback
  }

  private fun parseColor(value: String?): Int {
    return try {
      Color.parseColor(value ?: "#c084fc")
    } catch (_: IllegalArgumentException) {
      Color.parseColor("#c084fc")
    }
  }

  private fun startLoop() {
    if (running) return
    running = true
    lastFrameNanos = 0L
    Choreographer.getInstance().postFrameCallback(this)
  }

  private fun hasActiveEffects(): Boolean {
    return shapeEffects.isNotEmpty() || sparks.isNotEmpty() || smoke.isNotEmpty() || rings.isNotEmpty() || shake > 0.2f
  }

  private fun update(dt: Float) {
    for (i in shapeEffects.size - 1 downTo 0) {
      val fx = shapeEffects[i]
      fx.age += dt
      if (fx.age >= fx.life) shapeEffects.removeAt(i)
    }

    for (i in sparks.size - 1 downTo 0) {
      val p = sparks[i]
      p.age += dt
      if (p.age >= p.life) {
        sparks.removeAt(i)
        continue
      }
      p.vx *= 0.96f
      p.vy = p.vy * 0.96f + 250f * dpr * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
    }

    for (i in smoke.size - 1 downTo 0) {
      val s = smoke[i]
      s.age += dt
      if (s.age >= s.life) {
        smoke.removeAt(i)
        continue
      }
      s.x += s.vx * dt
      s.y += s.vy * dt
    }

    for (i in rings.size - 1 downTo 0) {
      val ring = rings[i]
      ring.age += dt
      if (ring.age >= ring.life) rings.removeAt(i)
    }

    shake *= 0.86f
  }

  private fun drawShapeEffects(canvas: Canvas) {
    for (fx in shapeEffects.asReversed()) {
      for (cell in fx.cells) {
        val localT = clamp((fx.age - cell.tOffset) / (fx.life * 0.72f), 0f, 1f)
        if (localT <= 0f || localT >= 1f) continue

        val flash = 1f - localT
        val bloom = easeOutQuart(localT)

        canvas.save()

        val outerRadius = cell.w * (0.45f + bloom * 0.8f)
        paint.resetForVfx()
        paint.blendLighter()
        paint.shader =
          RadialGradient(
            cell.x,
            cell.y,
            outerRadius,
            intArrayOf(
              Color.argb((66f * flash).toInt(), 255, 255, 220),
              Color.argb((61f * flash).toInt(), 175, 255, 120),
              Color.argb(0, 80, 255, 100),
            ),
            floatArrayOf(0f, 0.25f, 1f),
            Shader.TileMode.CLAMP,
          )
        canvas.drawCircle(cell.x, cell.y, outerRadius, paint)

        paint.resetForVfx()
        paint.blendLighter()
        paint.shader =
          RadialGradient(
            cell.x,
            cell.y,
            cell.w * 0.38f,
            intArrayOf(
              Color.argb((96f * flash).toInt(), 255, 255, 230),
              Color.argb((28f * flash).toInt(), 210, 255, 150),
              Color.TRANSPARENT,
            ),
            floatArrayOf(0f, 0.45f, 1f),
            Shader.TileMode.CLAMP,
          )
        canvas.drawCircle(cell.x, cell.y, cell.w * 0.38f, paint)

        canvas.restore()
      }
    }
  }

  private fun drawSparks(canvas: Canvas) {
    for (p in sparks.asReversed()) {
      val t = p.age / p.life
      val alpha = (1f - t) * 0.95f
      val tailX = p.x - p.vx * 0.04f
      val tailY = p.y - p.vy * 0.04f

      paint.resetForVfx()
      paint.blendLighter()
      paint.style = Paint.Style.STROKE
      paint.strokeWidth = p.size
      paint.strokeCap = Paint.Cap.ROUND
      paint.color = hslToColor(p.hue, 1f, 0.78f, alpha)
      canvas.drawLine(p.x, p.y, tailX, tailY, paint)
    }
  }

  private fun drawSmoke(canvas: Canvas) {
    for (s in smoke.asReversed()) {
      val t = s.age / s.life
      val size = s.size * (0.9f + t * 1.1f)
      val alpha = (1f - t) * 0.1f

      paint.resetForVfx()
      paint.shader =
        RadialGradient(
          s.x,
          s.y,
          size,
          intArrayOf(
            Color.argb((255f * alpha).toInt(), 220, 255, 210),
            Color.argb((140f * alpha).toInt(), 90, 180, 110),
            Color.TRANSPARENT,
          ),
          floatArrayOf(0f, 0.4f, 1f),
          Shader.TileMode.CLAMP,
        )
      canvas.drawCircle(s.x, s.y, size, paint)
    }
  }

  private fun drawRings(canvas: Canvas) {
    for (r in rings.asReversed()) {
      val t = r.age / r.life
      val radius = lerp(r.radius, r.maxRadius, easeOutQuart(t))
      val alpha = (1f - t) * 0.38f

      paint.resetForVfx()
      paint.blendScreen()
      paint.style = Paint.Style.STROKE
      paint.strokeWidth = max(2f, r.radius * 0.12f * (1f - t))
      paint.color = Color.argb((255f * alpha).toInt(), 220, 255, 200)
      canvas.drawCircle(r.x, r.y, radius, paint)
    }
  }

  private fun getShapeCenter(cells: List<CellInput>): Pair<Float, Float> {
    val x = cells.sumOf { it.x.toDouble() }.toFloat() / cells.size
    val y = cells.sumOf { it.y.toDouble() }.toFloat() / cells.size
    return x to y
  }

  private fun rand(min: Float, max: Float): Float = random.nextFloat() * (max - min) + min

  private fun clamp(v: Float, a: Float, b: Float): Float = max(a, min(b, v))

  private fun lerp(a: Float, b: Float, t: Float): Float = a + (b - a) * t

  private fun easeOutQuart(t: Float): Float = 1f - (1f - t).pow(4)

  private fun hslToColor(h: Float, s: Float, l: Float, alpha: Float): Int {
    val c = (1f - abs(2f * l - 1f)) * s
    val hp = h / 60f
    val x = c * (1f - abs(hp % 2f - 1f))
    val (r1, g1, b1) =
      when {
        hp < 1f -> Triple(c, x, 0f)
        hp < 2f -> Triple(x, c, 0f)
        hp < 3f -> Triple(0f, c, x)
        hp < 4f -> Triple(0f, x, c)
        hp < 5f -> Triple(x, 0f, c)
        else -> Triple(c, 0f, x)
      }
    val m = l - c / 2f
    return Color.argb(
      (255f * alpha).toInt().coerceIn(0, 255),
      ((r1 + m) * 255f).toInt().coerceIn(0, 255),
      ((g1 + m) * 255f).toInt().coerceIn(0, 255),
      ((b1 + m) * 255f).toInt().coerceIn(0, 255),
    )
  }

  private fun Paint.resetForVfx() {
    reset()
    isAntiAlias = true
    shader = null
    maskFilter = null
    xfermode = null
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      blendMode = null
    }
  }

  private fun Paint.blendLighter() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      blendMode = BlendMode.PLUS
    } else {
      @Suppress("DEPRECATION")
      xfermode = PorterDuffXfermode(PorterDuff.Mode.ADD)
    }
  }

  private fun Paint.blendScreen() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      blendMode = BlendMode.SCREEN
    } else {
      @Suppress("DEPRECATION")
      xfermode = PorterDuffXfermode(PorterDuff.Mode.SCREEN)
    }
  }
}
