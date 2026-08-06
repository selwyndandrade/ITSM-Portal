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
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ServiceRequestsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly AutomationEngineService _automationEngine;
        private readonly TenantContextService _tenantContext;
        private readonly UserManager<ApplicationUser> _userManager;

        public ServiceRequestsController(ApplicationDbContext context, AutomationEngineService automationEngine, TenantContextService tenantContext, UserManager<ApplicationUser> userManager)
        {
            _context = context;
            _automationEngine = automationEngine;
            _tenantContext = tenantContext;
            _userManager = userManager;
        }

        [HttpGet]
        public async Task<IActionResult> GetServiceRequests([FromQuery] string? status)
        {
            var query = _tenantContext.ApplyOrganizationFilter(_context.ServiceRequests)
                .Include(r => r.CatalogItem)
                .Include(r => r.RequestedByUser)
                .Include(r => r.Ticket)
                .AsQueryable();

            // This endpoint backs the "My Requests" page - a plain employee should only ever see
            // their own requests. Admin/Manager (the same roles that can approve/reject) get the
            // full org view, matching what the dedicated approval queue below already allows them.
            if (!User.IsInRole("Admin") && !User.IsInRole("Manager"))
            {
                var currentUser = await _userManager.GetUserAsync(User);
                query = query.Where(r => r.RequestedByUserId == currentUser!.Id);
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                query = query.Where(r => r.Status == status);
            }

            var items = await query
                .OrderByDescending(r => r.CreatedDate)
                // Bounded rather than paginated: this endpoint returns a bare array today and
                // both callers (the "My Requests" page and the global search index) expect that
                // shape, so this caps worst-case query/response size without a breaking API change.
                .Take(500)
                .Select(r => new
                {
                    id = r.Id,
                    catalogItemId = r.CatalogItemId,
                    catalogItemName = r.CatalogItem != null ? r.CatalogItem.Name : null,
                    requestedByUserId = r.RequestedByUserId,
                    requestedByUserName = r.RequestedByUser != null ? (r.RequestedByUser.DisplayName ?? r.RequestedByUser.Email) : null,
                    ticketId = r.TicketId,
                    ticketTitle = r.Ticket != null ? r.Ticket.Title : null,
                    status = r.Status,
                    approvalStatus = r.ApprovalStatus,
                    createdDate = r.CreatedDate,
                    completedDate = r.CompletedDate
                })
                .ToListAsync();

            return Ok(items);
        }

        [HttpGet("approvals")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> GetApprovals([FromQuery] string? status, [FromQuery] string? requester, [FromQuery] string? department, [FromQuery] string? requestType)
        {
            var query = _tenantContext.ApplyOrganizationFilter(_context.ServiceRequests)
                .Include(r => r.CatalogItem)
                .Include(r => r.RequestedByUser)
                .ThenInclude(u => u!.Department)
                .Include(r => r.Ticket)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(status))
            {
                query = query.Where(r => r.ApprovalStatus == status || r.Status == status);
            }

            if (!string.IsNullOrWhiteSpace(requester))
            {
                query = query.Where(r => r.RequestedByUser != null && (
                    (r.RequestedByUser.DisplayName != null && r.RequestedByUser.DisplayName.Contains(requester)) ||
                    r.RequestedByUser.Email.Contains(requester)));
            }

            if (!string.IsNullOrWhiteSpace(department))
            {
                query = query.Where(r => r.RequestedByUser != null && r.RequestedByUser.Department != null && r.RequestedByUser.Department.Name.Contains(department));
            }

            if (!string.IsNullOrWhiteSpace(requestType))
            {
                query = query.Where(r => r.CatalogItem != null && r.CatalogItem.Name.Contains(requestType));
            }

            var items = await query
                .OrderByDescending(r => r.CreatedDate)
                .Take(500)
                .Select(r => new
                {
                    id = r.Id,
                    requestType = r.CatalogItem != null ? r.CatalogItem.Name : "Unknown",
                    requesterName = r.RequestedByUser != null ? (r.RequestedByUser.DisplayName ?? r.RequestedByUser.Email) : null,
                    requesterEmail = r.RequestedByUser != null ? r.RequestedByUser.Email : null,
                    department = r.RequestedByUser != null && r.RequestedByUser.Department != null ? r.RequestedByUser.Department.Name : null,
                    status = r.ApprovalStatus,
                    workflowStatus = r.Status,
                    createdDate = r.CreatedDate,
                    completedDate = r.CompletedDate,
                    ticketId = r.TicketId,
                    ticketTitle = r.Ticket != null ? r.Ticket.Title : null,
                    businessJustification = r.TicketDescription,
                    approvalHistory = _context.ApprovalDecisions
                        .Where(d => d.ServiceRequestId == r.Id)
                        .OrderByDescending(d => d.CreatedDate)
                        .Select(d => new { d.Id, d.Decision, d.Comments, d.CreatedDate, decisionByUserName = d.DecisionByUser != null ? (d.DecisionByUser.DisplayName ?? d.DecisionByUser.Email) : null })
                        .ToList()
                })
                .ToListAsync();

            return Ok(items);
        }

        [HttpGet("approvals/{id}")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> GetApprovalDetails(int id)
        {
            var request = await _tenantContext.ApplyOrganizationFilter(_context.ServiceRequests)
                .Include(r => r.CatalogItem)
                .Include(r => r.RequestedByUser)
                .ThenInclude(u => u!.Department)
                .Include(r => r.Ticket)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (request == null) return NotFound();

            var decisions = await _context.ApprovalDecisions
                .Where(d => d.ServiceRequestId == id)
                .Include(d => d.DecisionByUser)
                .OrderByDescending(d => d.CreatedDate)
                .Select(d => new
                {
                    id = d.Id,
                    decision = d.Decision,
                    comments = d.Comments,
                    createdDate = d.CreatedDate,
                    decisionByUserName = d.DecisionByUser != null ? (d.DecisionByUser.DisplayName ?? d.DecisionByUser.Email) : null
                })
                .ToListAsync();

            return Ok(new
            {
                id = request.Id,
                requestType = request.CatalogItem != null ? request.CatalogItem.Name : "Unknown",
                requesterName = request.RequestedByUser != null ? (request.RequestedByUser.DisplayName ?? request.RequestedByUser.Email) : null,
                requesterEmail = request.RequestedByUser != null ? request.RequestedByUser.Email : null,
                department = request.RequestedByUser != null && request.RequestedByUser.Department != null ? request.RequestedByUser.Department.Name : null,
                status = request.ApprovalStatus,
                workflowStatus = request.Status,
                createdDate = request.CreatedDate,
                completedDate = request.CompletedDate,
                ticketId = request.TicketId,
                ticketTitle = request.Ticket != null ? request.Ticket.Title : null,
                businessJustification = request.TicketDescription,
                history = decisions
            });
        }

        [HttpPut("{id}/approve")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> ApproveRequest(int id, [FromBody] ApprovalDecisionRequest? decision)
        {
            var request = await _tenantContext.ApplyOrganizationFilter(_context.ServiceRequests)
                .Include(r => r.Ticket)
                .FirstOrDefaultAsync(r => r.Id == id);
            if (request == null) return NotFound();

            request.ApprovalStatus = "Approved";
            request.Status = "In Progress";
            request.CompletedDate = DateTime.UtcNow;

            if (request.Ticket != null)
            {
                request.Ticket.Status = "In Progress";
                request.Ticket.UpdatedDate = DateTime.UtcNow;
            }

            // DecisionByUserId is derived from the authenticated caller, never taken from the
            // request body - otherwise the approval audit trail could be attributed to anyone.
            var approver = await _userManager.GetUserAsync(User);
            _context.ApprovalDecisions.Add(new ApprovalDecision
            {
                ServiceRequestId = request.Id,
                Decision = "Approved",
                Comments = decision?.Comments,
                DecisionByUserId = approver?.Id,
                CreatedDate = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            await _automationEngine.ExecuteAsync(request, "ServiceRequestApproved", "ServiceRequest", request.Id);

            return Ok(new { id, approvalStatus = request.ApprovalStatus, status = request.Status, ticketId = request.TicketId });
        }

        [HttpPut("{id}/reject")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> RejectRequest(int id, [FromBody] ApprovalDecisionRequest? decision)
        {
            var request = await _tenantContext.ApplyOrganizationFilter(_context.ServiceRequests)
                .Include(r => r.Ticket)
                .FirstOrDefaultAsync(r => r.Id == id);
            if (request == null) return NotFound();

            request.ApprovalStatus = "Rejected";
            request.Status = "Rejected";
            request.CompletedDate = DateTime.UtcNow;

            if (request.Ticket != null)
            {
                request.Ticket.Status = "Pending";
                request.Ticket.UpdatedDate = DateTime.UtcNow;
            }

            // DecisionByUserId is derived from the authenticated caller, never taken from the
            // request body - otherwise the approval audit trail could be attributed to anyone.
            var rejector = await _userManager.GetUserAsync(User);
            _context.ApprovalDecisions.Add(new ApprovalDecision
            {
                ServiceRequestId = request.Id,
                Decision = "Rejected",
                Comments = decision?.Comments,
                DecisionByUserId = rejector?.Id,
                CreatedDate = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            await _automationEngine.ExecuteAsync(request, "ServiceRequestRejected", "ServiceRequest", request.Id);

            return Ok(new { id, approvalStatus = request.ApprovalStatus, status = request.Status, ticketId = request.TicketId });
        }
    }
}
