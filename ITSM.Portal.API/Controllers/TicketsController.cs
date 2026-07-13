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

        [HttpGet]
        public ActionResult<List<Ticket>> GetTickets()
        {
            return Ok(tickets);
        }
    }
}
