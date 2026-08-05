using System.Security.Claims;
using ITSM.Portal.API.DTOs;
using ITSM.Portal.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
namespace ITSM.Portal.API.Controllers
{
    [Route("api/ai/conversations")][ApiController][Authorize]
    public class AIConversationsController : ControllerBase
    {
        private readonly IAIConversationService _conversations;
        public AIConversationsController(IAIConversationService conversations) => _conversations = conversations;
        [HttpGet]
        public async Task<ActionResult<IReadOnlyList<AIConversationDTO>>> Get(CancellationToken cancellationToken) => Ok(await _conversations.GetForUserAsync(User.FindFirstValue(ClaimTypes.NameIdentifier)!, cancellationToken));
    }
}
