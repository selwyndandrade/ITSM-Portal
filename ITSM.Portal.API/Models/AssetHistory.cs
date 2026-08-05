using System.ComponentModel.DataAnnotations;

namespace ITSM.Portal.API.Models
{
    public class AssetHistory
    {
        [Key]
        public int Id { get; set; }

        public int AssetId { get; set; }

        public string Action { get; set; } = string.Empty;

        public string? PreviousUser { get; set; }

        public string? NewUser { get; set; }

        public string? ChangedBy { get; set; }

        public DateTime Date { get; set; } = DateTime.UtcNow;

        public Asset? Asset { get; set; }
    }
}
