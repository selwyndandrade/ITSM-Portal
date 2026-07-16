using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using ITSM.Portal.API.Data;
using ITSM.Portal.API.Models;
using ITSM.Portal.API.DTOs;

namespace ITSM.Portal.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class TicketsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;


        public TicketsController(
            ApplicationDbContext context,
            UserManager<ApplicationUser> userManager)
        {
            _context = context;
            _userManager = userManager;
        }



        // GET: api/tickets?page=1&pageSize=20
        [HttpGet]
        public async Task<IActionResult> GetTickets(int page = 1, int pageSize = 20)
        {
            if (page <= 0) page = 1;
            if (pageSize <= 0 || pageSize > 200) pageSize = 20;

            var query = _context.Tickets
                .Include(t => t.Comments)
                .OrderByDescending(t => t.CreatedDate)
                .AsQueryable();

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
                    CreatedById = t.CreatedBy,
                    AssignedToId = t.AssignedTo,
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
                CreatedDate = t.CreatedDate,
                CreatedBy = t.CreatedById != null && userDict.ContainsKey(t.CreatedById) ? userDict[t.CreatedById] : null,
                AssignedTo = t.AssignedToId != null && userDict.ContainsKey(t.AssignedToId) ? userDict[t.AssignedToId] : null,
                Comments = t.Comments.Select(c => new ITSM.Portal.API.DTOs.TicketCommentDto { Id = c.Id, Comment = c.Comment, CreatedBy = c.CreatedBy, CreatedDate = c.CreatedDate }).ToList()
            }).ToList();

            return Ok(new { items = result, totalCount, page, pageSize });
        }




        // GET: api/tickets/5
        [HttpGet("{id}")]
        public async Task<IActionResult> GetTicket(int id)
        {
            var ticket = await _context.Tickets
                .Include(t => t.Comments)
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
                CreatedDate = ticket.CreatedDate,
                CreatedBy = ticket.CreatedBy != null && userDict.ContainsKey(ticket.CreatedBy) ? userDict[ticket.CreatedBy] : null,
                AssignedTo = ticket.AssignedTo != null && userDict.ContainsKey(ticket.AssignedTo) ? userDict[ticket.AssignedTo] : null,
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




       
        // POST: api/tickets
        [HttpPost]
        public async Task<IActionResult> CreateTicket(Ticket ticket)
        {
            ticket.CreatedDate = DateTime.UtcNow;

            // Capture the logged-in user from JWT
            var user = await _userManager.GetUserAsync(User);

            ticket.CreatedBy = user?.Id;

            if (string.IsNullOrEmpty(ticket.Status))
            {
                ticket.Status = "Open";
            }

            _context.Tickets.Add(ticket);

            await _context.SaveChangesAsync();

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
                CreatedDate = ticket.CreatedDate,
                CreatedBy = user?.Email,
                AssignedTo = null,
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
                var exists = await _context.Tickets.AnyAsync(t => t.Id == id);
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





        // PUT: api/tickets/{id}/assign
        [HttpPut("{id}/assign")]
        public async Task<IActionResult> AssignTicket(
            int id,
            [FromBody] string userId)
        {
            var ticket = await _context.Tickets
                .FirstOrDefaultAsync(t => t.Id == id);



            if (ticket == null)
            {
                return NotFound();
            }



            ticket.AssignedTo = userId;


            await _context.SaveChangesAsync();

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
        public async Task<IActionResult> UpdateTicket(
            int id,
            Ticket ticket)
        {

            if (id != ticket.Id)
            {
                return BadRequest();
            }


            var existingTicket = await _context.Tickets.FindAsync(id);



            if (existingTicket == null)
            {
                return NotFound();
            }


            existingTicket.Title = ticket.Title;
            existingTicket.Description = ticket.Description;
            existingTicket.Status = ticket.Status;
            existingTicket.Priority = ticket.Priority;


            await _context.SaveChangesAsync();

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
        public async Task<IActionResult> UpdateTicketStatus(
            int id,
            [FromBody] string status)
        {
            var ticket = await _context.Tickets.FindAsync(id);

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

            await _context.SaveChangesAsync();

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
        public async Task<IActionResult> DeleteTicket(int id)
        {
            var ticket = await _context.Tickets.FindAsync(id);



            if (ticket == null)
            {
                return NotFound();
            }


            _context.Tickets.Remove(ticket);


            await _context.SaveChangesAsync();

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