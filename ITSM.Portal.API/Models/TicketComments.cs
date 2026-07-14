using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ITSM.Portal.API.Models
{
    public class TicketComment
    {
        public int Id { get; set; }

        [Required]
        public string Comment { get; set; } = string.Empty;

        public string CreatedBy { get; set; } = string.Empty;

        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

        public int TicketId { get; set; }

        [JsonIgnore]
        public Ticket Ticket { get; set; } = null!;
    }
}