Write-Host "=== Survey Bot Launcher ===" -ForegroundColor Cyan
Write-Host ""

# Kill ALL Chrome
Write-Host "Closing Chrome..." -ForegroundColor Yellow
Get-Process chrome -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep 3

# Delete old profile completely to avoid lock conflicts
$oldProfile = "$env:LOCALAPPDATA\Temp\opencode\survey-bot\profile"
if (Test-Path $oldProfile) {
    Remove-Item -Path $oldProfile -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "Old profile cleaned." -ForegroundColor Gray
}

Write-Host ""
Write-Host "=== IMPORTANTE ===" -ForegroundColor Yellow
Write-Host "El bot va a abrir Chrome. NO uses Google para loguearte." -ForegroundColor Yellow
Write-Host "Usa EMAIL (crea cuenta en Freecash con tu correo)." -ForegroundColor Yellow
Write-Host "Google detecta Puppeteer y bloquea el login." -ForegroundColor Yellow
Write-Host ""
Write-Host "Pasos:" -ForegroundColor Green
Write-Host "1. En Freecash, dale a 'Sign Up'" -ForegroundColor Green
Write-Host "2. Elige EMAIL, no Google" -ForegroundColor Green
Write-Host "3. Pon tu correo y una contraseña" -ForegroundColor Green
Write-Host "4. Resuelve el captcha (ahí el bot espera)" -ForegroundColor Green
Write-Host "5. El bot detecta el login y arranca solo" -ForegroundColor Green
Write-Host ""
Read-Host "Presiona ENTER para empezar..."

$env:CHROME_DEBUG = ""
Set-Location $PSScriptRoot
node survey-bot.js

Read-Host "Bot terminó. Presiona ENTER para salir."
