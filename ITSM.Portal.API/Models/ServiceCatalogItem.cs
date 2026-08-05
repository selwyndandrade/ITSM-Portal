using System.ComponentModel.DataAnnotations;

namespace ITSM.Portal.API.Models
{
    public class ServiceCatalogItem
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string Name { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        public string Category { get; set; } = "General";

        public string Icon { get; set; } = "◌";

        public string EstimatedCompletionTime { get; set; } = "1-2 business days";

        public bool RequiresApproval { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

        public ICollection<ServiceRequest>? ServiceRequests { get; set; }
    }
}
