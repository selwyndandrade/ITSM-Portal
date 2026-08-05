namespace ITSM.Portal.API.DTOs
{
    public class ProfileUpdateRequestDto
    {
        public string? DisplayName { get; set; }

        public string? Bio { get; set; }

        public string? LinkedInUrl { get; set; }

        public string? GitHubUrl { get; set; }

        public string? PortfolioUrl { get; set; }

        public bool ClearProfileImage { get; set; }
    }
}
