using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace ITSM.Portal.API.Models
{
    public class AutomationRule
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string Name { get; set; } = string.Empty;

        public string? Description { get; set; }

        [Required]
        public string TriggerType { get; set; } = string.Empty;

        public string? TriggerValue { get; set; }

        [JsonIgnore]
        public string ConditionsJson { get; set; } = "[]";

        [JsonIgnore]
        public string ActionsJson { get; set; } = "[]";

        public int? OrganizationId { get; set; }

        public Organization? Organization { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

        [NotMapped]
        public List<AutomationCondition> Conditions
        {
            get => string.IsNullOrWhiteSpace(ConditionsJson) ? new List<AutomationCondition>() : JsonSerializer.Deserialize<List<AutomationCondition>>(ConditionsJson) ?? new List<AutomationCondition>();
            set => ConditionsJson = JsonSerializer.Serialize(value ?? new List<AutomationCondition>());
        }

        [NotMapped]
        public List<AutomationAction> Actions
        {
            get => string.IsNullOrWhiteSpace(ActionsJson) ? new List<AutomationAction>() : JsonSerializer.Deserialize<List<AutomationAction>>(ActionsJson) ?? new List<AutomationAction>();
            set => ActionsJson = JsonSerializer.Serialize(value ?? new List<AutomationAction>());
        }
    }
}
