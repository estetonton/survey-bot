Write-Host "=== Survey Bot Launcher v5.1 (Real Chrome) ===" -ForegroundColor Cyan
Write-Host ""

# Kill ALL Chrome to unlock profile for Puppeteer
Write-Host "Cerrando Chrome para desbloquear perfil..." -ForegroundColor Yellow
Get-Process chrome -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep 3

Write-Host ""
Write-Host "=== IMPORTANTE ===" -ForegroundColor Yellow
Write-Host "El bot usara TU Chrome real con TU perfil." -ForegroundColor Yellow
Write-Host "Si ya tienes sesion en Freecash, el bot detecta solo." -ForegroundColor Yellow
Write-Host "Si no, inicia sesion con EMAIL (no Google)." -ForegroundColor Yellow
Write-Host ""

Read-Host "Presiona ENTER para empezar..."

$env:CHROME_DEBUG = ""
Set-Location $PSScriptRoot
node survey-bot.js

Read-Host "Bot termino. Presiona ENTER para salir."
