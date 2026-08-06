using ITSM.Portal.API.Data;
using ITSM.Portal.API.Models;
using ITSM.Portal.API.Seed;
using ITSM.Portal.API.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Microsoft.Extensions.Options;
using System.Text;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

var explicitConfigRoots = new[]
{
    builder.Environment.ContentRootPath,
    Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..")),
    Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "ITSM.Portal.API")),
    Path.GetFullPath(Path.Combine(builder.Environment.ContentRootPath, "ITSM.Portal.API"))
};

foreach (var configRoot in explicitConfigRoots.Distinct(StringComparer.OrdinalIgnoreCase))
{
    if (string.IsNullOrWhiteSpace(configRoot)) continue;

    var appSettingsPath = Path.Combine(configRoot, "appsettings.json");
    var envAppSettingsPath = Path.Combine(configRoot, $"appsettings.{builder.Environment.EnvironmentName}.json");

    if (File.Exists(appSettingsPath))
    {
        builder.Configuration.AddJsonFile(appSettingsPath, optional: true, reloadOnChange: false);
    }

    if (File.Exists(envAppSettingsPath))
    {
        builder.Configuration.AddJsonFile(envAppSettingsPath, optional: true, reloadOnChange: false);
    }
}

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? new[] { "http://localhost:5173", "http://127.0.0.1:5173" };

builder.Services.AddCors(options =>
{
    options.AddPolicy("ReactPolicy", policy =>
    {
        policy.WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    // Partitioned per caller (user id when authenticated, otherwise IP) - a single shared
    // "default" bucket meant every tenant's traffic counted against one platform-wide limit,
    // so one noisy or malicious client could exhaust the quota and 429 every other tenant.
    options.AddPolicy("default", httpContext =>
    {
        var partitionKey = httpContext.User.Identity?.IsAuthenticated == true
            ? httpContext.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "authenticated-unknown"
            : $"ip:{httpContext.Connection.RemoteIpAddress}";

        return RateLimitPartition.GetFixedWindowLimiter(partitionKey, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 100,
            Window = TimeSpan.FromMinutes(1),
            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
            QueueLimit = 0
        });
    });
});

// Database
var defaultConnectionString = builder.Configuration.GetConnectionString("DefaultConnection") ?? "";
if (string.IsNullOrWhiteSpace(defaultConnectionString))
{
    defaultConnectionString = "Server=(localdb)\\MSSQLLocalDB;Database=ITSMDatabase;Trusted_Connection=True;TrustServerCertificate=True";
}

var isLocalSqlServer = defaultConnectionString.Contains("(localdb)", StringComparison.OrdinalIgnoreCase)
    || defaultConnectionString.Contains("localhost", StringComparison.OrdinalIgnoreCase)
    || defaultConnectionString.Contains("127.0.0.1", StringComparison.OrdinalIgnoreCase);

var effectiveConnectionString = defaultConnectionString;
var shouldResetLocalDatabase = builder.Configuration.GetValue("ForceLocalDatabaseReset", false)
    || builder.Environment.IsDevelopment()
    || isLocalSqlServer;

if (shouldResetLocalDatabase)
{
    var sqlBuilder = new SqlConnectionStringBuilder(defaultConnectionString);
    sqlBuilder.InitialCatalog = "ITSMDatabaseDev";
    effectiveConnectionString = sqlBuilder.ConnectionString;
}

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(effectiveConnectionString));


// Identity
builder.Services.AddIdentity<ApplicationUser, IdentityRole>(options =>
{
    options.User.RequireUniqueEmail = true;
    options.Password.RequireDigit = true;
    options.Password.RequireLowercase = true;
    options.Password.RequireUppercase = true;
    options.Password.RequireNonAlphanumeric = true;
    options.Password.RequiredLength = 8;
    options.Lockout.MaxFailedAccessAttempts = 5;
    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
})
.AddEntityFrameworkStores<ApplicationDbContext>()
.AddDefaultTokenProviders();


// JWT Authentication
var jwtKey = builder.Configuration["Jwt:Key"];
if (string.IsNullOrWhiteSpace(jwtKey))
{
    if (!builder.Environment.IsDevelopment())
    {
        throw new InvalidOperationException("Jwt:Key must be configured (e.g. via the Jwt__Key environment variable) outside of Development.");
    }

    // Local-only fallback so `dotnet run` works out of the box in Development.
    jwtKey = "DEV_ONLY_INSECURE_JWT_SIGNING_KEY_DO_NOT_USE_IN_PRODUCTION";
    builder.Configuration["Jwt:Key"] = jwtKey;
}

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.SaveToken = true;

    options.RequireHttpsMetadata = false;

    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,

        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),

        ValidateIssuer = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "ITSM.Portal.API",

        ValidateAudience = true,
        ValidAudience = builder.Configuration["Jwt:Audience"] ?? "ITSM.Portal.Client",

        ValidateLifetime = true,

        ClockSkew = TimeSpan.Zero
    };
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            // Read token from cookie named 'jwt'
            var token = context.Request.Cookies["jwt"];
            if (!string.IsNullOrEmpty(token))
            {
                context.Token = token;
            }
            return Task.CompletedTask;
        }
    };
});


