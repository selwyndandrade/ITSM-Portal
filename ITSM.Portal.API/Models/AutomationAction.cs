namespace ITSM.Portal.API.Models
{
    public class AutomationAction
    {
        public string Type { get; set; } = "assign";
        public string Value { get; set; } = string.Empty;
        public string? Target { get; set; }
        public string? Message { get; set; }
    }
}
