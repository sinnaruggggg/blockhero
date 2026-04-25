package com.blockhero.game

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.Typeface
import android.view.Choreographer
import android.view.MotionEvent
import android.view.View
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.uimanager.events.RCTEventEmitter
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin
import kotlin.math.sqrt

class VoxelWorldView(context: Context) : View(context), Choreographer.FrameCallback {
  private data class ProjectedFace(
    val points: FloatArray,
    val depth: Float,
    val color: Int,
    val block: Int,
    val face: Int,
    val worldX: Int,
    val worldY: Int,
    val worldZ: Int,
    val selected: Boolean,
  )

  private data class RayHit(
    val x: Int,
    val y: Int,
    val z: Int,
    val placeX: Int,
    val placeY: Int,
    val placeZ: Int,
  )

  private val density = max(1f, resources.displayMetrics.density)
  private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
  private val path = Path()
  private val controlRect = RectF()
  private val faces = ArrayList<ProjectedFace>(2500)
  private val projected = FloatArray(12)
  private val skyProjected = FloatArray(3)
  private val blocks = ByteArray(WORLD_WIDTH * WORLD_HEIGHT * WORLD_DEPTH)

  private var cameraX = 16.5f
  private var cameraY = 5.8f
  private var cameraZ = 22.5f
  private var yaw = PI.toFloat()
  private var pitch = -0.08f
  private var propMoveX = 0f
  private var propMoveZ = 0f
  private var nativeMoveX = 0f
  private var nativeMoveZ = 0f
  private var turn = 0f
  private var look = 0f
  private var selectedBlock = PLANK
  private var selectedTool = TOOL_NONE
  private var selectedToolPowerMultiplier = 0f
  private var selectedToolDurability = 0
  private var selectedToolMaxDurability = 0
  private var target: RayHit? = null
  private var attached = false
  private var lastFrameNanos = 0L
  private var mineDeniedUntilNanos = 0L
  private var mineDeniedMessage = MINE_DENIED_TOOL_LABEL
  private var mineProgressUntilNanos = 0L
  private var lastMineProgress = 0f
  private var lastMineRequired = 1f
  private var activeAction = ACTION_NONE
  private var activeActionUntilNanos = 0L
  private var dragPointerId = MotionEvent.INVALID_POINTER_ID
  private val activeMovePointers = mutableMapOf<Int, Int>()
  private val blockDamage = mutableMapOf<Int, Float>()
  private var lastTouchX = 0f
  private var lastTouchY = 0f

  init {
    setWillNotDraw(false)
    setLayerType(LAYER_TYPE_HARDWARE, null)
    resetWorld()
  }

  fun setMoveX(value: Float) {
    propMoveX = value.coerceIn(-1f, 1f)
  }

  fun setMoveZ(value: Float) {
    propMoveZ = value.coerceIn(-1f, 1f)
  }

  fun setTurn(value: Float) {
    turn = value.coerceIn(-1f, 1f)
  }

  fun setLook(value: Float) {
    look = value.coerceIn(-1f, 1f)
  }

  fun setSelectedBlock(value: String?) {
    selectedBlock = when (value) {
      "grass" -> GRASS
      "dirt" -> DIRT
      "stone" -> STONE
      "wood" -> WOOD
      "leaves" -> LEAVES
      "iron_ore" -> IRON_ORE
      "plank" -> PLANK
      "workbench" -> WORKBENCH
      "furnace" -> FURNACE
      "door" -> DOOR
      "chair" -> CHAIR
      else -> PLANK
    }
  }

  fun setSelectedTool(value: String?) {
    selectedTool = when (value) {
      "shovel" -> TOOL_SHOVEL
      "axe" -> TOOL_AXE
      "pickaxe" -> TOOL_PICKAXE
      else -> TOOL_NONE
    }
  }

  fun setSelectedToolPowerMultiplier(value: Float) {
    selectedToolPowerMultiplier = value.coerceIn(0f, 10f)
  }

  fun setSelectedToolDurability(value: Int) {
    selectedToolDurability = value.coerceAtLeast(0)
  }

  fun setSelectedToolMaxDurability(value: Int) {
    selectedToolMaxDurability = value.coerceAtLeast(0)
    if (selectedToolDurability > selectedToolMaxDurability) {
      selectedToolDurability = selectedToolMaxDurability
    }
  }

  fun mineTarget() {
    val hit = target ?: return
    if (!inside(hit.x, hit.y, hit.z)) return
    val block = getBlock(hit.x, hit.y, hit.z)
    if (block == AIR) return
    if (!canMineBlock(block)) {
      mineDeniedMessage = MINE_DENIED_TOOL_LABEL
      mineDeniedUntilNanos = System.nanoTime() + 1_200_000_000L
      invalidate()
      return
    }
    if (selectedToolDurability <= 0) {
      mineDeniedMessage = MINE_DENIED_DURABILITY_LABEL
      mineDeniedUntilNanos = System.nanoTime() + 1_200_000_000L
      invalidate()
      return
    }

    val key = index(hit.x, hit.y, hit.z)
    val requiredHits = blockMineRequirement(block)
    val damage = selectedToolPowerMultiplier.coerceAtLeast(0.2f)
    val nextProgress = (blockDamage[key] ?: 0f) + damage
    selectedToolDurability = (selectedToolDurability - 1).coerceAtLeast(0)
    emitToolDurabilityChanged()

    if (nextProgress >= requiredHits) {
      blockDamage.remove(key)
      setBlock(hit.x, hit.y, hit.z, AIR)
      updateTarget()
    } else {
      blockDamage[key] = nextProgress
      lastMineProgress = nextProgress
      lastMineRequired = requiredHits
      mineProgressUntilNanos = System.nanoTime() + 850_000_000L
    }
    invalidate()
  }

  fun placeTarget() {
    val hit = target ?: return
    if (!inside(hit.placeX, hit.placeY, hit.placeZ)) return
    if (getBlock(hit.placeX, hit.placeY, hit.placeZ) != AIR) return
    if (intersectsPlayer(hit.placeX, hit.placeY, hit.placeZ)) return

    setBlock(hit.placeX, hit.placeY, hit.placeZ, selectedBlock)
    updateTarget()
    invalidate()
  }

  fun resetWorldAndPlayer() {
    resetWorld()
    invalidate()
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    attached = true
    lastFrameNanos = 0L
    Choreographer.getInstance().postFrameCallback(this)
  }

  override fun onDetachedFromWindow() {
    attached = false
    Choreographer.getInstance().removeFrameCallback(this)
    super.onDetachedFromWindow()
  }

  override fun doFrame(frameTimeNanos: Long) {
    if (!attached) return

    val dt =
      if (lastFrameNanos == 0L) 0.016f
      else ((frameTimeNanos - lastFrameNanos) / 1_000_000_000f).coerceIn(0.001f, 0.05f)

    lastFrameNanos = frameTimeNanos
    updateCamera(dt)
    invalidate()
    Choreographer.getInstance().postFrameCallback(this)
  }

