using ITSM.Portal.API.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace ITSM.Portal.API.Data
{
    public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<Organization> Organizations { get; set; }

        public DbSet<Department> Departments { get; set; }

        public DbSet<Ticket> Tickets { get; set; }

        public DbSet<TicketComment> TicketComments { get; set; }

        public DbSet<TicketHistory> TicketHistories { get; set; }

        public DbSet<TicketAttachment> TicketAttachments { get; set; }

        public DbSet<Notification> Notifications { get; set; }

        public DbSet<Asset> Assets { get; set; }

        public DbSet<AssetHistory> AssetHistories { get; set; }

        public DbSet<ServiceCatalogItem> ServiceCatalogItems { get; set; }

        public DbSet<ServiceRequest> ServiceRequests { get; set; }

        public DbSet<ApprovalDecision> ApprovalDecisions { get; set; }

        public DbSet<AutomationRule> AutomationRules { get; set; }

        public DbSet<AutomationExecution> AutomationExecutions { get; set; }

        public DbSet<KnowledgeArticle> KnowledgeArticles { get; set; }
        public DbSet<AIConversation> AIConversations { get; set; }
        public DbSet<AuditLog> AuditLogs { get; set; }
        public DbSet<SlaPolicy> SlaPolicies { get; set; }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            builder.Entity<ApplicationUser>()
                .HasOne(u => u.Organization)
                .WithMany(o => o.Users)
                .HasForeignKey(u => u.OrganizationId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<ApplicationUser>()
                .HasOne(u => u.Department)
                .WithMany(d => d.Users)
                .HasForeignKey(u => u.DepartmentId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<Ticket>()
                .HasOne(t => t.Department)
                .WithMany(d => d.Tickets)
                .HasForeignKey(t => t.DepartmentId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<Ticket>()
                .HasOne(t => t.RequesterUser)
                .WithMany()
                .HasForeignKey(t => t.RequesterUserId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<Ticket>()
                .HasOne(t => t.AssignedToUser)
                .WithMany()
                .HasForeignKey(t => t.AssignedToUserId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<TicketComment>()
                .HasOne(c => c.AuthorUser)
                .WithMany()
                .HasForeignKey(c => c.AuthorUserId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<TicketHistory>()
                .HasOne(h => h.ActorUser)
                .WithMany()
                .HasForeignKey(h => h.ActorUserId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<TicketAttachment>()
                .HasOne(a => a.UploadedByUser)
                .WithMany()
                .HasForeignKey(a => a.UploadedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<TicketAttachment>()
                .HasOne(a => a.Ticket)
                .WithMany()
                .HasForeignKey(a => a.TicketId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<Asset>()
                .HasOne(a => a.AssignedUser)
                .WithMany()
                .HasForeignKey(a => a.AssignedUserId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.Entity<Asset>()
                .HasOne(a => a.Department)
                .WithMany()
                .HasForeignKey(a => a.DepartmentId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.Entity<AssetHistory>()
                .HasOne(h => h.Asset)
                .WithMany(a => a.History)
                .HasForeignKey(h => h.AssetId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<Ticket>()
                .HasOne(t => t.Asset)
                .WithMany()
                .HasForeignKey(t => t.AssetId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.Entity<ServiceCatalogItem>()
                .HasMany(i => i.ServiceRequests)
                .WithOne(r => r.CatalogItem)
                .HasForeignKey(r => r.CatalogItemId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<ServiceRequest>()
                .HasOne(r => r.RequestedByUser)
                .WithMany()
                .HasForeignKey(r => r.RequestedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<ServiceRequest>()
                .HasOne(r => r.Ticket)
                .WithMany()
                .HasForeignKey(r => r.TicketId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.Entity<ApprovalDecision>()
                .HasOne(d => d.ServiceRequest)
                .WithMany()
                .HasForeignKey(d => d.ServiceRequestId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<ApprovalDecision>()
                .HasOne(d => d.DecisionByUser)
                .WithMany()
                .HasForeignKey(d => d.DecisionByUserId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.Entity<SlaPolicy>()
                .HasOne(p => p.Organization)
                .WithMany()
                .HasForeignKey(p => p.OrganizationId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<SlaPolicy>()
                .HasIndex(p => new { p.OrganizationId, p.Priority })
                .IsUnique();
        }
    }
}
