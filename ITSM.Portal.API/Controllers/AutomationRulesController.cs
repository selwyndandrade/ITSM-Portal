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
    public class AutomationRulesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly AutomationEngineService _automationEngine;
        private readonly TenantContextService _tenantContext;

        public AutomationRulesController(ApplicationDbContext context, AutomationEngineService automationEngine, TenantContextService tenantContext)
        {
            _context = context;
            _automationEngine = automationEngine;
            _tenantContext = tenantContext;
        }

        [HttpGet]
        public async Task<IActionResult> GetRules()
        {
            var rules = await _tenantContext.ApplyOrganizationFilter(_context.AutomationRules)
                .OrderByDescending(r => r.CreatedDate)
                .ToListAsync();

            return Ok(rules);
        }

        [HttpPost]
        public async Task<IActionResult> CreateRule([FromBody] AutomationRule rule)
        {
            // Ignore any client-supplied Id/OrganizationId - always attribute the rule to the
            // caller's own tenant to prevent cross-tenant rule injection via mass assignment.
            rule.Id = 0;
            rule.OrganizationId = _tenantContext.CurrentOrganizationId;
            rule.CreatedDate = DateTime.UtcNow;

            _context.AutomationRules.Add(rule);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetRules), new { id = rule.Id }, rule);
        }

        [HttpPost("test")]
        public async Task<IActionResult> TestRule([FromBody] TestAutomationRequest request)
        {
            if (request.Rule == null) return BadRequest();
            if (request.TicketId <= 0) return BadRequest();

            var ticket = await _tenantContext.ApplyOrganizationFilter(_context.Tickets).FirstOrDefaultAsync(t => t.Id == request.TicketId);
            if (ticket == null) return NotFound();

            var evaluation = await _automationEngine.TestRuleAsync(request.Rule, ticket);
            return Ok(new { ruleId = request.Rule.Id, summary = evaluation.Summary, passed = evaluation.Passed, conditions = evaluation.Conditions, actions = evaluation.Actions });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateRule(int id, [FromBody] AutomationRule rule)
        {
            if (id != rule.Id) return BadRequest();

            var existing = await _tenantContext.ApplyOrganizationFilter(_context.AutomationRules)
                .FirstOrDefaultAsync(r => r.Id == id);
            if (existing == null) return NotFound();

            // Apply only the mutable fields from the request - OrganizationId/CreatedDate stay
            // as originally set so a caller can't reassign the rule to another tenant.
            existing.Name = rule.Name;
            existing.Description = rule.Description;
            existing.TriggerType = rule.TriggerType;
            existing.TriggerValue = rule.TriggerValue;
            existing.Conditions = rule.Conditions;
            existing.Actions = rule.Actions;
            existing.IsActive = rule.IsActive;

            await _context.SaveChangesAsync();
            return Ok(existing);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteRule(int id)
        {
            var rule = await _tenantContext.ApplyOrganizationFilter(_context.AutomationRules)
                .FirstOrDefaultAsync(r => r.Id == id);
            if (rule == null) return NotFound();
            _context.AutomationRules.Remove(rule);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }

    public class TestAutomationRequest
    {
        public AutomationRule? Rule { get; set; }
        public int TicketId { get; set; }
    }
}
