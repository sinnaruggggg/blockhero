@echo off
setlocal

call "%~dp0..\..\run-ui-studio.bat"
exit /b %errorlevel%
