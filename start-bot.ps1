Write-Host "=== Survey Bot v5.2 (Real Chrome) ===" -ForegroundColor Cyan
Write-Host ""

# Kill ALL Chrome to unlock bot profile (NO afecta tu cuenta de Google - solo cierra ventanas)
Write-Host "Cerrando Chrome para liberar perfil del bot..." -ForegroundColor Yellow
Get-Process chrome -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep 3

# Clean profile dir (lockfiles viejos)
$profDir = "$PSScriptRoot\profile"
Remove-Item -Recurse -Force $profDir -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $profDir -Force | Out-Null

Write-Host ""
Write-Host "Se abrira una ventana de Chrome. Logueate en Freecash con EMAIL." -ForegroundColor Green
Write-Host "El bot detecta el login solo y arranca." -ForegroundColor Green
Write-Host ""

Read-Host "Presiona ENTER para empezar..."

Set-Location $PSScriptRoot
node survey-bot.js

Read-Host "Bot termino. Presiona ENTER para salir."
