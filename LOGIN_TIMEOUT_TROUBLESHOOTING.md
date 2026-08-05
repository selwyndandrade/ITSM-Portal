# LOGIN TIMEOUT - SYSTEMATIC TROUBLESHOOTING GUIDE

## Issue Description
Login request hangs and eventually times out with "exceeded time" error.

## Root Causes (In Order of Likelihood)

### 1. Service Lifetime Captive Dependency ⭐⭐⭐⭐⭐ MOST LIKELY
**Symptom**: Request hangs indefinitely, no error message  
**Cause**: IAIService registered as Singleton but depends on Scoped services  
**Fix**: Change from `AddSingleton<IAIService, AIService>()` to `AddScoped<IAIService, AIService>()`  
**Why it causes timeout**: Singleton services capture the first scoped instance and never release it, causing database context issues

### 2. Database Connection Deadlock ⭐⭐⭐⭐
**Symptom**: First request works, subsequent requests hang  
**Cause**: DbContext not being disposed properly  
**Fix**: Ensure all services using DbContext are Scoped, not Singleton  
**Test**: Restart SQL LocalDB: `sqllocaldb stop MSSQLLocalDB` then `sqllocaldb start MSSQLLocalDB`

### 3. Async/Await Deadlock ⭐⭐⭐
**Symptom**: Request hangs on first await  
**Cause**: Mixing `.Result` or `.Wait()` with async code  
**Check**: Search codebase for `.Result`, `.Wait()`, `.GetAwaiter().GetResult()`  
**Fix**: Use `await` consistently throughout the call chain

### 4. CORS Preflight Failure ⭐⭐
**Symptom**: Request never reaches the controller  
**Cause**: CORS preflight OPTIONS request failing  
**Check**: Browser Network tab shows failed OPTIONS request  
**Fix**: Ensure `app.UseCors()` comes BEFORE `app.UseAuthentication()`

### 5. JWT Token Validation Timeout ⭐⭐
**Symptom**: 401 eventually returned after long delay  
**Cause**: Token validation parameters incorrect  
**Check**: Verify Jwt:Key, Jwt:Issuer, Jwt:Audience in appsettings.json  
**Fix**: Clear browser cookies and try fresh login

### 6. Database Migration Pending ⭐
**Symptom**: First database query hangs  
**Cause**: Unapplied migrations  
**Test**: `dotnet ef database update --verbose`  
**Fix**: Apply migrations: `dotnet ef database update`

---

## SYSTEMATIC DEBUGGING PROCESS

### Step 1: Verify Backend is Running
```powershell
# Check if process is running
netstat -ano | findstr :5000

# If running, check Visual Studio Output window for:
# - Unhandled exceptions
# - Database connection errors
# - HTTP request logs
```

### Step 2: Test Without Frontend
Use Swagger UI or curl to isolate the issue:

```powershell
# Start backend in Visual Studio (F5)
# Navigate to: http://localhost:5000/swagger

# Try the login endpoint directly:
POST /api/auth/login
{
  "email": "admin@itsm.com",
  "password": "Admin@123"
}
```

**If Swagger also times out**: Backend issue confirmed  
**If Swagger works**: Frontend/CORS issue

### Step 3: Enable Detailed Logging
In `appsettings.Development.json`:
```json
{
  "Logging": {
	"LogLevel": {
	  "Default": "Debug",
	  "Microsoft.AspNetCore": "Information",
	  "Microsoft.EntityFrameworkCore.Database.Command": "Information"
	}
  }
}
```

Restart and check Output window for SQL queries being executed.

### Step 4: Check Database Connectivity
```powershell
cd ITSM.Portal.API
dotnet ef database update --verbose
```

Look for:
- ✓ "Applying migration..." - Good
- ✗ "Login failed" or "Network error" - Database connection problem
- ✗ Hangs forever - SQL LocalDB not running

### Step 5: Verify Service Registrations
Run the diagnostic script:
```powershell
.\diagnose-backend.ps1
```

