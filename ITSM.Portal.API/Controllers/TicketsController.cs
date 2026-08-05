using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using ITSM.Portal.API.Data;
using ITSM.Portal.API.Models;
using ITSM.Portal.API.DTOs;
using ITSM.Portal.API.Controllers;
using ITSM.Portal.API.Services;
using System.Text.Json;

namespace ITSM.Portal.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class TicketsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly AutomationEngineService _automationEngine;
        private readonly TenantContextService _tenantContext;
        private readonly AuditLogService _auditLog;


        public TicketsController(
            ApplicationDbContext context,
            UserManager<ApplicationUser> userManager,
            AutomationEngineService automationEngine,
            TenantContextService tenantContext,
            AuditLogService auditLog)
        {
            _context = context;
            _userManager = userManager;
            _automationEngine = automationEngine;
            _tenantContext = tenantContext;
            _auditLog = auditLog;
        }



        // GET: api/tickets?page=1&pageSize=20
        [HttpGet]
        public async Task<IActionResult> GetTickets(
            int page = 1,
            int pageSize = 20,
            string? status = null,
            string? priority = null,
            string? assignedTo = null,
            string? category = null,
            string? search = null,
            string? createdRange = null)
        {
            if (page <= 0) page = 1;
            if (pageSize <= 0 || pageSize > 200) pageSize = 20;

            var query = _tenantContext.ApplyOrganizationFilter(_context.Tickets)
                .Include(t => t.Comments)
                .Include(t => t.Asset)
                .OrderByDescending(t => t.CreatedDate)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(status))
            {
                query = query.Where(t => t.Status != null && t.Status.ToLower() == status.Trim().ToLower());
            }

            if (!string.IsNullOrWhiteSpace(priority))
            {
                query = query.Where(t => t.Priority != null && t.Priority.ToLower() == priority.Trim().ToLower());
            }

            if (!string.IsNullOrWhiteSpace(assignedTo))
            {
                query = query.Where(t => t.AssignedTo != null && t.AssignedTo.ToLower() == assignedTo.Trim().ToLower());
            }

            if (!string.IsNullOrWhiteSpace(category))
            {
                query = query.Where(t => t.Category != null && t.Category.ToLower() == category.Trim().ToLower());
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var searchTerm = search.Trim();
                query = query.Where(t =>
                    t.Title.Contains(searchTerm) ||
                    (t.Description != null && t.Description.Contains(searchTerm)) ||
                    (t.Category != null && t.Category.Contains(searchTerm)));
            }

            if (!string.IsNullOrWhiteSpace(createdRange))
            {
                var now = DateTime.UtcNow;
                if (createdRange.Equals("today", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(t => t.CreatedDate >= now.Date);
                }
                else if (createdRange.Equals("week", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(t => t.CreatedDate >= now.AddDays(-7));
                }
                else if (createdRange.Equals("month", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(t => t.CreatedDate >= now.AddDays(-30));
                }
            }

            var totalCount = await query.CountAsync();

            var tickets = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(t => new
                {
                    t.Id,
                    t.Title,
                    t.Description,
                    t.Status,
                    t.Priority,
                    t.CreatedDate,
                    t.UpdatedDate,
                    t.Category,
                    t.AssetId,
                    AssetTag = t.Asset != null ? t.Asset.AssetTag : null,
                    AssetName = t.Asset != null ? t.Asset.Name : null,
                    AssetSerialNumber = t.Asset != null ? t.Asset.SerialNumber : null,
                    CreatedById = t.CreatedBy,
                    AssignedToId = t.AssignedTo,
                    t.ResponseDeadline,
                    t.ResolutionDeadline,
                    t.ResolutionDate,
                    Comments = t.Comments.Select(c => new { c.Id, c.Comment, c.CreatedBy, c.CreatedDate, c.TicketId })
                })
                .ToListAsync();

            // Collect distinct user ids referenced in page
            var userIds = tickets.SelectMany(t => new[] { t.CreatedById, t.AssignedToId })
                .Where(id => !string.IsNullOrEmpty(id))
                .Distinct()
                .ToList();

            var userDict = new Dictionary<string, string?>();
            if (userIds.Any())
            {
                userDict = await _userManager.Users
                    .Where(u => userIds.Contains(u.Id))
                    .ToDictionaryAsync(u => u.Id, u => u.Email as string);
            }

            var result = tickets.Select(t => new ITSM.Portal.API.DTOs.TicketDto
            {
                Id = t.Id,
                Title = t.Title,
                Description = t.Description,
                Status = t.Status,
                Priority = t.Priority,
                Category = t.Category,
                CreatedDate = t.CreatedDate,
                UpdatedDate = t.UpdatedDate,
                CreatedBy = t.CreatedById != null && userDict.ContainsKey(t.CreatedById) ? userDict[t.CreatedById] : null,
                Requester = t.CreatedById != null && userDict.ContainsKey(t.CreatedById) ? userDict[t.CreatedById] : null,
                AssignedTo = t.AssignedToId != null && userDict.ContainsKey(t.AssignedToId) ? userDict[t.AssignedToId] : null,
                AssignedTechnician = t.AssignedToId != null && userDict.ContainsKey(t.AssignedToId) ? userDict[t.AssignedToId] : null,
                AssetId = t.AssetId,
                AssetTag = t.AssetTag,
                AssetName = t.AssetName,
                AssetSerialNumber = t.AssetSerialNumber,
                ResponseDeadline = t.ResponseDeadline,
                ResolutionDeadline = t.ResolutionDeadline,
                ResolutionDate = t.ResolutionDate,
                SlaStatus = SlaCalculator.GetStatus(t.Status, t.ResolutionDeadline, t.ResolutionDate),
                Comments = t.Comments.Select(c => new ITSM.Portal.API.DTOs.TicketCommentDto { Id = c.Id, Comment = c.Comment, CreatedBy = c.CreatedBy, CreatedDate = c.CreatedDate }).ToList()
            }).ToList();

            return Ok(new { items = result, totalCount, page, pageSize });
        }




        // GET: api/tickets/5
        [HttpGet("{id}")]
        public async Task<IActionResult> GetTicket(int id)
        {
            var ticket = await _tenantContext.ApplyOrganizationFilter(_context.Tickets)
                .Include(t => t.Comments)
                .Include(t => t.Asset)
                .FirstOrDefaultAsync(t => t.Id == id);

            if (ticket == null)
            {
                return NotFound();
            }

            var ids = new[] { ticket.CreatedBy, ticket.AssignedTo }.Where(i => !string.IsNullOrEmpty(i)).Distinct().ToList();
            var userDict = new Dictionary<string, string?>();
            if (ids.Any())
            {
                userDict = await _userManager.Users.Where(u => ids.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.Email as string);
            }

            var dto = new ITSM.Portal.API.DTOs.TicketDto
            {
                Id = ticket.Id,
                Title = ticket.Title,
                Description = ticket.Description,
                Status = ticket.Status,
                Priority = ticket.Priority,
                Category = ticket.Category,
                CreatedDate = ticket.CreatedDate,
                UpdatedDate = ticket.UpdatedDate,
                CreatedBy = ticket.CreatedBy != null && userDict.ContainsKey(ticket.CreatedBy) ? userDict[ticket.CreatedBy] : null,
                Requester = ticket.CreatedBy != null && userDict.ContainsKey(ticket.CreatedBy) ? userDict[ticket.CreatedBy] : null,
                AssignedTo = ticket.AssignedTo != null && userDict.ContainsKey(ticket.AssignedTo) ? userDict[ticket.AssignedTo] : null,
                AssignedTechnician = ticket.AssignedTo != null && userDict.ContainsKey(ticket.AssignedTo) ? userDict[ticket.AssignedTo] : null,
                AssetId = ticket.AssetId,
                AssetTag = ticket.Asset?.AssetTag,
                AssetName = ticket.Asset?.Name,
                AssetSerialNumber = ticket.Asset?.SerialNumber,
                ResponseDeadline = ticket.ResponseDeadline,
                ResolutionDeadline = ticket.ResolutionDeadline,
                ResolutionDate = ticket.ResolutionDate,
                SlaStatus = SlaCalculator.GetStatus(ticket.Status, ticket.ResolutionDeadline, ticket.ResolutionDate),
                Comments = ticket.Comments?.Select(c => new ITSM.Portal.API.DTOs.TicketCommentDto { Id = c.Id, Comment = c.Comment, CreatedBy = c.CreatedBy, CreatedDate = c.CreatedDate }).ToList()
            };

            // include recent history entries
            try
            {
                var histories = await _context.TicketHistories
                    .Where(h => h.TicketId == ticket.Id)
                    .OrderByDescending(h => h.CreatedDate)
                    .Take(50)
                    .Select(h => new TicketHistoryDto { Id = h.Id, Action = h.Action, Details = h.Details, CreatedBy = h.CreatedBy, CreatedDate = h.CreatedDate })
                    .ToListAsync();

                // attach to response via an anonymous wrapper
                return Ok(new { ticket = dto, history = histories });
            }
            catch
            {
                // If history fails, still return ticket
                return Ok(new { ticket = dto, history = new List<TicketHistoryDto>() });
            }
        }





        private async Task EvaluateAutomationRules(Ticket ticket, string triggerType)
        {
            await _automationEngine.ExecuteAsync(ticket, triggerType, "Ticket", ticket.Id);
        }

        // POST: api/tickets
        [HttpPost]
        [Authorize(Roles = "Admin,Technician,User")]
        public async Task<IActionResult> CreateTicket(CreateTicketDto model)
        {
            // Capture the logged-in user from JWT
            var user = await _userManager.GetUserAsync(User);

            // Only whitelisted fields are accepted from the client - the ticket is otherwise
            // built server-side so a caller can't set Status, AssignedTo, OrganizationId, the
            // SLA/resolution fields, etc. via the request body.
            var ticket = new Ticket
            {
                Title = model.Title,
                Description = model.Description,
                Priority = string.IsNullOrWhiteSpace(model.Priority) ? "Medium" : model.Priority,
                Category = model.Category,
                AssetId = model.AssetId,
                Status = "Open",
                CreatedDate = DateTime.UtcNow,
                CreatedBy = user?.Id,
                OrganizationId = user?.OrganizationId
            };

            var orgPolicies = ticket.OrganizationId.HasValue
                ? await _context.SlaPolicies.Where(p => p.OrganizationId == ticket.OrganizationId.Value).ToDictionaryAsync(p => p.Priority, StringComparer.OrdinalIgnoreCase)
                : null;
            var (responseDeadline, resolutionDeadline) = SlaCalculator.ComputeDeadlines(ticket.CreatedDate, ticket.Priority, orgPolicies);
            ticket.ResponseDeadline = responseDeadline;
            ticket.ResolutionDeadline = resolutionDeadline;

            _context.Tickets.Add(ticket);

            await _context.SaveChangesAsync();

            await EvaluateAutomationRules(ticket, "TicketCreated");

            await _auditLog.WriteAsync("TicketCreated", $"Ticket '{ticket.Title}' created", "Ticket", ticket.Id);

            // Add history entry for ticket creation
            try
            {
                var history = new TicketHistory
                {
                    TicketId = ticket.Id,
                    Action = "Created",
                    Details = $"Ticket created with status '{ticket.Status}'",
                    CreatedBy = user?.Email ?? "System",
                    CreatedDate = DateTime.UtcNow
                };

                _context.TicketHistories.Add(history);
                await _context.SaveChangesAsync();
            }
            catch
            {
                // Swallow history errors to avoid breaking primary flow
            }

            // Build DTO to return
            var dto = new ITSM.Portal.API.DTOs.TicketDto
            {
                Id = ticket.Id,
                Title = ticket.Title,
                Description = ticket.Description,
                Status = ticket.Status,
                Priority = ticket.Priority,
                Category = ticket.Category,
                CreatedDate = ticket.CreatedDate,
                UpdatedDate = ticket.UpdatedDate,
                CreatedBy = user?.Email,
                Requester = user?.Email,
                AssignedTo = null,
                AssignedTechnician = null,
                ResponseDeadline = ticket.ResponseDeadline,
                ResolutionDeadline = ticket.ResolutionDeadline,
                SlaStatus = SlaCalculator.GetStatus(ticket.Status, ticket.ResolutionDeadline, ticket.ResolutionDate),
                Comments = new List<ITSM.Portal.API.DTOs.TicketCommentDto>()
            };

            return CreatedAtAction(nameof(GetTicket), new { id = ticket.Id }, dto);
        }


        // GET: api/tickets/{id}/history
        [HttpGet("{id}/history")]
        public async Task<IActionResult> GetHistory(int id)
        {
            try
            {
                var exists = await _tenantContext.ApplyOrganizationFilter(_context.Tickets).AnyAsync(t => t.Id == id);
                if (!exists) return NotFound();

                var histories = await _context.TicketHistories
                    .Where(h => h.TicketId == id)
                    .OrderByDescending(h => h.CreatedDate)
                    .Select(h => new TicketHistoryDto { Id = h.Id, Action = h.Action, Details = h.Details, CreatedBy = h.CreatedBy, CreatedDate = h.CreatedDate })
                    .ToListAsync();

                return Ok(histories);
            }
            catch
            {
                // If the history table doesn't exist or another error occurs, return an empty list
                return Ok(new List<TicketHistoryDto>());
            }
        }

        // GET: api/tickets/stats
        [HttpGet("stats")]
        public async Task<IActionResult> GetStats()
        {
            try
            {
                var now = DateTime.UtcNow;
                var todayStart = now.Date;

                var ticketsQuery = _tenantContext.ApplyOrganizationFilter(_context.Tickets);

                var totalOpen = await ticketsQuery
                    .CountAsync(t => t.Status != "Closed" && t.Status != "Resolved");

                var inProgress = await ticketsQuery
                    .CountAsync(t => t.Status == "In Progress");

                var resolvedToday = await ticketsQuery
                    .CountAsync(t => t.Status == "Resolved" && t.ResolutionDate != null && t.ResolutionDate >= todayStart);

                // Calculate average resolution time directly from ResolutionDate (set whenever a
                // ticket transitions to Resolved/Closed, regardless of which endpoint did it).
                var resolutionTimes = await ticketsQuery
                    .Where(t => t.ResolutionDate != null)
                    .Select(t => new { t.CreatedDate, t.ResolutionDate })
                    .ToListAsync();

                var avgResolutionTime = resolutionTimes.Any()
                    ? resolutionTimes.Select(t => (t.ResolutionDate!.Value - t.CreatedDate).TotalHours).Where(hours => hours >= 0).DefaultIfEmpty(0).Average()
                    : 0;

                // Ticket breakdown by status
                var byStatus = await ticketsQuery
                    .GroupBy(t => t.Status)
                    .Select(g => new { status = g.Key, count = g.Count() })
                    .ToListAsync();

                // Ticket breakdown by priority
                var byPriority = await ticketsQuery
                    .GroupBy(t => t.Priority)
                    .Select(g => new { priority = g.Key, count = g.Count() })
                    .ToListAsync();

                return Ok(new
                {
                    totalOpen,
                    inProgress,
                    resolvedToday,
                    avgResolutionTimeHours = Math.Round(avgResolutionTime, 1),
                    byStatus,
                    byPriority
                });
            }
            catch
            {
                // Return empty stats on error
                return Ok(new
                {
                    totalOpen = 0,
                    inProgress = 0,
                    resolvedToday = 0,
                    avgResolutionTimeHours = 0.0,
                    byStatus = new List<object>(),
                    byPriority = new List<object>()
                });
            }
        }





        // PUT: api/tickets/{id}/assign
        [HttpPut("{id}/assign")]
        [Authorize(Roles = "Admin,Technician")]
        public async Task<IActionResult> AssignTicket(
            int id,
            [FromBody] string userId)
        {
            var ticket = await _tenantContext.ApplyOrganizationFilter(_context.Tickets)
                .FirstOrDefaultAsync(t => t.Id == id);



            if (ticket == null)
            {
                return NotFound();
            }



            ticket.AssignedTo = userId;


            await _context.SaveChangesAsync();

            await _auditLog.WriteAsync("TicketAssigned", $"Ticket '{ticket.Title}' assigned to userId {userId}", "Ticket", ticket.Id);

            // Add history entry for assignment
            try
            {
                var assigner = await _userManager.GetUserAsync(User);
                var history = new TicketHistory
                {
                    TicketId = ticket.Id,
                    Action = "Assigned",
                    Details = $"Assigned to userId: {userId}",
                    CreatedBy = assigner?.Email ?? "System",
                    CreatedDate = DateTime.UtcNow
                };
                _context.TicketHistories.Add(history);
                await _context.SaveChangesAsync();

                var assignee = await _userManager.FindByIdAsync(userId);
                if (assignee is not null && !string.IsNullOrWhiteSpace(assignee.Id))
                {
                    await NotificationsController.CreateAsync(
                        _context,
                        assignee.Id,
                        "Ticket assigned",
                        $"A new ticket was assigned to you: {ticket.Title}",
                        "TicketAssigned",
                        ticket.Id);
                }
            }
            catch
            {
            }



            return Ok(new
            {
                message = "Ticket assigned successfully",
                ticketId = ticket.Id,
                assignedTo = userId
            });
        }





        // PUT: api/tickets/5
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,Technician")]
        public async Task<IActionResult> UpdateTicket(
            int id,
            Ticket ticket)
        {

            if (id != ticket.Id)
            {
                return BadRequest();
            }


            var existingTicket = await _tenantContext.ApplyOrganizationFilter(_context.Tickets)
                .FirstOrDefaultAsync(t => t.Id == id);



            if (existingTicket == null)
            {
                return NotFound();
            }


            existingTicket.Title = ticket.Title;
            existingTicket.Description = ticket.Description;
            existingTicket.Status = ticket.Status;
            existingTicket.Priority = ticket.Priority;
            existingTicket.Category = ticket.Category;
            existingTicket.AssetId = ticket.AssetId;
            existingTicket.UpdatedDate = DateTime.UtcNow;

            var isResolvedOrClosed = !string.IsNullOrWhiteSpace(existingTicket.Status)
                && (existingTicket.Status.Equals("Resolved", StringComparison.OrdinalIgnoreCase)
                    || existingTicket.Status.Equals("Closed", StringComparison.OrdinalIgnoreCase));

            if (isResolvedOrClosed)
            {
                existingTicket.ResolutionDate ??= DateTime.UtcNow;
            }
            else
            {
                existingTicket.ResolutionDate = null;
            }

            var updater = await _userManager.GetUserAsync(User);
            existingTicket.UpdatedBy = updater?.Email ?? "System";


            await _context.SaveChangesAsync();

            await _auditLog.WriteAsync("TicketUpdated", $"Ticket '{existingTicket.Title}' fields updated", "Ticket", existingTicket.Id);

            // Add history entry for generic updates
            try
            {
                var user = await _userManager.GetUserAsync(User);
                var history = new TicketHistory
                {
                    TicketId = existingTicket.Id,
                    Action = "Updated",
                    Details = "Ticket fields updated",
                    CreatedBy = user?.Email ?? "System",
                    CreatedDate = DateTime.UtcNow
                };
                _context.TicketHistories.Add(history);
                await _context.SaveChangesAsync();
            }
            catch
            {
            }



            return NoContent();
        }



        // PUT: api/tickets/{id}/status
        [HttpPut("{id}/status")]
        [Authorize(Roles = "Admin,Technician")]
        public async Task<IActionResult> UpdateTicketStatus(
            int id,
            [FromBody] string status)
        {
            var ticket = await _tenantContext.ApplyOrganizationFilter(_context.Tickets)
                .FirstOrDefaultAsync(t => t.Id == id);

            if (ticket == null)
            {
                return NotFound();
            }


            var allowedStatuses = new[]
            {
        "Open",
        "Assigned",
        "In Progress",
        "Pending",
        "Resolved",
        "Closed"
    };


            if (!allowedStatuses.Contains(status))
            {
                return BadRequest(new
                {
                    message = "Invalid ticket status"
                });
            }


            ticket.Status = status;
            ticket.UpdatedDate = DateTime.UtcNow;

            var isResolvedOrClosed = status.Equals("Resolved", StringComparison.OrdinalIgnoreCase)
                || status.Equals("Closed", StringComparison.OrdinalIgnoreCase);

            if (isResolvedOrClosed)
            {
                ticket.ResolutionDate ??= DateTime.UtcNow;
            }
            else
            {
                ticket.ResolutionDate = null;
            }

            var updater = await _userManager.GetUserAsync(User);
            ticket.UpdatedBy = updater?.Email ?? "System";

            await _context.SaveChangesAsync();

            await _auditLog.WriteAsync("TicketStatusChanged", $"Ticket '{ticket.Title}' status changed to '{status}'", "Ticket", ticket.Id);

            // Add history entry for status change
            try
            {
                var user = await _userManager.GetUserAsync(User);
                var history = new TicketHistory
                {
                    TicketId = ticket.Id,
                    Action = "StatusChanged",
                    Details = $"Status changed to '{status}'",
                    CreatedBy = user?.Email ?? "System",
                    CreatedDate = DateTime.UtcNow
                };
                _context.TicketHistories.Add(history);
                await _context.SaveChangesAsync();

                if (ticket.AssignedTo is not null)
                {
                    var assignee = await _userManager.FindByIdAsync(ticket.AssignedTo);
                    if (assignee is not null && !string.IsNullOrWhiteSpace(assignee.Id))
                    {
                        await NotificationsController.CreateAsync(
                            _context,
                            assignee.Id,
                            "Ticket updated",
                            $"Ticket status changed to {status}: {ticket.Title}",
                            "TicketStatusChanged",
                            ticket.Id);
                    }
                }
            }
            catch
            {
            }


            return Ok(new
            {
                message = "Ticket status updated",
                ticketId = ticket.Id,
                status = ticket.Status
            });
        }

        // DELETE: api/tickets/5
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteTicket(int id)
        {
            var ticket = await _tenantContext.ApplyOrganizationFilter(_context.Tickets)
                .FirstOrDefaultAsync(t => t.Id == id);



            if (ticket == null)
            {
                return NotFound();
            }


            _context.Tickets.Remove(ticket);


            await _context.SaveChangesAsync();

            await _auditLog.WriteAsync("TicketDeleted", $"Ticket '{ticket.Title}' deleted", "Ticket", ticket.Id);

            // Optionally add history for deletion
            try
            {
                var user = await _userManager.GetUserAsync(User);
                var history = new TicketHistory
                {
                    TicketId = ticket.Id,
                    Action = "Deleted",
                    Details = "Ticket deleted",
                    CreatedBy = user?.Email ?? "System",
                    CreatedDate = DateTime.UtcNow
                };
                _context.TicketHistories.Add(history);
                await _context.SaveChangesAsync();
            }
            catch
            {
            }



            return NoContent();
        }
    }
}