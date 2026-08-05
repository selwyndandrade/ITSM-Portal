using System.ComponentModel.DataAnnotations;

namespace ITSM.Portal.API.Models
{
    public class ApprovalDecision
    {
        [Key]
        public int Id { get; set; }

        public int ServiceRequestId { get; set; }

        public int? OrganizationId { get; set; }

        public string? Decision { get; set; }

        public string? Comments { get; set; }

        public string? DecisionByUserId { get; set; }

        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

        public ServiceRequest? ServiceRequest { get; set; }

        public Organization? Organization { get; set; }

        public ApplicationUser? DecisionByUser { get; set; }
    }
}
