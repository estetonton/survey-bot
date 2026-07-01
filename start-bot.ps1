Write-Host "=== Survey Bot Launcher ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Step 1: Closing all Chrome windows..." -ForegroundColor Yellow
Get-Process chrome -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep 2

Write-Host "Step 2: Opening your Chrome with remote debugging..." -ForegroundColor Yellow
Write-Host "       (Your profile, your accounts, everything normal)" -ForegroundColor Gray
Write-Host ""

$chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$profilePath = "$env:LOCALAPPDATA\Google\Chrome\User Data"

Start-Process -FilePath $chromePath -ArgumentList "--remote-debugging-port=9222", "--no-first-run", "--new-window", "https://freecash.com/en"

Write-Host ""
Write-Host "Step 3: LOG IN to Freecash in the Chrome window that opened." -ForegroundColor Green
Write-Host "        Use Google, email, whatever you want." -ForegroundColor Green
Write-Host "        It's your normal Chrome with your accounts." -ForegroundColor Green
Write-Host ""
Write-Host "Step 4: When you're logged in, come back here and press ENTER" -ForegroundColor Cyan
Write-Host "        The bot will take over from there." -ForegroundColor Cyan
Write-Host ""
Read-Host "Press ENTER when logged in..."

Write-Host ""
Write-Host "Starting bot..." -ForegroundColor Green
$env:CHROME_DEBUG = "9222"
Set-Location $PSScriptRoot
node survey-bot.js
