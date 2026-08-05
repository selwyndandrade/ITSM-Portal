# Quick Fix - Kill Locked Process and Clean Build
# Run this when you get "file is locked" errors

Write-Host "=== Killing Locked ITSM.Portal.API Process ===" -ForegroundColor Cyan
Write-Host ""

# Kill the specific PID that's locking the file
$pid = 28084
Write-Host "Attempting to kill PID: $pid" -ForegroundColor Yellow
try {
	Stop-Process -Id $pid -Force -ErrorAction Stop
	Write-Host "  ✓ Process killed successfully" -ForegroundColor Green
} catch {
	Write-Host "  ⚠ Process may have already exited" -ForegroundColor Gray
}

# Also kill any other ITSM.Portal.API processes
Write-Host ""
Write-Host "Checking for other ITSM.Portal.API processes..." -ForegroundColor Yellow
$processes = Get-Process | Where-Object { $_.ProcessName -like "*ITSM.Portal.API*" }
if ($processes) {
	foreach ($proc in $processes) {
		Write-Host "  Killing: $($proc.ProcessName) (PID: $($proc.Id))" -ForegroundColor Yellow
		Stop-Process -Id $proc.Id -Force
	}
	Write-Host "  ✓ All processes killed" -ForegroundColor Green
} else {
	Write-Host "  ✓ No other processes found" -ForegroundColor Green
}

Start-Sleep -Seconds 2

# Clean bin and obj folders
Write-Host ""
Write-Host "Cleaning build artifacts..." -ForegroundColor Yellow
Push-Location ITSM.Portal.API

if (Test-Path "bin") {
	Remove-Item -Recurse -Force bin -ErrorAction SilentlyContinue
	Write-Host "  ✓ Deleted bin folder" -ForegroundColor Green
}

if (Test-Path "obj") {
	Remove-Item -Recurse -Force obj -ErrorAction SilentlyContinue
	Write-Host "  ✓ Deleted obj folder" -ForegroundColor Green
}

Pop-Location

Write-Host ""
Write-Host "=== Ready to Rebuild ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "1. In Visual Studio: Build → Rebuild Solution" -ForegroundColor Gray
Write-Host "2. Press F5 to start debugging" -ForegroundColor Gray
Write-Host ""
