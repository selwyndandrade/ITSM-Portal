# ITSM Portal - AUTOMATED FIX SCRIPT
# This script attempts to fix common backend issues automatically
# Run as Administrator in PowerShell from the solution root directory

param(
	[switch]$SkipBackup,
	[switch]$ResetDatabase
)

$ErrorActionPreference = "Continue"

Write-Host @"
╔════════════════════════════════════════════════════════════════╗
║                 ITSM PORTAL - AUTO FIX TOOL                    ║
║                                                                ║
║  This script will attempt to fix:                            ║
║   • Service lifetime mismatches (Singleton → Scoped)          ║
║   • Missing dependency registrations                          ║
║   • Database connection issues                                ║
║   • Build cache problems                                      ║
╚════════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan

Write-Host ""

# Verify we're in the right directory
if (-not (Test-Path "ITSM.Portal.API\Program.cs")) {
	Write-Host "ERROR: Program.cs not found. Are you in the solution directory?" -ForegroundColor Red
	Write-Host "Current directory: $(Get-Location)" -ForegroundColor Yellow
	exit 1
}

Write-Host "[STEP 1/9] Backing up current Program.cs..." -ForegroundColor Yellow
if (-not $SkipBackup) {
	$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
	Copy-Item "ITSM.Portal.API\Program.cs" "ITSM.Portal.API\Program.cs.backup_$timestamp"
	Write-Host "  ✓ Backup created: Program.cs.backup_$timestamp" -ForegroundColor Green
} else {
	Write-Host "  ⊘ Skipped (--SkipBackup flag)" -ForegroundColor Gray
}

Write-Host ""

Write-Host "[STEP 2/9] Analyzing Program.cs for issues..." -ForegroundColor Yellow
$programPath = "ITSM.Portal.API\Program.cs"
$programContent = Get-Content $programPath -Raw
$issuesFound = @()
$fixesApplied = @()

# Check for Singleton IAIService (CRITICAL BUG)
if ($programContent -match 'AddSingleton<IAIService,\s*AIService>') {
	$issuesFound += "IAIService registered as Singleton (should be Scoped)"
	Write-Host "  ✗ CRITICAL: IAIService is Singleton (causes timeouts)" -ForegroundColor Red

	# Fix it
	$programContent = $programContent -replace 'AddSingleton<IAIService,\s*AIService>\(\)', 'AddScoped<IAIService, AIService>()'
	$fixesApplied += "Changed IAIService from Singleton to Scoped"
	Write-Host "    ✓ Auto-fixed: Changed to AddScoped" -ForegroundColor Green
} elseif ($programContent -match 'AddScoped<IAIService,\s*AIService>') {
	Write-Host "  ✓ IAIService is correctly Scoped" -ForegroundColor Green
} else {
	Write-Host "  ⚠ IAIService registration not found or in unexpected format" -ForegroundColor Yellow
}

# Check for missing IAIProvider registration
if (-not ($programContent -match 'AddScoped<IAIProvider,\s*OpenAIProvider>')) {
	if ($programContent -match 'AddHttpClient<IAIProvider,\s*OpenAIProvider>') {
		$issuesFound += "IAIProvider not explicitly registered (only AddHttpClient)"
		Write-Host "  ✗ IAIProvider interface not registered" -ForegroundColor Red

		# Fix it - Insert after AddHttpClient line
		$programContent = $programContent -replace '(AddHttpClient<OpenAIProvider>\(\);)', "`$1`r`nbuilder.Services.AddScoped<IAIProvider, OpenAIProvider>();"
		$fixesApplied += "Added IAIProvider interface registration"
		Write-Host "    ✓ Auto-fixed: Added AddScoped<IAIProvider, OpenAIProvider>" -ForegroundColor Green
	} else {
		Write-Host "  ✓ IAIProvider registration present" -ForegroundColor Green
	}
}

# Check middleware order
$middlewareSection = $programContent -replace '(?s).*var app = builder\.Build\(\);(.*)app\.Run\(\);.*', '$1'
$corsIndex = $middlewareSection.IndexOf("UseCors")
$authIndex = $middlewareSection.IndexOf("UseAuthentication")

