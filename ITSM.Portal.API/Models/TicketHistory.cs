using System.ComponentModel.DataAnnotations;

namespace ITSM.Portal.API.Models
{
    public class TicketHistory
    {
        [Key]
        public int Id { get; set; }

        public int TicketId { get; set; }

        public string Action { get; set; } = string.Empty;

        public string Details { get; set; } = string.Empty;

        public string CreatedBy { get; set; } = string.Empty;

        public string? ActorUserId { get; set; }

        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

        public ApplicationUser? ActorUser { get; set; }
    }
}
