@echo off
setlocal
cd /d "%~dp0"
start "" "http://localhost:4273"
python -m http.server 4273
