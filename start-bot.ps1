Write-Host "=== Survey Bot v5.1 (Real Chrome) ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "El bot abre una ventana NUEVA de Chrome (tu Chrome real)." -ForegroundColor Green
Write-Host "NO cierra tu Chrome existente - no pierdes sesion." -ForegroundColor Green
Write-Host ""
Write-Host "Si ya tienes cuenta en Freecash, inicia sesion con EMAIL." -ForegroundColor Yellow
Write-Host "Si no, registrate con EMAIL (no Google)." -ForegroundColor Yellow
Write-Host ""

Read-Host "Presiona ENTER para empezar..."

Set-Location $PSScriptRoot
node survey-bot.js

Read-Host "Bot termino. Presiona ENTER para salir."
