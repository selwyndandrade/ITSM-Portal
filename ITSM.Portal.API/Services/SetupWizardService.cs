using ITSM.Portal.API.Data;
using ITSM.Portal.API.DTOs;
using ITSM.Portal.API.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace ITSM.Portal.API.Services
{
    public class SetupWizardService
    {
        private readonly ApplicationDbContext _dbContext;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly RoleManager<IdentityRole> _roleManager;

        public SetupWizardService(ApplicationDbContext dbContext, UserManager<ApplicationUser> userManager, RoleManager<IdentityRole> roleManager)
        {
            _dbContext = dbContext;
            _userManager = userManager;
            _roleManager = roleManager;
        }

        public async Task<SetupWizardResult> CreateSetupAsync(SetupWizardRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.CompanyName))
            {
                throw new ArgumentException("Company name is required.", nameof(request));
            }

            var organization = new Organization
            {
                Name = request.CompanyName.Trim(),
                Slug = request.CompanyName.Trim().ToLowerInvariant().Replace(" ", "-"),
                Description = request.CompanyDescription,
                PrimaryContactEmail = request.PrimaryContactEmail ?? request.AdminEmail,
                SettingsJson = System.Text.Json.JsonSerializer.Serialize(new { notificationSettings = request.NotificationSettings ?? new Dictionary<string, object>(), automationDefaults = request.AutomationDefaults ?? new Dictionary<string, object>() })
            };

            _dbContext.Organizations.Add(organization);
            await _dbContext.SaveChangesAsync();

            var departments = (request.Departments ?? new List<string> { "Service Desk" })
                .Where(value => !string.IsNullOrWhiteSpace(value))
                .Select(value => value.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .Select(name => new Department { OrganizationId = organization.Id, Name = name, IsActive = true, CreatedDate = DateTime.UtcNow })
                .ToList();

            _dbContext.Departments.AddRange(departments);
            await _dbContext.SaveChangesAsync();

            var requestedRoles = (request.Roles ?? new List<string> { "Employee" })
                .Where(value => !string.IsNullOrWhiteSpace(value))
                .Select(value => value.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            foreach (var roleName in requestedRoles)
            {
                if (!await _roleManager.RoleExistsAsync(roleName))
                {
                    await _roleManager.CreateAsync(new IdentityRole(roleName));
                }
            }

            if (!await _roleManager.RoleExistsAsync("Admin"))
            {
                await _roleManager.CreateAsync(new IdentityRole("Admin"));
            }

            var automationRules = new List<AutomationRule>
            {
                new() { OrganizationId = organization.Id, Name = "Auto-assign priority tickets", TriggerType = "TicketCreated", Description = "Assign high priority tickets to the service desk queue.", IsActive = true, CreatedDate = DateTime.UtcNow },
                new() { OrganizationId = organization.Id, Name = "Notify requester on ticket updates", TriggerType = "TicketUpdated", Description = "Send notifications for status changes.", IsActive = true, CreatedDate = DateTime.UtcNow }
            };
            _dbContext.AutomationRules.AddRange(automationRules);
            await _dbContext.SaveChangesAsync();

            if (!string.IsNullOrWhiteSpace(request.AdminEmail))
            {
                var adminUser = new ApplicationUser
                {
                    UserName = request.AdminEmail,
                    Email = request.AdminEmail,
                    EmailConfirmed = true,
                    Role = "Admin",
                    OrganizationId = organization.Id,
                    DisplayName = request.CompanyName.Trim()
                };

                var result = await _userManager.CreateAsync(adminUser, request.AdminPassword ?? "ChangeMe@123");
                if (result.Succeeded)
                {
                    await _userManager.AddToRoleAsync(adminUser, "Admin");
                    return new SetupWizardResult { Organization = organization, Departments = departments, AutomationRules = automationRules, AdminUser = adminUser };
                }

                throw new InvalidOperationException(string.Join("; ", result.Errors.Select(error => error.Description)));
            }

            return new SetupWizardResult { Organization = organization, Departments = departments, AutomationRules = automationRules };
        }
    }
}
