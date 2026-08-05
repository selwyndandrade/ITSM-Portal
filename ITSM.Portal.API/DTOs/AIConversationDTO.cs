namespace ITSM.Portal.API.DTOs
{
    public class AIConversationDTO
    {
        public int Id { get; set; }
        public string UserMessage { get; set; } = string.Empty;
        public string AIResponse { get; set; } = string.Empty;
        public DateTime CreatedDate { get; set; }
    }
}
