using ITSM.Portal.API.Models;

namespace ITSM.Portal.API.Services
{
    // Computes SLA deadlines/status at read time so there's no need for a background job
    // to keep a persisted status column in sync.
    public static class SlaCalculator
    {
        // Fallback targets used when an organization has no configured SlaPolicy rows yet.
        public static readonly IReadOnlyDictionary<string, (int ResponseMinutes, int ResolutionMinutes)> DefaultTargets =
            new Dictionary<string, (int, int)>(StringComparer.OrdinalIgnoreCase)
            {
                ["Critical"] = (30, 240),
                ["High"] = (60, 480),
                ["Medium"] = (240, 1440),
                ["Low"] = (480, 4320)
            };

        public static (int ResponseMinutes, int ResolutionMinutes) GetTargets(string? priority, IReadOnlyDictionary<string, SlaPolicy>? orgPolicies)
        {
            var key = string.IsNullOrWhiteSpace(priority) ? "Medium" : priority;

            if (orgPolicies != null && orgPolicies.TryGetValue(key, out var policy))
            {
                return (policy.ResponseTargetMinutes, policy.ResolutionTargetMinutes);
            }

            return DefaultTargets.TryGetValue(key, out var defaults) ? defaults : DefaultTargets["Medium"];
        }

        public static (DateTime ResponseDeadline, DateTime ResolutionDeadline) ComputeDeadlines(DateTime createdDate, string? priority, IReadOnlyDictionary<string, SlaPolicy>? orgPolicies)
        {
            var targets = GetTargets(priority, orgPolicies);
            return (createdDate.AddMinutes(targets.ResponseMinutes), createdDate.AddMinutes(targets.ResolutionMinutes));
        }

        // "Met" - resolved before the resolution deadline
        // "Breached" - resolution deadline passed (open) or resolved after the deadline
        // "AtRisk" - open, less than 20% of the remaining window (or under 1 hour) left before breach
        // "OnTrack" - open, plenty of time remaining
        // "None" - no deadline information available
        public static string GetStatus(string? status, DateTime? resolutionDeadline, DateTime? resolutionDate)
        {
            if (resolutionDeadline is null) return "None";

            var isClosed = string.Equals(status, "Resolved", StringComparison.OrdinalIgnoreCase)
                || string.Equals(status, "Closed", StringComparison.OrdinalIgnoreCase);

            if (isClosed)
            {
                var completedAt = resolutionDate ?? DateTime.UtcNow;
                return completedAt <= resolutionDeadline.Value ? "Met" : "Breached";
            }

            var now = DateTime.UtcNow;
            if (now > resolutionDeadline.Value) return "Breached";

            var remaining = resolutionDeadline.Value - now;
            if (remaining <= TimeSpan.FromHours(1)) return "AtRisk";

            return "OnTrack";
        }
    }
}
