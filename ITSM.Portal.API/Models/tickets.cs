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

        public DateTime CreatedDate { get; set; }


        [Column("CreatedByID")]
        public string? CreatedBy { get; set; }


        [Column("AssignedToID")]
        public string? AssignedTo { get; set; }


        public ICollection<TicketComment>? Comments { get; set; }
    }
}