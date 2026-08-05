using System.Collections.Concurrent;

namespace ITSM.Portal.API.Services
{
    public class AIConversationCache : IAIConversationCache
    {
        private const int MaxEntries = 500;
        private static readonly TimeSpan Ttl = TimeSpan.FromHours(2);
        private readonly ConcurrentDictionary<string, (string IssueText, DateTime ExpiresAt)> _entries = new();

        public void Set(string conversationId, string issueText)
        {
            _entries[conversationId] = (issueText, DateTime.UtcNow.Add(Ttl));
            Evict();
        }

        public bool TryGet(string conversationId, out string issueText)
        {
            if (_entries.TryGetValue(conversationId, out var entry) && entry.ExpiresAt > DateTime.UtcNow)
            {
                issueText = entry.IssueText;
                return true;
            }

            issueText = string.Empty;
            return false;
        }

        private void Evict()
        {
            var now = DateTime.UtcNow;
            foreach (var key in _entries.Where(e => e.Value.ExpiresAt <= now).Select(e => e.Key).ToList())
            {
                _entries.TryRemove(key, out _);
            }

            if (_entries.Count > MaxEntries)
            {
                foreach (var key in _entries.OrderBy(e => e.Value.ExpiresAt).Take(_entries.Count - MaxEntries).Select(e => e.Key).ToList())
                {
                    _entries.TryRemove(key, out _);
                }
            }
        }
    }
}
