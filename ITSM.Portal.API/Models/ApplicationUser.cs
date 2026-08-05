using Microsoft.AspNetCore.Identity;

namespace ITSM.Portal.API.Models
{
    public class ApplicationUser : IdentityUser
    {
        public string Role { get; set; } = "User";

        public string? DisplayName { get; set; }

        public string? Bio { get; set; }

        public string? LinkedInUrl { get; set; }

        public string? GitHubUrl { get; set; }

        public string? PortfolioUrl { get; set; }

        public string? ProfileImageUrl { get; set; }

        public int? OrganizationId { get; set; }

        public int? DepartmentId { get; set; }

        public bool IsActive { get; set; } = true;

        public string? RefreshToken { get; set; }

        public DateTime? RefreshTokenExpiryTime { get; set; }

        public Organization? Organization { get; set; }

        public Department? Department { get; set; }
    }
}