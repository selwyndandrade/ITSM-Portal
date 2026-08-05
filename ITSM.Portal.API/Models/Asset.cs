using System.ComponentModel.DataAnnotations;

namespace ITSM.Portal.API.Models
{
    public class Asset
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string AssetTag { get; set; } = string.Empty;

        [Required]
        public string Name { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        public string Category { get; set; } = "Hardware";

        public string SerialNumber { get; set; } = string.Empty;

        public string Manufacturer { get; set; } = string.Empty;

        public string Model { get; set; } = string.Empty;

        public string Status { get; set; } = "Active";

        public string? AssignedUserId { get; set; }

        public int? DepartmentId { get; set; }

        public DateTime? PurchaseDate { get; set; }

        public DateTime? WarrantyExpirationDate { get; set; }

        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedDate { get; set; } = DateTime.UtcNow;

        public int? OrganizationId { get; set; }

        public string? Location { get; set; }

        public string? Notes { get; set; }

        public ApplicationUser? AssignedUser { get; set; }

        public Organization? Organization { get; set; }

        public Department? Department { get; set; }

        public ICollection<AssetHistory>? History { get; set; }
    }
}
