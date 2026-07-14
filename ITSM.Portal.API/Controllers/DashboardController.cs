using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ITSM.Portal.API.Data;

namespace ITSM.Portal.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class DashboardController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public DashboardController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetDashboard()
        {
            var totalTickets = await _context.Tickets.CountAsync();

            var openTickets = await _context.Tickets
                .CountAsync(t => t.Status == "Open");

            var assignedTickets = await _context.Tickets
                .CountAsync(t => t.AssignedTo != null);

            var inProgressTickets = await _context.Tickets
                .CountAsync(t => t.Status == "In Progress");

            var resolvedTickets = await _context.Tickets
                .CountAsync(t => t.Status == "Resolved");

            var closedTickets = await _context.Tickets
                .CountAsync(t => t.Status == "Closed");

            return Ok(new
            {
                totalTickets,
                openTickets,
                assignedTickets,
                inProgressTickets,
                resolvedTickets,
                closedTickets
            });
        }
    }
}