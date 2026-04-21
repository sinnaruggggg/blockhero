# Auto Update Release Runbook

## Goal
`git push` or `git push --tags` alone is not enough. The app checks GitHub `releases/latest`, so auto update is only live after the GitHub Release exists and the APK asset is attached.

## Source Of Truth
- Release workflow: [.github/workflows/release-apk.yml](/C:/www/game/blockhero_codex/.github/workflows/release-apk.yml)
- App update check: [src/services/updateService.ts](/C:/www/game/blockhero_codex/src/services/updateService.ts)
- Android app version: [android/app/build.gradle](/C:/www/game/blockhero_codex/android/app/build.gradle)
- Release verifier script: [scripts/wait-for-github-release.ps1](/C:/www/game/blockhero_codex/scripts/wait-for-github-release.ps1)

## Required Release Flow
1. Update `versionCode` and `versionName` in `android/app/build.gradle`.
2. Update `CURRENT_VERSION_CODE` and `CURRENT_VERSION_NAME` in `src/services/updateService.ts`.
3. Build locally.
4. Commit the release bump.
5. Push `main`.
6. Create and push the matching tag, for example `v1.3.25`.
7. Wait for the GitHub Release workflow to finish.
8. Verify that `releases/latest` now points to the new tag and that an `.apk` asset exists.
9. Only after step 8 say that auto update is live.

## Progress Reporting Rule
Do not block on a long GitHub Actions watch without reporting back.

- After starting a release workflow, check status with `gh run view` or `gh run list`.
- If the workflow is still running after 5 minutes, stop waiting and report the current step, elapsed time, and whether it is still progressing.
- Continue in short status-check loops instead of one long silent wait.
- Never leave the user without an update while an APK build is still in progress.

## Commands
```powershell
git push origin main
git tag v1.3.25
git push origin v1.3.25
powershell -ExecutionPolicy Bypass -File scripts/wait-for-github-release.ps1 -Version 1.3.25
```

## Release Done Criteria
All of these must be true:
- `https://api.github.com/repos/sinnaruggggg/blockhero/releases/latest` returns the target tag.
- `https://api.github.com/repos/sinnaruggggg/blockhero/releases/tags/vX.Y.Z` exists.
- The release has an `.apk` asset.
- The corresponding `Release APK` GitHub Actions run finished with `success`.

## Common Failure Pattern
The repeated mistake was treating `tag pushed` as `release completed`.

That is wrong because:
- the app does not read tags
- the app does not read `main`
- the app only reads `releases/latest`

If the workflow is still building or failed, users will never see the update.

## Guardrail
Before reporting a release as done, always run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/wait-for-github-release.ps1 -Version X.Y.Z
```

If the script fails, do not say the release is done. Fix the workflow or cut a new version.
