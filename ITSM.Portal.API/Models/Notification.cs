namespace ITSM.Portal.API.Models
{
    public class Notification
    {
        public int Id { get; set; }

        public string UserId { get; set; } = string.Empty;

        public string Title { get; set; } = string.Empty;

        public string Message { get; set; } = string.Empty;

        public string Type { get; set; } = "General";

        public int? RelatedTicketId { get; set; }

        public int? OrganizationId { get; set; }

        public Organization? Organization { get; set; }

        public bool IsRead { get; set; }

        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    }
}
