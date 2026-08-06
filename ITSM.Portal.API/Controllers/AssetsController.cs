using ITSM.Portal.API.Data;
using ITSM.Portal.API.Models;
using ITSM.Portal.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace ITSM.Portal.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class AssetsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly AutomationEngineService _automationEngine;
        private readonly TenantContextService _tenantContext;

        public AssetsController(ApplicationDbContext context, UserManager<ApplicationUser> userManager, AutomationEngineService automationEngine, TenantContextService tenantContext)
        {
            _context = context;
            _userManager = userManager;
            _automationEngine = automationEngine;
            _tenantContext = tenantContext;
        }

        // Neither DepartmentId nor AssignedUserId get overwritten server-side (unlike OrganizationId),
        // so without this check an admin could point an asset at another organization's department or
        // user - the asset itself would stay correctly tenant-scoped, but its references wouldn't.
        private async Task<bool> ReferencesBelongToOrganizationAsync(int? departmentId, string? assignedUserId, int? organizationId)
        {
            if (departmentId.HasValue)
            {
                var department = await _context.Departments.FindAsync(departmentId.Value);
                if (department is null || department.OrganizationId != organizationId) return false;
            }

            if (!string.IsNullOrWhiteSpace(assignedUserId))
            {
                var assignedUser = await _userManager.FindByIdAsync(assignedUserId);
                if (assignedUser is null || assignedUser.OrganizationId != organizationId) return false;
            }

            return true;
        }

        [HttpGet]
        public async Task<IActionResult> GetAssets([FromQuery] string? query, [FromQuery] string? category, [FromQuery] string? status, [FromQuery] int? departmentId, [FromQuery] string? assignedUserId)
        {
            var assetsQuery = _tenantContext.ApplyOrganizationFilter(_context.Assets)
                .Include(a => a.AssignedUser)
                .Include(a => a.Department)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(query))
            {
                var q = query.Trim();
                assetsQuery = assetsQuery.Where(a =>
                    a.Name.Contains(q) ||
                    a.AssetTag.Contains(q) ||
                    a.SerialNumber.Contains(q) ||
                    a.Manufacturer.Contains(q) ||
                    a.Model.Contains(q));
            }

            if (!string.IsNullOrWhiteSpace(category))
            {
                assetsQuery = assetsQuery.Where(a => a.Category == category);
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                assetsQuery = assetsQuery.Where(a => a.Status == status);
            }

            if (departmentId.HasValue)
            {
                assetsQuery = assetsQuery.Where(a => a.DepartmentId == departmentId.Value);
            }

            if (!string.IsNullOrWhiteSpace(assignedUserId))
            {
                assetsQuery = assetsQuery.Where(a => a.AssignedUserId == assignedUserId);
            }

            var assets = await assetsQuery
                .OrderByDescending(a => a.UpdatedDate)
                .Select(a => new
                {
                    id = a.Id,
                    assetTag = a.AssetTag,
                    name = a.Name,
                    description = a.Description,
                    category = a.Category,
                    serialNumber = a.SerialNumber,
                    manufacturer = a.Manufacturer,
                    model = a.Model,
                    status = a.Status,
                    assignedUserId = a.AssignedUserId,
                    assignedUserName = a.AssignedUser != null ? (a.AssignedUser.DisplayName ?? a.AssignedUser.Email) : null,
                    departmentId = a.DepartmentId,
                    departmentName = a.Department != null ? a.Department.Name : null,
                    purchaseDate = a.PurchaseDate,
                    warrantyExpirationDate = a.WarrantyExpirationDate,
                    createdDate = a.CreatedDate,
                    updatedDate = a.UpdatedDate,
                    location = a.Location,
                    notes = a.Notes
                })
                .ToListAsync();

            return Ok(assets);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetAsset(int id)
        {
            var asset = await _tenantContext.ApplyOrganizationFilter(_context.Assets)
                .Include(a => a.AssignedUser)
                .Include(a => a.Department)
                .Include(a => a.History)
                .FirstOrDefaultAsync(a => a.Id == id);

            if (asset == null) return NotFound();

            var relatedTickets = await _tenantContext.ApplyOrganizationFilter(_context.Tickets)
                .Where(t => t.AssetId == id)
                .OrderByDescending(t => t.CreatedDate)
                .Select(t => new { t.Id, t.Title, t.Status, t.CreatedDate })
                .Take(10)
                .ToListAsync();

            return Ok(new
            {
                id = asset.Id,
                assetTag = asset.AssetTag,
                name = asset.Name,
                description = asset.Description,
                category = asset.Category,
                serialNumber = asset.SerialNumber,
                manufacturer = asset.Manufacturer,
                model = asset.Model,
                status = asset.Status,
                assignedUserId = asset.AssignedUserId,
                assignedUserName = asset.AssignedUser != null ? (asset.AssignedUser.DisplayName ?? asset.AssignedUser.Email) : null,
                departmentId = asset.DepartmentId,
                departmentName = asset.Department != null ? asset.Department.Name : null,
                purchaseDate = asset.PurchaseDate,
                warrantyExpirationDate = asset.WarrantyExpirationDate,
                createdDate = asset.CreatedDate,
                updatedDate = asset.UpdatedDate,
                location = asset.Location,
                notes = asset.Notes,
                history = asset.History?.OrderByDescending(h => h.Date).Select(h => new { h.Id, h.Action, h.PreviousUser, h.NewUser, h.ChangedBy, h.Date }).ToList(),
                relatedTickets
            });
        }

        [HttpPost]
        [Authorize(Roles = "Admin,Technician")]
        public async Task<IActionResult> CreateAsset([FromBody] Asset asset)
        {
            asset.CreatedDate = DateTime.UtcNow;
            asset.UpdatedDate = DateTime.UtcNow;

            // Always attribute the asset to the caller's own tenant - without this it's created with
            // OrganizationId = null (the frontend never sends one) and becomes invisible to every
            // non-platform-admin query, since ApplyOrganizationFilter requires an exact org match.
            asset.OrganizationId = _tenantContext.IsPlatformAdmin() ? asset.OrganizationId : _tenantContext.CurrentOrganizationId;

            if (!await ReferencesBelongToOrganizationAsync(asset.DepartmentId, asset.AssignedUserId, asset.OrganizationId))
            {
                return BadRequest(new { message = "Department or assigned user does not belong to this organization." });
            }

            _context.Assets.Add(asset);
            await _context.SaveChangesAsync();

            if (!string.IsNullOrWhiteSpace(asset.AssignedUserId))
            {
                _context.AssetHistories.Add(new AssetHistory
                {
                    AssetId = asset.Id,
                    Action = "Assigned",
                    NewUser = asset.AssignedUserId,
                    ChangedBy = "System",
                    Date = DateTime.UtcNow
                });
                await _context.SaveChangesAsync();
            }

            return CreatedAtAction(nameof(GetAsset), new { id = asset.Id }, asset);
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,Technician")]
        public async Task<IActionResult> UpdateAsset(int id, [FromBody] Asset asset)
        {
            if (id != asset.Id) return BadRequest();

            var existing = await _tenantContext.ApplyOrganizationFilter(_context.Assets)
                .FirstOrDefaultAsync(a => a.Id == id);
            if (existing == null) return NotFound();

            if (!await ReferencesBelongToOrganizationAsync(asset.DepartmentId, asset.AssignedUserId, existing.OrganizationId))
            {
                return BadRequest(new { message = "Department or assigned user does not belong to this organization." });
            }

            var previousUser = existing.AssignedUserId;
            var previousStatus = existing.Status;

            existing.AssetTag = asset.AssetTag;
            existing.Name = asset.Name;
            existing.Description = asset.Description;
            existing.Category = asset.Category;
            existing.SerialNumber = asset.SerialNumber;
            existing.Manufacturer = asset.Manufacturer;
            existing.Model = asset.Model;
            existing.Status = asset.Status;
            existing.AssignedUserId = asset.AssignedUserId;
            existing.DepartmentId = asset.DepartmentId;
            existing.PurchaseDate = asset.PurchaseDate;
            existing.WarrantyExpirationDate = asset.WarrantyExpirationDate;
            existing.Location = asset.Location;
            existing.Notes = asset.Notes;
            existing.UpdatedDate = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            if (existing.AssignedUserId != previousUser)
            {
                _context.AssetHistories.Add(new AssetHistory
                {
                    AssetId = existing.Id,
                    Action = "Assigned",
                    PreviousUser = previousUser,
                    NewUser = existing.AssignedUserId,
                    ChangedBy = User.Identity?.Name ?? "System",
                    Date = DateTime.UtcNow
                });
                await _context.SaveChangesAsync();
            }

            if (!string.Equals(previousStatus, existing.Status, StringComparison.OrdinalIgnoreCase))
            {
                _context.AssetHistories.Add(new AssetHistory
                {
                    AssetId = existing.Id,
                    Action = "Status changed",
                    PreviousUser = previousStatus,
                    NewUser = existing.Status,
                    ChangedBy = User.Identity?.Name ?? "System",
                    Date = DateTime.UtcNow
                });
                await _context.SaveChangesAsync();
            }

            return Ok(existing);
        }

        [HttpPost("{id}/assign")]
        [Authorize(Roles = "Admin,Technician")]
        public async Task<IActionResult> AssignAsset(int id, [FromBody] AssetAssignmentRequest request)
        {
            var asset = await _tenantContext.ApplyOrganizationFilter(_context.Assets)
                .FirstOrDefaultAsync(a => a.Id == id);
            if (asset == null) return NotFound();

            if (!await ReferencesBelongToOrganizationAsync(null, request.AssignedUserId, asset.OrganizationId))
            {
                return BadRequest(new { message = "Assigned user must belong to the same organization as the asset." });
            }

            var previousUser = asset.AssignedUserId;
            asset.AssignedUserId = request.AssignedUserId;
            asset.UpdatedDate = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            _context.AssetHistories.Add(new AssetHistory
            {
                AssetId = asset.Id,
                Action = "Assigned",
                PreviousUser = previousUser,
                NewUser = request.AssignedUserId,
                ChangedBy = User.Identity?.Name ?? "System",
                Date = DateTime.UtcNow
            });

            if (!string.IsNullOrWhiteSpace(request.Notes))
            {
                _context.AssetHistories.Add(new AssetHistory
                {
                    AssetId = asset.Id,
                    Action = "Note",
                    PreviousUser = previousUser,
                    NewUser = request.Notes,
                    ChangedBy = User.Identity?.Name ?? "System",
                    Date = DateTime.UtcNow
                });
            }

            await _context.SaveChangesAsync();

            await _automationEngine.ExecuteAsync(asset, "AssetAssigned", "Asset", asset.Id);

            return Ok(new { id = asset.Id, assignedUserId = asset.AssignedUserId });
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteAsset(int id)
        {
            var asset = await _tenantContext.ApplyOrganizationFilter(_context.Assets)
                .FirstOrDefaultAsync(a => a.Id == id);
            if (asset == null) return NotFound();

            _context.Assets.Remove(asset);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpGet("{id}/history")]
        public async Task<IActionResult> GetAssetHistory(int id)
        {
            var asset = await _tenantContext.ApplyOrganizationFilter(_context.Assets).AnyAsync(a => a.Id == id);
            if (!asset) return NotFound();

            var history = await _context.AssetHistories
                .Where(h => h.AssetId == id)
                .OrderByDescending(h => h.Date)
                .ToListAsync();

            return Ok(history);
        }
    }
}
