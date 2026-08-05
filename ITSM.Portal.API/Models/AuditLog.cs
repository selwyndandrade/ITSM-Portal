namespace ITSM.Portal.API.Models
{
    public class AuditLog
    {
        public int Id { get; set; }
        public string Action { get; set; } = string.Empty;
        public string Details { get; set; } = string.Empty;
        public string? EntityType { get; set; }
        public int? EntityId { get; set; }
        public string? UserId { get; set; }
        public string? UserEmail { get; set; }
        public int? OrganizationId { get; set; }
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }
}
