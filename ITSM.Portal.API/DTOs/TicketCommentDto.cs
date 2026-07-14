using System;

namespace ITSM.Portal.API.DTOs
{
    public class TicketCommentDto
    {
        public int Id { get; set; }

        public string Comment { get; set; } = string.Empty;

        public string CreatedBy { get; set; } = string.Empty;

        public DateTime CreatedDate { get; set; }
    }
}