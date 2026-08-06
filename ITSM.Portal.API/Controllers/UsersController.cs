using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using ITSM.Portal.API.Data;
using ITSM.Portal.API.Models;
using ITSM.Portal.API.Services;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Threading.Tasks;

namespace ITSM.Portal.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class UsersController : ControllerBase
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly ApplicationDbContext _context;
        private readonly TenantContextService _tenantContext;
        private readonly AuditLogService _auditLog;

        public UsersController(UserManager<ApplicationUser> userManager, ApplicationDbContext context, TenantContextService tenantContext, AuditLogService auditLog)
        {
            _userManager = userManager;
            _context = context;
            _tenantContext = tenantContext;
            _auditLog = auditLog;
        }

        [HttpGet]
        public async Task<IActionResult> GetUsers([FromQuery] string? query)
        {
            var usersQuery = _tenantContext.ApplyOrganizationFilter(_userManager.Users.AsQueryable());

            if (!string.IsNullOrEmpty(query))
            {
                var q = query.Trim().ToLower();
                usersQuery = usersQuery.Where(u => u.Email != null && u.Email.ToLower().Contains(q));
            }

            var users = await usersQuery
                .OrderBy(u => u.Email)
                .Select(u => new
                {
                    id = u.Id,
                    email = u.Email,
                    displayName = u.DisplayName,
                    role = u.Role,
                    departmentId = u.DepartmentId,
                    isActive = u.IsActive
                })
                .Take(100)
                .ToListAsync();

            return Ok(users);
        }

        // Fetches a user only if they belong to the caller's organization (or the caller is a platform admin).
        private async Task<ApplicationUser?> FindTenantUserAsync(string id)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user is null) return null;
            if (!_tenantContext.CanAccessOrganization(user.OrganizationId)) return null;
            return user;
        }

        // Roles an organization Admin is allowed to grant. "PlatformAdmin" is deliberately excluded -
        // it is the only path to cross-tenant access (see TenantContextService.IsPlatformAdmin) and
        // must never be assignable by a tenant-scoped Admin, including to themselves.
        private static readonly HashSet<string> AssignableRoles = new(StringComparer.OrdinalIgnoreCase)
        {
            "Admin", "Technician", "User", "Manager", "Employee"
        };

        [HttpPut("{id}/role")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateRole(string id, [FromBody] string role)
        {
            if (string.IsNullOrWhiteSpace(role) || !AssignableRoles.Contains(role.Trim()))
            {
                return BadRequest(new { message = "Role must be one of: " + string.Join(", ", AssignableRoles) });
            }

            var user = await FindTenantUserAsync(id);
            if (user is null) return NotFound();

            user.Role = role.Trim();
            await _userManager.UpdateAsync(user);
            await _auditLog.WriteAsync("UserRoleChanged", $"User '{user.Email}' role changed to '{role}'", "User", null);
            return Ok(new { id, role });
        }

        [HttpPut("{id}/department")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateDepartment(string id, [FromBody] int departmentId)
        {
            var user = await FindTenantUserAsync(id);
            if (user is null) return NotFound();

            // 0/negative means "unassigned" from the client (Number('') on an empty select).
            // Anything else must resolve to a real department in the user's own org, or an Admin
            // could link a user to another tenant's department record.
            if (departmentId > 0)
            {
                var departmentInOrg = await _tenantContext.ApplyOrganizationFilter(_context.Departments)
                    .AnyAsync(d => d.Id == departmentId);
                if (!departmentInOrg)
                {
                    return BadRequest(new { message = "Department must belong to the same organization as the user." });
                }
            }

            user.DepartmentId = departmentId > 0 ? departmentId : null;
            await _userManager.UpdateAsync(user);
            await _auditLog.WriteAsync("UserDepartmentChanged", $"User '{user.Email}' department changed to {departmentId}", "User", null);
            return Ok(new { id, departmentId });
        }

        [HttpPut("{id}/active")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> ToggleActive(string id, [FromBody] bool isActive)
        {
            var user = await FindTenantUserAsync(id);
            if (user is null) return NotFound();

            user.IsActive = isActive;
            await _userManager.UpdateAsync(user);
            await _auditLog.WriteAsync("UserActiveStateChanged", $"User '{user.Email}' active state set to {isActive}", "User", null);
            return Ok(new { id, isActive });
        }

        [HttpGet("departments")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetDepartments()
        {
            var departmentsQuery = _tenantContext.ApplyOrganizationFilter(_context.Departments.AsNoTracking());
            var departments = await departmentsQuery.OrderBy(d => d.Name).Select(d => new { id = d.Id, name = d.Name, description = d.Description, isActive = d.IsActive }).ToListAsync();
            return Ok(departments);
        }
    }
}
