using ITSM.Portal.API.Models;

namespace ITSM.Portal.API.DTOs
{
    public class OrganizationOnboardingResult
    {
        public Organization? Organization { get; set; }

        public ApplicationUser? AdminUser { get; set; }

        public IReadOnlyList<Department> Departments { get; set; } = Array.Empty<Department>();
    }
}
