using ITSM.Portal.API.Controllers;
using ITSM.Portal.API.Data;
using ITSM.Portal.API.Models;
using ITSM.Portal.API.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ITSM.Portal.API.Tests;

public class DashboardTenantIsolationTests
{
    [Fact]
    public async Task GetDashboard_ReturnsOnlyCurrentOrganizationCounts()
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
            new Ticket { Id = 1, Title = "A", Description = "A", OrganizationId = 1, Status = "Open", CreatedDate = DateTime.UtcNow, UpdatedDate = DateTime.UtcNow },
            new Ticket { Id = 2, Title = "B", Description = "B", OrganizationId = 2, Status = "Resolved", CreatedDate = DateTime.UtcNow, UpdatedDate = DateTime.UtcNow });

        await dbContext.SaveChangesAsync();

        var httpContext = new DefaultHttpContext();
        httpContext.User = new System.Security.Claims.ClaimsPrincipal(new System.Security.Claims.ClaimsIdentity(new[]
        {
            new System.Security.Claims.Claim("organization_id", "1")
        }, "Test"));

        provider.GetRequiredService<IHttpContextAccessor>().HttpContext = httpContext;

        var httpAccessor = provider.GetRequiredService<IHttpContextAccessor>();
        var tenantContext = new TenantContextService(httpAccessor);
        var controller = new DashboardController(dbContext, tenantContext);

        var result = await controller.GetDashboard();
        var ok = Assert.IsType<Microsoft.AspNetCore.Mvc.OkObjectResult>(result);
        var payload = ok.Value;

        var totalTickets = (int)payload.GetType().GetProperty("totalTickets")!.GetValue(payload)!;
        var openTickets = (int)payload.GetType().GetProperty("openTickets")!.GetValue(payload)!;

        Assert.Equal(1, totalTickets);
        Assert.Equal(1, openTickets);
    }
}
