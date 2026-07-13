using Microsoft.AspNetCore.Mvc;
using ITSM.Portal.API.Models;

namespace ITSM.Portal.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TicketsController : ControllerBase
    {
        private static List<Ticket> tickets = new List<Ticket>()
        {
            new Ticket
            {
                Id = 1,
                Title = "VPN Not Working",
                Description = "Unable to connect to company VPN.",
                Category = "Network",
                Priority = "High",
                Status = "Open"
            }
        };


        // GET: api/Tickets
        [HttpGet]
        public ActionResult<List<Ticket>> GetTickets()
        {
            return Ok(tickets);
        }


        // GET: api/Tickets/1
        [HttpGet("{id}")]
        public ActionResult<Ticket> GetTicket(int id)
        {
            var ticket = tickets.FirstOrDefault(t => t.Id == id);

            if (ticket == null)
            {
                return NotFound();
            }

            return Ok(ticket);
        }


        // POST: api/Tickets
        [HttpPost]
        public ActionResult<Ticket> CreateTicket(Ticket ticket)
        {
            ticket.Id = tickets.Count + 1;
            ticket.CreatedDate = DateTime.Now;

            tickets.Add(ticket);

            return CreatedAtAction(nameof(GetTicket),
                new { id = ticket.Id }, ticket);
        }


        // PUT: api/Tickets/1
        [HttpPut("{id}")]
        public IActionResult UpdateTicket(int id, Ticket updatedTicket)
        {
            var ticket = tickets.FirstOrDefault(t => t.Id == id);

            if (ticket == null)
            {
                return NotFound();
            }

            ticket.Title = updatedTicket.Title;
            ticket.Description = updatedTicket.Description;
            ticket.Category = updatedTicket.Category;
            ticket.Priority = updatedTicket.Priority;
            ticket.Status = updatedTicket.Status;

            return NoContent();
        }


        [HttpDelete("{id}")]
        public IActionResult DeleteTicket(int id)
        {
            var ticket = tickets.FirstOrDefault(t => t.Id == id);

            if (ticket == null)
            {
                return NotFound($"Ticket with ID {id} was not found.");
            }

            tickets.Remove(ticket);

            return Ok($"Ticket {id} deleted successfully.");
        }
    }
}
