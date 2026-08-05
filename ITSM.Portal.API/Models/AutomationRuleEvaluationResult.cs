namespace ITSM.Portal.API.Models
{
    public class AutomationRuleEvaluationResult
    {
        public bool Passed { get; set; }
        public string? Summary { get; set; }
        public List<AutomationConditionEvaluation> Conditions { get; set; } = new();
        public List<AutomationAction> Actions { get; set; } = new();
    }

    public class AutomationConditionEvaluation
    {
        public string Field { get; set; } = string.Empty;
        public string Operator { get; set; } = "equals";
        public string Value { get; set; } = string.Empty;
        public bool Passed { get; set; }
        public string? ActualValue { get; set; }
        public string? Message { get; set; }
    }
}
