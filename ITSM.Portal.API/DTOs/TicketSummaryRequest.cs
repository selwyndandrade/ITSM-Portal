using System.ComponentModel.DataAnnotations;

namespace ITSM.Portal.API.DTOs
{
    public class TicketSummaryRequest
    {
        [Required]
        public string ConversationId { get; set; } = string.Empty;
    }
}
