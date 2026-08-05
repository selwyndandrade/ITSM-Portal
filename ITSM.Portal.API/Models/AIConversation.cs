using System.ComponentModel.DataAnnotations;

namespace ITSM.Portal.API.Models
{
    public class AIConversation
    {
        public int Id { get; set; }
        [Required, MaxLength(450)] public string UserId { get; set; } = string.Empty;
        [Required] public string UserMessage { get; set; } = string.Empty;
        [Required] public string AIResponse { get; set; } = string.Empty;
        public DateTime CreatedDate { get; set; }
    }
}
