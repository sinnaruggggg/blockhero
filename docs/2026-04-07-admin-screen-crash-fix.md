# 2026-04-07 Admin Screen Crash Fix

## Root Cause

The admin screen crashed on entry because `AdminScreenContent` changed its hook order between renders.

- The first render returned early on `!accessChecked`.
- Later renders executed additional `useCallback` hooks for announcement editing.
- This violated the Rules of Hooks and caused React Native to throw:
  - `Rendered more hooks than during the previous render.`

This was the real crash cause. The earlier `react-native-image-picker` suspicion was not sufficient on its own.

## Fix

- Moved announcement-related hooks so all hooks run before any conditional return.
- Added a local error boundary around `AdminScreen`.
- Wrapped bootstrap logic (`getAdminStatus`, `loadDashboard`) with guarded error handling.
- Added a render test for:
  - normal admin bootstrap
  - admin bootstrap failure fallback

## Guardrails

- Never define hooks after `if (...) return ...`.
- When adding admin-only UI, keep all hooks grouped before any early-return path.
- For critical entry screens, add at least one render test that mounts the screen and flushes effects.

## Verification

- `npx tsc --noEmit`
- `npm test -- --runInBand __tests__/adminScreen.test.tsx`
- `android\\gradlew.bat assembleRelease`
