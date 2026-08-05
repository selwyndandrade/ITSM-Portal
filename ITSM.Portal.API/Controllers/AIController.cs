using ITSM.Portal.API.DTOs;
using ITSM.Portal.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace ITSM.Portal.API.Controllers
{
    [Route("api/ai")]
    [ApiController]
    [Authorize]
    public class AIController : ControllerBase
    {
        private readonly IAIService _aiService;
        private readonly TenantContextService _tenantContext;
        public AIController(IAIService aiService, TenantContextService tenantContext)
        {
            _aiService = aiService;
            _tenantContext = tenantContext;
        }

        [HttpPost("chat")]
        public async Task<ActionResult<AIChatResponse>> Chat(AIChatRequest request, CancellationToken cancellationToken)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Unauthorized();
            return Ok(await _aiService.ChatAsync(request, userId, _tenantContext.CurrentOrganizationId, _tenantContext.IsPlatformAdmin(), cancellationToken));
        }

        [HttpPost("ticket-summary")]
        public async Task<ActionResult<TicketSummaryResponse>> TicketSummary(TicketSummaryRequest request, CancellationToken cancellationToken)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);
            var summary = await _aiService.CreateTicketSummaryAsync(request, cancellationToken);
            return summary is null ? BadRequest(new { message = "The AI conversation was not found. Start a new chat before creating a ticket draft." }) : Ok(summary);
        }

        // Powers the "Suggest with AI" action on the Create Ticket form - lets an employee get
        // category/priority/title suggestions directly from the description they typed, with no
        // separate chat conversation required.
        [HttpPost("analyze")]
        public async Task<ActionResult<TicketAnalysisResponse>> Analyze(AnalyzeTextRequest request, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(request.Text)) return BadRequest(new { message = "Please enter a description before requesting AI suggestions." });
            return Ok(await _aiService.AnalyzeTextAsync(request.Text, cancellationToken));
        }

        // Powers the technician-facing "AI Assist" panel on Ticket Detail: a suggested response
        // draft, a likely root cause, and recommended next steps for the specific ticket.
        [HttpGet("ticket-assist/{ticketId:int}")]
        public async Task<ActionResult<TicketAssistResponse>> TicketAssist(int ticketId, [FromServices] Data.ApplicationDbContext context, CancellationToken cancellationToken)
        {
            var ticket = await _tenantContext.ApplyOrganizationFilter(context.Tickets.AsQueryable())
                .FirstOrDefaultAsync(t => t.Id == ticketId, cancellationToken);
            if (ticket == null) return NotFound(new { message = "Ticket not found." });

            var assist = await _aiService.GetTicketAssistAsync(ticket.Title, ticket.Description, ticket.Category, ticket.Priority, cancellationToken);
            return Ok(assist);
        }
    }
}
