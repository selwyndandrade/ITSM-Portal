using System.ComponentModel.DataAnnotations;

namespace ITSM.Portal.API.Models
{
    public class Ticket
    {
        public int Id { get; set; }

        [Required]
        public string Title { get; set; } = string.Empty;

        [Required]
        public string Description { get; set; } = string.Empty;

        [Required]
        public string Category { get; set; } = string.Empty;

        [Required]
        public string Priority { get; set; } = string.Empty;

        [Required]
        public string Status { get; set; } = string.Empty;

        public string AssignedTo { get; set; } = string.Empty;

        public string CreatedBy { get; set; } = string.Empty;

        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

        public ICollection<TicketComment> Comments { get; set; } = new List<TicketComment>();
    }
}