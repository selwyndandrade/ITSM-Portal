using System.ComponentModel.DataAnnotations;

namespace ITSM.Portal.API.Models
{
    public class AutomationExecution
    {
        [Key]
        public int Id { get; set; }

        public int? RuleId { get; set; }

        public int? OrganizationId { get; set; }

        public string RuleName { get; set; } = string.Empty;

        public string TriggerEvent { get; set; } = string.Empty;

        public string? RelatedEntityType { get; set; }

        public int? RelatedEntityId { get; set; }

        public string Status { get; set; } = "Pending";

        public string? Message { get; set; }

        public DateTime TriggeredAt { get; set; } = DateTime.UtcNow;
    }
}
