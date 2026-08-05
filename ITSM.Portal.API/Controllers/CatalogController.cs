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
    public class CatalogController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly AutomationEngineService _automationEngine;

        public CatalogController(ApplicationDbContext context, UserManager<ApplicationUser> userManager, AutomationEngineService automationEngine)
        {
            _context = context;
            _userManager = userManager;
            _automationEngine = automationEngine;
        }

        [HttpGet]
        public async Task<IActionResult> GetCatalog([FromQuery] string? category, [FromQuery] string? query)
        {
            var itemsQuery = _context.ServiceCatalogItems
                .Where(i => i.IsActive)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(category))
            {
                itemsQuery = itemsQuery.Where(i => i.Category == category);
            }

            if (!string.IsNullOrWhiteSpace(query))
            {
                var q = query.Trim();
                itemsQuery = itemsQuery.Where(i => i.Name.Contains(q) || i.Description.Contains(q) || i.Category.Contains(q));
            }

            var items = await itemsQuery
                .OrderBy(i => i.Name)
                .Select(i => new
                {
                    id = i.Id,
                    name = i.Name,
                    description = i.Description,
                    category = i.Category,
                    icon = i.Icon,
                    estimatedCompletionTime = i.EstimatedCompletionTime,
                    requiresApproval = i.RequiresApproval,
                    isActive = i.IsActive,
                    createdDate = i.CreatedDate
                })
                .ToListAsync();

            return Ok(items);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetCatalogItem(int id)
        {
            var item = await _context.ServiceCatalogItems
                .FirstOrDefaultAsync(i => i.Id == id && i.IsActive);

            if (item == null) return NotFound();

            return Ok(new
            {
                id = item.Id,
                name = item.Name,
                description = item.Description,
                category = item.Category,
                icon = item.Icon,
                estimatedCompletionTime = item.EstimatedCompletionTime,
                requiresApproval = item.RequiresApproval,
                isActive = item.IsActive,
                createdDate = item.CreatedDate
            });
        }

        [HttpPost("request")]
        public async Task<IActionResult> CreateServiceRequest([FromBody] CreateServiceRequestDto model)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return Unauthorized();

            var catalogItem = await _context.ServiceCatalogItems.FindAsync(model.CatalogItemId);
            if (catalogItem == null || !catalogItem.IsActive) return NotFound("Catalog item not found.");

            // Built entirely server-side from a two-field DTO - a caller cannot set Status,
            // ApprovalStatus, RequestedByUserId, OrganizationId, CompletedDate, etc.
            var request = new ServiceRequest
            {
                CatalogItemId = model.CatalogItemId,
                TicketDescription = model.TicketDescription,
                RequestedByUserId = user.Id,
                OrganizationId = user.OrganizationId,
                CreatedDate = DateTime.UtcNow,
                Status = "Submitted",
                ApprovalStatus = catalogItem.RequiresApproval ? "Pending" : "Approved"
            };

            var ticket = new Ticket
            {
                Title = $"Service request: {catalogItem.Name}",
                Description = request.TicketDescription ?? $"Service request created from catalog item '{catalogItem.Name}'.",
                Status = "Open",
                Priority = "Medium",
                Category = catalogItem.Category,
                CreatedBy = user.Id,
                CreatedDate = DateTime.UtcNow,
                DepartmentId = user.DepartmentId,
                OrganizationId = user.OrganizationId,
                RequesterUserId = user.Id,
                AssignedToUserId = null
            };

            _context.Tickets.Add(ticket);
            await _context.SaveChangesAsync();

            request.TicketId = ticket.Id;
            _context.ServiceRequests.Add(request);
            await _context.SaveChangesAsync();

            await _automationEngine.ExecuteAsync(request, "ServiceRequestSubmitted", "ServiceRequest", request.Id);

            return Ok(new
            {
                id = request.Id,
                catalogItemId = request.CatalogItemId,
                ticketId = ticket.Id,
                status = request.Status,
                approvalStatus = request.ApprovalStatus
            });
        }
    }
}
