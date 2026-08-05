namespace ITSM.Portal.API.DTOs
{
    // Fully-populated ticket triage suggestion (category/priority always filled,
    // via LLM provider when configured, otherwise via keyword heuristics).
    public class TicketAnalysisResponse
    {
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Category { get; set; } = "General";
        public string Priority { get; set; } = "Medium";
        public string SuggestedAssignmentGroup { get; set; } = "Service Desk";
    }

    public class AnalyzeTextRequest
    {
        public string Text { get; set; } = string.Empty;
    }

    // Technician-facing AI assist for an existing ticket: a draft response,
    // a likely root cause, and recommended next steps.
    public class TicketAssistResponse
    {
        public string SuggestedResponse { get; set; } = string.Empty;
        public string RootCauseSuggestion { get; set; } = string.Empty;
        public IReadOnlyList<string> NextSteps { get; set; } = [];
    }
}