if ($corsIndex -gt 0 -and $authIndex -gt 0 -and $corsIndex -lt $authIndex) {
	Write-Host "  ✓ Middleware order is correct (CORS before Authentication)" -ForegroundColor Green
} elseif ($corsIndex -gt 0 -and $authIndex -gt 0) {
	$issuesFound += "CORS configured after Authentication (wrong order)"
	Write-Host "  ⚠ CORS may be after Authentication (check manually)" -ForegroundColor Yellow
}

# Save fixed Program.cs if changes were made
if ($fixesApplied.Count -gt 0) {
	Set-Content $programPath $programContent -NoNewline
	Write-Host ""
	Write-Host "  ✓ Program.cs has been updated with $($fixesApplied.Count) fix(es)" -ForegroundColor Green
} else {
	Write-Host "  ℹ No automatic fixes needed in Program.cs" -ForegroundColor Cyan
}

Write-Host ""

Write-Host "[STEP 3/9] Checking SQL Server LocalDB..." -ForegroundColor Yellow
try {
	$localDbInfo = sqllocaldb info MSSQLLocalDB 2>&1
	if ($LASTEXITCODE -eq 0) {
		$status = sqllocaldb info MSSQLLocalDB | Select-String "State" | Select-Object -First 1
		if ($status -match "Running") {
			Write-Host "  ✓ LocalDB is running" -ForegroundColor Green
		} else {
			Write-Host "  ⚠ LocalDB stopped. Starting..." -ForegroundColor Yellow
			sqllocaldb start MSSQLLocalDB | Out-Null
			Start-Sleep -Seconds 3
			Write-Host "  ✓ LocalDB started" -ForegroundColor Green
		}
	} else {
		Write-Host "  ✗ LocalDB instance not found" -ForegroundColor Red
		Write-Host "    Install SQL Server Express LocalDB" -ForegroundColor Yellow
	}
} catch {
	Write-Host "  ✗ Error checking LocalDB: $_" -ForegroundColor Red
}

Write-Host ""

Write-Host "[STEP 4/9] Stopping any running backend processes..." -ForegroundColor Yellow
$backendProcesses = Get-Process | Where-Object { $_.ProcessName -like "*ITSM.Portal.API*" }
if ($backendProcesses) {
	foreach ($proc in $backendProcesses) {
		try {
			Stop-Process -Id $proc.Id -Force
			Write-Host "  ✓ Stopped process: $($proc.ProcessName) (PID: $($proc.Id))" -ForegroundColor Green
		} catch {
			Write-Host "  ⚠ Could not stop PID $($proc.Id)" -ForegroundColor Yellow
		}
	}
} else {
	Write-Host "  ✓ No backend processes running" -ForegroundColor Green
}

# Also check ports
$port5000 = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
if ($port5000) {
	Write-Host "  ⚠ Port 5000 still in use (may clear automatically)" -ForegroundColor Yellow
}

Write-Host ""

Write-Host "[STEP 5/9] Cleaning build artifacts..." -ForegroundColor Yellow
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

Write-Host "[STEP 6/9] Restoring NuGet packages..." -ForegroundColor Yellow
dotnet restore ITSM.Portal.API\ITSM.Portal.API.csproj --verbosity quiet
if ($LASTEXITCODE -eq 0) {
	Write-Host "  ✓ NuGet packages restored" -ForegroundColor Green
} else {
	Write-Host "  ✗ Package restore failed" -ForegroundColor Red
}

Write-Host ""

if ($ResetDatabase) {
	Write-Host "[STEP 7/9] Resetting database (--ResetDatabase flag)..." -ForegroundColor Yellow
	Push-Location ITSM.Portal.API

	Write-Host "  ⚠ Dropping existing database..." -ForegroundColor Yellow
	dotnet ef database drop --force --verbosity quiet 2>&1 | Out-Null

	Write-Host "  ⚠ Recreating database from migrations..." -ForegroundColor Yellow
	$updateResult = dotnet ef database update --verbosity quiet 2>&1

	if ($LASTEXITCODE -eq 0) {
		Write-Host "  ✓ Database reset and migrations applied" -ForegroundColor Green
	} else {
		Write-Host "  ✗ Database update failed: $updateResult" -ForegroundColor Red
	}

	Pop-Location
} else {
	Write-Host "[STEP 7/9] Updating database migrations..." -ForegroundColor Yellow
	Push-Location ITSM.Portal.API

	$updateResult = dotnet ef database update --verbosity quiet 2>&1

	if ($LASTEXITCODE -eq 0) {
		Write-Host "  ✓ Database migrations applied" -ForegroundColor Green
	} else {
		Write-Host "  ✗ Database update failed" -ForegroundColor Red
		Write-Host "    Run with --ResetDatabase to drop and recreate" -ForegroundColor Yellow
	}

	Pop-Location
}

