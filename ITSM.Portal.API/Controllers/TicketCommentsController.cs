using ITSM.Portal.API.Data;
using ITSM.Portal.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ITSM.Portal.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TicketCommentsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public TicketCommentsController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/TicketComments/ticket/1
        [HttpGet("ticket/{ticketId}")]
        public async Task<ActionResult<IEnumerable<TicketComment>>> GetTicketComments(int ticketId)
        {
            var comments = await _context.TicketComments
                .Where(c => c.TicketId == ticketId)
                .OrderByDescending(c => c.CreatedDate)
                .ToListAsync();

            return Ok(comments);
        }


        // GET: api/TicketComments/5
        [HttpGet("{id}")]
        public async Task<ActionResult<TicketComment>> GetComment(int id)
        {
            var comment = await _context.TicketComments
                .FindAsync(id);

            if (comment == null)
            {
                return NotFound();
            }

            return Ok(comment);
        }


        // POST: api/TicketComments
        [HttpPost]
        public async Task<ActionResult<TicketComment>> CreateComment(TicketComment comment)
        {
            comment.CreatedDate = DateTime.UtcNow;

            _context.TicketComments.Add(comment);

            await _context.SaveChangesAsync();

            return CreatedAtAction(
                nameof(GetComment),
                new { id = comment.Id },
                comment
            );
        }


        // PUT: api/TicketComments/5
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateComment(int id, TicketComment comment)
        {
            if (id != comment.Id)
            {
                return BadRequest();
            }

            _context.Entry(comment).State = EntityState.Modified;

            await _context.SaveChangesAsync();

            return NoContent();
        }


        // DELETE: api/TicketComments/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteComment(int id)
        {
            var comment = await _context.TicketComments
                .FindAsync(id);

            if (comment == null)
            {
                return NotFound();
            }

            _context.TicketComments.Remove(comment);

            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}