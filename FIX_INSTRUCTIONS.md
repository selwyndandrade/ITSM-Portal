# Fix for Dependency Injection Error

## Problem
The application fails to start with: "Unable to resolve service for type 'ITSM.Portal.API.Services.IAIProvider'"

## Solution

In **ITSM.Portal.API/Program.cs**, find these lines (around line 97-98):

```csharp
builder.Services.AddHttpClient<IAIProvider, OpenAIProvider>();
builder.Services.AddScoped<IAIService, AIService>();
```

**Replace them with these 3 lines:**

```csharp
builder.Services.AddHttpClient<OpenAIProvider>();
builder.Services.AddScoped<IAIProvider, OpenAIProvider>();
builder.Services.AddScoped<IAIService, AIService>();
```

## Why This Fixes It

The `AddHttpClient<TInterface, TImplementation>()` method does NOT register the interface with the DI container. By splitting it into two separate registrations:
1. `AddHttpClient<OpenAIProvider>()` - Registers the typed HttpClient for OpenAIProvider
2. `AddScoped<IAIProvider, OpenAIProvider>()` - Explicitly registers the IAIProvider interface

This allows AIService to properly inject IAIProvider through its constructor.

## After Applying the Fix

Rebuild and run the application. The dependency injection error should be resolved.
