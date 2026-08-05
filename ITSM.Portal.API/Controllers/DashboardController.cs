using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ITSM.Portal.API.Data;
using ITSM.Portal.API.DTOs;
using ITSM.Portal.API.Services;

namespace ITSM.Portal.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class DashboardController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly TenantContextService _tenantContext;

        public DashboardController(ApplicationDbContext context, TenantContextService tenantContext)
        {
            _context = context;
            _tenantContext = tenantContext;
        }

        [HttpGet]
        public async Task<IActionResult> GetDashboard()
        {
            var ticketsQuery = _tenantContext.ApplyOrganizationFilter(_context.Tickets);

            var totalTickets = await ticketsQuery.CountAsync();

            var openTickets = await ticketsQuery
                .CountAsync(t => t.Status == "Open");

            var assignedTickets = await ticketsQuery
                .CountAsync(t => t.AssignedTo != null);

            var inProgressTickets = await ticketsQuery
                .CountAsync(t => t.Status == "In Progress");

            var resolvedTickets = await ticketsQuery
                .CountAsync(t => t.Status == "Resolved");

            var closedTickets = await ticketsQuery
                .CountAsync(t => t.Status == "Closed");

            var slaTickets = await ticketsQuery
                .Select(t => new { t.Status, t.ResolutionDeadline, t.ResolutionDate })
                .ToListAsync();

            var slaBreaches = slaTickets.Count(t => SlaCalculator.GetStatus(t.Status, t.ResolutionDeadline, t.ResolutionDate) == "Breached");
            var slaAtRisk = slaTickets.Count(t => SlaCalculator.GetStatus(t.Status, t.ResolutionDeadline, t.ResolutionDate) == "AtRisk");

            var priorityBreakdown = await ticketsQuery
                .GroupBy(t => string.IsNullOrWhiteSpace(t.Priority) ? "Medium" : t.Priority)
                .Select(g => new MetricBucketDto { Label = g.Key, Count = g.Count() })
                .OrderByDescending(x => x.Count)
                .ToListAsync();

            var categoryBreakdown = await ticketsQuery
                .Where(t => !string.IsNullOrWhiteSpace(t.Category))
                .GroupBy(t => t.Category)
                .Select(g => new MetricBucketDto { Label = g.Key!, Count = g.Count() })
                .OrderByDescending(x => x.Count)
                .ToListAsync();

            var resolutionHours = await ticketsQuery
                .Where(t => (t.Status == "Resolved" || t.Status == "Closed") && t.ResolutionDate != null)
                .Select(t => new { t.CreatedDate, t.ResolutionDate })
                .ToListAsync();

            var avgResolutionHours = resolutionHours.Count > 0
                ? Math.Round(resolutionHours.Select(t => (t.ResolutionDate!.Value - t.CreatedDate).TotalHours).Where(h => h >= 0).DefaultIfEmpty(0).Average(), 1)
                : 0;

            return Ok(new
            {
                totalTickets,
                openTickets,
                assignedTickets,
                inProgressTickets,
                resolvedTickets,
                closedTickets,
                avgResolutionHours,
                slaBreaches,
                slaAtRisk,
                priorityBreakdown,
                categoryBreakdown
            });
        }

        [HttpGet("reports")]
        public async Task<ActionResult<ReportingSnapshotDto>> GetReports()
        {
            var tickets = await _tenantContext.ApplyOrganizationFilter(_context.Tickets.AsNoTracking()).ToListAsync();
            var resolvedTickets = tickets.Where(t => t.Status == "Resolved" || t.Status == "Closed").ToList();
            var openTickets = tickets.Where(t => t.Status != "Resolved" && t.Status != "Closed").ToList();

            var volumeTrend = Enumerable.Range(0, 6)
                .Select(offset =>
                {
                    var date = DateTime.UtcNow.AddDays(-5 + offset).Date;
                    var count = tickets.Count(t => t.CreatedDate.Date == date);
                    return new TrendPointDto { Label = date.ToString("MMM d"), Count = count };
                })
                .ToList();

            var priorityBreakdown = tickets
                .GroupBy(t => string.IsNullOrWhiteSpace(t.Priority) ? "Medium" : t.Priority)
                .Select(g => new MetricBucketDto { Label = g.Key, Count = g.Count() })
                .OrderByDescending(x => x.Count)
                .ToList();

            var departmentBreakdown = tickets
                .Where(t => !string.IsNullOrWhiteSpace(t.Category))
                .GroupBy(t => t.Category)
                .Select(g => new MetricBucketDto { Label = g.Key, Count = g.Count() })
                .OrderByDescending(x => x.Count)
                .Take(5)
                .ToList();

            var assignedTechnicianIds = tickets
                .Where(t => !string.IsNullOrWhiteSpace(t.AssignedTo))
                .Select(t => t.AssignedTo!)
                .Distinct()
                .ToList();

            var technicianNames = assignedTechnicianIds.Count > 0
                ? await _context.Users
                    .Where(u => assignedTechnicianIds.Contains(u.Id))
                    .ToDictionaryAsync(u => u.Id, u => u.DisplayName ?? u.Email ?? u.Id)
                : new Dictionary<string, string>();

            var technicianWorkload = tickets
                .Where(t => !string.IsNullOrWhiteSpace(t.AssignedTo))
                .GroupBy(t => t.AssignedTo)
                .Select(g => new MetricBucketDto
                {
                    Label = technicianNames.TryGetValue(g.Key!, out var name) ? name : "Unknown technician",
                    Count = g.Count()
                })
                .OrderByDescending(x => x.Count)
                .Take(5)
                .ToList();

            var statusBreakdown = tickets
                .GroupBy(t => string.IsNullOrWhiteSpace(t.Status) ? "Open" : t.Status)
                .Select(g => new MetricBucketDto { Label = g.Key, Count = g.Count() })
                .OrderByDescending(x => x.Count)
                .ToList();

            var resolutionHours = resolvedTickets
                .Where(t => t.ResolutionDate is not null)
                .Select(t => (t.ResolutionDate!.Value - t.CreatedDate).TotalHours)
                .Where(hours => hours >= 0)
                .ToList();

            var slaBreaches = tickets.Count(t => SlaCalculator.GetStatus(t.Status, t.ResolutionDeadline, t.ResolutionDate) == "Breached");

            return Ok(new ReportingSnapshotDto
            {
                TotalTickets = tickets.Count,
                OpenTickets = openTickets.Count,
                ResolvedTickets = resolvedTickets.Count,
                AvgResolutionHours = resolutionHours.Any() ? Math.Round(resolutionHours.Average(), 1) : 0,
                SlaCompliance = tickets.Count > 0 ? Math.Round(100.0 * (tickets.Count - slaBreaches) / tickets.Count, 1) : 100,
                SlaBreaches = slaBreaches,
                VolumeTrend = volumeTrend,
                PriorityBreakdown = priorityBreakdown,
                DepartmentBreakdown = departmentBreakdown,
                TechnicianWorkload = technicianWorkload,
                StatusBreakdown = statusBreakdown
            });
        }
    }
}