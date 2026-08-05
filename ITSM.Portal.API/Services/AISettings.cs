namespace ITSM.Portal.API.Services
{
    // Provider configuration is deliberately independent of the application logic.
    public class AISettings
    {
        public const string SectionName = "AISettings";
        public string Provider { get; set; } = string.Empty;
        public string ApiKey { get; set; } = string.Empty;
        public string Model { get; set; } = string.Empty;
        public string Endpoint { get; set; } = string.Empty;
        public string DeploymentName { get; set; } = string.Empty;
        public string ApiVersion { get; set; } = "2024-02-01";
    }
}
