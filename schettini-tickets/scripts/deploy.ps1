# =============================================================================
# Script de despliegue - ejecutar EN TU PC (Windows, PowerShell)
# Opción 1: Solo build local (después subís a mano y en el VPS corrés deploy.sh)
# Opción 2: Build + desplegar en el VPS por SSH (configurá abajo)
# =============================================================================

# ---------- CONFIGURACIÓN (completar si usás la opción 2) ----------
$SERVER_USER = "root"           # Usuario SSH del VPS
$SERVER_IP   = "200.58.127.173" # IP de tu VPS
$REMOTE_PATH = "/var/www/tickets/schettini-tickets"  # Ruta del proyecto en el VPS
# -------------------------------------------------------------------

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir   = Split-Path -Parent $ScriptDir

Write-Host ">>> Raíz del proyecto: $RootDir" -ForegroundColor Cyan
Write-Host ""

# Build del frontend en tu PC
Write-Host ">>> Build del frontend (local)..." -ForegroundColor Yellow
Push-Location (Join-Path $RootDir "frontend")
try {
    npm run build
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
    Pop-Location
}
Write-Host ">>> Build listo." -ForegroundColor Green
Write-Host ""

# Preguntar si quiere desplegar por SSH
$deploy = Read-Host "¿Desplegar en el VPS por SSH? (s/n). Si elegís 'n', subí los archivos a mano y en el servidor ejecutá: bash scripts/deploy.sh"
if ($deploy -eq "s" -or $deploy -eq "S") {
    Write-Host ">>> Conectando por SSH y ejecutando deploy en el servidor (git pull + build + pm2 restart)..." -ForegroundColor Yellow
    $cmd = "cd $REMOTE_PATH && bash scripts/deploy.sh --pull"
    ssh "${SERVER_USER}@${SERVER_IP}" $cmd
    if ($LASTEXITCODE -eq 0) {
        Write-Host ">>> Despliegue en el VPS terminado." -ForegroundColor Green
    } else {
        Write-Host ">>> Error al ejecutar en el VPS. Revisá usuario, IP y que tengas SSH configurado." -ForegroundColor Red
    }
} else {
    Write-Host ">>> Recordá: en el VPS ejecutá:  cd $REMOTE_PATH  y luego  bash scripts/deploy.sh" -ForegroundColor Cyan
}