Look for RED ✗ errors, especially:
- Service lifetime mismatches
- Missing DI registrations
- Build errors

### Step 6: Test Fresh Database
If all else fails, recreate the database:
```powershell
cd ITSM.Portal.API

# Backup first!
dotnet ef database drop --force
dotnet ef database update

# This will recreate and seed
```

---

## QUICK FIXES TO TRY (In Order)

### Fix 1: Restart Everything
```powershell
# Stop backend in Visual Studio (Shift+F5)
# Stop SQL LocalDB
sqllocaldb stop MSSQLLocalDB
Start-Sleep -Seconds 3
sqllocaldb start MSSQLLocalDB

# Rebuild in Visual Studio
# Start backend (F5)

# In browser:
# F12 → Application → Cookies → Delete "jwt" cookie
# Try login again
```

### Fix 2: Verify Program.cs Service Registration
Search Program.cs for:
```csharp
builder.Services.AddSingleton<IAIService, AIService>();
```

If found, change to:
```csharp
builder.Services.AddScoped<IAIService, AIService>();
```

This is the **#1 most likely cause** of the timeout.

### Fix 3: Check Middleware Order
In Program.cs, verify this exact order:
```csharp
app.UseCors("ReactPolicy");      // ← Must be FIRST
app.UseAuthentication();         // ← Then auth
app.UseAuthorization();          // ← Then authz
app.MapControllers();            // ← Then routing
```

### Fix 4: Clear All Cached Data
```powershell
# Delete bin and obj folders
cd ITSM.Portal.API
Remove-Item -Recurse -Force bin, obj

# Rebuild
dotnet build
```

---

## BROWSER-SIDE CHECKS

### Open Browser Developer Tools (F12)

#### Console Tab:
Look for:
- `CORS policy` errors (red text)
- `Failed to fetch` errors
- `401 Unauthorized` errors

#### Network Tab:
1. Clear network log
2. Try login
3. Look for the login request:
   - **Pending forever**: Backend timeout (service issue)
   - **Failed (red)**: CORS or network issue
   - **Status 401**: Authentication issue (not timeout)
   - **Status 500**: Backend exception

#### Application Tab → Cookies:
- Check if `jwt` cookie exists
- If corrupted, delete it
- Try login again

---

## EXPECTED BEHAVIOR (WORKING STATE)

When working correctly:

1. Browser sends POST to `/api/auth/login`
2. Request completes in < 500ms
3. Response status: 200 OK
4. Response body: `{"message":"Login successful","email":"...","role":"..."}`
5. `jwt` cookie is set (visible in Application tab)
6. Subsequent requests include the JWT automatically

---

## IF NOTHING WORKS

### Last Resort: Fresh Clone Test
```powershell
# In a different directory
git clone <your-repo>
cd ITSM-Portal
dotnet restore
cd ITSM.Portal.API
dotnet ef database update
dotnet run
```

If fresh clone works → Configuration issue in your working copy  
If fresh clone fails → Code issue needs debugging

---

## CAPTURE DIAGNOSTIC DATA

If you need to share the issue for help:

1. **Visual Studio Output Window** (Debug mode):
   - Copy ALL output from app start to timeout

2. **Browser Network Tab**:
   - Filter to `/api/auth/login`
   - Right-click → Copy → Copy as cURL

3. **Browser Console Tab**:
   - Copy all red errors

4. Run diagnostic script:
   ```powershell
   .\diagnose-backend.ps1 > diagnostic-results.txt
   ```

Share these 4 outputs for targeted help.

---

## AUTOMATED FIX ATTEMPT

Run this to attempt automatic fixes:

```powershell
# Stop backend in Visual Studio first!

# 1. Restart SQL LocalDB
sqllocaldb stop MSSQLLocalDB
sqllocaldb start MSSQLLocalDB

# 2. Update database
cd ITSM.Portal.API
dotnet ef database update

# 3. Rebuild
dotnet clean
dotnet build

# 4. Start
dotnet run
```

Then test: http://localhost:5000/swagger