builder.Services.AddAuthorization();

builder.Services.AddProblemDetails();

builder.Services.Configure<AISettings>(builder.Configuration.GetSection(AISettings.SectionName));
builder.Services.AddScoped<IKnowledgeArticleService, KnowledgeArticleService>();
builder.Services.AddScoped<IAIConversationService, AIConversationService>();
builder.Services.AddSingleton<IAIConversationCache, AIConversationCache>();
builder.Services.AddHttpClient<OpenAIProvider>();
builder.Services.AddHttpClient<AzureOpenAIProvider>();
builder.Services.AddScoped<IAIProvider>(sp =>
{
    var aiSettings = sp.GetRequiredService<IOptions<AISettings>>().Value;
    return string.Equals(aiSettings.Provider, "AzureOpenAI", StringComparison.OrdinalIgnoreCase)
        ? sp.GetRequiredService<AzureOpenAIProvider>()
        : sp.GetRequiredService<OpenAIProvider>();
});
builder.Services.AddScoped<IAIService, AIService>();
builder.Services.AddScoped<AutomationEngineService>();
builder.Services.AddScoped<OrganizationService>();
builder.Services.AddScoped<SetupWizardService>();
builder.Services.AddScoped<SubscriptionPlanService>();
builder.Services.AddScoped<AuditLogService>();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<TenantContextService>();

// Controllers
builder.Services.AddControllers();


// Swagger
builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",

        Type = SecuritySchemeType.ApiKey,

        In = ParameterLocation.Header,

        Scheme = "Bearer",

        BearerFormat = "JWT",

        Description = "Enter: Bearer {your JWT token}"
    });


    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },

            Array.Empty<string>()
        }
    });
});


var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    var isLocalDevelopment = builder.Environment.IsDevelopment()
        || builder.Configuration.GetValue("ForceLocalDatabaseReset", false)
        || defaultConnectionString.Contains("(localdb)", StringComparison.OrdinalIgnoreCase);

    // Opt-in: apply real migrations locally too (same code path as production) instead of the
    // default wipe-and-rebuild-from-model behavior below. Off by default so local dev keeps its
    // always-fresh demo dataset; set "UseMigrationsInDevelopment": true to validate the actual
    // migration chain against LocalDB without needing a full deploy.
    var useMigrationsInDevelopment = builder.Configuration.GetValue("UseMigrationsInDevelopment", false);

    if (isLocalDevelopment && useMigrationsInDevelopment)
    {
        try
        {
            dbContext.Database.Migrate();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Database migration warning: {ex.Message}");
        }
    }
    else if (isLocalDevelopment)
    {
        try
        {
            dbContext.Database.EnsureDeleted();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Database reset warning: {ex.Message}");
        }

        try
        {
            dbContext.Database.EnsureCreated();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Database initialization warning: {ex.Message}");
        }
    }
    else
    {
        // Outside local dev, apply real EF Core migrations instead of EnsureCreated so schema
        // changes are versioned and existing production data isn't wiped or left out of sync.
        try
        {
            dbContext.Database.Migrate();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Database migration warning: {ex.Message}");
        }
    }

    try
    {
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        await DbSeeder.SeedRolesAsync(roleManager);

        // Demo/sample data (default admin account with a known password, the "Northwind Digital"
        // sample org, demo users/tickets/assets) must never be created outside local development -
        // it would otherwise expose predictable credentials and fabricated data in a real deployment.
        var seedDemoData = builder.Configuration.GetValue("SeedDemoData", builder.Environment.IsDevelopment());
        if (seedDemoData)
        {
            await DbSeeder.SeedDefaultAdminUserAsync(userManager);
            await DbSeeder.SeedPlatformAdminUserAsync(userManager);
            await DbSeeder.SeedDemoEnvironmentAsync(dbContext, userManager, roleManager);
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Seeding warning: {ex.Message}");
    }

    try
    {
        await CatalogSeed.SeedCatalogItems(dbContext);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Catalog seeding warning: {ex.Message}");
    }
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    app.UseExceptionHandler();
}

var enableHttpsRedirection = builder.Configuration.GetValue("EnableHttpsRedirection", false);
if (enableHttpsRedirection)
{
    app.UseHttpsRedirection();
}

app.UseCors("ReactPolicy");

app.Use(async (context, next) =>
{
    // Baseline hardening headers - safe to apply to every response, dev or prod.
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["X-Frame-Options"] = "DENY";
    context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    await next();
});

app.UseStaticFiles();
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();

app.MapControllers().RequireRateLimiting("default");


app.Run();
