using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using ITSM.Portal.API.Data;
using ITSM.Portal.API.Models;

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

            var result = tickets.Select(t => new TicketDto
            {
                Id = t.Id,
                Title = t.Title,
                Description = t.Description,
                Status = t.Status,
                Priority = t.Priority,
                CreatedDate = t.CreatedDate,
                CreatedBy = t.CreatedById != null && userDict.ContainsKey(t.CreatedById) ? userDict[t.CreatedById] : null,
                AssignedTo = t.AssignedToId != null && userDict.ContainsKey(t.AssignedToId) ? userDict[t.AssignedToId] : null,
                Comments = t.Comments.Select(c => new CommentDto { Id = c.Id, Comment = c.Comment, CreatedBy = c.CreatedBy, CreatedDate = c.CreatedDate, TicketId = c.TicketId }).ToList()
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

            var dto = new TicketDto
            {
                Id = ticket.Id,
                Title = ticket.Title,
                Description = ticket.Description,
                Status = ticket.Status,
                Priority = ticket.Priority,
                CreatedDate = ticket.CreatedDate,
                CreatedBy = ticket.CreatedBy != null && userDict.ContainsKey(ticket.CreatedBy) ? userDict[ticket.CreatedBy] : null,
                AssignedTo = ticket.AssignedTo != null && userDict.ContainsKey(ticket.AssignedTo) ? userDict[ticket.AssignedTo] : null,
                Comments = ticket.Comments?.Select(c => new CommentDto { Id = c.Id, Comment = c.Comment, CreatedBy = c.CreatedBy, CreatedDate = c.CreatedDate, TicketId = c.TicketId }).ToList()
            };

            return Ok(dto);
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

            // Build DTO to return
            var dto = new TicketDto
            {
                Id = ticket.Id,
                Title = ticket.Title,
                Description = ticket.Description,
                Status = ticket.Status,
                Priority = ticket.Priority,
                CreatedDate = ticket.CreatedDate,
                CreatedBy = user?.Email,
                AssignedTo = null,
                Comments = new List<CommentDto>()
            };

            return CreatedAtAction(nameof(GetTicket), new { id = ticket.Id }, dto);
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



            return NoContent();
        }
    }
}