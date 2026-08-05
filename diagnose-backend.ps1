# ITSM Portal - Complete Backend Diagnostic & Fix Script
# Run this in PowerShell as Administrator

Write-Host "=== ITSM Portal Backend Diagnostic Tool ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check SQL Server LocalDB
Write-Host "[1/7] Checking SQL Server LocalDB..." -ForegroundColor Yellow
try {
	$sqllocaldb = sqllocaldb info MSSQLLocalDB 2>&1
	if ($LASTEXITCODE -eq 0) {
		Write-Host "  ✓ LocalDB instance found" -ForegroundColor Green

		$status = sqllocaldb info MSSQLLocalDB | Select-String "State:"
		if ($status -match "Running") {
			Write-Host "  ✓ LocalDB is running" -ForegroundColor Green
		} else {
			Write-Host "  ⚠ LocalDB is stopped. Starting..." -ForegroundColor Yellow
			sqllocaldb start MSSQLLocalDB
			Start-Sleep -Seconds 3
			Write-Host "  ✓ LocalDB started" -ForegroundColor Green
		}
	}
} catch {
	Write-Host "  ✗ LocalDB not found or not running" -ForegroundColor Red
	Write-Host "    Install SQL Server LocalDB or check connection string" -ForegroundColor Red
}

Write-Host ""

# Step 2: Check if backend is running on port 5000/5001
Write-Host "[2/7] Checking if backend is already running..." -ForegroundColor Yellow
$port5000 = netstat -ano | Select-String ":5000" | Select-Object -First 1
$port5001 = netstat -ano | Select-String ":5001" | Select-Object -First 1

if ($port5000 -or $port5001) {
	Write-Host "  ⚠ Backend appears to be running on port 5000 or 5001" -ForegroundColor Yellow

	if ($port5000) {
		$pid = ($port5000 -split '\s+')[-1]
		Write-Host "    Process on port 5000: PID $pid" -ForegroundColor Yellow
	}
	if ($port5001) {
		$pid = ($port5001 -split '\s+')[-1]
		Write-Host "    Process on port 5001: PID $pid" -ForegroundColor Yellow
	}

	Write-Host "    Stop the backend in Visual Studio before running diagnostics" -ForegroundColor Yellow
} else {
	Write-Host "  ✓ No backend currently running on standard ports" -ForegroundColor Green
}

Write-Host ""

# Step 3: Verify project files exist
Write-Host "[3/7] Checking project structure..." -ForegroundColor Yellow
$projectPath = "ITSM.Portal.API\ITSM.Portal.API.csproj"
if (Test-Path $projectPath) {
	Write-Host "  ✓ Project file found: $projectPath" -ForegroundColor Green
} else {
	Write-Host "  ✗ Project file not found!" -ForegroundColor Red
	Write-Host "    Make sure you're running this from the solution directory" -ForegroundColor Red
	exit 1
}

$programCs = "ITSM.Portal.API\Program.cs"
if (Test-Path $programCs) {
	Write-Host "  ✓ Program.cs found" -ForegroundColor Green
} else {
	Write-Host "  ✗ Program.cs not found!" -ForegroundColor Red
	exit 1
}

Write-Host ""

# Step 4: Check for service lifetime issues in Program.cs
Write-Host "[4/7] Analyzing Program.cs for common issues..." -ForegroundColor Yellow
$programContent = Get-Content $programCs -Raw

if ($programContent -match 'AddSingleton<IAIService') {
	Write-Host "  ✗ CRITICAL: IAIService registered as Singleton (WRONG!)" -ForegroundColor Red
	Write-Host "    This causes captive dependency issues and timeouts" -ForegroundColor Red
	Write-Host "    FIX: Change AddSingleton<IAIService, AIService>() to AddScoped<IAIService, AIService>()" -ForegroundColor Yellow
} elseif ($programContent -match 'AddScoped<IAIService') {
	Write-Host "  ✓ IAIService is correctly registered as Scoped" -ForegroundColor Green
} else {
	Write-Host "  ⚠ Cannot find IAIService registration" -ForegroundColor Yellow
}

