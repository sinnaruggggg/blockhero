@echo off
setlocal

set "ROOT_DIR=%~dp0"
set "STUDIO_DIR=%ROOT_DIR%tools\visual-config-studio"
set "PORT=4173"
set "URL=http://localhost:%PORT%/"
set "OPEN_BROWSER=1"

if /i "%UI_STUDIO_NO_BROWSER%"=="1" set "OPEN_BROWSER=0"

if not exist "%STUDIO_DIR%\index.html" (
  echo UI Studio index.html not found.
  echo Expected path: "%STUDIO_DIR%\index.html"
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$conn = Get-NetTCPConnection -LocalPort %PORT% -State Listen -ErrorAction SilentlyContinue; if ($conn) { exit 0 } else { exit 1 }"
if %errorlevel%==0 (
  echo UI Studio server already running on %URL%
  if "%OPEN_BROWSER%"=="1" start "" "%URL%"
  exit /b 0
)

set "PY_CMD="
where py >nul 2>nul
if %errorlevel%==0 set "PY_CMD=py -3"
if not defined PY_CMD (
  where python >nul 2>nul
  if %errorlevel%==0 set "PY_CMD=python"
)
if not defined PY_CMD (
  where python3 >nul 2>nul
  if %errorlevel%==0 set "PY_CMD=python3"
)

if not defined PY_CMD (
  echo Python executable was not found.
  echo Install Python 3 or run the studio with another local web server.
  pause
  exit /b 1
)

echo Starting UI Studio on %URL%
start "BlockHero UI Studio Server" cmd /k "cd /d ""%STUDIO_DIR%"" && %PY_CMD% -m http.server %PORT%"
timeout /t 2 /nobreak >nul
if "%OPEN_BROWSER%"=="1" start "" "%URL%"
exit /b 0
