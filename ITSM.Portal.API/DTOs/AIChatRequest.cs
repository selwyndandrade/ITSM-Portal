using System.ComponentModel.DataAnnotations;

namespace ITSM.Portal.API.DTOs
{
    public class AIChatRequest
    {
        [Required, MaxLength(4000)]
        public string Message { get; set; } = string.Empty;
        public string? ConversationId { get; set; }
        public PortalContextDTO? PortalContext { get; set; }
    }
}
