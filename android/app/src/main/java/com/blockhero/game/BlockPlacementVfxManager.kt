package com.blockhero.game

import com.facebook.react.bridge.ReadableArray
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

class BlockPlacementVfxManager : SimpleViewManager<BlockPlacementVfxView>() {
  override fun getName(): String = "BlockPlacementVfxView"

  override fun createViewInstance(reactContext: ThemedReactContext): BlockPlacementVfxView {
    return BlockPlacementVfxView(reactContext)
  }

  @ReactProp(name = "cells")
  fun setCells(view: BlockPlacementVfxView, cells: ReadableArray?) {
    view.play(cells)
  }
}
