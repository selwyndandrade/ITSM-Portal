using ITSM.Portal.API.Data;
using ITSM.Portal.API.DTOs;
using ITSM.Portal.API.Models;
using ITSM.Portal.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ITSM.Portal.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class SlaPoliciesController : ControllerBase
    {
        private static readonly string[] Priorities = { "Critical", "High", "Medium", "Low" };

        private readonly ApplicationDbContext _context;
        private readonly TenantContextService _tenantContext;
        private readonly AuditLogService _auditLog;

        public SlaPoliciesController(ApplicationDbContext context, TenantContextService tenantContext, AuditLogService auditLog)
        {
            _context = context;
            _tenantContext = tenantContext;
            _auditLog = auditLog;
        }

        [HttpGet]
        public async Task<IActionResult> GetPolicies()
        {
            var organizationId = _tenantContext.CurrentOrganizationId;
            if (organizationId is null)
            {
                return Ok(Priorities.Select(p =>
                {
                    var defaults = SlaCalculator.DefaultTargets[p];
                    return new SlaPolicyDto { Priority = p, ResponseTargetMinutes = defaults.ResponseMinutes, ResolutionTargetMinutes = defaults.ResolutionMinutes };
                }));
            }

            var existing = await _context.SlaPolicies
                .Where(p => p.OrganizationId == organizationId.Value)
                .ToDictionaryAsync(p => p.Priority, StringComparer.OrdinalIgnoreCase);

            var result = Priorities.Select(p =>
            {
                if (existing.TryGetValue(p, out var policy))
                {
                    return new SlaPolicyDto { Priority = p, ResponseTargetMinutes = policy.ResponseTargetMinutes, ResolutionTargetMinutes = policy.ResolutionTargetMinutes };
                }

                var defaults = SlaCalculator.DefaultTargets[p];
                return new SlaPolicyDto { Priority = p, ResponseTargetMinutes = defaults.ResponseMinutes, ResolutionTargetMinutes = defaults.ResolutionMinutes };
            });

            return Ok(result);
        }

        [HttpPut("{priority}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdatePolicy(string priority, [FromBody] UpdateSlaPolicyRequest request)
        {
            if (!Priorities.Contains(priority, StringComparer.OrdinalIgnoreCase))
            {
                return BadRequest(new { message = "Priority must be one of: " + string.Join(", ", Priorities) });
            }

            if (request.ResponseTargetMinutes <= 0 || request.ResolutionTargetMinutes <= 0)
            {
                return BadRequest(new { message = "SLA targets must be positive." });
            }

            if (request.ResponseTargetMinutes > request.ResolutionTargetMinutes)
            {
                return BadRequest(new { message = "Response target cannot exceed the resolution target." });
            }

            var organizationId = _tenantContext.CurrentOrganizationId;
            if (organizationId is null)
            {
                return BadRequest(new { message = "No organization context available for this account." });
            }

            var policy = await _context.SlaPolicies
                .FirstOrDefaultAsync(p => p.OrganizationId == organizationId.Value && p.Priority.ToLower() == priority.ToLower());

            if (policy is null)
            {
                policy = new SlaPolicy { OrganizationId = organizationId.Value, Priority = priority };
                _context.SlaPolicies.Add(policy);
            }

            policy.ResponseTargetMinutes = request.ResponseTargetMinutes;
            policy.ResolutionTargetMinutes = request.ResolutionTargetMinutes;

            await _context.SaveChangesAsync();

            await _auditLog.WriteAsync("SlaPolicyUpdated", $"SLA policy for priority '{priority}' set to response={request.ResponseTargetMinutes}m, resolution={request.ResolutionTargetMinutes}m", "SlaPolicy", policy.Id);

            return Ok(new SlaPolicyDto { Priority = priority, ResponseTargetMinutes = policy.ResponseTargetMinutes, ResolutionTargetMinutes = policy.ResolutionTargetMinutes });
        }
    }
}
