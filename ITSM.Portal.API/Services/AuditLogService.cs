using ITSM.Portal.API.Data;
using ITSM.Portal.API.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Http;

namespace ITSM.Portal.API.Services
{
    public class AuditLogService
    {
        private readonly ApplicationDbContext _context;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly UserManager<ApplicationUser> _userManager;

        public AuditLogService(ApplicationDbContext context, IHttpContextAccessor httpContextAccessor, UserManager<ApplicationUser> userManager)
        {
            _context = context;
            _httpContextAccessor = httpContextAccessor;
            _userManager = userManager;
        }

        public async Task WriteAsync(string action, string details, string? entityType = null, int? entityId = null, ApplicationUser? actingUser = null)
        {
            var user = actingUser ?? await _userManager.GetUserAsync(_httpContextAccessor.HttpContext?.User!);
            var organizationId = user?.OrganizationId;
            var userId = user?.Id;
            var email = user?.Email;

            _context.AuditLogs.Add(new AuditLog
            {
                Action = action,
                Details = details,
                EntityType = entityType,
                EntityId = entityId,
                OrganizationId = organizationId,
                UserId = userId,
                UserEmail = email,
                Timestamp = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();
        }
    }
}
