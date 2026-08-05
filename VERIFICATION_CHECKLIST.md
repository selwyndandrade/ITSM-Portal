# ✅ BACKEND VERIFICATION CHECKLIST

Use this checklist to verify all backend components are correctly configured.

---

## 🔧 Service Registration - Program.cs

### Location: Lines ~90-100 in ITSM.Portal.API\Program.cs

```csharp
// ✅ Verify these exact lines exist:

// AI Services Configuration
builder.Services.Configure<AISettings>(builder.Configuration.GetSection(AISettings.SectionName));

// Knowledge Article Service
builder.Services.AddScoped<IKnowledgeArticleService, KnowledgeArticleService>();

// AI Conversation Service
builder.Services.AddScoped<IAIConversationService, AIConversationService>();

// OpenAI Provider (with HttpClient)
builder.Services.AddHttpClient<OpenAIProvider>();

// ⭐ CRITICAL: IAIProvider interface registration
builder.Services.AddScoped<IAIProvider, OpenAIProvider>();

// ⭐ CRITICAL: IAIService MUST be Scoped (not Singleton)
builder.Services.AddScoped<IAIService, AIService>();
```

### ❌ WRONG Patterns (Replace if found):
```csharp
// ❌ This is WRONG - interface not registered:
builder.Services.AddHttpClient<IAIProvider, OpenAIProvider>();

// ❌ This is WRONG - Singleton causes timeouts:
builder.Services.AddSingleton<IAIService, AIService>();
```

### ✅ Checklist:
- [ ] `AddHttpClient<OpenAIProvider>()` present (no interface in brackets)
- [ ] `AddScoped<IAIProvider, OpenAIProvider>()` present (explicit interface mapping)
- [ ] `AddScoped<IAIService, AIService>()` present (NOT Singleton)
- [ ] All three services use `AddScoped` (not Singleton)

---

## 🔀 Middleware Order - Program.cs

### Location: Lines ~145-170 in ITSM.Portal.API\Program.cs

```csharp
app.UseCors("ReactPolicy");      // ✅ Must be FIRST
app.UseAuthentication();         // ✅ Then authentication
app.UseAuthorization();          // ✅ Then authorization
app.MapControllers();           // ✅ Then routing
```

### ✅ Checklist:
- [ ] `UseCors` comes BEFORE `UseAuthentication`
- [ ] `UseAuthentication` comes BEFORE `UseAuthorization`
- [ ] No middleware between CORS and Auth

---

## 🗄️ Database Configuration

### Connection String - appsettings.json

```json
{
  "ConnectionStrings": {
	"DefaultConnection": "Server=(localdb)\\MSSQLLocalDB;Database=ITSMDatabase;Trusted_Connection=True;TrustServerCertificate=True"
  }
}
```

### ✅ Checklist:
- [ ] Connection string points to LocalDB
- [ ] `TrustServerCertificate=True` is present
- [ ] SQL LocalDB is running: `sqllocaldb info MSSQLLocalDB`
- [ ] Migrations are applied: `dotnet ef database update`

---

## 🤖 AI Configuration - appsettings.json

### Current State:
```json
{
  "AISettings": {
	"Provider": "",
	"ApiKey": "",
	"Model": ""
  }
}
```

### For Real AI (Optional):
```json
{
  "AISettings": {
	"Provider": "OpenAI",
	"ApiKey": "sk-your-api-key-here",
	"Model": "gpt-3.5-turbo"
  }
}
```

### ✅ Checklist:
- [ ] AISettings section exists
- [ ] If empty: AI will use fallback responses (**this is OK for testing**)
- [ ] If configured: API key is valid OpenAI key starting with "sk-"

---

## 🔐 JWT Configuration - appsettings.json

```json
{
  "Jwt": {
	"Key": "THIS_IS_MY_SUPER_SECRET_KEY_FOR_ITSM_PORTAL_2026",
	"Issuer": "ITSM.Portal.API",
	"Audience": "ITSM.Portal.Client"
  }
}
```

