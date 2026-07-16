using ITSM.Portal.API.Data;
using ITSM.Portal.API.DTOs;
using ITSM.Portal.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ITSM.Portal.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class TicketCommentsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;

        public TicketCommentsController(ApplicationDbContext context, UserManager<ApplicationUser> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

        // GET: api/ticketcomments?ticketId=5
        [HttpGet]
        public async Task<IActionResult> GetComments([FromQuery] int ticketId)
        {
            if (ticketId <= 0) return BadRequest();

            var comments = await _context.TicketComments
                .Where(c => c.TicketId == ticketId)
                .OrderBy(c => c.CreatedDate)
                .Select(c => new TicketCommentDto { Id = c.Id, Comment = c.Comment, CreatedBy = c.CreatedBy, CreatedDate = c.CreatedDate })
                .ToListAsync();

            return Ok(comments);
        }

        // POST: api/ticketcomments
        [HttpPost]
        public async Task<IActionResult> CreateComment([FromBody] TicketCommentCreateDto model)
        {

            if (model == null) return BadRequest();
            if (string.IsNullOrWhiteSpace(model.Comment)) return BadRequest(new { message = "Comment is required" });
            if (model.TicketId <= 0) return BadRequest(new { message = "TicketId is required" });

            var user = await _userManager.GetUserAsync(User);

            var comment = new TicketComment
            {
                Comment = model.Comment,
                TicketId = model.TicketId,
                CreatedBy = user?.Email ?? string.Empty,
                CreatedDate = DateTime.UtcNow
            };

            _context.TicketComments.Add(comment);
            await _context.SaveChangesAsync();

            // Add history entry for comment
            try
            {
                var history = new TicketHistory
                {
                    TicketId = comment.TicketId,
                    Action = "Comment",
                    Details = comment.Comment,
                    CreatedBy = comment.CreatedBy,
                    CreatedDate = DateTime.UtcNow
                };
                _context.TicketHistories.Add(history);
                await _context.SaveChangesAsync();
            }
            catch
            {
            }

            var dto = new TicketCommentDto { Id = comment.Id, Comment = comment.Comment, CreatedBy = comment.CreatedBy, CreatedDate = comment.CreatedDate };

            return Ok(dto);
        }
    }
}
