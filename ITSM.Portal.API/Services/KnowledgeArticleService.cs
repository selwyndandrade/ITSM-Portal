using ITSM.Portal.API.Data;
using ITSM.Portal.API.DTOs;
using Microsoft.EntityFrameworkCore;

namespace ITSM.Portal.API.Services
{
    public class KnowledgeArticleService : IKnowledgeArticleService
    {
        private readonly ApplicationDbContext _context;
        public KnowledgeArticleService(ApplicationDbContext context) => _context = context;

        public async Task<IReadOnlyList<KnowledgeArticleDTO>> GetArticlesAsync(string? query, string? category, int? organizationId, bool includeAllOrganizations, CancellationToken cancellationToken = default)
        {
            var articles = _context.KnowledgeArticles.AsNoTracking().AsQueryable();
            if (!includeAllOrganizations)
            {
                // Articles with no OrganizationId are treated as shared/global content (e.g. seeded defaults).
                // Org-scoped articles are only visible to members of that same organization.
                articles = articles.Where(a => a.OrganizationId == null || a.OrganizationId == organizationId);
            }
            if (!string.IsNullOrWhiteSpace(query))
            {
                var value = query.Trim();
                articles = articles.Where(a => a.Title.Contains(value) || a.Content.Contains(value));
            }
            if (!string.IsNullOrWhiteSpace(category))
                articles = articles.Where(a => a.Category == category.Trim());

            return await articles.OrderByDescending(a => a.UpdatedDate ?? a.CreatedDate)
                .Select(a => new KnowledgeArticleDTO { Id = a.Id, Title = a.Title, Content = a.Content, Category = a.Category, CreatedBy = a.CreatedBy, CreatedDate = a.CreatedDate, UpdatedDate = a.UpdatedDate })
                .ToListAsync(cancellationToken);
        }

        public async Task<KnowledgeArticleDTO?> GetArticleAsync(int id, int? organizationId, bool includeAllOrganizations, CancellationToken cancellationToken = default)
        {
            var articles = _context.KnowledgeArticles.AsNoTracking().Where(a => a.Id == id);
            if (!includeAllOrganizations)
            {
                articles = articles.Where(a => a.OrganizationId == null || a.OrganizationId == organizationId);
            }
            return await articles
                .Select(a => new KnowledgeArticleDTO { Id = a.Id, Title = a.Title, Content = a.Content, Category = a.Category, CreatedBy = a.CreatedBy, CreatedDate = a.CreatedDate, UpdatedDate = a.UpdatedDate })
                .FirstOrDefaultAsync(cancellationToken);
        }
    }
}
