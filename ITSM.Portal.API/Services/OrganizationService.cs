using ITSM.Portal.API.Data;
using ITSM.Portal.API.DTOs;
using ITSM.Portal.API.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace ITSM.Portal.API.Services
{
    public class OrganizationService
    {
        private readonly ApplicationDbContext _dbContext;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly RoleManager<IdentityRole> _roleManager;

        public OrganizationService(
            ApplicationDbContext dbContext,
            UserManager<ApplicationUser> userManager,
            RoleManager<IdentityRole> roleManager)
        {
            _dbContext = dbContext;
            _userManager = userManager;
            _roleManager = roleManager;
        }

        public async Task<OrganizationOnboardingResult> CreateOrganizationAsync(OrganizationOnboardingRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.OrganizationName))
            {
                throw new ArgumentException("Organization name is required.", nameof(request));
            }

            var organization = new Organization
            {
                Name = request.OrganizationName.Trim(),
                Slug = string.IsNullOrWhiteSpace(request.OrganizationSlug)
                    ? request.OrganizationName.Trim().ToLowerInvariant().Replace(" ", "-")
                    : request.OrganizationSlug.Trim().ToLowerInvariant(),
                Description = request.Description,
                PrimaryContactEmail = request.AdminEmail,
                SubscriptionTier = request.SubscriptionTier ?? "Free trial",
                SettingsJson = System.Text.Json.JsonSerializer.Serialize(new
                {
                    defaultDepartmentCreationEnabled = true,
                    branding = new
                    {
                        companyName = request.OrganizationName.Trim(),
                        productName = "Kyro",
                        primaryColor = "#1d4ed8"
                    },
                    onboarding = new
                    {
                        completed = true,
                        setupWizardUsed = true
                    }
                })
            };

            _dbContext.Organizations.Add(organization);
            await _dbContext.SaveChangesAsync();

            var departmentNames = (request.DepartmentNames ?? Array.Empty<string>())
                .Where(d => !string.IsNullOrWhiteSpace(d))
                .Select(d => d.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            if (departmentNames.Count == 0)
            {
                departmentNames.Add("Service Desk");
            }

            foreach (var departmentName in departmentNames)
            {
                _dbContext.Departments.Add(new Department
                {
                    OrganizationId = organization.Id,
                    Name = departmentName,
                    IsActive = true,
                    CreatedDate = DateTime.UtcNow
                });
            }

            await _dbContext.SaveChangesAsync();

            var adminUser = new ApplicationUser
            {
                UserName = request.AdminEmail,
                Email = request.AdminEmail,
                EmailConfirmed = true,
                Role = "Admin",
                OrganizationId = organization.Id,
                DisplayName = request.OrganizationName.Trim()
            };

            var createResult = await _userManager.CreateAsync(adminUser, request.AdminPassword);
            if (!createResult.Succeeded)
            {
                throw new InvalidOperationException(string.Join("; ", createResult.Errors.Select(e => e.Description)));
            }

            if (!await _roleManager.RoleExistsAsync("Admin"))
            {
                await _roleManager.CreateAsync(new IdentityRole("Admin"));
            }

            await _userManager.AddToRoleAsync(adminUser, "Admin");

            return new OrganizationOnboardingResult
            {
                Organization = organization,
                AdminUser = adminUser,
                Departments = await _dbContext.Departments.Where(d => d.OrganizationId == organization.Id).ToListAsync()
            };
        }
    }
}
