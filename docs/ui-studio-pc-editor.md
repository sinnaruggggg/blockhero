# UI Studio PC Editor

The PC editor lives in `tools/visual-config-studio/` and is the fast iteration companion to the in-app runtime studio.

## What it does

- Lets admins edit `level`, `endless`, `battle`, and `raid` visual layouts.
- Supports direct drag on the stage, inspector edits, nudge controls, grid snapping, zoom, and safe-area preview.
- Can load the latest published visual config, save draft, publish a new release, and rollback by cloning an older release.
- Supports background override editing for:
  - `level -> world`
  - `level -> level`
  - `raid -> bossStage`
- Supports image upload to `ui_assets` and previewing those assets in the editor.

## Why it is not the final source of truth

This editor is intentionally close to a scene editor, but it still runs in a browser. The final pixel validation must happen in the app runtime preview because:

- React Native font metrics differ from browser metrics.
- Native safe-area handling is not identical to CSS.
- Android/iOS rendering and browser rendering handle scaling differently.

Use the PC editor to move quickly. Use the in-app `UI Studio` fullscreen preview to sign off.

## Recommended workflow

1. Open the PC editor.
2. Load draft or latest release.
3. Pick a target device preset or custom viewport.
4. Adjust layout with drag, arrow keys, inspector, and grid snap.
5. Save draft.
6. Publish when ready.
7. Open the app runtime preview on a real phone and verify the published version.
