@echo off
setlocal
cd /d "%~dp0.."
call npm.cmd run check
if errorlevel 1 exit /b 1
call npm.cmd test
pause
