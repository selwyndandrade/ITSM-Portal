namespace ITSM.Portal.API.DTOs
{
    public class OrganizationSettingsDto
    {
        public int? OrganizationId { get; set; }
        public string OrganizationName { get; set; } = string.Empty;
        public string? LogoUrl { get; set; }
        public string PrimaryColor { get; set; } = "#1d4ed8";
        public string DefaultView { get; set; } = "Dashboard";
        public bool AutoAssign { get; set; } = true;
        public bool NotifyUpdates { get; set; } = true;
    }

    public class UpdateOrganizationSettingsRequest
    {
        public string OrganizationName { get; set; } = string.Empty;
        public string? PrimaryColor { get; set; }
    }
}
