@echo off
setlocal
set EXE_PATH=
for %%F in ("%~dp0tools\blockhero-creator-desktop\dist\BlockHero Creator *.exe") do (
  set EXE_PATH=%%~fF
)
if not defined EXE_PATH (
  echo BlockHero Creator exe가 없습니다. 먼저 npm run creator:exe 를 실행하세요.
  exit /b 1
)
start "" "%EXE_PATH%"
