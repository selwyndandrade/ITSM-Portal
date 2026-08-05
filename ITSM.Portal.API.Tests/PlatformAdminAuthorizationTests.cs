using System.Reflection;
using System.Security.Claims;
using ITSM.Portal.API.Controllers;
using ITSM.Portal.API.Data;
using ITSM.Portal.API.DTOs;
using ITSM.Portal.API.Models;
using ITSM.Portal.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ITSM.Portal.API.Tests;

public class PlatformAdminAuthorizationTests
{
    // Mirrors how ASP.NET Core's RolesAuthorizationRequirement evaluates [Authorize(Roles = "...")]:
    // the principal is authorized if it is in ANY of the comma-separated roles on the attribute.
    private static bool SatisfiesRoleRequirement(ClaimsPrincipal principal, AuthorizeAttribute attribute)
    {
        var allowedRoles = (attribute.Roles ?? string.Empty).Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        return allowedRoles.Length == 0 || allowedRoles.Any(principal.IsInRole);
    }

    private static ClaimsPrincipal PrincipalWithRole(string role, string? organizationId = null)
    {
        var claims = new List<Claim> { new(ClaimTypes.Role, role) };
        if (organizationId != null)
        {
            claims.Add(new Claim("organization_id", organizationId));
        }
        return new ClaimsPrincipal(new ClaimsIdentity(claims, "Test"));
    }

    [Fact]
    public void PlatformAdminController_RequiresDedicatedPlatformAdminRole_NotOrganizationAdmin()
    {
        var attribute = typeof(PlatformAdminController).GetCustomAttribute<AuthorizeAttribute>();

        Assert.NotNull(attribute);
        Assert.Equal("PlatformAdmin", attribute!.Roles);
    }

    [Fact]
    public void PlatformAdminController_PlatformAdmin_CanAccess()
    {
        var attribute = typeof(PlatformAdminController).GetCustomAttribute<AuthorizeAttribute>()!;
        var principal = PrincipalWithRole("PlatformAdmin");

        Assert.True(SatisfiesRoleRequirement(principal, attribute));
    }

    [Fact]
    public void PlatformAdminController_OrganizationAdmin_CannotAccessPlatformFunctions()
    {
        var attribute = typeof(PlatformAdminController).GetCustomAttribute<AuthorizeAttribute>()!;

        // Even the legacy "org admin with no organization_id" combination must be rejected now -
        // organization_id == 0 no longer implies platform access.
        var orgAdmin = PrincipalWithRole("Admin", organizationId: "0");

        Assert.False(SatisfiesRoleRequirement(orgAdmin, attribute));
    }

    [Fact]
    public void PlatformAdminController_Employee_CannotAccessAdminEndpoints()
    {
        var attribute = typeof(PlatformAdminController).GetCustomAttribute<AuthorizeAttribute>()!;
        var employee = PrincipalWithRole("Employee");

        Assert.False(SatisfiesRoleRequirement(employee, attribute));
    }

    [Fact]
    public void IsPlatformAdmin_OrganizationAdminWithZeroOrgClaim_IsNoLongerPlatformAdmin()
    {
        var httpContext = new DefaultHttpContext { User = PrincipalWithRole("Admin", organizationId: "0") };
        var tenantContext = new TenantContextService(new HttpContextAccessor { HttpContext = httpContext });

        Assert.False(tenantContext.IsPlatformAdmin());
    }

    [Fact]
    public void IsPlatformAdmin_DedicatedRole_IsPlatformAdmin()
    {
        var httpContext = new DefaultHttpContext { User = PrincipalWithRole("PlatformAdmin") };
        var tenantContext = new TenantContextService(new HttpContextAccessor { HttpContext = httpContext });

        Assert.True(tenantContext.IsPlatformAdmin());
    }

    [Fact]
    public async Task ApplyOrganizationFilter_NonPlatformAdminWithNoOrganization_FailsClosedToEmpty()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        await using var dbContext = new ApplicationDbContext(options);
        dbContext.Tickets.AddRange(
            new Ticket { Id = 1, Title = "A1", Description = "A1", OrganizationId = 1, Status = "Open" },
            new Ticket { Id = 2, Title = "B1", Description = "B1", OrganizationId = 2, Status = "Open" });
        await dbContext.SaveChangesAsync();

        // An Admin whose token carries no organization_id at all is not a platform admin, so they
        // must see nothing - not the previous "return everything unfiltered" fallback.
        var httpContext = new DefaultHttpContext { User = PrincipalWithRole("Admin") };
        var tenantContext = new TenantContextService(new HttpContextAccessor { HttpContext = httpContext });

        var tickets = await tenantContext.ApplyOrganizationFilter(dbContext.Tickets).ToListAsync();

        Assert.Empty(tickets);
    }

    [Fact]
    public async Task GetOrganizations_PlatformAdmin_CanListAllOrganizations()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        await using var dbContext = new ApplicationDbContext(options);
        dbContext.Organizations.AddRange(
            new Organization { Id = 1, Name = "Contoso", IsActive = true },
            new Organization { Id = 2, Name = "Fabrikam", IsActive = true });
        await dbContext.SaveChangesAsync();

        var controller = new PlatformAdminController(dbContext);

        var result = await controller.GetOrganizations();

        var okResult = Assert.IsType<Microsoft.AspNetCore.Mvc.OkObjectResult>(result);
        var organizations = Assert.IsAssignableFrom<System.Collections.IEnumerable>(okResult.Value);
        Assert.Equal(2, organizations.Cast<object>().Count());
    }

    [Fact]
    public async Task SetOrganizationStatus_PlatformAdmin_CanDeactivateOrganization()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        await using var dbContext = new ApplicationDbContext(options);
        dbContext.Organizations.Add(new Organization { Id = 1, Name = "Contoso", IsActive = true });
        await dbContext.SaveChangesAsync();

        var controller = new PlatformAdminController(dbContext);

        await controller.SetOrganizationStatus(1, new SetOrganizationStatusRequest { IsActive = false });

        var organization = await dbContext.Organizations.FindAsync(1);
        Assert.False(organization!.IsActive);
    }
}
