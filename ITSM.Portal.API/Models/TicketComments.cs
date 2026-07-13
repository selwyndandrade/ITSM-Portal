namespace ITSM.Portal.API.Models
{
    public class TicketComment
    {
        public int Id { get; set; }

        public string Comment { get; set; } = string.Empty;

        public string CreatedBy { get; set; } = string.Empty;

        public DateTime CreatedDate { get; set; } = DateTime.Now;


        // Relationship
        public int TicketId { get; set; }

        public Ticket? Ticket { get; set; }
    }
}
