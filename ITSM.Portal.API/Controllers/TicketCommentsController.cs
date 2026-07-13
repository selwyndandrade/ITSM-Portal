using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ITSM.Portal.API.Data;
using ITSM.Portal.API.Models;

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


        // GET: api/TicketComments
        [HttpGet]
        public async Task<ActionResult<IEnumerable<TicketComment>>> GetComments()
        {
            return await _context.TicketComments.ToListAsync();
        }


        // GET: api/TicketComments/5
        [HttpGet("{id}")]
        public async Task<ActionResult<TicketComment>> GetComment(int id)
        {
            var comment = await _context.TicketComments.FindAsync(id);

            if (comment == null)
            {
                return NotFound();
            }

            return comment;
        }


        // POST: api/TicketComments
        [HttpPost]
        public async Task<ActionResult<TicketComment>> CreateComment(TicketComment comment)
        {
            comment.CreatedDate = DateTime.Now;

            _context.TicketComments.Add(comment);

            await _context.SaveChangesAsync();

            return CreatedAtAction(
                nameof(GetComment),
                new { id = comment.Id },
                comment
            );
        }


        // DELETE: api/TicketComments/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteComment(int id)
        {
            var comment = await _context.TicketComments.FindAsync(id);

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