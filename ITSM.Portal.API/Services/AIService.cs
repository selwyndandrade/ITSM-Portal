using ITSM.Portal.API.DTOs;

namespace ITSM.Portal.API.Services
{
    public class AIService : IAIService
    {
        private readonly IKnowledgeArticleService _knowledgeArticles;
        private readonly IAIProvider _provider;
        private readonly IAIConversationService _conversationHistory;
        private readonly IAIConversationCache _conversationCache;
        private readonly AuditLogService _auditLog;

        public AIService(IKnowledgeArticleService knowledgeArticles, IAIProvider provider, IAIConversationService conversationHistory, IAIConversationCache conversationCache, AuditLogService auditLog)
        {
            _knowledgeArticles = knowledgeArticles;
            _provider = provider;
            _conversationHistory = conversationHistory;
            _conversationCache = conversationCache;
            _auditLog = auditLog;
        }

        public async Task<AIChatResponse> ChatAsync(AIChatRequest request, string userId, int? organizationId, bool includeAllOrganizations, CancellationToken cancellationToken = default)
        {
            var conversationId = string.IsNullOrWhiteSpace(request.ConversationId) ? Guid.NewGuid().ToString("N") : request.ConversationId;
            _conversationCache.Set(conversationId, request.Message.Trim());
            var analysis = await AnalyzeIssueAsync(request.Message, cancellationToken);
            var articles = await _knowledgeArticles.GetArticlesAsync(request.Message, analysis.Category, organizationId, includeAllOrganizations, cancellationToken);
            var recommendedArticles = articles.Take(3).ToList();
            var portalContextMessage = BuildPortalContextMessage(request.PortalContext);
            var messageToProvider = string.IsNullOrWhiteSpace(portalContextMessage)
                ? request.Message
                : $"{request.Message}\n\nPortal context:\n{portalContextMessage}";
            var response = await _provider.GenerateResponseAsync(messageToProvider, recommendedArticles, cancellationToken);
            await _conversationHistory.StoreAsync(userId, request.Message, response, cancellationToken);
            await _auditLog.WriteAsync("AIChatInteraction", $"AI chat processed a message (category={analysis.Category}, priority={analysis.Priority})", "AIConversation", null);

            return new AIChatResponse { ConversationId = conversationId, Response = response, Message = response, Category = analysis.Category!, Priority = analysis.Priority!, KnowledgeArticles = recommendedArticles, RecommendedArticles = recommendedArticles, RequiresTicket = recommendedArticles.Count == 0 };
        }

        public async Task<TicketSummaryResponse?> CreateTicketSummaryAsync(TicketSummaryRequest request, CancellationToken cancellationToken = default)
        {
            if (!_conversationCache.TryGet(request.ConversationId, out var issue)) return null;

            var analysis = await AnalyzeTextAsync(issue, cancellationToken);
            var summary = new TicketSummaryResponse
            {
                Title = analysis.Title,
                Description = analysis.Description,
                Category = analysis.Category,
                Priority = analysis.Priority,
                SuggestedAssignmentGroup = analysis.SuggestedAssignmentGroup
            };

            await _auditLog.WriteAsync("AITicketSummaryGenerated", $"AI generated ticket draft '{summary.Title}' (category={summary.Category}, priority={summary.Priority})", "TicketDraft", null);

            return summary;
        }

        // Same triage analysis used by the chat flow, exposed directly so the Create Ticket
        // form can offer an inline "Suggest with AI" action without going through a chat conversation.
        public async Task<TicketAnalysisResponse> AnalyzeTextAsync(string text, CancellationToken cancellationToken = default)
        {
            var analysis = await AnalyzeIssueAsync(text, cancellationToken);
            return new TicketAnalysisResponse
            {
                Title = analysis.Title ?? CreateHeuristicTitle(text, analysis.Category!),
                Description = analysis.Description ?? $"User reports: {text.Trim()}",
                Category = analysis.Category!,
                Priority = analysis.Priority!,
                SuggestedAssignmentGroup = analysis.SuggestedAssignmentGroup ?? GetHeuristicAssignmentGroup(analysis.Category!)
            };
        }

        // Technician-facing assist for an existing ticket: a draft response, likely root cause,
        // and next steps. Template-based (no external LLM call required) so it works reliably in
        // demos out of the box; the templates are informed by category/priority for a tailored feel.
        public async Task<TicketAssistResponse> GetTicketAssistAsync(string title, string description, string category, string priority, CancellationToken cancellationToken = default)
        {
            var response = new TicketAssistResponse
            {
                SuggestedResponse = BuildSuggestedResponse(title, category, priority),
                RootCauseSuggestion = BuildRootCauseSuggestion(category, description),
                NextSteps = BuildNextSteps(category, priority)
            };

            await _auditLog.WriteAsync("AITicketAssistGenerated", $"AI generated technician assist for ticket '{title}' (category={category})", "TicketDraft", null);

            return await Task.FromResult(response);
        }

