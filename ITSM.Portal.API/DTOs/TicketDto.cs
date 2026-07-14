namespace ITSM.Portal.API.DTOs
{
    public class TicketDto
    {
        public int Id { get; set; }

        public string Title { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        public string Status { get; set; } = string.Empty;

        public string Priority { get; set; } = string.Empty;

        public DateTime CreatedDate { get; set; }


        public string? CreatedBy { get; set; }

        public string? AssignedTo { get; set; }


        public List<TicketCommentDto> Comments { get; set; }
            = new List<TicketCommentDto>();
    }
}