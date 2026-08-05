namespace ITSM.Portal.API.DTOs
{
    public class TicketSummaryResponse
    {
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Category { get; set; } = "General";
        public string Priority { get; set; } = "Medium";
        public string SuggestedAssignmentGroup { get; set; } = "Service Desk";
    }
}
