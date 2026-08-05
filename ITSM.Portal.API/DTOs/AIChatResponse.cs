namespace ITSM.Portal.API.DTOs
{
    public class AIChatResponse
    {
        public string ConversationId { get; set; } = string.Empty;
        public string Response { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string Category { get; set; } = "General";
        public string Priority { get; set; } = "Medium";
        public IReadOnlyList<KnowledgeArticleDTO> KnowledgeArticles { get; set; } = [];
        public IReadOnlyList<KnowledgeArticleDTO> RecommendedArticles { get; set; } = [];
        public bool RequiresTicket { get; set; }
    }
}
