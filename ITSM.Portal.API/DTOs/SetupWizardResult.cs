using ITSM.Portal.API.Models;

namespace ITSM.Portal.API.DTOs
{
    public class SetupWizardResult
    {
        public Organization Organization { get; set; } = null!;
        public List<Department> Departments { get; set; } = new();
        public List<AutomationRule> AutomationRules { get; set; } = new();
        public ApplicationUser? AdminUser { get; set; }
    }
}
