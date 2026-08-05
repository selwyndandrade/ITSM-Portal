using ITSM.Portal.API.DTOs;
namespace ITSM.Portal.API.Services
{
    public interface IAIConversationService
    {
        Task StoreAsync(string userId, string userMessage, string aiResponse, CancellationToken cancellationToken = default);
        Task<IReadOnlyList<AIConversationDTO>> GetForUserAsync(string userId, CancellationToken cancellationToken = default);
    }
}
