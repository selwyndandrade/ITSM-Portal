using System.Text.RegularExpressions;
using ITSM.Portal.API.Data;
using ITSM.Portal.API.DTOs;
using ITSM.Portal.API.Models;
using ITSM.Portal.API.Seed;
using ITSM.Portal.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ITSM.Portal.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class OrganizationSettingsController : ControllerBase
    {
        private const long MaxLogoSizeBytes = 2 * 1024 * 1024; // 2 MB
        private static readonly Regex HexColorPattern = new("^#[0-9a-fA-F]{6}$", RegexOptions.Compiled);

        // SVG is intentionally excluded: it can embed <script>/event-handler content that would
        // execute if a user navigates directly to the stored file (same-origin stored-XSS risk).
        private static readonly HashSet<string> AllowedLogoExtensions = new(StringComparer.OrdinalIgnoreCase)
        {
            ".png", ".jpg", ".jpeg", ".webp"
        };

        private static readonly HashSet<string> AllowedLogoContentTypes = new(StringComparer.OrdinalIgnoreCase)
        {
            "image/png", "image/jpeg", "image/webp"
        };

        private readonly ApplicationDbContext _context;
        private readonly TenantContextService _tenantContext;
        private readonly IWebHostEnvironment _environment;
        private readonly AuditLogService _auditLog;

        public OrganizationSettingsController(
            ApplicationDbContext context,
            TenantContextService tenantContext,
            IWebHostEnvironment environment,
            AuditLogService auditLog)
        {
            _context = context;
            _tenantContext = tenantContext;
            _environment = environment;
            _auditLog = auditLog;
        }

        private async Task<Organization?> GetCurrentOrganizationAsync()
        {
            var organizationId = _tenantContext.CurrentOrganizationId;
            if (organizationId is null)
            {
                return _tenantContext.IsPlatformAdmin()
                    ? await _context.Organizations.OrderBy(o => o.Id).FirstOrDefaultAsync()
                    : null;
            }

            return await _context.Organizations.FirstOrDefaultAsync(o => o.Id == organizationId.Value);
        }

        [HttpGet]
        public async Task<IActionResult> GetSettings()
        {
            var organization = await GetCurrentOrganizationAsync();
            if (organization is null)
            {
                return Ok(new OrganizationSettingsDto { OrganizationName = "Kyro" });
            }

            return Ok(new OrganizationSettingsDto
            {
                OrganizationId = organization.Id,
                OrganizationName = organization.Name,
                LogoUrl = organization.LogoUrl,
                PrimaryColor = string.IsNullOrWhiteSpace(organization.PrimaryColor) ? "#1d4ed8" : organization.PrimaryColor
            });
        }

        [HttpPut]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateSettings([FromBody] UpdateOrganizationSettingsRequest request)
        {
            var organization = await GetCurrentOrganizationAsync();
            if (organization is null)
            {
                return BadRequest(new { message = "No organization context available for this account." });
            }

            var name = (request.OrganizationName ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(name) || name.Length > 200)
            {
                return BadRequest(new { message = "Organization name is required and must be 200 characters or fewer." });
            }

            if (!string.IsNullOrWhiteSpace(request.PrimaryColor) && !HexColorPattern.IsMatch(request.PrimaryColor))
            {
                return BadRequest(new { message = "Primary color must be a hex value like #1d4ed8." });
            }

            organization.Name = name;
            if (!string.IsNullOrWhiteSpace(request.PrimaryColor))
            {
                organization.PrimaryColor = request.PrimaryColor;
            }

            await _context.SaveChangesAsync();
            await _auditLog.WriteAsync("OrganizationBrandingUpdated", $"Organization branding updated: name='{organization.Name}', color='{organization.PrimaryColor}'", "Organization", organization.Id);

            return Ok(new OrganizationSettingsDto
            {
                OrganizationId = organization.Id,
                OrganizationName = organization.Name,
                LogoUrl = organization.LogoUrl,
                PrimaryColor = string.IsNullOrWhiteSpace(organization.PrimaryColor) ? "#1d4ed8" : organization.PrimaryColor
            });
        }

        [HttpPost("logo")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UploadLogo(IFormFile file)
        {
            if (file is null || file.Length == 0)
            {
                return BadRequest(new { message = "No file was uploaded." });
            }

            if (file.Length > MaxLogoSizeBytes)
            {
                return BadRequest(new { message = "Logo must be 2MB or smaller." });
            }

            var extension = Path.GetExtension(file.FileName);
            if (string.IsNullOrWhiteSpace(extension) || !AllowedLogoExtensions.Contains(extension))
            {
                return BadRequest(new { message = "Logo must be a PNG, JPG, SVG, or WEBP image." });
            }

            if (!AllowedLogoContentTypes.Contains(file.ContentType))
            {
                return BadRequest(new { message = "Logo content type is not allowed." });
            }

            var organization = await GetCurrentOrganizationAsync();
            if (organization is null)
            {
                return BadRequest(new { message = "No organization context available for this account." });
            }

            var folder = Path.Combine(_environment.WebRootPath ?? Path.Combine(_environment.ContentRootPath, "wwwroot"), "branding", organization.Id.ToString());
            Directory.CreateDirectory(folder);

            // Remove any previously uploaded logo (regardless of extension) before saving the new one.
            foreach (var existingFile in Directory.EnumerateFiles(folder, "logo.*"))
            {
                try { System.IO.File.Delete(existingFile); } catch { /* best effort cleanup */ }
            }

            var fileName = $"logo{extension}";
            var fullPath = Path.Combine(folder, fileName);

            using (var stream = new FileStream(fullPath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            organization.LogoUrl = $"/branding/{organization.Id}/{fileName}?v={DateTime.UtcNow.Ticks}";
            await _context.SaveChangesAsync();

            await _auditLog.WriteAsync("OrganizationLogoUpdated", $"Organization logo updated for '{organization.Name}'", "Organization", organization.Id);

            return Ok(new { logoUrl = organization.LogoUrl });
        }

        // Wipes and regenerates this organization's demo tickets, assets, service requests,
        // approvals, automation activity, and notifications. Intended for sales/demo
        // environments so presenters can restore a clean, realistic dataset between sessions
        // without risking the underlying users, departments, or configuration. Users,
        // departments, knowledge articles, the service catalog, and automation rules are
        // left untouched.
        [HttpPost("reset-demo-data")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> ResetDemoData()
        {
            var organization = await GetCurrentOrganizationAsync();
            if (organization is null)
            {
                return BadRequest(new { message = "No organization context available for this account." });
            }

            await DbSeeder.ResetDemoDataAsync(_context, organization.Id);
            await _auditLog.WriteAsync("DemoDataReset", $"Demo data reset for organization '{organization.Name}'", "Organization", organization.Id);

            return Ok(new { message = "Demo data has been reset.", resetAt = DateTime.UtcNow });
        }
    }
}

