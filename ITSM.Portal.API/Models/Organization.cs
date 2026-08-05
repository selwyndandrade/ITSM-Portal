namespace ITSM.Portal.API.Models
{
    public class Organization
    {
        public int Id { get; set; }

        public string Name { get; set; } = string.Empty;

        public string? Slug { get; set; }

        public string? Description { get; set; }

        public string? PrimaryContactEmail { get; set; }

        public string? SubscriptionTier { get; set; } = "Starter";

        public bool IsActive { get; set; } = true;

        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

        public string? SettingsJson { get; set; }

        public string? LogoUrl { get; set; }

        public string? PrimaryColor { get; set; }

        public ICollection<ApplicationUser> Users { get; set; } = new List<ApplicationUser>();

        public ICollection<Department> Departments { get; set; } = new List<Department>();

        public ICollection<Ticket> Tickets { get; set; } = new List<Ticket>();

        public ICollection<Asset> Assets { get; set; } = new List<Asset>();

        public ICollection<ServiceRequest> ServiceRequests { get; set; } = new List<ServiceRequest>();

        public ICollection<AutomationRule> AutomationRules { get; set; } = new List<AutomationRule>();

        public ICollection<Notification> Notifications { get; set; } = new List<Notification>();

        public ICollection<KnowledgeArticle> KnowledgeArticles { get; set; } = new List<KnowledgeArticle>();
    }
}
