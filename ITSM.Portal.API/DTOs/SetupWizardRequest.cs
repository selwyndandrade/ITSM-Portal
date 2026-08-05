namespace ITSM.Portal.API.DTOs
{
    public class SetupWizardRequest
    {
        public string CompanyName { get; set; } = string.Empty;
        public string? CompanyDescription { get; set; }
        public string? PrimaryContactEmail { get; set; }
        public string? AdminEmail { get; set; }
        public string? AdminPassword { get; set; }
        public List<string>? Departments { get; set; }
        public List<string>? Roles { get; set; }
        public List<string>? SlaPolicies { get; set; }
        public Dictionary<string, object>? NotificationSettings { get; set; }
        public Dictionary<string, object>? AutomationDefaults { get; set; }
    }
}