        private static string BuildSuggestedResponse(string title, string category, string priority)
        {
            var urgencyNote = priority is "High" or "Critical"
                ? "I've prioritized this given the impact it's having on your work."
                : "I've picked this up and will keep you posted as I make progress.";
            var categoryAction = category switch
            {
                "Network" => "I'm verifying connectivity, VPN configuration, and any recent network changes that could be related.",
                "Hardware" => "I'm checking the device's diagnostics and confirming whether a repair, part replacement, or swap is needed.",
                "Access" => "I'm verifying your account and permissions to make sure access is restored securely.",
                "Software" => "I'm reproducing the issue and checking recent updates or configuration changes that may be the cause.",
                _ => "I'm reviewing the details you provided and looking into the most likely cause."
            };
            return $"Hi, thanks for reporting \"{title}\". {urgencyNote} {categoryAction} I'll follow up as soon as I have an update or need more information from you.";
        }

        private static string BuildRootCauseSuggestion(string category, string description)
        {
            var text = (description ?? string.Empty).ToLowerInvariant();
            return category switch
            {
                "Network" when text.Contains("vpn") => "Likely cause: VPN client/session expiry or a firewall rule change blocking the tunnel.",
                "Network" => "Likely cause: local network/Wi-Fi connectivity issue or a recent infrastructure change affecting this segment.",
                "Hardware" => "Likely cause: hardware fault or driver/firmware mismatch following a recent update.",
                "Access" => "Likely cause: expired credentials, a recent permissions change, or an account lockout.",
                "Software" => "Likely cause: a recent application update or configuration change introduced a regression.",
                _ => "Likely cause: not yet clear from the details provided \u2014 recommend gathering reproduction steps from the requester."
            };
        }

        private static List<string> BuildNextSteps(string category, string priority)
        {
            var steps = category switch
            {
                "Network" => new List<string> { "Confirm the affected user's network/VPN status", "Check for related incidents or recent network changes", "Escalate to Network Support if unresolved within SLA" },
                "Hardware" => new List<string> { "Run device diagnostics", "Confirm warranty/asset status", "Arrange repair or replacement if needed" },
                "Access" => new List<string> { "Verify identity and account status", "Confirm required permissions with the requester's manager", "Reset or restore access and confirm with the user" },
                "Software" => new List<string> { "Attempt to reproduce the issue", "Check recent updates or configuration changes", "Apply a fix or escalate to Application Support" },
                _ => new List<string> { "Clarify the issue with the requester", "Check the knowledge base for similar cases", "Assign to the appropriate support queue" }
            };
            if (priority is "High" or "Critical") steps.Insert(0, "Notify the requester this has been prioritized");
            return steps;
        }

        // Calls the LLM provider for structured triage; any field it doesn't return
        // (or if the provider is unavailable/fails) is filled in from keyword heuristics,
        // so callers always get a fully-populated, usable result.
        private async Task<AITicketAnalysisResult> AnalyzeIssueAsync(string issue, CancellationToken cancellationToken)
        {
            var llmResult = await _provider.AnalyzeTicketAsync(issue, cancellationToken);
            var category = llmResult?.Category ?? GetHeuristicCategory(issue);

            return new AITicketAnalysisResult
            {
                Category = category,
                Priority = llmResult?.Priority ?? GetHeuristicPriority(issue),
                Title = llmResult?.Title,
                Description = llmResult?.Description,
                SuggestedAssignmentGroup = llmResult?.SuggestedAssignmentGroup
            };
        }

        private static string BuildPortalContextMessage(PortalContextDTO? portalContext)
        {
            if (portalContext is null) return string.Empty;

            var parts = new List<string>();
            if (!string.IsNullOrWhiteSpace(portalContext.UserEmail)) parts.Add($"userEmail={portalContext.UserEmail}");
            if (portalContext.TicketCount > 0) parts.Add($"ticketCount={portalContext.TicketCount}");
            if (portalContext.OpenTicketCount > 0) parts.Add($"openTicketCount={portalContext.OpenTicketCount}");
            if (portalContext.AssignedTicketCount > 0) parts.Add($"assignedTicketCount={portalContext.AssignedTicketCount}");
            if (portalContext.KnowledgeArticles.Count > 0)
            {
                var articleTitles = string.Join(", ", portalContext.KnowledgeArticles.Take(3).Select(a => a.Title));
                parts.Add($"knowledgeArticles={articleTitles}");
            }

            return string.Join("; ", parts);
        }

        // Fallback heuristics, used only when the LLM provider is unavailable or fails.
        private static string GetHeuristicCategory(string issue) => issue.ToLowerInvariant() switch
        {
            var text when text.Contains("wifi") || text.Contains("network") || text.Contains("vpn") => "Network",
            var text when text.Contains("monitor") || text.Contains("laptop") || text.Contains("keyboard") || text.Contains("hardware") => "Hardware",
            var text when text.Contains("email") || text.Contains("password") || text.Contains("login") || text.Contains("access") => "Access",
            var text when text.Contains("software") || text.Contains("application") || text.Contains("app") => "Software",
            _ => "General"
        };
        private static string GetHeuristicPriority(string issue) => issue.Contains("urgent", StringComparison.OrdinalIgnoreCase) || issue.Contains("cannot work", StringComparison.OrdinalIgnoreCase) ? "High" : "Medium";
        private static string GetHeuristicAssignmentGroup(string category) => category switch { "Network" => "Network Support", "Hardware" => "Hardware Support", "Access" => "Identity & Access Support", "Software" => "Application Support", _ => "Service Desk" };
        private static string CreateHeuristicTitle(string issue, string category) => $"{category}: {issue.Trim().TrimEnd('.', '!', '?')}".Length > 150 ? $"{category} support request" : $"{category}: {issue.Trim().TrimEnd('.', '!', '?')}";
    }
}