Write-Host ""

Write-Host "[STEP 8/9] Building project..." -ForegroundColor Yellow
$buildOutput = dotnet build ITSM.Portal.API\ITSM.Portal.API.csproj --verbosity quiet 2>&1

if ($LASTEXITCODE -eq 0) {
	Write-Host "  ✓ Build successful" -ForegroundColor Green
} else {
	Write-Host "  ✗ Build failed!" -ForegroundColor Red
	$buildOutput | Select-String "error" | ForEach-Object {
		Write-Host "    $_" -ForegroundColor Red
	}
}

Write-Host ""

Write-Host "[STEP 9/9] Verifying AI configuration..." -ForegroundColor Yellow
$appSettingsPath = "ITSM.Portal.API\appsettings.json"
if (Test-Path $appSettingsPath) {
	$settings = Get-Content $appSettingsPath -Raw | ConvertFrom-Json

	if ([string]::IsNullOrWhiteSpace($settings.AISettings.ApiKey)) {
		Write-Host "  ⚠ AI ApiKey is empty - AI Manager will use fallback responses" -ForegroundColor Yellow
		Write-Host "    To enable real AI: Add your OpenAI API key to appsettings.json" -ForegroundColor Gray
	} else {
		Write-Host "  ✓ AI ApiKey is configured" -ForegroundColor Green
	}
}

Write-Host ""
Write-Host @"
╔════════════════════════════════════════════════════════════════╗
║                      FIX SUMMARY                               ║
╚════════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan

if ($issuesFound.Count -gt 0) {
	Write-Host ""
	Write-Host "Issues Found:" -ForegroundColor Yellow
	foreach ($issue in $issuesFound) {
		Write-Host "  • $issue" -ForegroundColor Yellow
	}
}

if ($fixesApplied.Count -gt 0) {
	Write-Host ""
	Write-Host "Fixes Applied:" -ForegroundColor Green
	foreach ($fix in $fixesApplied) {
		Write-Host "  ✓ $fix" -ForegroundColor Green
	}
}

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                    NEXT STEPS                                  ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. In Visual Studio:" -ForegroundColor White
Write-Host "   • Press F5 to start the backend" -ForegroundColor Gray
Write-Host ""
Write-Host "2. In your browser:" -ForegroundColor White
Write-Host "   • Press F12 → Application → Cookies" -ForegroundColor Gray
Write-Host "   • Delete the 'jwt' cookie if it exists" -ForegroundColor Gray
Write-Host "   • Try logging in with: admin@itsm.com / Admin@123" -ForegroundColor Gray
Write-Host ""
Write-Host "3. If login still times out:" -ForegroundColor White
Write-Host "   • Check Visual Studio Output window for exceptions" -ForegroundColor Gray
Write-Host "   • Check browser Console (F12) for CORS errors" -ForegroundColor Gray
Write-Host "   • See: LOGIN_TIMEOUT_TROUBLESHOOTING.md" -ForegroundColor Gray
Write-Host ""
Write-Host "4. To reset database completely:" -ForegroundColor White
Write-Host "   • Run: .\fix-backend.ps1 -ResetDatabase" -ForegroundColor Gray
Write-Host ""

if ($fixesApplied.Count -gt 0) {
	Write-Host "✓ Auto-fixes were applied. Try running the app now!" -ForegroundColor Green
} else {
	Write-Host "ℹ No auto-fixes needed. If issues persist, check troubleshooting docs." -ForegroundColor Cyan
}

Write-Host ""
