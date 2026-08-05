// ==============================================
// CORRECT SERVICE REGISTRATION - COPY THIS
// ==============================================
// Replace the AI service registration section in Program.cs with this exact code

// AI and knowledge-base modules are independent of ticket and authentication services.
builder.Services.Configure<AISettings>(builder.Configuration.GetSection(AISettings.SectionName));

// Knowledge Article Service
builder.Services.AddScoped<IKnowledgeArticleService, KnowledgeArticleService>();

// AI Conversation Service  
builder.Services.AddScoped<IAIConversationService, AIConversationService>();

// OpenAI Provider with HttpClient
builder.Services.AddHttpClient<OpenAIProvider>();
builder.Services.AddScoped<IAIProvider, OpenAIProvider>();

// AI Service - MUST BE SCOPED, NOT SINGLETON
// AIService depends on scoped services (IKnowledgeArticleService, IAIConversationService)
// A singleton service cannot capture scoped dependencies
builder.Services.AddScoped<IAIService, AIService>();

// ==============================================
// CRITICAL NOTES:
// ==============================================
// 
// 1. ALL services MUST be Scoped (not Singleton) because they depend on ApplicationDbContext
// 2. Service registration order matters for some ASP.NET Core features
// 3. AddHttpClient<T>() does NOT automatically register interface mappings
// 4. Verify in appsettings.json that AISettings.ApiKey is set (or expect fallback responses)
//
// ==============================================
