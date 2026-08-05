namespace ITSM.Portal.API.Models
{
    public class AutomationCondition
    {
        public string Field { get; set; } = string.Empty;
        public string Operator { get; set; } = "equals";
        public string Value { get; set; } = string.Empty;
    }
}
