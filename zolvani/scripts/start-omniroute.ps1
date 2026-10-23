$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$omniCommand = Join-Path $projectRoot '.tools\omniroute-global\omniroute.cmd'
$localData = Join-Path $projectRoot '.tools\omniroute-data'

if (-not (Test-Path -LiteralPath $omniCommand)) {
  throw 'OmniRoute no está instalado en .tools. Consulta README.md para instalar la versión oficial en un prefijo local.'
}

$listeners = @(Get-NetTCPConnection -State Listen -LocalPort 20128 -ErrorAction SilentlyContinue)
if ($listeners.Count -gt 0) {
  $nonLocal = @($listeners | Where-Object { $_.LocalAddress -notin @('127.0.0.1', '::1') })
  if ($nonLocal.Count -gt 0) { throw 'El puerto 20128 ya escucha fuera de loopback. OmniRoute no se iniciará.' }
  throw 'El puerto local 20128 ya está ocupado. Revisa ese proceso antes de iniciar OmniRoute.'
}

New-Item -ItemType Directory -Force -Path $localData | Out-Null
$env:OMNIROUTE_SERVER_HOST = '127.0.0.1'
$env:DATA_DIR = $localData
$env:PORT = '20128'
$env:OMNIROUTE_MEMORY_MB = '1024'
Set-Location -LiteralPath $projectRoot
Write-Host 'OmniRoute se iniciará en 127.0.0.1:20128; los datos quedan bajo Z:\Zolvani\.tools.'
& $omniCommand serve --no-open
