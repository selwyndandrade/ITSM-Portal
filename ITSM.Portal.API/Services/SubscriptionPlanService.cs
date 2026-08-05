namespace ITSM.Portal.API.Services
{
    public class SubscriptionPlanService
    {
        private readonly IReadOnlyDictionary<string, SubscriptionPlanDefinition> _plans;

        public SubscriptionPlanService()
        {
            _plans = new Dictionary<string, SubscriptionPlanDefinition>(StringComparer.OrdinalIgnoreCase)
            {
                ["Free trial"] = new("Free trial", "Best for evaluating Kyro with a small team.", 10, 25, 100, new[] { "Core ticketing", "Knowledge base", "Basic automation", "Demo environment" }),
                ["Professional"] = new("Professional", "Built for growing operations and service teams.", 50, 200, 500, new[] { "Advanced automation", "Priority analytics", "AI assistance", "Approval workflows" }),
                ["Enterprise"] = new("Enterprise", "For multi-department organizations with governance needs.", 250, 1000, 2000, new[] { "Unlimited automation", "Advanced reporting", "SSO-ready administration", "Dedicated onboarding" })
            };
        }

        public SubscriptionPlanDefinition GetPlan(string? planName)
        {
            if (string.IsNullOrWhiteSpace(planName)) return _plans["Free trial"];
            return _plans.TryGetValue(planName, out var plan) ? plan : _plans["Free trial"];
        }

        public IReadOnlyDictionary<string, SubscriptionPlanDefinition> GetPlans() => _plans;
    }

    public sealed record SubscriptionPlanDefinition(
        string Name,
        string Description,
        int UserLimit,
        int AssetLimit,
        int AiUsageLimit,
        IReadOnlyList<string> Features);
}
