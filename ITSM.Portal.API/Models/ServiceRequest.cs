using System.ComponentModel.DataAnnotations;

namespace ITSM.Portal.API.Models
{
    public class ServiceRequest
    {
        [Key]
        public int Id { get; set; }

        public int CatalogItemId { get; set; }

        public int? OrganizationId { get; set; }

        public string? RequestedByUserId { get; set; }

        public int? TicketId { get; set; }

        public string? TicketDescription { get; set; }

        public string Status { get; set; } = "Submitted";

        public string ApprovalStatus { get; set; } = "Pending";

        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

        public DateTime? CompletedDate { get; set; }

        public ServiceCatalogItem? CatalogItem { get; set; }
        public Organization? Organization { get; set; }
        public ApplicationUser? RequestedByUser { get; set; }

        public Ticket? Ticket { get; set; }
    }
}
