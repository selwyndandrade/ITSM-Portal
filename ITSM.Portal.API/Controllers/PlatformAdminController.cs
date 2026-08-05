using ITSM.Portal.API.Data;
using ITSM.Portal.API.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ITSM.Portal.API.Controllers
{
    // Platform-level functions (cross-tenant visibility, organization management) require the
    // dedicated "PlatformAdmin" role - a regular organization "Admin" must never reach this controller.
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "PlatformAdmin")]
    public class PlatformAdminController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public PlatformAdminController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet("health")]
        public IActionResult Health()
        {
            return Ok(new { status = "ok", service = "platform-admin" });
        }

        [HttpGet("metrics")]
        public async Task<IActionResult> Metrics()
        {
            var customers = await _context.Organizations.CountAsync();
            var activeSubscriptions = await _context.Organizations.CountAsync(o => o.IsActive);
            return Ok(new { customers, activeSubscriptions, uptimeMinutes = 0 });
        }

        [HttpGet("organizations")]
        public async Task<IActionResult> GetOrganizations()
        {
            var organizations = await _context.Organizations
                .OrderBy(o => o.Id)
                .Select(o => new
                {
                    o.Id,
                    o.Name,
                    o.Slug,
                    o.SubscriptionTier,
                    o.IsActive,
                    o.CreatedDate,
                    UserCount = o.Users.Count
                })
                .ToListAsync();

            return Ok(organizations);
        }

        [HttpGet("organizations/{id:int}")]
        public async Task<IActionResult> GetOrganization(int id)
        {
            var organization = await _context.Organizations.FindAsync(id);
            return organization is null ? NotFound() : Ok(organization);
        }

        [HttpPut("organizations/{id:int}/status")]
        public async Task<IActionResult> SetOrganizationStatus(int id, [FromBody] SetOrganizationStatusRequest request)
        {
            var organization = await _context.Organizations.FindAsync(id);
            if (organization is null) return NotFound();

            organization.IsActive = request.IsActive;
            await _context.SaveChangesAsync();

            return Ok(new { organization.Id, organization.IsActive });
        }
    }
}

