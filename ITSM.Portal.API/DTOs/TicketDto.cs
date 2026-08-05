namespace ITSM.Portal.API.DTOs
{
    public class TicketDto
    {
        public int Id { get; set; }

        public string Title { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        public string Status { get; set; } = string.Empty;

        public string Priority { get; set; } = string.Empty;

        public string? Category { get; set; }

        public string? Department { get; set; }

        public string? Requester { get; set; }

        public string? AssignedTechnician { get; set; }

        public DateTime CreatedDate { get; set; }

        public DateTime? UpdatedDate { get; set; }

        public string? CreatedBy { get; set; }

        public string? AssignedTo { get; set; }

        public int? AssetId { get; set; }

        public string? AssetTag { get; set; }

        public string? AssetName { get; set; }

        public string? AssetSerialNumber { get; set; }

        public DateTime? DueDate { get; set; }

        public DateTime? ResponseDeadline { get; set; }

        public DateTime? ResolutionDeadline { get; set; }

        public string? SlaStatus { get; set; }

        public DateTime? ResolutionDate { get; set; }

        public string? EscalationLevel { get; set; }

        public List<TicketCommentDto> Comments { get; set; }
            = new List<TicketCommentDto>();
    }
}