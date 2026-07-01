Write-Host "=== Survey Bot Launcher ===" -ForegroundColor Cyan
Write-Host ""

# Kill ALL Chrome processes forcefully
Write-Host "Closing Chrome..." -ForegroundColor Yellow
Get-Process chrome -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep 3

# Clean up old bot profile lock files
$oldProfile = "$env:LOCALAPPDATA\Temp\opencode\survey-bot\profile"
if (Test-Path $oldProfile) {
    Remove-Item -Path "$oldProfile\SingletonLock" -Force -ErrorAction SilentlyContinue
    Remove-Item -Path "$oldProfile\SingletonSocket" -Force -ErrorAction SilentlyContinue
    Remove-Item -Path "$oldProfile\SingletonCookie" -Force -ErrorAction SilentlyContinue
}

# Launch Chrome with USER's real profile AND remote debugging
$chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$userProfile = "$env:LOCALAPPDATA\Google\Chrome\User Data"

Write-Host "Opening your Chrome (your profile, your accounts)..." -ForegroundColor Yellow
Start-Process -FilePath $chromePath -ArgumentList `
    "--remote-debugging-port=9222", `
    "--user-data-dir=`"$userProfile`"", `
    "--no-first-run", `
    "--new-window", `
    "https://freecash.com/en"

Start-Sleep 3

Write-Host ""
Write-Host "=== LOG IN to Freecash in the Chrome window ===" -ForegroundColor Green
Write-Host "Use Google, email, whatever you want." -ForegroundColor Green
Write-Host "It's your normal Chrome with your accounts." -ForegroundColor Green
Write-Host ""
Write-Host "When logged in, press ENTER here to start the bot." -ForegroundColor Cyan
Read-Host "Press ENTER when ready..."

# Verify Chrome debug port is responding
$maxRetries = 10
$connected = $false
for ($i = 0; $i -lt $maxRetries; $i++) {
    try {
        $resp = Invoke-WebRequest -Uri "http://127.0.0.1:9222/json/version" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        if ($resp.StatusCode -eq 200) { $connected = $true; break }
    } catch {}
    Start-Sleep 1
}

if (-not $connected) {
    Write-Host "Chrome debug port not responding. Restarting..." -ForegroundColor Red
    Get-Process chrome -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep 2
    Start-Process -FilePath $chromePath -ArgumentList "--remote-debugging-port=9222", "--user-data-dir=`"$userProfile`"", "--no-first-run", "--new-window", "https://freecash.com/en"
    Start-Sleep 5
}

Write-Host ""
Write-Host "Starting bot..." -ForegroundColor Green
$env:CHROME_DEBUG = "9222"
Set-Location $PSScriptRoot
node survey-bot.js

Read-Host "Bot finished. Press ENTER to exit."
