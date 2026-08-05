using ITSM.Portal.API.DTOs;
namespace ITSM.Portal.API.Services
{
    public interface IAIProvider
    {
        Task<string> GenerateResponseAsync(string message, IReadOnlyList<KnowledgeArticleDTO> articles, CancellationToken cancellationToken = default);

        // Returns null when the provider is unavailable/unconfigured or the call fails,
        // so callers can fall back to heuristic categorization/prioritization.
        Task<AITicketAnalysisResult?> AnalyzeTicketAsync(string issueText, CancellationToken cancellationToken = default);
    }
}
