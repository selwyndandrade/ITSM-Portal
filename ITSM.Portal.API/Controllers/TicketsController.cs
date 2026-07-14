using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
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

        public TicketsController(ApplicationDbContext context)
        {
            _context = context;
        }


        // GET: api/tickets
        [HttpGet]
        public async Task<IActionResult> GetTickets()
        {
            var tickets = await _context.Tickets
                .ToListAsync();

            return Ok(tickets);
        }



        // GET: api/tickets/5
        [HttpGet("{id}")]
        public async Task<IActionResult> GetTicket(int id)
        {
            var ticket = await _context.Tickets
                .FirstOrDefaultAsync(t => t.Id == id);


            if (ticket == null)
            {
                return NotFound();
            }


            return Ok(ticket);
        }



        // POST: api/tickets
        [HttpPost]
        public async Task<IActionResult> CreateTicket(Ticket ticket)
        {
            ticket.CreatedDate = DateTime.UtcNow;


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
            existingTicket.CreatedBy = ticket.CreatedBy;
            existingTicket.AssignedTo = ticket.AssignedTo;


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
