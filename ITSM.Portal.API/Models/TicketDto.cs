using System;
using System.Collections.Generic;

namespace ITSM.Portal.API.Models
{
    public class CommentDto
    {
        public int Id { get; set; }
        public string Comment { get; set; } = string.Empty;
        public string CreatedBy { get; set; } = string.Empty;
        public DateTime CreatedDate { get; set; }
        public int TicketId { get; set; }
    }

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
        public List<CommentDto>? Comments { get; set; }
    }
}
