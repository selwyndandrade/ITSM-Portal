using ITSM.Portal.API.Data;
using ITSM.Portal.API.DTOs;
using ITSM.Portal.API.Models;
using ITSM.Portal.API.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace ITSM.Portal.API.Tests;

public class AIServiceTests
{
    private static AuditLogService CreateAuditLogService()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var dbContext = new ApplicationDbContext(options);

        var userStore = new UserStore<ApplicationUser>(dbContext);
        var userManager = new UserManager<ApplicationUser>(
            userStore,
            null,
            new PasswordHasher<ApplicationUser>(),
            new IUserValidator<ApplicationUser>[] { new UserValidator<ApplicationUser>() },
            new IPasswordValidator<ApplicationUser>[] { new PasswordValidator<ApplicationUser>() },
            new UpperInvariantLookupNormalizer(),
            new IdentityErrorDescriber(),
            null,
            NullLogger<UserManager<ApplicationUser>>.Instance);

        var httpContextAccessor = new HttpContextAccessor { HttpContext = new DefaultHttpContext() };
        return new AuditLogService(dbContext, httpContextAccessor, userManager);
    }

    [Fact]
    public async Task ChatAsync_IncludesPortalContextInProviderMessage()
    {
        var knowledgeService = new StubKnowledgeArticleService();
        var provider = new RecordingProvider();
        var conversationService = new StubConversationService();
        var conversationCache = new AIConversationCache();
        var service = new AIService(knowledgeService, provider, conversationService, conversationCache, CreateAuditLogService());

        var request = new AIChatRequest
        {
            Message = "Show my assigned tickets",
            PortalContext = new PortalContextDTO
            {
                UserEmail = "user@company.com",
                TicketCount = 3,
                OpenTicketCount = 2,
                AssignedTicketCount = 1
            }
        };

        var result = await service.ChatAsync(request, "user-1", organizationId: null, includeAllOrganizations: true);

        Assert.Contains("Show my assigned tickets", provider.LastMessage);
        Assert.Contains("user@company.com", provider.LastMessage);
        Assert.Contains("assignedTicketCount=1", provider.LastMessage);
        Assert.Equal("General", result.Category);
        Assert.True(result.RequiresTicket);
    }

    private sealed class StubKnowledgeArticleService : IKnowledgeArticleService
    {
        public Task<IReadOnlyList<KnowledgeArticleDTO>> GetArticlesAsync(string? query, string? category, int? organizationId, bool includeAllOrganizations, CancellationToken cancellationToken = default)
            => Task.FromResult<IReadOnlyList<KnowledgeArticleDTO>>(Array.Empty<KnowledgeArticleDTO>());

        public Task<KnowledgeArticleDTO?> GetArticleAsync(int id, int? organizationId, bool includeAllOrganizations, CancellationToken cancellationToken = default)
            => Task.FromResult<KnowledgeArticleDTO?>(null);
    }

    private sealed class StubConversationService : IAIConversationService
    {
        public Task StoreAsync(string userId, string userMessage, string aiResponse, CancellationToken cancellationToken = default)
            => Task.CompletedTask;

        public Task<IReadOnlyList<AIConversationDTO>> GetForUserAsync(string userId, CancellationToken cancellationToken = default)
            => Task.FromResult<IReadOnlyList<AIConversationDTO>>(Array.Empty<AIConversationDTO>());
    }

    private sealed class RecordingProvider : IAIProvider
    {
        public string? LastMessage { get; private set; }

        public Task<string> GenerateResponseAsync(string message, IReadOnlyList<KnowledgeArticleDTO> articles, CancellationToken cancellationToken = default)
        {
            LastMessage = message;
            return Task.FromResult("portal-aware-response");
        }

        public Task<AITicketAnalysisResult?> AnalyzeTicketAsync(string issueText, CancellationToken cancellationToken = default)
            => Task.FromResult<AITicketAnalysisResult?>(null);
    }
}
