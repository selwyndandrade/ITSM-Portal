using ITSM.Portal.API.Data;
using ITSM.Portal.API.Models;
using ITSM.Portal.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ITSM.Portal.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class AutomationExecutionsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly TenantContextService _tenantContext;

        public AutomationExecutionsController(ApplicationDbContext context, TenantContextService tenantContext)
        {
            _context = context;
            _tenantContext = tenantContext;
        }

        [HttpGet]
        public async Task<IActionResult> GetExecutions(
            [FromQuery] string? search,
            [FromQuery] string? status,
            [FromQuery] string? triggerType,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            if (page <= 0) page = 1;
            if (pageSize <= 0 || pageSize > 100) pageSize = 20;

            var query = _tenantContext.ApplyOrganizationFilter(_context.AutomationExecutions.AsQueryable());

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                query = query.Where(e =>
                    e.RuleName.Contains(term) ||
                    e.TriggerEvent.Contains(term) ||
                    (e.Message != null && e.Message.Contains(term)));
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                query = query.Where(e => e.Status == status);
            }

            if (!string.IsNullOrWhiteSpace(triggerType))
            {
                query = query.Where(e => e.TriggerEvent == triggerType);
            }

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderByDescending(e => e.TriggeredAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return Ok(new { items, totalCount, page, pageSize });
        }
    }
}
