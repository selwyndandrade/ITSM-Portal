namespace ITSM.Portal.API.DTOs
{
    public class SubscriptionPlanDto
    {
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int UserLimit { get; set; }
        public int AssetLimit { get; set; }
        public int AiUsageLimit { get; set; }
        public IReadOnlyList<string> Features { get; set; } = Array.Empty<string>();
    }
}
