namespace ITSM.Portal.API.Services
{
    // Short-lived, in-memory cache of the latest issue text per AI conversation,
    // used to bridge the chat step and the ticket-draft-generation step. Must be
    // registered as a singleton since AIService itself is scoped per-request.
    public interface IAIConversationCache
    {
        void Set(string conversationId, string issueText);
        bool TryGet(string conversationId, out string issueText);
    }
}
