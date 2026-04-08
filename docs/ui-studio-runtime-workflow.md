# UI Studio Runtime Workflow

## Why the old preview drifted

The first `UiStudio` preview used a fixed canvas and manually rebuilt sample UI. That could not match the real game screens because runtime layout depends on:

- actual device window width and height
- safe area insets
- flex layout in the real React Native screens
- board sizing derived from `Dimensions.get('window')`

So it was impossible for the old preview to be a true 1:1 device representation.

## What changed

- `UiStudio` now uses `VisualRuntimePreview`, which renders runtime-style screen sections with the current device viewport and safe area.
- Each visual config draft now stores a `referenceViewport`.
- Runtime offsets are resolved through `resolveVisualOffset(...)`, so the same config can adapt to different devices.
- The admin app can preview on:
  - the current phone
  - preset device profiles
  - a custom viewport
- The phone fullscreen preview is the canonical check.

## Why PC preview is still not the final source of truth

Even with the new scaling model, a PC page still cannot be perfectly identical to React Native on-device rendering because:

- browser font metrics differ from native text rendering
- browser safe area simulation is approximate
- React Native image scaling and shadows differ from the browser
- touch hit areas and native layout timing are not identical

Because of that, the PC tool is for fast numeric editing and multi-device simulation, but final approval should happen in the phone app.

## PC editor

Static editor path:

- `tools/visual-config-studio/index.html`

Open it in a browser and provide:

- Supabase URL
- anon key
- admin JWT

Then you can:

- load draft
- load latest published release
- edit screen/element offsets
- simulate device profiles
- edit raw manifest JSON
- save draft
- publish a new config release

## Recommended workflow

1. Use the PC editor to make coarse numeric changes.
2. Save the draft to Supabase.
3. Open `UI Studio` on the admin phone.
4. Check the same draft in fullscreen preview on the real device.
5. Fine-tune on the phone if needed.
6. Publish from the phone.
7. If the release is bad, rollback from the admin history list.
