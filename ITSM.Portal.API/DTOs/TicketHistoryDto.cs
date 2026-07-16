using System;

namespace ITSM.Portal.API.DTOs
{
    public class TicketHistoryDto
    {
        public int Id { get; set; }

        public string Action { get; set; } = string.Empty;

        public string Details { get; set; } = string.Empty;

        public string CreatedBy { get; set; } = string.Empty;

        public DateTime CreatedDate { get; set; }
    }
}