  override fun onDraw(canvas: Canvas) {
    super.onDraw(canvas)
    drawSky(canvas)
    drawWorld(canvas)
    drawCrosshair(canvas)
    drawHud(canvas)
    drawNativeMovePad(canvas)
    drawNativeActionPad(canvas)
  }

  override fun onTouchEvent(event: MotionEvent): Boolean {
    when (event.actionMasked) {
      MotionEvent.ACTION_DOWN -> {
        parent?.requestDisallowInterceptTouchEvent(true)
        handlePointerDown(event, 0)
        return true
      }

      MotionEvent.ACTION_POINTER_DOWN -> {
        handlePointerDown(event, event.actionIndex)
        return true
      }

      MotionEvent.ACTION_MOVE -> {
        updateNativeMovePointers(event)

        val dragPointerIndex = event.findPointerIndex(dragPointerId)
        if (dragPointerIndex >= 0) {
          val x = event.getX(dragPointerIndex)
          val y = event.getY(dragPointerIndex)
          val dx = x - lastTouchX
          val dy = y - lastTouchY
          lastTouchX = x
          lastTouchY = y

          yaw += dx * DRAG_YAW_SPEED
          pitch = (pitch - dy * DRAG_PITCH_SPEED).coerceIn(MIN_PITCH, MAX_PITCH)
          updateTarget()
          invalidate()
        }
        return true
      }

      MotionEvent.ACTION_POINTER_UP -> {
        val pointerId = event.getPointerId(event.actionIndex)
        if (activeMovePointers.remove(pointerId) != null) {
          recalculateNativeMove()
        }
        if (pointerId == dragPointerId) {
          assignFallbackDragPointer(event)
        }
        return true
      }

      MotionEvent.ACTION_UP,
      MotionEvent.ACTION_CANCEL -> {
        dragPointerId = MotionEvent.INVALID_POINTER_ID
        clearNativeMove()
        parent?.requestDisallowInterceptTouchEvent(false)
        return true
      }
    }

    return true
  }

  private fun handlePointerDown(event: MotionEvent, index: Int) {
    val pointerId = event.getPointerId(index)
    val x = event.getX(index)
    val y = event.getY(index)

    val moveDirection = hitNativeMovePad(x, y)
    if (moveDirection != MOVE_NONE) {
      activeMovePointers[pointerId] = moveDirection
      recalculateNativeMove()
      invalidate()
      return
    }

    val action = hitNativeActionPad(x, y)
    if (action != ACTION_NONE) {
      performNativeAction(action)
      return
    }

    if (dragPointerId == MotionEvent.INVALID_POINTER_ID) {
      dragPointerId = pointerId
      lastTouchX = x
      lastTouchY = y
    }
  }

  private fun assignFallbackDragPointer(event: MotionEvent) {
    dragPointerId = MotionEvent.INVALID_POINTER_ID
    for (i in 0 until event.pointerCount) {
      if (i == event.actionIndex) {
        continue
      }
      val pointerId = event.getPointerId(i)
      if (activeMovePointers.containsKey(pointerId)) {
        continue
      }
      dragPointerId = pointerId
      lastTouchX = event.getX(i)
      lastTouchY = event.getY(i)
      return
    }
  }

  private fun updateNativeMovePointers(event: MotionEvent) {
    if (activeMovePointers.isEmpty()) {
      return
    }

    val pointerIds = activeMovePointers.keys.toList()
    for (pointerId in pointerIds) {
      val pointerIndex = event.findPointerIndex(pointerId)
      if (pointerIndex < 0) {
        activeMovePointers.remove(pointerId)
        continue
      }
      activeMovePointers[pointerId] =
        hitNativeMovePad(event.getX(pointerIndex), event.getY(pointerIndex))
    }
    recalculateNativeMove()
  }

  private fun clearNativeMove() {
    activeMovePointers.clear()
    recalculateNativeMove()
  }

  private fun recalculateNativeMove() {
    var nextMoveX = 0f
    var nextMoveZ = 0f

    activeMovePointers.values.forEach { direction ->
      when (direction) {
        MOVE_UP -> nextMoveZ += 1f
        MOVE_DOWN -> nextMoveZ -= 1f
        MOVE_LEFT -> nextMoveX -= 1f
        MOVE_RIGHT -> nextMoveX += 1f
      }
    }

    nativeMoveX = nextMoveX.coerceIn(-1f, 1f)
    nativeMoveZ = nextMoveZ.coerceIn(-1f, 1f)
  }

  private fun resetWorld() {
    blocks.fill(AIR.toByte())
    blockDamage.clear()

    for (x in 0 until WORLD_WIDTH) {
      for (z in 0 until WORLD_DEPTH) {
        val wave =
          sin(x * 0.23f).toFloat() * 1.2f +
            cos(z * 0.19f).toFloat() * 1.0f +
            sin((x + z) * 0.09f).toFloat() * 1.1f +
            cos((x - z) * 0.07f).toFloat() * 0.8f
        val surface = (4 + floor(wave).toInt()).coerceIn(2, 8)

        for (y in 0..surface) {
          val type =
            when {
              y == surface -> GRASS
              y >= surface - 2 -> DIRT
              ((x * 37 + y * 19 + z * 31) % 53 == 0) -> IRON_ORE
              else -> STONE
            }
          setBlock(x, y, z, type)
        }
      }
    }

    for (x in 5 until WORLD_WIDTH - 5 step 4) {
      for (z in 5 until WORLD_DEPTH - 5 step 4) {
        val hash = (x * 73 + z * 41 + x * z * 7) % 29
        if (hash == 0 || hash == 6) {
          placeTree(x, z)
        }
      }
    }
    placeStarterHouse()

    cameraX = WORLD_WIDTH * 0.5f + 0.5f
    cameraZ = WORLD_DEPTH * 0.5f + 10.5f
    cameraY = surfaceTopAt(cameraX, cameraZ) + EYE_HEIGHT
    yaw = PI.toFloat()
    pitch = -0.08f
    updateTarget()
  }

  private fun placeTree(x: Int, z: Int) {
    val baseY = highestSolidY(x, z) + 1
    if (baseY < 1 || baseY + 5 >= WORLD_HEIGHT) return

    for (y in baseY until baseY + 4) {
      setBlock(x, y, z, WOOD)
    }

    for (lx in x - 2..x + 2) {
      for (lz in z - 2..z + 2) {
        for (ly in baseY + 3..baseY + 5) {
          val distance = kotlin.math.abs(lx - x) + kotlin.math.abs(lz - z) + max(0, ly - (baseY + 4))
          if (distance <= 4 && inside(lx, ly, lz)) {
            setBlock(lx, ly, lz, LEAVES)
          }
        }
      }
    }
  }

