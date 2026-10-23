@echo off
setlocal
cd /d "%~dp0.."
where node >nul 2>&1
if errorlevel 1 (
 echo ERROR: instala Node.js 20 o superior desde https://nodejs.org
 pause
 exit /b 1
)
echo Iniciando ZOLVANI: LA COLMENA...
start "" "http://127.0.0.1:4173"
node server\index.mjs
pause
