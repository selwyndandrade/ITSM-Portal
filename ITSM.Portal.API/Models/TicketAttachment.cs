using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ITSM.Portal.API.Models
{
    public class TicketAttachment
    {
        public int Id { get; set; }

        public int TicketId { get; set; }

        [JsonIgnore]
        public Ticket Ticket { get; set; } = null!;

        [Required]
        public string FileName { get; set; } = string.Empty;

        [Required]
        public string StoredFileName { get; set; } = string.Empty;

        public string ContentType { get; set; } = string.Empty;

        public long FileSizeBytes { get; set; }

        public string? UploadedByUserId { get; set; }

        public ApplicationUser? UploadedByUser { get; set; }

        public string UploadedBy { get; set; } = string.Empty;

        public DateTime UploadedDate { get; set; } = DateTime.UtcNow;
    }
}
