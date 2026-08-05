using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ITSM.Portal.API.Models
{
    public class Ticket
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string Title { get; set; } = string.Empty;

        [Required]
        public string Description { get; set; } = string.Empty;

        public string Status { get; set; } = "Open";

        public string Priority { get; set; } = "Medium";

        public string? Category { get; set; }

        public int? OrganizationId { get; set; }

        public int? DepartmentId { get; set; }

        public string? RequesterUserId { get; set; }

        public string? AssignedToUserId { get; set; }

        public DateTime CreatedDate { get; set; }

        [Column("CreatedByID")]
        public string? CreatedBy { get; set; }

        [Column("AssignedToID")]
        public string? AssignedTo { get; set; }

        public DateTime? DueDate { get; set; }

        public DateTime? ResponseDeadline { get; set; }

        public DateTime? ResolutionDeadline { get; set; }

        public string? SlaStatus { get; set; }

        public DateTime? ResolutionDate { get; set; }

        public string? EscalationLevel { get; set; }

        public ICollection<TicketComment>? Comments { get; set; }
        public string? UpdatedBy { get; set; }

        public DateTime? UpdatedDate { get; set; }

        public int? AssetId { get; set; }

        public Asset? Asset { get; set; }

        public Organization? Organization { get; set; }

        public Department? Department { get; set; }

        public ApplicationUser? RequesterUser { get; set; }

        public ApplicationUser? AssignedToUser { get; set; }
    }
}
