namespace ITSM.Portal.API.DTOs
{
    public class OrganizationOnboardingRequest
    {
        public string OrganizationName { get; set; } = string.Empty;

        public string? OrganizationSlug { get; set; }

        public string? Description { get; set; }

        public string AdminEmail { get; set; } = string.Empty;

        public string AdminPassword { get; set; } = string.Empty;

        public string? SubscriptionTier { get; set; }

        public string[]? DepartmentNames { get; set; }

        public string? PrimaryColor { get; set; }
    }
}
