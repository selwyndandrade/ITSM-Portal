using ITSM.Portal.API.Data;
using ITSM.Portal.API.Models;
using ITSM.Portal.API.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ITSM.Portal.API.Tests;

public class TenantIsolationTests
{
    [Fact]
    public async Task ApplyOrganizationFilter_ReturnsOnlyCurrentOrganizationTickets()
    {
        var services = new ServiceCollection();
        services.AddHttpContextAccessor();
        var provider = services.BuildServiceProvider();

        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        await using var dbContext = new ApplicationDbContext(options);

        dbContext.Organizations.AddRange(
            new Organization { Id = 1, Name = "Contoso" },
            new Organization { Id = 2, Name = "Northwind" });

        dbContext.Tickets.AddRange(
            new Ticket { Id = 1, Title = "A1", Description = "A1", OrganizationId = 1, Status = "Open" },
            new Ticket { Id = 2, Title = "B1", Description = "B1", OrganizationId = 2, Status = "Open" });

        await dbContext.SaveChangesAsync();

        var httpContext = new DefaultHttpContext();
        httpContext.User = new System.Security.Claims.ClaimsPrincipal(new System.Security.Claims.ClaimsIdentity(new[]
        {
            new System.Security.Claims.Claim("organization_id", "1")
        }, "Test"));

        provider.GetRequiredService<IHttpContextAccessor>().HttpContext = httpContext;

        var tenantContext = new TenantContextService(provider.GetRequiredService<IHttpContextAccessor>());

        var tickets = await tenantContext.ApplyOrganizationFilter(dbContext.Tickets).ToListAsync();

        Assert.Single(tickets);
        Assert.Equal(1, tickets[0].Id);
    }

    [Fact]
    public void PlatformAdmin_CanAccessAnyOrganization()
    {
        var httpContext = new DefaultHttpContext();
        httpContext.User = new System.Security.Claims.ClaimsPrincipal(new System.Security.Claims.ClaimsIdentity(new[]
        {
            new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.Role, "PlatformAdmin")
        }, "Test"));

        var accessor = new HttpContextAccessor { HttpContext = httpContext };
        var tenantContext = new TenantContextService(accessor);

        Assert.True(tenantContext.CanAccessOrganization(42));
    }
}
