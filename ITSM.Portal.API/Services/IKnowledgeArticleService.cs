using ITSM.Portal.API.DTOs;

namespace ITSM.Portal.API.Services
{
    public interface IKnowledgeArticleService
    {
        Task<IReadOnlyList<KnowledgeArticleDTO>> GetArticlesAsync(string? query, string? category, int? organizationId, bool includeAllOrganizations, CancellationToken cancellationToken = default);
        Task<KnowledgeArticleDTO?> GetArticleAsync(int id, int? organizationId, bool includeAllOrganizations, CancellationToken cancellationToken = default);
    }
}
