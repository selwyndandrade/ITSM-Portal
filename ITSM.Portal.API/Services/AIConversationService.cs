using ITSM.Portal.API.Data;
using ITSM.Portal.API.DTOs;
using ITSM.Portal.API.Models;
using Microsoft.EntityFrameworkCore;
namespace ITSM.Portal.API.Services
{
    public class AIConversationService : IAIConversationService
    {
        private readonly ApplicationDbContext _context;
        public AIConversationService(ApplicationDbContext context) => _context = context;
        public async Task StoreAsync(string userId, string userMessage, string aiResponse, CancellationToken cancellationToken = default)
        {
            _context.AIConversations.Add(new AIConversation { UserId = userId, UserMessage = userMessage, AIResponse = aiResponse, CreatedDate = DateTime.UtcNow });
            await _context.SaveChangesAsync(cancellationToken);
        }
        public async Task<IReadOnlyList<AIConversationDTO>> GetForUserAsync(string userId, CancellationToken cancellationToken = default) =>
            await _context.AIConversations.AsNoTracking().Where(c => c.UserId == userId).OrderByDescending(c => c.CreatedDate).Take(100)
                .Select(c => new AIConversationDTO { Id = c.Id, UserMessage = c.UserMessage, AIResponse = c.AIResponse, CreatedDate = c.CreatedDate }).ToListAsync(cancellationToken);
    }
}