if ($programContent -match 'AddScoped<IAIProvider, OpenAIProvider>') {
	Write-Host "  ✓ IAIProvider is correctly registered" -ForegroundColor Green
} else {
	Write-Host "  ⚠ IAIProvider registration may be missing or incorrect" -ForegroundColor Yellow
}

if ($programContent -match 'UseCors.*UseAuthentication') {
	Write-Host "  ✓ CORS is configured before Authentication (correct order)" -ForegroundColor Green
} else {
	Write-Host "  ⚠ Check middleware order: CORS should come before Authentication" -ForegroundColor Yellow
}

Write-Host ""

# Step 5: Check appsettings.json for AI configuration
Write-Host "[5/7] Checking AI configuration..." -ForegroundColor Yellow
$appSettings = "ITSM.Portal.API\appsettings.json"
if (Test-Path $appSettings) {
	$settings = Get-Content $appSettings -Raw | ConvertFrom-Json

	if ($settings.AISettings.ApiKey -eq "" -or $null -eq $settings.AISettings.ApiKey) {
		Write-Host "  ⚠ AI ApiKey is empty - AI Manager will use fallback responses only" -ForegroundColor Yellow
	} else {
		Write-Host "  ✓ AI ApiKey is configured" -ForegroundColor Green
	}

	if ($settings.AISettings.Model -eq "" -or $null -eq $settings.AISettings.Model) {
		Write-Host "  ⚠ AI Model is empty - set to 'gpt-3.5-turbo' or similar" -ForegroundColor Yellow
	} else {
		Write-Host "  ✓ AI Model is configured: $($settings.AISettings.Model)" -ForegroundColor Green
	}
} else {
	Write-Host "  ✗ appsettings.json not found!" -ForegroundColor Red
}

Write-Host ""

# Step 6: Check database migrations
Write-Host "[6/7] Checking database status..." -ForegroundColor Yellow
Push-Location ITSM.Portal.API
try {
	Write-Host "  Running: dotnet ef database update --dry-run" -ForegroundColor Gray
	$dbCheck = dotnet ef database update --dry-run 2>&1

	if ($LASTEXITCODE -eq 0) {
		if ($dbCheck -match "No migrations were applied") {
			Write-Host "  ✓ Database is up to date" -ForegroundColor Green
		} else {
			Write-Host "  ⚠ Pending migrations detected" -ForegroundColor Yellow
			Write-Host "    Run: dotnet ef database update" -ForegroundColor Yellow
		}
	} else {
		Write-Host "  ✗ Database connection or migration issue" -ForegroundColor Red
		Write-Host "    Error: $dbCheck" -ForegroundColor Red
	}
} catch {
	Write-Host "  ✗ Failed to check database" -ForegroundColor Red
	Write-Host "    Make sure Entity Framework tools are installed:" -ForegroundColor Yellow
	Write-Host "    dotnet tool install --global dotnet-ef" -ForegroundColor Yellow
}
Pop-Location

Write-Host ""

# Step 7: Build project to check for compilation errors
Write-Host "[7/7] Building project..." -ForegroundColor Yellow
Push-Location ITSM.Portal.API
$buildOutput = dotnet build --no-restore 2>&1
Pop-Location

if ($LASTEXITCODE -eq 0) {
	Write-Host "  ✓ Project builds successfully" -ForegroundColor Green
} else {
	Write-Host "  ✗ Build errors detected:" -ForegroundColor Red
	$buildOutput | Select-String "error" | ForEach-Object {
		Write-Host "    $_" -ForegroundColor Red
	}
}

Write-Host ""
Write-Host "=== Diagnostic Summary ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Yellow
Write-Host "1. Review any ✗ RED errors above and fix them" -ForegroundColor White
Write-Host "2. Address any ⚠ YELLOW warnings (especially service lifetime issues)" -ForegroundColor White
Write-Host "3. In Visual Studio: Clean Solution → Rebuild Solution" -ForegroundColor White
Write-Host "4. Stop any running instances, then press F5 to start fresh" -ForegroundColor White
Write-Host "5. Clear browser cookies for localhost:5173" -ForegroundColor White
Write-Host "6. Test login with admin@itsm.com / Admin@123" -ForegroundColor White
Write-Host ""
Write-Host "For detailed fixes, see: BACKEND_FIXES.md" -ForegroundColor Cyan
Write-Host ""
