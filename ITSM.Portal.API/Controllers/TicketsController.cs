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



        // GET: api/tickets
        [HttpGet]
        public async Task<IActionResult> GetTickets()
        {
            var tickets = await _context.Tickets
                .Include(t => t.Comments)
                .ToListAsync();


            var result = new List<object>();


            foreach (var ticket in tickets)
            {
                var createdUser = ticket.CreatedBy != null
                    ? await _userManager.FindByIdAsync(ticket.CreatedBy)
                    : null;


                var assignedUser = ticket.AssignedTo != null
                    ? await _userManager.FindByIdAsync(ticket.AssignedTo)
                    : null;



                result.Add(new
                {
                    ticket.Id,
                    ticket.Title,
                    ticket.Description,
                    ticket.Status,
                    ticket.Priority,
                    ticket.CreatedDate,

                    CreatedBy = createdUser?.Email,

                    AssignedTo = assignedUser?.Email,


                    Comments = ticket.Comments
                });
            }


            return Ok(result);
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



            var createdUser = ticket.CreatedBy != null
                ? await _userManager.FindByIdAsync(ticket.CreatedBy)
                : null;


            var assignedUser = ticket.AssignedTo != null
                ? await _userManager.FindByIdAsync(ticket.AssignedTo)
                : null;



            return Ok(new
            {
                ticket.Id,
                ticket.Title,
                ticket.Description,
                ticket.Status,
                ticket.Priority,
                ticket.CreatedDate,

                CreatedBy = createdUser?.Email,

                AssignedTo = assignedUser?.Email,


                Comments = ticket.Comments
            });
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

            return CreatedAtAction(
                nameof(GetTicket),
                new
                {
                    id = ticket.Id
                },
                ticket
            );
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