using System.ComponentModel.DataAnnotations;

namespace ITSM.Portal.API.Models
{
    public class KnowledgeArticle
    {
        public int Id { get; set; }

        [Required, MaxLength(250)]
        public string Title { get; set; } = string.Empty;

        [Required]
        public string Content { get; set; } = string.Empty;

        [Required, MaxLength(100)]
        public string Category { get; set; } = "General";

        [MaxLength(256)]
        public string? CreatedBy { get; set; }

        public int? OrganizationId { get; set; }

        public DateTime CreatedDate { get; set; }

        public DateTime? UpdatedDate { get; set; }
    }
}
