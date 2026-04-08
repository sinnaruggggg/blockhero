@echo off
setlocal
if not exist "%~dp0blockhero-creator.local.json" (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\setup_blockhero_creator_local.ps1"
  if errorlevel 1 exit /b %errorlevel%
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\launch_blockhero_creator_desktop.ps1"
