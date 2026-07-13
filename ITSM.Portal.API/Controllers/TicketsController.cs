using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ITSM.Portal.API.Data;
using ITSM.Portal.API.Models;

namespace ITSM.Portal.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TicketsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public TicketsController(ApplicationDbContext context)
        {
            _context = context;
        }


        // GET: api/Tickets
        [HttpGet]
        public async Task<ActionResult<List<Ticket>>> GetTickets()
        {
            return await _context.Tickets.ToListAsync();
        }


        // GET: api/Tickets/1
        [HttpGet("{id}")]
        public async Task<ActionResult<Ticket>> GetTicket(int id)
        {
            var ticket = await _context.Tickets.FindAsync(id);

            if (ticket == null)
            {
                return NotFound();
            }

            return Ok(ticket);
        }


        // POST: api/Tickets
        [HttpPost]
        public async Task<ActionResult<Ticket>> CreateTicket(Ticket ticket)
        {
            ticket.CreatedDate = DateTime.Now;

            _context.Tickets.Add(ticket);
            await _context.SaveChangesAsync();

            return CreatedAtAction(
                nameof(GetTicket),
                new { id = ticket.Id },
                ticket
            );
        }


        // PUT: api/Tickets/1
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateTicket(int id, Ticket updatedTicket)
        {
            var ticket = await _context.Tickets.FindAsync(id);

            if (ticket == null)
            {
                return NotFound();
            }

            ticket.Title = updatedTicket.Title;
            ticket.Description = updatedTicket.Description;
            ticket.Category = updatedTicket.Category;
            ticket.Priority = updatedTicket.Priority;
            ticket.Status = updatedTicket.Status;

            await _context.SaveChangesAsync();

            return NoContent();
        }


        // DELETE: api/Tickets/1
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