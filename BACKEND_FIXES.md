# COMPREHENSIVE BACKEND FIX GUIDE

## CRITICAL ISSUE IDENTIFIED: Service Lifetime Mismatch

### Problem
The original exception message stated:
```
ServiceType: ITSM.Portal.API.Services.IAIService Lifetime: Singleton
```

But AIService depends on:
- IKnowledgeArticleService (Scoped)
- IAIProvider (Scoped)
- IAIConversationService (Scoped)

**A Singleton service CANNOT depend on Scoped services** - this is a "captive dependency" anti-pattern.

### Root Cause of Login Timeout
When AIService is registered as Singleton and depends on Scoped services, the DI container may:
1. Fail validation in ASP.NET Core 8.0+ (strict mode)
2. Create zombie dependencies that never get disposed
3. Cause database connection leaks
4. Result in timeouts and hanging requests

---

## FIX #1: Correct Service Lifetimes in Program.cs

### Current (INCORRECT):
```csharp
builder.Services.AddScoped<IKnowledgeArticleService, KnowledgeArticleService>();
builder.Services.AddScoped<IAIConversationService, AIConversationService>();
builder.Services.AddHttpClient<OpenAIProvider>();
builder.Services.AddScoped<IAIProvider, OpenAIProvider>();
builder.Services.AddSingleton<IAIService, AIService>();  // ❌ WRONG!
```

### Fixed (CORRECT):
```csharp
builder.Services.AddScoped<IKnowledgeArticleService, KnowledgeArticleService>();
builder.Services.AddScoped<IAIConversationService, AIConversationService>();
builder.Services.AddHttpClient<OpenAIProvider>();
builder.Services.AddScoped<IAIProvider, OpenAIProvider>();
builder.Services.AddScoped<IAIService, AIService>();  // ✅ CORRECT!
```

**Why**: All services must be Scoped because they all depend on ApplicationDbContext (which is Scoped).

---

## FIX #2: AI Configuration (AI Manager Not Working)

### In appsettings.json, change:
```json
"AISettings": {
	"Provider": "",
	"ApiKey": "",
	"Model": ""
}
```

### To (example with OpenAI):
```json
"AISettings": {
	"Provider": "OpenAI",
	"ApiKey": "sk-your-api-key-here",
	"Model": "gpt-3.5-turbo"
}
```

**Note**: Without valid credentials, AI will only return fallback responses.

---

## FIX #3: Database Connection Check

The login timeout might also be caused by database connection issues.

### Verify:
1. SQL Server LocalDB is running:
   ```powershell
   sqllocaldb info
   sqllocaldb start MSSQLLocalDB
   ```

2. Database exists and migrations are applied:
   ```powershell
   cd ITSM.Portal.API
   dotnet ef database update
   ```

---

## FIX #4: CORS Configuration Verification

Ensure Program.cs has CORS configured BEFORE Authentication:

```csharp
app.UseCors("ReactPolicy");      // ✅ MUST BE FIRST
app.UseAuthentication();         // Then auth
app.UseAuthorization();          // Then authz
```

**Order matters!** Wrong order can cause requests to hang.

---

## FIX #5: JWT Cookie Issues

If JWT cookie is corrupted, login will fail. Clear it by:

### In Browser (F12 → Application tab → Cookies):
- Delete the "jwt" cookie for localhost:5173

### Or programmatically test without cookies:
Use the `dev-login` endpoint in Swagger (DEBUG mode only)

---

## IMPLEMENTATION STEPS

### Step 1: Fix Program.cs
Replace the AI service registration section with:
```csharp
// AI and knowledge-base modules
builder.Services.Configure<AISettings>(builder.Configuration.GetSection(AISettings.SectionName));
builder.Services.AddScoped<IKnowledgeArticleService, KnowledgeArticleService>();
builder.Services.AddScoped<IAIConversationService, AIConversationService>();
builder.Services.AddHttpClient<OpenAIProvider>();
builder.Services.AddScoped<IAIProvider, OpenAIProvider>();
builder.Services.AddScoped<IAIService, AIService>();  // Changed from AddSingleton to AddScoped
```

### Step 2: Update AI Configuration (Optional - for AI Manager)
Edit appsettings.json and add your API key.

### Step 3: Restart Everything
1. Stop the backend (Shift+F5)
2. Stop SQL LocalDB if needed: `sqllocaldb stop MSSQLLocalDB`
3. Start SQL LocalDB: `sqllocaldb start MSSQLLocalDB`
4. Rebuild solution
5. Start backend (F5)
6. Clear browser cookies
7. Test login

---

## DIAGNOSTIC COMMANDS

### Check if backend is running:
```powershell
netstat -ano | findstr :5000
netstat -ano | findstr :5001
```

### Check database connection:
```powershell
cd ITSM.Portal.API
dotnet ef database update --verbose
```

### Test API directly (bypass frontend):
```powershell
# Using curl or Postman
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "admin@itsm.com",
  "password": "Admin@123"
}
```

---

## EXPECTED BEHAVIOR AFTER FIXES

✅ Backend starts without DI validation errors
✅ Login completes quickly (< 1 second)
✅ JWT cookie is set successfully
✅ AI Manager returns fallback responses (or AI-generated if API key configured)
✅ No timeouts on any endpoints

---

## IF PROBLEMS PERSIST

1. Check Visual Studio Output window for exception details
2. Enable detailed errors in appsettings.Development.json:
   ```json
   "Logging": {
	 "LogLevel": {
	   "Default": "Debug",
	   "Microsoft.AspNetCore": "Debug",
	   "Microsoft.EntityFrameworkCore": "Debug"
	 }
   }
   ```
3. Check browser Network tab (F12) for failed requests
4. Look for CORS errors in browser console
5. Verify SQL Server connection string in appsettings.json