### ✅ Checklist:
- [ ] Jwt:Key is at least 32 characters long
- [ ] Jwt:Issuer matches Program.cs configuration
- [ ] Jwt:Audience matches Program.cs configuration

---

## 🌐 CORS Configuration - Program.cs

```csharp
builder.Services.AddCors(options =>
{
	options.AddPolicy("ReactPolicy", policy =>
	{
		policy.WithOrigins("http://localhost:5173")
			  .AllowAnyHeader()
			  .AllowAnyMethod()
			  .AllowCredentials();
	});
});
```

### ✅ Checklist:
- [ ] Origin is `http://localhost:5173` (matches your frontend)
- [ ] `AllowCredentials()` is present (required for JWT cookies)
- [ ] Policy name is "ReactPolicy"
- [ ] `app.UseCors("ReactPolicy")` matches the policy name

---

## 🏗️ Build Status

### Run These Commands:
```powershell
cd ITSM.Portal.API

# Clean
dotnet clean

# Restore
dotnet restore

# Build
dotnet build
```

### ✅ Checklist:
- [ ] No build errors
- [ ] No build warnings about missing dependencies
- [ ] bin\Debug\net8.0\ITSM.Portal.API.dll exists

---

## 🚀 Runtime Verification

### Start the Backend:
```powershell
cd ITSM.Portal.API
dotnet run
```

### ✅ Checklist:
- [ ] Application starts without exceptions
- [ ] Output shows: "Now listening on: http://localhost:5000"
- [ ] No DI validation errors
- [ ] No database connection errors
- [ ] Swagger UI loads: http://localhost:5000/swagger

---

## 🧪 Functional Testing

### Test 1: Swagger Login
1. Navigate to: http://localhost:5000/swagger
2. Expand `POST /api/auth/login`
3. Click "Try it out"
4. Enter:
   ```json
   {
	 "email": "admin@itsm.com",
	 "password": "Admin@123"
   }
   ```
5. Click "Execute"

### ✅ Expected Result:
- [ ] Response code: 200
- [ ] Response body contains: `"message":"Login successful"`
- [ ] Response time: < 1 second

### ❌ If Failed:
- Response 401: Check password (should be Admin@123)
- Timeout: Service lifetime issue - check service registrations
- 500 error: Check Visual Studio Output window for exception

---

### Test 2: Frontend Login
1. Start frontend: `npm run dev` (in frontend directory)
2. Navigate to: http://localhost:5173
3. Enter credentials:
   - Email: admin@itsm.com
   - Password: Admin@123
4. Click Login

### ✅ Expected Result:
- [ ] Login completes in < 1 second
- [ ] Redirected to dashboard
- [ ] No CORS errors in browser console (F12)
- [ ] JWT cookie is set (F12 → Application → Cookies)

### ❌ If Failed:
- CORS error: Check CORS configuration and middleware order
- Timeout: Run diagnostic script
- 401: Clear browser cookies and try again

---

### Test 3: AI Manager
1. Login to frontend
2. Navigate to AI Help Manager
3. Enter test message: "My laptop won't turn on"
4. Send

### ✅ Expected Result (With API Key):
- [ ] AI-generated response appears
- [ ] Response is contextual to the question
- [ ] Knowledge articles appear if relevant

### ✅ Expected Result (Without API Key):
- [ ] Fallback response appears: "Check connections, restart the affected device..."
- [ ] Knowledge articles still appear
- [ ] No errors or crashes

---

### Test 4: Ticket Creation
1. Login to frontend
2. Navigate to Create Ticket
3. Fill in:
   - Title: "Test Ticket"
   - Description: "Testing ticket creation"
   - Category: "Network"
   - Priority: "Medium"
4. Submit

### ✅ Expected Result:
- [ ] Ticket creates successfully
- [ ] Redirected to ticket list
- [ ] New ticket appears in the list
- [ ] No timeout errors

---

## 🔍 Visual Studio Output Checks

### When Starting Backend (F5):

### ✅ Good Output:
```
info: Microsoft.Hosting.Lifetime[14]
	  Now listening on: http://localhost:5000
info: Microsoft.Hosting.Lifetime[0]
	  Application started. Press Ctrl+C to shut down.
```

