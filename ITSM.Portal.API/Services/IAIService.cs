using ITSM.Portal.API.DTOs;

namespace ITSM.Portal.API.Services
{
    public interface IAIService
    {
        Task<AIChatResponse> ChatAsync(AIChatRequest request, string userId, int? organizationId, bool includeAllOrganizations, CancellationToken cancellationToken = default);
        Task<TicketSummaryResponse?> CreateTicketSummaryAsync(TicketSummaryRequest request, CancellationToken cancellationToken = default);
        Task<TicketAnalysisResponse> AnalyzeTextAsync(string text, CancellationToken cancellationToken = default);
        Task<TicketAssistResponse> GetTicketAssistAsync(string title, string description, string category, string priority, CancellationToken cancellationToken = default);
    }
}