  private fun placeStarterHouse() {
    val centerX = WORLD_WIDTH / 2
    val centerZ = WORLD_DEPTH / 2 - 7
    val minX = centerX - 3
    val maxX = centerX + 3
    val minZ = centerZ - 3
    val maxZ = centerZ + 3
    val floorY = highestSolidY(centerX, centerZ).coerceAtLeast(4)

    for (x in minX..maxX) {
      for (z in minZ..maxZ) {
        for (y in floorY + 1 until WORLD_HEIGHT) {
          setBlock(x, y, z, AIR)
        }
        setBlock(x, floorY, z, PLANK)
      }
    }

    for (x in minX..maxX) {
      for (z in minZ..maxZ) {
        val wall = x == minX || x == maxX || z == minZ || z == maxZ
        if (!wall) continue

        for (y in floorY + 1..floorY + 3) {
          val doorway = z == maxZ && x == centerX && y <= floorY + 2
          if (!doorway) {
            setBlock(x, y, z, WOOD)
          }
        }
      }
    }

    for (x in minX - 1..maxX + 1) {
      for (z in minZ - 1..maxZ + 1) {
        setBlock(x, floorY + 4, z, STONE)
      }
    }

    setBlock(centerX, floorY + 1, maxZ, DOOR)
    setBlock(centerX - 2, floorY + 1, centerZ - 1, WORKBENCH)
    setBlock(centerX + 2, floorY + 1, centerZ - 1, FURNACE)
    setBlock(centerX, floorY + 1, centerZ, CHAIR)
  }

  private fun updateCamera(dt: Float) {
    yaw += turn * TURN_SPEED * dt
    pitch = (pitch + look * LOOK_SPEED * dt).coerceIn(MIN_PITCH, MAX_PITCH)

    var forward = (propMoveZ + nativeMoveZ).coerceIn(-1f, 1f)
    var strafe = (propMoveX + nativeMoveX).coerceIn(-1f, 1f)
    val length = sqrt(forward * forward + strafe * strafe)
    if (length > 1f) {
      forward /= length
      strafe /= length
    }

    if (forward != 0f || strafe != 0f) {
      val sinYaw = sin(yaw)
      val cosYaw = cos(yaw)
      val speed = WALK_SPEED * dt
      val dx = (sinYaw * forward + cosYaw * strafe) * speed
      val dz = (cosYaw * forward - sinYaw * strafe) * speed
      tryMove(dx, dz)
    }

    val targetY = surfaceTopAt(cameraX, cameraZ) + EYE_HEIGHT
    cameraY += (targetY - cameraY) * min(1f, dt * 9f)
    updateTarget()
  }

  private fun tryMove(dx: Float, dz: Float) {
    val nextX = cameraX + dx
    if (canStandAt(nextX, cameraZ)) {
      cameraX = nextX.coerceIn(1.2f, WORLD_WIDTH - 1.2f)
    }

    val nextZ = cameraZ + dz
    if (canStandAt(cameraX, nextZ)) {
      cameraZ = nextZ.coerceIn(1.2f, WORLD_DEPTH - 1.2f)
    }
  }

  private fun canStandAt(x: Float, z: Float): Boolean {
    val surface = surfaceTopAt(x, z)
    val current = surfaceTopAt(cameraX, cameraZ)
    return surface > 0f && surface - current <= 1.05f
  }

  private fun updateTarget() {
    val cosPitch = cos(pitch)
    val dirX = sin(yaw) * cosPitch
    val dirY = sin(pitch)
    val dirZ = cos(yaw) * cosPitch

    var lastAirX = floor(cameraX).toInt()
    var lastAirY = floor(cameraY).toInt()
    var lastAirZ = floor(cameraZ).toInt()

    var distance = 0.15f
    while (distance <= ACTION_REACH) {
      val wx = cameraX + dirX * distance
      val wy = cameraY + dirY * distance
      val wz = cameraZ + dirZ * distance
      val bx = floor(wx).toInt()
      val by = floor(wy).toInt()
      val bz = floor(wz).toInt()

      if (inside(bx, by, bz)) {
        if (getBlock(bx, by, bz) != AIR) {
          target = RayHit(bx, by, bz, lastAirX, lastAirY, lastAirZ)
          return
        }
        lastAirX = bx
        lastAirY = by
        lastAirZ = bz
      }

      distance += 0.12f
    }

    target = null
  }

  private fun drawSky(canvas: Canvas) {
    canvas.drawColor(Color.rgb(121, 176, 232))
    paint.style = Paint.Style.FILL
    paint.color = Color.rgb(183, 219, 252)
    val hazeTop = (height * (0.52f + pitch * 0.28f)).coerceIn(height * 0.16f, height * 0.92f)
    canvas.drawRect(0f, hazeTop, width.toFloat(), height.toFloat(), paint)

    drawSunDirection(canvas, -0.38f, 0.54f, -0.76f)
    drawCloudDirection(canvas, -0.78f, 0.36f, -0.50f, 1.1f)
    drawCloudDirection(canvas, 0.18f, 0.50f, -0.84f, 0.86f)
    drawCloudDirection(canvas, 0.72f, 0.42f, 0.32f, 0.95f)
  }

  private fun drawSunDirection(
    canvas: Canvas,
    dirX: Float,
    dirY: Float,
    dirZ: Float,
  ) {
    if (!projectSkyDirection(dirX, dirY, dirZ, skyProjected)) {
      return
    }

    val sunX = skyProjected[0]
    val sunY = skyProjected[1]
    val depth = skyProjected[2].coerceIn(0.18f, 1f)
    val sunRadius = 28f * density * (0.74f + depth * 0.34f)
    paint.style = Paint.Style.FILL
    paint.color = Color.argb(58, 255, 241, 142)
    canvas.drawCircle(sunX, sunY, sunRadius * 1.75f, paint)
    paint.color = Color.rgb(255, 226, 87)
    canvas.drawCircle(sunX, sunY, sunRadius, paint)
    paint.color = Color.rgb(255, 246, 168)
    canvas.drawCircle(sunX - sunRadius * 0.28f, sunY - sunRadius * 0.28f, sunRadius * 0.34f, paint)
  }

  private fun drawCloudDirection(
    canvas: Canvas,
    dirX: Float,
    dirY: Float,
    dirZ: Float,
    scale: Float,
  ) {
    if (!projectSkyDirection(dirX, dirY, dirZ, skyProjected)) {
      return
    }

    val margin = 90f * density * scale
    if (
      skyProjected[0] < -margin ||
        skyProjected[0] > width + margin ||
        skyProjected[1] < -margin ||
        skyProjected[1] > height + margin
    ) {
      return
    }

    drawCloud(canvas, skyProjected[0], skyProjected[1], scale)
  }

  private fun drawCloud(canvas: Canvas, cx: Float, cy: Float, scale: Float) {
    paint.style = Paint.Style.FILL
    paint.color = Color.argb(60, 75, 112, 154)
    canvas.drawCircle(cx - 22f * density * scale, cy + 6f * density * scale, 18f * density * scale, paint)
    canvas.drawCircle(cx + 8f * density * scale, cy + 7f * density * scale, 24f * density * scale, paint)
    canvas.drawCircle(cx + 34f * density * scale, cy + 8f * density * scale, 17f * density * scale, paint)

    paint.color = Color.argb(218, 248, 252, 255)
    canvas.drawCircle(cx - 24f * density * scale, cy, 18f * density * scale, paint)
    canvas.drawCircle(cx, cy - 7f * density * scale, 25f * density * scale, paint)
    canvas.drawCircle(cx + 27f * density * scale, cy, 19f * density * scale, paint)
    canvas.drawCircle(cx + 51f * density * scale, cy + 4f * density * scale, 13f * density * scale, paint)
  }

