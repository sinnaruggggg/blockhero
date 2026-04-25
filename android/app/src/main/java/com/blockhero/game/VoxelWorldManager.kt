package com.blockhero.game

import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

class VoxelWorldManager : SimpleViewManager<VoxelWorldView>() {
  private val lastMineCommands = mutableMapOf<Int, Int>()
  private val lastPlaceCommands = mutableMapOf<Int, Int>()
  private val lastResetCommands = mutableMapOf<Int, Int>()

  override fun getName(): String = "VoxelWorldView"

  override fun createViewInstance(reactContext: ThemedReactContext): VoxelWorldView {
    return VoxelWorldView(reactContext)
  }

  override fun getExportedCustomBubblingEventTypeConstants(): MutableMap<String, Any> {
    return mutableMapOf(
      "topToolDurabilityChanged" to mapOf(
        "phasedRegistrationNames" to mapOf(
          "bubbled" to "onToolDurabilityChanged",
        ),
      ),
    )
  }

  override fun onDropViewInstance(view: VoxelWorldView) {
    lastMineCommands.remove(view.id)
    lastPlaceCommands.remove(view.id)
    lastResetCommands.remove(view.id)
    super.onDropViewInstance(view)
  }

  @ReactProp(name = "moveX", defaultFloat = 0f)
  fun setMoveX(view: VoxelWorldView, value: Float) {
    view.setMoveX(value)
  }

  @ReactProp(name = "moveZ", defaultFloat = 0f)
  fun setMoveZ(view: VoxelWorldView, value: Float) {
    view.setMoveZ(value)
  }

  @ReactProp(name = "turn", defaultFloat = 0f)
  fun setTurn(view: VoxelWorldView, value: Float) {
    view.setTurn(value)
  }

  @ReactProp(name = "look", defaultFloat = 0f)
  fun setLook(view: VoxelWorldView, value: Float) {
    view.setLook(value)
  }

  @ReactProp(name = "selectedBlock")
  fun setSelectedBlock(view: VoxelWorldView, value: String?) {
    view.setSelectedBlock(value)
  }

  @ReactProp(name = "selectedTool")
  fun setSelectedTool(view: VoxelWorldView, value: String?) {
    view.setSelectedTool(value)
  }

  @ReactProp(name = "selectedToolPowerMultiplier", defaultFloat = 0f)
  fun setSelectedToolPowerMultiplier(view: VoxelWorldView, value: Float) {
    view.setSelectedToolPowerMultiplier(value)
  }

  @ReactProp(name = "selectedToolDurability", defaultInt = 0)
  fun setSelectedToolDurability(view: VoxelWorldView, value: Int) {
    view.setSelectedToolDurability(value)
  }

  @ReactProp(name = "selectedToolMaxDurability", defaultInt = 0)
  fun setSelectedToolMaxDurability(view: VoxelWorldView, value: Int) {
    view.setSelectedToolMaxDurability(value)
  }

  @ReactProp(name = "mineCommand", defaultInt = 0)
  fun setMineCommand(view: VoxelWorldView, value: Int) {
    val key = view.id
    if (lastMineCommands[key] == value) return
    lastMineCommands[key] = value
    if (value > 0) {
      view.mineTarget()
    }
  }

  @ReactProp(name = "placeCommand", defaultInt = 0)
  fun setPlaceCommand(view: VoxelWorldView, value: Int) {
    val key = view.id
    if (lastPlaceCommands[key] == value) return
    lastPlaceCommands[key] = value
    if (value > 0) {
      view.placeTarget()
    }
  }

  @ReactProp(name = "resetCommand", defaultInt = 0)
  fun setResetCommand(view: VoxelWorldView, value: Int) {
    val key = view.id
    if (lastResetCommands[key] == value) return
    lastResetCommands[key] = value
    if (value > 0) {
      view.resetWorldAndPlayer()
    }
  }
}
