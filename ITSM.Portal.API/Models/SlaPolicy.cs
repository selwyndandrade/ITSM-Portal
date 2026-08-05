using System.ComponentModel.DataAnnotations;

namespace ITSM.Portal.API.Models
{
    // Per-organization, per-priority SLA response/resolution targets.
    public class SlaPolicy
    {
        [Key]
        public int Id { get; set; }

        public int OrganizationId { get; set; }

        [Required]
        public string Priority { get; set; } = string.Empty;

        public int ResponseTargetMinutes { get; set; }

        public int ResolutionTargetMinutes { get; set; }

        public Organization? Organization { get; set; }
    }
}
