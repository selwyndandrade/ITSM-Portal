namespace ITSM.Portal.API.DTOs
{
    // Result of an LLM-backed ticket analysis. Any field left null means the
    // provider didn't return a usable value, so the caller should fall back
    // to heuristic logic for that field.
    public class AITicketAnalysisResult
    {
        public string? Category { get; set; }
        public string? Priority { get; set; }
        public string? Title { get; set; }
        public string? Description { get; set; }
        public string? SuggestedAssignmentGroup { get; set; }
    }
}
