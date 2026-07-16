namespace ITSM.Portal.API.DTOs
{
    public class TicketCommentCreateDto
    {
        public string Comment { get; set; } = string.Empty;

        public int TicketId { get; set; }
    }
}
