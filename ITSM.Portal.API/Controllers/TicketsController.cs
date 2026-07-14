using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ITSM.Portal.API.Data;
using ITSM.Portal.API.Models;

namespace ITSM.Portal.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TicketsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public TicketsController(ApplicationDbContext context)
        {
            _context = context;
        }


        // GET: api/tickets
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Ticket>>> GetTickets()
        {
            var tickets = await _context.Tickets
                .Include(t => t.CreatedBy)
                .Include(t => t.AssignedTo)
                .ToListAsync();

            return Ok(tickets);
        }



        // GET: api/tickets/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Ticket>> GetTicket(int id)
        {
            var ticket = await _context.Tickets
                .Include(t => t.CreatedBy)
                .Include(t => t.AssignedTo)
                .FirstOrDefaultAsync(t => t.Id == id);


            if (ticket == null)
            {
                return NotFound();
            }


            return Ok(ticket);
        }



        // POST: api/tickets
        [HttpPost]
        public async Task<ActionResult<Ticket>> CreateTicket(Ticket ticket)
        {
            ticket.CreatedDate = DateTime.Now;

            if (string.IsNullOrEmpty(ticket.Status))
            {
                ticket.Status = "Open";
            }


            _context.Tickets.Add(ticket);

            await _context.SaveChangesAsync();


            return CreatedAtAction(
                nameof(GetTicket),
                new { id = ticket.Id },
                ticket
            );
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


            _context.Entry(ticket).State =
                EntityState.Modified;


            await _context.SaveChangesAsync();


            return NoContent();
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