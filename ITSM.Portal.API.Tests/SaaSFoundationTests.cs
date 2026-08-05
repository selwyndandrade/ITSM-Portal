using ITSM.Portal.API.Data;
using ITSM.Portal.API.DTOs;
using ITSM.Portal.API.Models;
using ITSM.Portal.API.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace ITSM.Portal.API.Tests;

public class SaaSFoundationTests
{
    [Fact]
    public async Task CreateOrganizationAsync_BindsAdminToOrganizationAndCreatesDepartments()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        await using var dbContext = new ApplicationDbContext(options);

        var userStore = new UserStore<ApplicationUser>(dbContext);
        var roleStore = new RoleStore<IdentityRole>(dbContext);
        var userManager = new UserManager<ApplicationUser>(
            userStore,
            null,
            new PasswordHasher<ApplicationUser>(),
            new IUserValidator<ApplicationUser>[] { new UserValidator<ApplicationUser>() },
            new IPasswordValidator<ApplicationUser>[] { new PasswordValidator<ApplicationUser>() },
            new UpperInvariantLookupNormalizer(),
            new IdentityErrorDescriber(),
            null,
            NullLogger<UserManager<ApplicationUser>>.Instance);

        var roleManager = new RoleManager<IdentityRole>(
            roleStore,
            new IRoleValidator<IdentityRole>[] { new RoleValidator<IdentityRole>() },
            new UpperInvariantLookupNormalizer(),
            new IdentityErrorDescriber(),
            NullLogger<RoleManager<IdentityRole>>.Instance);

        var service = new OrganizationService(dbContext, userManager, roleManager);

        var result = await service.CreateOrganizationAsync(new OrganizationOnboardingRequest
        {
            OrganizationName = "Contoso IT",
            AdminEmail = "admin@contoso.com",
            AdminPassword = "Password123!",
            DepartmentNames = new[] { "Service Desk", "Engineering" }
        });

        Assert.NotNull(result.Organization);
        Assert.Equal("Contoso IT", result.Organization.Name);
        Assert.Equal(result.Organization.Id, result.AdminUser?.OrganizationId);
        Assert.Contains(dbContext.Departments, d => d.OrganizationId == result.Organization.Id && d.Name == "Service Desk");
        Assert.Contains(dbContext.Departments, d => d.OrganizationId == result.Organization.Id && d.Name == "Engineering");
    }
}
