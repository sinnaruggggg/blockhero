@echo off
setlocal
cd /d "%~dp0tools\blockhero-creator"
start "" "http://localhost:4273"
python -m http.server 4273
