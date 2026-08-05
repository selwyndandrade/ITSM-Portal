using ITSM.Portal.API.Data;
using ITSM.Portal.API.DTOs;
using ITSM.Portal.API.Models;
using ITSM.Portal.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ITSM.Portal.API.Controllers
{
    [Route("api/knowledgearticles")]
    [ApiController]
    [Authorize]
    public class KnowledgeArticlesController : ControllerBase
    {
        private readonly IKnowledgeArticleService _knowledgeArticles;
        private readonly ApplicationDbContext _context;
        private readonly TenantContextService _tenantContext;
        private readonly UserManager<ApplicationUser> _userManager;

        public KnowledgeArticlesController(IKnowledgeArticleService knowledgeArticles, ApplicationDbContext context, TenantContextService tenantContext, UserManager<ApplicationUser> userManager)
        {
            _knowledgeArticles = knowledgeArticles;
            _context = context;
            _tenantContext = tenantContext;
            _userManager = userManager;
        }

        [HttpGet]
        public async Task<ActionResult<IReadOnlyList<KnowledgeArticleDTO>>> GetArticles([FromQuery] string? query, [FromQuery] string? category, CancellationToken cancellationToken) =>
            Ok(await _knowledgeArticles.GetArticlesAsync(query, category, _tenantContext.CurrentOrganizationId, _tenantContext.IsPlatformAdmin(), cancellationToken));

        [HttpGet("{id:int}")]
        public async Task<ActionResult<KnowledgeArticleDTO>> GetArticle(int id, CancellationToken cancellationToken)
        {
            var article = await _knowledgeArticles.GetArticleAsync(id, _tenantContext.CurrentOrganizationId, _tenantContext.IsPlatformAdmin(), cancellationToken);
            return article is null ? NotFound() : Ok(article);
        }

        [HttpGet("summary")]
        public async Task<ActionResult<object>> GetKnowledgeSummary(CancellationToken cancellationToken)
        {
            var articlesQuery = _context.KnowledgeArticles.AsNoTracking().AsQueryable();
            if (!_tenantContext.IsPlatformAdmin())
            {
                var organizationId = _tenantContext.CurrentOrganizationId;
                articlesQuery = articlesQuery.Where(a => a.OrganizationId == null || a.OrganizationId == organizationId);
            }
            var articles = await articlesQuery.ToListAsync(cancellationToken);
            return Ok(new
            {
                categories = articles.Select(a => a.Category).Where(x => !string.IsNullOrWhiteSpace(x)).Distinct().OrderBy(x => x).ToList(),
                popularArticles = articles.OrderByDescending(a => a.UpdatedDate ?? a.CreatedDate).Take(5).Select(a => new KnowledgeArticleDTO { Id = a.Id, Title = a.Title, Category = a.Category, UpdatedDate = a.UpdatedDate, CreatedDate = a.CreatedDate }).ToList(),
                recentArticles = articles.OrderByDescending(a => a.UpdatedDate ?? a.CreatedDate).Take(5).Select(a => new KnowledgeArticleDTO { Id = a.Id, Title = a.Title, Category = a.Category, UpdatedDate = a.UpdatedDate, CreatedDate = a.CreatedDate }).ToList()
            });
        }

        [HttpPost]
        [Authorize(Roles = "Admin,Technician")]
        public async Task<ActionResult<KnowledgeArticleDTO>> CreateArticle([FromBody] KnowledgeArticle article, CancellationToken cancellationToken)
        {
            var author = await _userManager.GetUserAsync(User);

            article.CreatedDate = DateTime.UtcNow;
            article.UpdatedDate = DateTime.UtcNow;
            article.OrganizationId = _tenantContext.IsPlatformAdmin() ? article.OrganizationId : _tenantContext.CurrentOrganizationId;
            // CreatedBy is attribution, not free-form input - it must reflect who actually authored
            // the article, not whatever the client claims.
            article.CreatedBy = author?.Email ?? "System";
            _context.KnowledgeArticles.Add(article);
            await _context.SaveChangesAsync(cancellationToken);

            return CreatedAtAction(nameof(GetArticle), new { id = article.Id }, new KnowledgeArticleDTO
            {
                Id = article.Id,
                Title = article.Title,
                Content = article.Content,
                Category = article.Category,
                CreatedBy = article.CreatedBy,
                CreatedDate = article.CreatedDate,
                UpdatedDate = article.UpdatedDate
            });
        }

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Admin,Technician")]
        public async Task<IActionResult> UpdateArticle(int id, [FromBody] KnowledgeArticle article, CancellationToken cancellationToken)
        {
            var existingQuery = _context.KnowledgeArticles.Where(x => x.Id == id);
            if (!_tenantContext.IsPlatformAdmin())
            {
                var organizationId = _tenantContext.CurrentOrganizationId;
                existingQuery = existingQuery.Where(a => a.OrganizationId == null || a.OrganizationId == organizationId);
            }
            var existing = await existingQuery.FirstOrDefaultAsync(cancellationToken);
            if (existing is null) return NotFound();

            existing.Title = article.Title;
            existing.Content = article.Content;
            existing.Category = string.IsNullOrWhiteSpace(article.Category) ? "General" : article.Category;
            existing.UpdatedDate = DateTime.UtcNow;
            // Original authorship is preserved on edit - it is not something an editor can reassign.

            await _context.SaveChangesAsync(cancellationToken);
            return Ok();
        }
    }
}
