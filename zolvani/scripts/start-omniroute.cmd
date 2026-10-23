@echo off
setlocal
set "PROJECT_ROOT=%~dp0.."
set "OMNI_COMMAND=%PROJECT_ROOT%\.tools\omniroute-global\omniroute.cmd"
if not exist "%OMNI_COMMAND%" (
  echo OmniRoute no esta instalado en .tools. Consulta README.md.
  exit /b 1
)
powershell.exe -NoProfile -Command "$listeners = @(Get-NetTCPConnection -State Listen -LocalPort 20128 -ErrorAction SilentlyContinue); if ($listeners.Count -gt 0) { $nonLocal = @($listeners | Where-Object { $_.LocalAddress -notin @('127.0.0.1','::1') }); if ($nonLocal.Count -gt 0) { Write-Error 'El puerto 20128 ya escucha fuera de loopback.' } else { Write-Error 'El puerto local 20128 ya esta ocupado.' }; exit 1 }"
if errorlevel 1 exit /b 1
set "OMNIROUTE_SERVER_HOST=127.0.0.1"
set "DATA_DIR=%PROJECT_ROOT%\.tools\omniroute-data"
set "PORT=20128"
set "OMNIROUTE_MEMORY_MB=1024"
cd /d "%PROJECT_ROOT%"
echo OmniRoute iniciara en 127.0.0.1:20128 y guardara datos bajo Zolvani\.tools.
call "%OMNI_COMMAND%" serve --no-open
