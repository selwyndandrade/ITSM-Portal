using ITSM.Portal.API.Data;
using ITSM.Portal.API.DTOs;
using ITSM.Portal.API.Models;
using ITSM.Portal.API.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace ITSM.Portal.API.Tests;

public class SetupWizardServiceTests
{
    [Fact]
    public async Task CreateSetupAsync_CreatesOrganizationDepartmentsAndAutomationRules()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        await using var context = new ApplicationDbContext(options);
        var roleStore = new RoleStore<IdentityRole>(context);
        var roleManager = new RoleManager<IdentityRole>(roleStore, Array.Empty<IRoleValidator<IdentityRole>>(), new UpperInvariantLookupNormalizer(), new IdentityErrorDescriber(), null);

        var userStore = new UserStore<ApplicationUser>(context);
        var passwordHasher = new PasswordHasher<ApplicationUser>();
        var userManager = new UserManager<ApplicationUser>(userStore, null, passwordHasher, Array.Empty<IUserValidator<ApplicationUser>>(), Array.Empty<IPasswordValidator<ApplicationUser>>(), new UpperInvariantLookupNormalizer(), new IdentityErrorDescriber(), null, null);

        var service = new SetupWizardService(context, userManager, roleManager);

        var request = new SetupWizardRequest
        {
            CompanyName = "Northwind IT",
            CompanyDescription = "Demo customer environment",
            PrimaryContactEmail = "ops@northwind.demo",
            AdminEmail = "admin@northwind.demo",
            AdminPassword = "Northwind@123",
            Departments = new List<string> { "Service Desk", "Infrastructure", "Security" },
            Roles = new List<string> { "Manager" },
            SlaPolicies = new List<string> { "Priority 1 - 30 min", "Priority 2 - 2 hours" },
            NotificationSettings = new Dictionary<string, object> { ["emailNotifications"] = true },
            AutomationDefaults = new Dictionary<string, object> { ["autoAssign"] = true }
        };

        var result = await service.CreateSetupAsync(request);

        Assert.NotNull(result.Organization);
        Assert.Equal("Northwind IT", result.Organization.Name);
        Assert.Equal(3, result.Departments.Count);
        Assert.Contains(result.Departments, department => department.Name == "Infrastructure");
        Assert.Contains(await context.AutomationRules.Where(rule => rule.OrganizationId == result.Organization.Id).ToListAsync(), rule => rule.Name.Contains("ticket"));
    }
}
