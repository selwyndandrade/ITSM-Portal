namespace ITSM.Portal.API.DTOs
{
    public class PortalContextDTO
    {
        public string? UserEmail { get; set; }
        public int TicketCount { get; set; }
        public int OpenTicketCount { get; set; }
        public int AssignedTicketCount { get; set; }
        public IReadOnlyList<KnowledgeArticleDTO> KnowledgeArticles { get; set; } = [];
    }
}