### ❌ Bad Output (Examples):
```
System.AggregateException: Some services are not able to be constructed
→ Service registration issue - check DI configuration

Microsoft.Data.SqlClient.SqlException: Cannot open database
→ Database issue - check SQL LocalDB is running

System.InvalidOperationException: Unable to resolve service for type
→ Missing service registration - check Program.cs
```

---

## 🌐 Browser Console Checks (F12)

### ✅ Good Console (No Errors):
```
(No red errors)
```

### ❌ Bad Console (Examples):
```
Access to fetch at 'http://localhost:5000/api/auth/login' blocked by CORS policy
→ CORS issue - check CORS configuration

POST http://localhost:5000/api/auth/login net::ERR_CONNECTION_REFUSED
→ Backend not running - start backend

401 Unauthorized
→ Invalid credentials or JWT issue - clear cookies and try again
```

---

## 🗂️ File Checklist

### Verify These Files Exist:

#### Backend Core:
- [ ] ITSM.Portal.API\Program.cs
- [ ] ITSM.Portal.API\appsettings.json
- [ ] ITSM.Portal.API\appsettings.Development.json

#### Services:
- [ ] ITSM.Portal.API\Services\AIService.cs
- [ ] ITSM.Portal.API\Services\IAIService.cs
- [ ] ITSM.Portal.API\Services\OpenAIProvider.cs
- [ ] ITSM.Portal.API\Services\IAIProvider.cs
- [ ] ITSM.Portal.API\Services\AISettings.cs
- [ ] ITSM.Portal.API\Services\KnowledgeArticleService.cs
- [ ] ITSM.Portal.API\Services\AIConversationService.cs

#### Controllers:
- [ ] ITSM.Portal.API\Controllers\AuthController.cs
- [ ] ITSM.Portal.API\Controllers\AIController.cs
- [ ] ITSM.Portal.API\Controllers\TicketsController.cs

---

## 📊 Quick Status Check

Run this command to get a quick overview:
```powershell
.\diagnose-backend.ps1
```

### ✅ All Green Checkmarks:
Backend is properly configured. Login should work.

### ⚠️ Yellow Warnings:
Non-critical issues. May affect AI Manager but not login.

### ✗ Red Errors:
Critical issues. Must be fixed before login will work.

---

## 🎯 Final Verification Steps

### 1. Automated Check:
```powershell
.\fix-backend.ps1
```
Should show: "✓ Auto-fixes were applied" or "ℹ No auto-fixes needed"

### 2. Manual Build:
```powershell
cd ITSM.Portal.API
dotnet clean
dotnet build
```
Should show: "Build succeeded. 0 Warning(s). 0 Error(s)."

### 3. Database Check:
```powershell
cd ITSM.Portal.API
dotnet ef database update --verbose
```
Should show migrations being applied or "No migrations were applied"

### 4. Runtime Check:
```powershell
cd ITSM.Portal.API
dotnet run
```
Should show: "Now listening on: http://localhost:5000" with no errors

### 5. Swagger Check:
Navigate to: http://localhost:5000/swagger  
Should load without errors

### 6. Login Check:
Use Swagger `/api/auth/login` endpoint  
Should return 200 OK in < 1 second

---

## ✅ FINAL STATUS

If ALL checkboxes above are checked:
- ✅ Backend is correctly configured
- ✅ Login should work
- ✅ AI Manager will function (with fallback if no API key)
- ✅ Ticketing system should be operational

If ANY checkbox is unchecked:
- Refer to the specific section
- Apply the fix recommended
- Re-run verification

---

## 🆘 Emergency Quick Fix

If you just want to get it working ASAP:

```powershell
# Run this in PowerShell as Administrator:
.\fix-backend.ps1 -ResetDatabase

# Then in Visual Studio:
# 1. Clean Solution
# 2. Rebuild Solution
# 3. Press F5

# Then in Browser:
# 1. Clear cookies (F12 → Application → Cookies)
# 2. Refresh page
# 3. Login with admin@itsm.com / Admin@123
```

This performs a full reset and should resolve most issues.

