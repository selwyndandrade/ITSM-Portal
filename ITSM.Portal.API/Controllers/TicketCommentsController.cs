using ITSM.Portal.API.Data;
using ITSM.Portal.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ITSM.Portal.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class TicketController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public TicketController(ApplicationDbContext context)
        {
            _context = context;
        }


        [HttpGet]
        public async Task<IActionResult> GetTickets()
        {
            var tickets = await _context.Tickets
                .Include(t => t.Comments)
                .ToListAsync();

            return Ok(tickets);
        }



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


            return Ok(ticket);
        }



        [HttpPost]
        public async Task<IActionResult> CreateTicket(Ticket ticket)
        {
            ticket.CreatedDate = DateTime.UtcNow;

            _context.Tickets.Add(ticket);

            await _context.SaveChangesAsync();


            return Ok(ticket);
        }



        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateTicket(int id, Ticket ticket)
        {
            var existingTicket = await _context.Tickets.FindAsync(id);


            if (existingTicket == null)
            {
                return NotFound();
            }


            existingTicket.Title = ticket.Title;
            existingTicket.Description = ticket.Description;
            existingTicket.Status = ticket.Status;
            existingTicket.Priority = ticket.Priority;
            existingTicket.AssignedTo = ticket.AssignedTo;


            await _context.SaveChangesAsync();


            return Ok(existingTicket);
        }



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


            return Ok(new
            {
                message = "Ticket deleted"
            });
        }
    }
}