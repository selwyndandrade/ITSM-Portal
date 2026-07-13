namespace ITSM.Portal.API.Models
{
    public class Ticket
    {
        public int Id { get; set; }

        public string Title { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        public string Category { get; set; } = string.Empty;

        public string Priority { get; set; } = "Medium";

        public string Status { get; set; } = "Open";

        public string RequestedBy { get; set; } = string.Empty;

        public string AssignedTo { get; set; } = string.Empty;

        public DateTime CreatedDate { get; set; } = DateTime.Now;

        public List<TicketComment> Comments { get; set; } = new();
    }
}