  private fun projectSkyDirection(
    dirX: Float,
    dirY: Float,
    dirZ: Float,
    out: FloatArray,
  ): Boolean {
    val length = sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ)
    if (length <= 0.0001f) {
      return false
    }

    val dx = dirX / length
    val dy = dirY / length
    val dz = dirZ / length
    val sinYaw = sin(yaw)
    val cosYaw = cos(yaw)
    val cameraSpaceX = cosYaw * dx - sinYaw * dz
    val cameraSpaceZ = sinYaw * dx + cosYaw * dz
    val sinPitch = sin(pitch)
    val cosPitch = cos(pitch)
    val cameraSpaceY = cosPitch * dy - sinPitch * cameraSpaceZ
    val cameraSpaceDepth = sinPitch * dy + cosPitch * cameraSpaceZ

    if (cameraSpaceDepth <= 0.08f) {
      return false
    }

    val focal = width * 0.62f
    out[0] = width * 0.5f + cameraSpaceX * focal / cameraSpaceDepth
    out[1] = height * 0.48f - cameraSpaceY * focal / cameraSpaceDepth
    out[2] = cameraSpaceDepth
    return true
  }

  private fun drawWorld(canvas: Canvas) {
    faces.clear()

    val cameraBlockX = floor(cameraX).toInt()
    val cameraBlockZ = floor(cameraZ).toInt()
    val minX = max(0, cameraBlockX - RENDER_RADIUS)
    val maxX = min(WORLD_WIDTH - 1, cameraBlockX + RENDER_RADIUS)
    val minZ = max(0, cameraBlockZ - RENDER_RADIUS)
    val maxZ = min(WORLD_DEPTH - 1, cameraBlockZ + RENDER_RADIUS)
    val hit = target

    for (x in minX..maxX) {
      for (z in minZ..maxZ) {
        for (y in 0 until WORLD_HEIGHT) {
          val block = getBlock(x, y, z)
          if (block == AIR) continue

          val selected = hit?.let { it.x == x && it.y == y && it.z == z } == true
          if (getBlock(x, y + 1, z) == AIR) {
            addFace(x, y, z, block, TOP_FACE, 1.05f, selected)
          }
          if (getBlock(x, y, z - 1) == AIR) {
            addFace(x, y, z, block, NORTH_FACE, 0.72f, selected)
          }
          if (getBlock(x, y, z + 1) == AIR) {
            addFace(x, y, z, block, SOUTH_FACE, 0.88f, selected)
          }
          if (getBlock(x - 1, y, z) == AIR) {
            addFace(x, y, z, block, WEST_FACE, 0.78f, selected)
          }
          if (getBlock(x + 1, y, z) == AIR) {
            addFace(x, y, z, block, EAST_FACE, 0.66f, selected)
          }
        }
      }
    }

    faces.sortByDescending { it.depth }

    for (face in faces) {
      path.reset()
      path.moveTo(face.points[0], face.points[1])
      path.lineTo(face.points[3], face.points[4])
      path.lineTo(face.points[6], face.points[7])
      path.lineTo(face.points[9], face.points[10])
      path.close()

      paint.style = Paint.Style.FILL
      paint.color = face.color
      canvas.drawPath(path, paint)

      if (face.depth < TEXTURE_DISTANCE) {
        drawFaceTexture(canvas, face, path)
      }

      paint.style = Paint.Style.STROKE
      paint.strokeWidth = 0.8f * density
      paint.color = shade(face.color, 0.7f)
      canvas.drawPath(path, paint)

      if (face.selected) {
        paint.strokeWidth = 2.4f * density
        paint.color = Color.rgb(255, 226, 92)
        canvas.drawPath(path, paint)
      }
    }
  }

  private fun addFace(
    x: Int,
    y: Int,
    z: Int,
    block: Int,
    face: Int,
    shade: Float,
    selected: Boolean,
  ) {
    val vertices = FACE_VERTICES[face]
    var depthTotal = 0f

    for (i in 0 until 4) {
      val vx = x + vertices[i * 3]
      val vy = y + vertices[i * 3 + 1]
      val vz = z + vertices[i * 3 + 2]
      if (!project(vx, vy, vz, projected, i * 3)) {
        return
      }
      depthTotal += projected[i * 3 + 2]
    }

    val depth = depthTotal / 4f
    if (depth > RENDER_DISTANCE) return

    val points = FloatArray(12)
    for (i in projected.indices) {
      points[i] = projected[i]
    }

    val fog = (1f - depth / RENDER_DISTANCE).coerceIn(0.18f, 1f)
    val color = fogToSky(shade(blockColor(block), shade), fog)
    faces.add(ProjectedFace(points, depth, color, block, face, x, y, z, selected))
  }

  private fun project(
    wx: Float,
    wy: Float,
    wz: Float,
    out: FloatArray,
    offset: Int,
  ): Boolean {
    val dx = wx - cameraX
    val dy = wy - cameraY
    val dz = wz - cameraZ
    val sinYaw = sin(yaw)
    val cosYaw = cos(yaw)
    val cameraSpaceX = cosYaw * dx - sinYaw * dz
    val cameraSpaceZ = sinYaw * dx + cosYaw * dz
    val sinPitch = sin(pitch)
    val cosPitch = cos(pitch)
    val cameraSpaceY = cosPitch * dy - sinPitch * cameraSpaceZ
    val cameraSpaceDepth = sinPitch * dy + cosPitch * cameraSpaceZ

    if (cameraSpaceDepth <= NEAR_PLANE) {
      return false
    }

    val focal = width * 0.78f
    val centerY = height * 0.48f
    out[offset] = width * 0.5f + cameraSpaceX * focal / cameraSpaceDepth
    out[offset + 1] = centerY - cameraSpaceY * focal / cameraSpaceDepth
    out[offset + 2] = cameraSpaceDepth
    return true
  }

  private fun drawFaceTexture(canvas: Canvas, face: ProjectedFace, clipPath: Path) {
    val left = minOf(face.points[0], face.points[3], face.points[6], face.points[9])
    val right = maxOf(face.points[0], face.points[3], face.points[6], face.points[9])
    val top = minOf(face.points[1], face.points[4], face.points[7], face.points[10])
    val bottom = maxOf(face.points[1], face.points[4], face.points[7], face.points[10])
    val w = right - left
    val h = bottom - top
    if (w < 5f || h < 5f) {
      return
    }

    canvas.save()
    canvas.clipPath(clipPath)
    when (face.block) {
      GRASS -> drawGrassTexture(canvas, face, left, top, right, bottom)
      DIRT -> drawDirtTexture(canvas, face, left, top, right, bottom)
      STONE -> drawStoneTexture(canvas, face, left, top, right, bottom)
      WOOD -> drawWoodTexture(canvas, face, left, top, right, bottom)
      LEAVES -> drawLeavesTexture(canvas, face, left, top, right, bottom)
      IRON_ORE -> drawIronOreTexture(canvas, face, left, top, right, bottom)
      PLANK, WORKBENCH, DOOR, CHAIR -> drawPlankTexture(canvas, face, left, top, right, bottom)
      FURNACE -> drawFurnaceTexture(canvas, face, left, top, right, bottom)
    }
    canvas.restore()
  }

  private fun drawGrassTexture(
    canvas: Canvas,
    face: ProjectedFace,
    left: Float,
    top: Float,
    right: Float,
    bottom: Float,
  ) {
    if (face.face == TOP_FACE) {
      paint.style = Paint.Style.STROKE
      paint.strokeWidth = 1f * density
      paint.color = Color.argb(92, 217, 255, 136)
      drawSeededStrokes(canvas, face, left, top, right, bottom, 7, 4f, -5f)
      paint.color = Color.argb(78, 35, 111, 47)
      drawSeededDots(canvas, face, left, top, right, bottom, 8, 1.2f * density)
    } else {
      paint.style = Paint.Style.FILL
      paint.color = Color.argb(110, 65, 42, 25)
      val stripeHeight = ((bottom - top) * 0.24f).coerceAtLeast(3f)
      canvas.drawRect(left, top + stripeHeight, right, bottom, paint)
      paint.color = Color.argb(95, 43, 131, 49)
      drawSeededDots(canvas, face, left, top, right, top + stripeHeight, 5, 1.1f * density)
    }
  }

  private fun drawDirtTexture(
    canvas: Canvas,
    face: ProjectedFace,
    left: Float,
    top: Float,
    right: Float,
    bottom: Float,
  ) {
    paint.style = Paint.Style.FILL
    paint.color = Color.argb(82, 86, 48, 26)
    drawSeededDots(canvas, face, left, top, right, bottom, 13, 1.4f * density)
    paint.color = Color.argb(74, 176, 116, 70)
    drawSeededDots(canvas, face, left, top, right, bottom, 6, 1.0f * density)
  }

  private fun drawStoneTexture(
    canvas: Canvas,
    face: ProjectedFace,
    left: Float,
    top: Float,
    right: Float,
    bottom: Float,
  ) {
    paint.style = Paint.Style.STROKE
    paint.strokeWidth = 1f * density
    paint.color = Color.argb(86, 64, 69, 78)
    drawSeededStrokes(canvas, face, left, top, right, bottom, 5, 8f, 7f)
    paint.color = Color.argb(50, 208, 216, 226)
    drawSeededStrokes(canvas, face, left, top, right, bottom, 3, 5f, -4f)
  }

  private fun drawWoodTexture(
    canvas: Canvas,
    face: ProjectedFace,
    left: Float,
    top: Float,
    right: Float,
    bottom: Float,
  ) {
    paint.style = Paint.Style.STROKE
    paint.strokeWidth = 1.1f * density
    paint.color = Color.argb(98, 76, 43, 18)

    if (face.face == TOP_FACE) {
      val cx = (left + right) * 0.5f
      val cy = (top + bottom) * 0.5f
      val maxRadius = min(right - left, bottom - top) * 0.42f
      canvas.drawCircle(cx, cy, maxRadius * 0.35f, paint)
      canvas.drawCircle(cx, cy, maxRadius * 0.62f, paint)
      canvas.drawCircle(cx, cy, maxRadius * 0.88f, paint)
    } else {
      val step = ((right - left) / 4f).coerceAtLeast(6f)
      var x = left + step * 0.6f
      while (x < right) {
        canvas.drawLine(x, top, x + step * 0.18f, bottom, paint)
        x += step
      }
    }
  }

  private fun drawLeavesTexture(
    canvas: Canvas,
    face: ProjectedFace,
    left: Float,
    top: Float,
    right: Float,
    bottom: Float,
  ) {
    paint.style = Paint.Style.FILL
    paint.color = Color.argb(86, 29, 94, 45)
    drawSeededDots(canvas, face, left, top, right, bottom, 11, 1.8f * density)
    paint.color = Color.argb(76, 115, 205, 95)
    drawSeededDots(canvas, face, left, top, right, bottom, 8, 1.3f * density)
  }

  private fun drawIronOreTexture(
    canvas: Canvas,
    face: ProjectedFace,
    left: Float,
    top: Float,
    right: Float,
    bottom: Float,
  ) {
    drawStoneTexture(canvas, face, left, top, right, bottom)
    paint.style = Paint.Style.FILL
    paint.color = Color.argb(160, 210, 143, 92)
    drawSeededDots(canvas, face, left, top, right, bottom, 6, 1.9f * density)
    paint.color = Color.argb(110, 236, 203, 168)
    drawSeededDots(canvas, face, left, top, right, bottom, 3, 1.1f * density)
  }

  private fun drawPlankTexture(
    canvas: Canvas,
    face: ProjectedFace,
    left: Float,
    top: Float,
    right: Float,
    bottom: Float,
  ) {
    paint.style = Paint.Style.STROKE
    paint.strokeWidth = 1f * density
    paint.color = Color.argb(92, 91, 52, 23)

    val rowStep = ((bottom - top) / 3f).coerceAtLeast(6f)
    var y = top + rowStep
    while (y < bottom) {
      canvas.drawLine(left, y, right, y, paint)
      y += rowStep
    }

    val colStep = ((right - left) / 3f).coerceAtLeast(7f)
    var x = left + colStep
    while (x < right) {
      canvas.drawLine(x, top, x, bottom, paint)
      x += colStep
    }

    if (face.block == WORKBENCH) {
      paint.color = Color.argb(130, 222, 176, 99)
      paint.strokeWidth = 1.5f * density
      canvas.drawLine(left + colStep * 0.45f, top + rowStep * 0.45f, right - colStep * 0.45f, top + rowStep * 0.45f, paint)
      canvas.drawLine(left + colStep * 0.45f, top + rowStep * 0.85f, right - colStep * 0.45f, top + rowStep * 0.85f, paint)
    }

    if (face.block == DOOR && face.face != TOP_FACE) {
      paint.style = Paint.Style.STROKE
      paint.strokeWidth = 1.5f * density
      paint.color = Color.argb(120, 64, 34, 13)
      canvas.drawRect(left + colStep * 0.45f, top + rowStep * 0.45f, right - colStep * 0.45f, bottom - rowStep * 0.35f, paint)
      paint.style = Paint.Style.FILL
      paint.color = Color.argb(190, 238, 191, 73)
      canvas.drawCircle(right - colStep * 0.65f, (top + bottom) * 0.5f, 1.9f * density, paint)
    }
  }

  private fun drawFurnaceTexture(
    canvas: Canvas,
    face: ProjectedFace,
    left: Float,
    top: Float,
    right: Float,
    bottom: Float,
  ) {
    drawStoneTexture(canvas, face, left, top, right, bottom)
    if (face.face == TOP_FACE) return

    paint.style = Paint.Style.FILL
    paint.color = Color.argb(175, 22, 27, 34)
    val w = right - left
    val h = bottom - top
    canvas.drawRect(left + w * 0.28f, top + h * 0.34f, right - w * 0.28f, bottom - h * 0.25f, paint)
    paint.color = Color.argb(170, 244, 124, 55)
    canvas.drawRect(left + w * 0.38f, top + h * 0.48f, right - w * 0.38f, bottom - h * 0.34f, paint)
  }

  private fun drawSeededDots(
    canvas: Canvas,
    face: ProjectedFace,
    left: Float,
    top: Float,
    right: Float,
    bottom: Float,
    count: Int,
    radius: Float,
  ) {
    val w = right - left
    val h = bottom - top
    if (w <= 0f || h <= 0f) return

    for (i in 0 until count) {
      val rx = seededUnit(face, i * 2 + 1)
      val ry = seededUnit(face, i * 2 + 2)
      canvas.drawCircle(left + rx * w, top + ry * h, radius, paint)
    }
  }

  private fun drawSeededStrokes(
    canvas: Canvas,
    face: ProjectedFace,
    left: Float,
    top: Float,
    right: Float,
    bottom: Float,
    count: Int,
    length: Float,
    slope: Float,
  ) {
    val w = right - left
    val h = bottom - top
    if (w <= 0f || h <= 0f) return

    for (i in 0 until count) {
      val rx = seededUnit(face, i * 3 + 1)
      val ry = seededUnit(face, i * 3 + 2)
      val x = left + rx * w
      val y = top + ry * h
      canvas.drawLine(x - length * 0.5f, y, x + length * 0.5f, y + slope, paint)
    }
  }

  private fun seededUnit(face: ProjectedFace, salt: Int): Float {
    val raw =
      face.worldX * 374761393 +
        face.worldY * 668265263 +
        face.worldZ * 224682251 +
        face.block * 326648991 +
        face.face * 1274126177 +
        salt * 1103515245
    val mixed = raw xor (raw ushr 13)
    return (mixed and 0x7fffffff) / 2147483647f
  }

  private fun drawNativeMovePad(canvas: Canvas) {
    drawNativeMoveButton(canvas, MOVE_UP)
    drawNativeMoveButton(canvas, MOVE_LEFT)
    drawNativeMoveButton(canvas, MOVE_RIGHT)
    drawNativeMoveButton(canvas, MOVE_DOWN)

    setNativeMoveButtonRect(MOVE_CENTER, controlRect)
    paint.style = Paint.Style.FILL
    paint.color = Color.argb(112, 31, 94, 48)
    canvas.drawRoundRect(controlRect, 10f * density, 10f * density, paint)
    paint.style = Paint.Style.STROKE
    paint.strokeWidth = 1f * density
    paint.color = Color.argb(74, 221, 234, 255)
    canvas.drawRoundRect(controlRect, 10f * density, 10f * density, paint)
  }

  private fun drawNativeMoveButton(canvas: Canvas, direction: Int) {
    setNativeMoveButtonRect(direction, controlRect)
    val active = activeMovePointers.values.contains(direction)
    paint.style = Paint.Style.FILL
    paint.color =
      if (active) Color.argb(214, 35, 91, 50) else Color.argb(184, 8, 31, 23)
    canvas.drawRoundRect(controlRect, 12f * density, 12f * density, paint)

    paint.style = Paint.Style.STROKE
    paint.strokeWidth = 1.4f * density
    paint.color =
      if (active) Color.argb(230, 221, 255, 227) else Color.argb(118, 221, 234, 255)
    canvas.drawRoundRect(controlRect, 12f * density, 12f * density, paint)

    drawMoveArrow(canvas, direction, controlRect.centerX(), controlRect.centerY())
  }

  private fun drawMoveArrow(canvas: Canvas, direction: Int, cx: Float, cy: Float) {
    val size = 14f * density
    path.reset()
    when (direction) {
      MOVE_UP -> {
        path.moveTo(cx, cy - size)
        path.lineTo(cx - size * 0.88f, cy + size * 0.72f)
        path.lineTo(cx + size * 0.88f, cy + size * 0.72f)
      }
      MOVE_DOWN -> {
        path.moveTo(cx, cy + size)
        path.lineTo(cx - size * 0.88f, cy - size * 0.72f)
        path.lineTo(cx + size * 0.88f, cy - size * 0.72f)
      }
      MOVE_LEFT -> {
        path.moveTo(cx - size, cy)
        path.lineTo(cx + size * 0.72f, cy - size * 0.88f)
        path.lineTo(cx + size * 0.72f, cy + size * 0.88f)
      }
      MOVE_RIGHT -> {
        path.moveTo(cx + size, cy)
        path.lineTo(cx - size * 0.72f, cy - size * 0.88f)
        path.lineTo(cx - size * 0.72f, cy + size * 0.88f)
      }
    }
    path.close()
    paint.style = Paint.Style.FILL
    paint.color = Color.argb(242, 255, 255, 255)
    canvas.drawPath(path, paint)
  }

  private fun hitNativeMovePad(x: Float, y: Float): Int {
    val directions = intArrayOf(MOVE_UP, MOVE_LEFT, MOVE_RIGHT, MOVE_DOWN)
    for (direction in directions) {
      setNativeMoveButtonRect(direction, controlRect)
      if (controlRect.contains(x, y)) {
        return direction
      }
    }
    return MOVE_NONE
  }

  private fun setNativeMoveButtonRect(direction: Int, out: RectF) {
    val button = MOVE_BUTTON_SIZE_DP * density
    val gap = MOVE_BUTTON_GAP_DP * density
    val left = MOVE_PAD_LEFT_DP * density
    val top = height - MOVE_PAD_BOTTOM_DP * density - button * 3f - gap * 2f
    val middleTop = top + button + gap
    val centerLeft = left + button + gap

    when (direction) {
      MOVE_UP -> out.set(centerLeft, top, centerLeft + button, top + button)
      MOVE_LEFT -> out.set(left, middleTop, left + button, middleTop + button)
      MOVE_RIGHT ->
        out.set(
          centerLeft + button + gap,
          middleTop,
          centerLeft + button * 2f + gap,
          middleTop + button,
        )
      MOVE_DOWN ->
        out.set(
          centerLeft,
          middleTop + button + gap,
          centerLeft + button,
          middleTop + button * 2f + gap,
        )
      else -> out.set(centerLeft, middleTop, centerLeft + button, middleTop + button)
    }
  }

  private fun drawNativeActionPad(canvas: Canvas) {
    drawNativeActionButton(canvas, ACTION_MINE)
    drawNativeActionButton(canvas, ACTION_PLACE)
    drawNativeActionButton(canvas, ACTION_RESET)
  }

  private fun drawNativeActionButton(canvas: Canvas, action: Int) {
    setNativeActionButtonRect(action, controlRect)
    val active = activeAction == action && System.nanoTime() < activeActionUntilNanos

    paint.style = Paint.Style.FILL
    paint.color =
      when (action) {
        ACTION_MINE -> if (active) Color.rgb(205, 111, 64) else Color.argb(232, 177, 88, 55)
        ACTION_PLACE -> if (active) Color.rgb(62, 157, 101) else Color.argb(232, 55, 130, 88)
        else -> if (active) Color.rgb(70, 85, 110) else Color.argb(232, 48, 58, 76)
      }
    canvas.drawRoundRect(controlRect, 12f * density, 12f * density, paint)

    paint.style = Paint.Style.STROKE
    paint.strokeWidth = 1.4f * density
    paint.color =
      when (action) {
        ACTION_MINE -> Color.rgb(255, 194, 164)
        ACTION_PLACE -> Color.rgb(184, 255, 208)
        else -> Color.rgb(182, 196, 216)
      }
    canvas.drawRoundRect(controlRect, 12f * density, 12f * density, paint)

    paint.style = Paint.Style.FILL
    paint.textAlign = Paint.Align.CENTER
    paint.typeface = Typeface.DEFAULT_BOLD
    paint.textSize = 13f * density
    paint.color = Color.WHITE
    val centerY = controlRect.centerY() - (paint.descent() + paint.ascent()) * 0.5f
    canvas.drawText(nativeActionLabel(action), controlRect.centerX(), centerY, paint)
    paint.textAlign = Paint.Align.LEFT
    paint.typeface = Typeface.DEFAULT
  }

  private fun hitNativeActionPad(x: Float, y: Float): Int {
    val actions = intArrayOf(ACTION_MINE, ACTION_PLACE, ACTION_RESET)
    for (action in actions) {
      setNativeActionButtonRect(action, controlRect)
      if (controlRect.contains(x, y)) {
        return action
      }
    }
    return ACTION_NONE
  }

  private fun setNativeActionButtonRect(action: Int, out: RectF) {
    val landscape = width > height
    val buttonWidth = ACTION_BUTTON_WIDTH_DP * density
    val buttonHeight = ACTION_BUTTON_HEIGHT_DP * density
    val gap = ACTION_BUTTON_GAP_DP * density
    val right = ACTION_PAD_RIGHT_DP * density
    val bottom = ACTION_PAD_BOTTOM_DP * density
    val actionIndex =
      when (action) {
        ACTION_MINE -> 0
        ACTION_PLACE -> 1
        else -> 2
      }

    if (landscape) {
      val totalWidth = buttonWidth * 3f + gap * 2f
      val left = width - right - totalWidth
      val top = height - bottom - buttonHeight
      val itemLeft = left + actionIndex * (buttonWidth + gap)
      out.set(itemLeft, top, itemLeft + buttonWidth, top + buttonHeight)
      return
    }

    val totalHeight = buttonHeight * 3f + gap * 2f
    val left = width - right - buttonWidth
    val top = height - bottom - totalHeight
    val itemTop = top + actionIndex * (buttonHeight + gap)
    out.set(left, itemTop, left + buttonWidth, itemTop + buttonHeight)
  }

  private fun performNativeAction(action: Int) {
    activeAction = action
    activeActionUntilNanos = System.nanoTime() + ACTION_FLASH_NANOS
    when (action) {
      ACTION_MINE -> mineTarget()
      ACTION_PLACE -> placeTarget()
      ACTION_RESET -> resetWorldAndPlayer()
    }
    invalidate()
  }

  private fun nativeActionLabel(action: Int): String {
    return when (action) {
      ACTION_MINE -> ACTION_MINE_LABEL
      ACTION_PLACE -> ACTION_PLACE_LABEL
      else -> ACTION_RESET_LABEL
    }
  }

  private fun drawCrosshair(canvas: Canvas) {
    val cx = width * 0.5f
    val cy = height * 0.48f
    val size = 11f * density

    paint.style = Paint.Style.STROKE
    paint.strokeWidth = 2f * density
    paint.color = Color.argb(220, 255, 255, 255)
    canvas.drawLine(cx - size, cy, cx + size, cy, paint)
    canvas.drawLine(cx, cy - size, cx, cy + size, paint)

    paint.strokeWidth = 1f * density
    paint.color = Color.argb(180, 0, 0, 0)
    canvas.drawCircle(cx, cy, size * 0.82f, paint)
  }

  private fun drawHud(canvas: Canvas) {
    val now = System.nanoTime()
    paint.style = Paint.Style.FILL
    paint.textAlign = Paint.Align.CENTER
    paint.textSize = 13f * density

    if (now < mineProgressUntilNanos) {
      val progress = (lastMineProgress / lastMineRequired).coerceIn(0f, 1f)
      val barWidth = min(width * 0.42f, 190f * density)
      val barHeight = 8f * density
      val left = width * 0.5f - barWidth * 0.5f
      val top = height - 120f * density

      paint.color = Color.argb(170, 7, 16, 28)
      canvas.drawRoundRect(left, top, left + barWidth, top + barHeight, 6f * density, 6f * density, paint)
      paint.color = Color.argb(230, 255, 219, 96)
      canvas.drawRoundRect(
        left,
        top,
        left + barWidth * progress,
        top + barHeight,
        6f * density,
        6f * density,
        paint,
      )
      paint.textAlign = Paint.Align.LEFT
      return
    }

    if (now >= mineDeniedUntilNanos) {
      paint.textAlign = Paint.Align.LEFT
      return
    }

    paint.color = Color.argb(230, 255, 240, 206)
    canvas.drawText(
      mineDeniedMessage,
      width * 0.5f,
      height - 112f * density,
      paint,
    )
    paint.textAlign = Paint.Align.LEFT
  }

  private fun canMineBlock(block: Int): Boolean {
    return when (block) {
      GRASS, DIRT -> selectedTool == TOOL_SHOVEL
      WOOD, LEAVES, PLANK, WORKBENCH, DOOR, CHAIR -> selectedTool == TOOL_AXE
      STONE, IRON_ORE, FURNACE -> selectedTool == TOOL_PICKAXE
      else -> false
    }
  }

  private fun blockMineRequirement(block: Int): Float {
    return when (block) {
      LEAVES -> 1.6f
      GRASS -> 2.0f
      DIRT -> 3.0f
      WOOD, PLANK -> 4.0f
      WORKBENCH, DOOR, CHAIR -> 5.0f
      STONE -> 6.0f
      FURNACE -> 8.0f
      IRON_ORE -> 9.0f
      else -> 1.0f
    }
  }

  private fun emitToolDurabilityChanged() {
    val reactContext = context as? ReactContext ?: return
    val event = Arguments.createMap()
    event.putInt("durability", selectedToolDurability)
    event.putInt("maxDurability", selectedToolMaxDurability)
    reactContext
      .getJSModule(RCTEventEmitter::class.java)
      .receiveEvent(id, "topToolDurabilityChanged", event)
  }

  private fun intersectsPlayer(x: Int, y: Int, z: Int): Boolean {
    val px = floor(cameraX).toInt()
    val pz = floor(cameraZ).toInt()
    val footY = floor(cameraY - EYE_HEIGHT).toInt()
    return x == px && z == pz && y in footY..footY + 2
  }

  private fun highestSolidY(x: Int, z: Int): Int {
    if (x !in 0 until WORLD_WIDTH || z !in 0 until WORLD_DEPTH) {
      return -1
    }
    for (y in WORLD_HEIGHT - 1 downTo 0) {
      if (getBlock(x, y, z) != AIR) {
        return y
      }
    }
    return -1
  }

  private fun surfaceTopAt(x: Float, z: Float): Float {
    val blockX = floor(x).toInt()
    val blockZ = floor(z).toInt()
    val y = highestSolidY(blockX, blockZ)
    return if (y >= 0) y + 1f else 0f
  }

  private fun inside(x: Int, y: Int, z: Int): Boolean {
    return x in 0 until WORLD_WIDTH && y in 0 until WORLD_HEIGHT && z in 0 until WORLD_DEPTH
  }

  private fun index(x: Int, y: Int, z: Int): Int {
    return (y * WORLD_DEPTH + z) * WORLD_WIDTH + x
  }

  private fun getBlock(x: Int, y: Int, z: Int): Int {
    if (!inside(x, y, z)) return AIR
    return blocks[index(x, y, z)].toInt()
  }

  private fun setBlock(x: Int, y: Int, z: Int, block: Int) {
    if (!inside(x, y, z)) return
    val key = index(x, y, z)
    blockDamage.remove(key)
    blocks[key] = block.toByte()
  }

  private fun blockColor(block: Int): Int {
    return when (block) {
      GRASS -> Color.rgb(86, 172, 78)
      DIRT -> Color.rgb(127, 83, 49)
      STONE -> Color.rgb(116, 121, 130)
      WOOD -> Color.rgb(130, 82, 42)
      LEAVES -> Color.rgb(50, 135, 77)
      IRON_ORE -> Color.rgb(161, 143, 124)
      PLANK -> Color.rgb(181, 128, 70)
      WORKBENCH -> Color.rgb(151, 95, 46)
      FURNACE -> Color.rgb(81, 88, 96)
      DOOR -> Color.rgb(146, 92, 45)
      CHAIR -> Color.rgb(166, 106, 56)
      else -> Color.TRANSPARENT
    }
  }

  private fun shade(color: Int, factor: Float): Int {
    val r = (Color.red(color) * factor).toInt().coerceIn(0, 255)
    val g = (Color.green(color) * factor).toInt().coerceIn(0, 255)
    val b = (Color.blue(color) * factor).toInt().coerceIn(0, 255)
    return Color.rgb(r, g, b)
  }

  private fun fogToSky(color: Int, visibility: Float): Int {
    val sky = Color.rgb(157, 199, 239)
    val r = (Color.red(sky) * (1f - visibility) + Color.red(color) * visibility).toInt()
    val g = (Color.green(sky) * (1f - visibility) + Color.green(color) * visibility).toInt()
    val b = (Color.blue(sky) * (1f - visibility) + Color.blue(color) * visibility).toInt()
    return Color.rgb(r.coerceIn(0, 255), g.coerceIn(0, 255), b.coerceIn(0, 255))
  }

  companion object {
    private const val WORLD_WIDTH = 72
    private const val WORLD_DEPTH = 72
    private const val WORLD_HEIGHT = 18
    private const val RENDER_RADIUS = 17
    private const val RENDER_DISTANCE = 25f
    private const val TEXTURE_DISTANCE = 18f
    private const val NEAR_PLANE = 0.08f
    private const val ACTION_REACH = 5.8f
    private const val WALK_SPEED = 4.1f
    private const val TURN_SPEED = 1.95f
    private const val LOOK_SPEED = 1.15f
    private const val DRAG_YAW_SPEED = 0.0055f
    private const val DRAG_PITCH_SPEED = 0.0048f
    private const val MIN_PITCH = -1.55f
    private const val MAX_PITCH = 1.55f
    private const val EYE_HEIGHT = 1.68f

    private const val MOVE_NONE = 0
    private const val MOVE_UP = 1
    private const val MOVE_DOWN = 2
    private const val MOVE_LEFT = 3
    private const val MOVE_RIGHT = 4
    private const val MOVE_CENTER = 5
    private const val MOVE_BUTTON_SIZE_DP = 54f
    private const val MOVE_BUTTON_GAP_DP = 6f
    private const val MOVE_PAD_LEFT_DP = 14f
    private const val MOVE_PAD_BOTTOM_DP = 14f

    private const val ACTION_NONE = 0
    private const val ACTION_MINE = 1
    private const val ACTION_PLACE = 2
    private const val ACTION_RESET = 3
    private const val ACTION_BUTTON_WIDTH_DP = 74f
    private const val ACTION_BUTTON_HEIGHT_DP = 48f
    private const val ACTION_BUTTON_GAP_DP = 8f
    private const val ACTION_PAD_RIGHT_DP = 14f
    private const val ACTION_PAD_BOTTOM_DP = 16f
    private const val ACTION_FLASH_NANOS = 140_000_000L
    private const val ACTION_MINE_LABEL = "\uCE90\uAE30"
    private const val ACTION_PLACE_LABEL = "\uB193\uAE30"
    private const val ACTION_RESET_LABEL = "\uB9AC\uC14B"
    private const val MINE_DENIED_TOOL_LABEL = "맞는 특별 도구가 있어야 캘 수 있습니다."
    private const val MINE_DENIED_DURABILITY_LABEL = "도구 내구도가 없습니다."

    private const val AIR = 0
    private const val GRASS = 1
    private const val DIRT = 2
    private const val STONE = 3
    private const val WOOD = 4
    private const val LEAVES = 5
    private const val IRON_ORE = 6
    private const val PLANK = 7
    private const val WORKBENCH = 8
    private const val FURNACE = 9
    private const val DOOR = 10
    private const val CHAIR = 11

    private const val TOOL_NONE = 0
    private const val TOOL_SHOVEL = 1
    private const val TOOL_AXE = 2
    private const val TOOL_PICKAXE = 3

    private const val TOP_FACE = 0
    private const val NORTH_FACE = 1
    private const val SOUTH_FACE = 2
    private const val WEST_FACE = 3
    private const val EAST_FACE = 4

    private val FACE_VERTICES =
      arrayOf(
        floatArrayOf(0f, 1f, 0f, 1f, 1f, 0f, 1f, 1f, 1f, 0f, 1f, 1f),
        floatArrayOf(1f, 0f, 0f, 0f, 0f, 0f, 0f, 1f, 0f, 1f, 1f, 0f),
        floatArrayOf(0f, 0f, 1f, 1f, 0f, 1f, 1f, 1f, 1f, 0f, 1f, 1f),
        floatArrayOf(0f, 0f, 0f, 0f, 0f, 1f, 0f, 1f, 1f, 0f, 1f, 0f),
        floatArrayOf(1f, 0f, 1f, 1f, 0f, 0f, 1f, 1f, 0f, 1f, 1f, 1f),
      )
  }
}
