using ITSM.Portal.API.DTOs;
using Microsoft.Extensions.Options;
namespace ITSM.Portal.API.Services
{
    // Azure can be selected through AISettings:Provider. It safely falls back until endpoint/deployment configuration is supplied.
    public class AzureOpenAIProvider : IAIProvider
    {
        private readonly OpenAIProvider _fallback;
        public AzureOpenAIProvider(HttpClient client, IOptions<AISettings> settings) => _fallback = new OpenAIProvider(client, settings);
        public Task<string> GenerateResponseAsync(string message, IReadOnlyList<KnowledgeArticleDTO> articles, CancellationToken cancellationToken = default) => _fallback.GenerateResponseAsync(message, articles, cancellationToken);
        public Task<AITicketAnalysisResult?> AnalyzeTicketAsync(string issueText, CancellationToken cancellationToken = default) => _fallback.AnalyzeTicketAsync(issueText, cancellationToken);
    }
}
