using ITSM.Portal.API.Data;
using ITSM.Portal.API.Models;
using ITSM.Portal.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ITSM.Portal.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class NotificationsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly TenantContextService _tenantContext;
        private readonly ILogger<NotificationsController> _logger;

        public NotificationsController(ApplicationDbContext context, UserManager<ApplicationUser> userManager, TenantContextService tenantContext, ILogger<NotificationsController> logger)
        {
            _context = context;
            _userManager = userManager;
            _tenantContext = tenantContext;
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> GetNotifications()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user is null) return Unauthorized();

            try
            {
                var notifications = await _tenantContext.ApplyOrganizationFilter(_context.Notifications)
                    .Where(n => n.UserId == user.Id)
                    .OrderByDescending(n => n.CreatedDate)
                    .Take(50)
                    .Select(n => new
                    {
                        n.Id,
                        n.Title,
                        n.Message,
                        n.Type,
                        n.RelatedTicketId,
                        n.IsRead,
                        n.CreatedDate
                    })
                    .ToListAsync();

                return Ok(notifications);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to load notifications for user {UserId}", user.Id);
                return Ok(Array.Empty<object>());
            }
        }

        [HttpPut("{id}/read")]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user is null) return Unauthorized();

            var notification = await _tenantContext.ApplyOrganizationFilter(_context.Notifications)
                .FirstOrDefaultAsync(n => n.Id == id && n.UserId == user.Id);
            if (notification is null) return NotFound();

            notification.IsRead = true;
            await _context.SaveChangesAsync();
            return Ok();
        }

        [HttpPut("read-all")]
        public async Task<IActionResult> MarkAllAsRead()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user is null) return Unauthorized();

            await _tenantContext.ApplyOrganizationFilter(_context.Notifications)
                .Where(n => n.UserId == user.Id && !n.IsRead)
                .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true));

            return Ok();
        }

        internal static async Task CreateAsync(ApplicationDbContext context, string userId, string title, string message, string type, int? relatedTicketId = null)
        {
            // GetNotifications() filters by OrganizationId via ApplyOrganizationFilter, so a
            // notification created without one is permanently invisible to its recipient.
            var organizationId = await context.Users
                .Where(u => u.Id == userId)
                .Select(u => u.OrganizationId)
                .FirstOrDefaultAsync();

            context.Notifications.Add(new Notification
            {
                UserId = userId,
                Title = title,
                Message = message,
                Type = type,
                RelatedTicketId = relatedTicketId,
                OrganizationId = organizationId,
                IsRead = false,
                CreatedDate = DateTime.UtcNow
            });

            await context.SaveChangesAsync();
        }
    }
}
