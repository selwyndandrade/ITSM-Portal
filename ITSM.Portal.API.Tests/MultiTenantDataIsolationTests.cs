using System.Collections;
using System.Security.Claims;
using ITSM.Portal.API.Controllers;
using ITSM.Portal.API.Data;
using ITSM.Portal.API.Models;
using ITSM.Portal.API.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace ITSM.Portal.API.Tests;

// Broad regression coverage proving that Organization A can never see Organization B's records
// (or vice versa) across every tenant-scoped resource type, and that a record missing its
// OrganizationId fails closed (invisible to everyone) rather than leaking to every tenant.
public class MultiTenantDataIsolationTests
{
    private static ApplicationDbContext NewContext() =>
        new(new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static TenantContextService TenantContextFor(int? organizationId, string role = "Admin")
    {
        var claims = new List<Claim> { new(ClaimTypes.Role, role) };
        if (organizationId.HasValue)
        {
            claims.Add(new Claim("organization_id", organizationId.Value.ToString()));
        }
        var httpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity(claims, "Test")) };
        return new TenantContextService(new HttpContextAccessor { HttpContext = httpContext });
    }

    private static List<object> ItemsFrom(IActionResult result)
    {
        var ok = Assert.IsType<OkObjectResult>(result);
        return Assert.IsAssignableFrom<IEnumerable>(ok.Value).Cast<object>().ToList();
    }

    private static object? GetProp(object obj, string name) => obj.GetType().GetProperty(name)?.GetValue(obj);

    [Fact]
    public async Task Tickets_OrganizationA_CannotSeeOrRetrieveOrganizationBTicket()
    {
        await using var context = NewContext();
        context.Tickets.AddRange(
            new Ticket { Id = 1, Title = "Org A ticket", Description = "d", Status = "Open", OrganizationId = 1 },
            new Ticket { Id = 2, Title = "Org B confidential ticket", Description = "d", Status = "Open", OrganizationId = 2 });
        await context.SaveChangesAsync();

        var tenantA = TenantContextFor(1);

        var visible = await tenantA.ApplyOrganizationFilter(context.Tickets).ToListAsync();
        Assert.Single(visible);
        Assert.Equal(1, visible[0].Id);

        var directLookup = await tenantA.ApplyOrganizationFilter(context.Tickets).FirstOrDefaultAsync(t => t.Id == 2);
        Assert.Null(directLookup);
    }

    [Fact]
    public async Task Assets_OrganizationA_CannotListOrFetchOrganizationBAsset()
    {
        await using var context = NewContext();
        context.Assets.AddRange(
            new Asset { Id = 1, AssetTag = "A-1", Name = "Org A laptop", OrganizationId = 1 },
            new Asset { Id = 2, AssetTag = "B-1", Name = "Org B laptop", OrganizationId = 2 });
        await context.SaveChangesAsync();

        var controller = new AssetsController(context, null!, null!, TenantContextFor(1));

        var listResult = await controller.GetAssets(null, null, null, null, null);
        var listItems = ItemsFrom(listResult);
        Assert.Single(listItems);
        Assert.Equal("A-1", GetProp(listItems[0], "assetTag"));

        var getResult = await controller.GetAsset(2);
        Assert.IsType<NotFoundResult>(getResult);
    }

    [Fact]
    public async Task Notifications_OrganizationA_CannotSeeOrganizationBNotification_EvenForKnownUserId()
    {
        await using var context = NewContext();
        context.Notifications.AddRange(
            new Notification { Id = 1, UserId = "user-a", Title = "Org A note", Message = "m", OrganizationId = 1 },
            new Notification { Id = 2, UserId = "user-b", Title = "Org B note", Message = "m", OrganizationId = 2 });
        await context.SaveChangesAsync();

        var tenantA = TenantContextFor(1);

        // Mirrors NotificationsController.GetNotifications: org filter + owning-user filter.
        var visibleToOrgAForUserB = await tenantA.ApplyOrganizationFilter(context.Notifications)
            .Where(n => n.UserId == "user-b")
            .ToListAsync();

        Assert.Empty(visibleToOrgAForUserB);
    }

    [Fact]
    public async Task KnowledgeArticles_OrganizationScopedArticle_NotVisibleToOtherOrganization_ButSharedArticleIs()
    {
        await using var context = NewContext();
        context.KnowledgeArticles.AddRange(
            new KnowledgeArticle { Id = 1, Title = "Org A internal runbook", Content = "c", Category = "General", OrganizationId = 1, CreatedDate = DateTime.UtcNow },
            new KnowledgeArticle { Id = 2, Title = "Org B internal runbook", Content = "c", Category = "General", OrganizationId = 2, CreatedDate = DateTime.UtcNow },
            new KnowledgeArticle { Id = 3, Title = "Shared onboarding guide", Content = "c", Category = "General", OrganizationId = null, CreatedDate = DateTime.UtcNow });
        await context.SaveChangesAsync();

        var service = new KnowledgeArticleService(context);

        var orgBArticleForOrgA = await service.GetArticleAsync(2, organizationId: 1, includeAllOrganizations: false);
        Assert.Null(orgBArticleForOrgA);

        var orgAArticles = await service.GetArticlesAsync(null, null, organizationId: 1, includeAllOrganizations: false);
        Assert.Equal(2, orgAArticles.Count); // Org A's own article + the shared article
        Assert.DoesNotContain(orgAArticles, a => a.Title == "Org B internal runbook");
        Assert.Contains(orgAArticles, a => a.Title == "Shared onboarding guide");
    }

    [Fact]
    public async Task ServiceRequests_OrganizationA_CannotSeeOrganizationBRequests()
    {
        await using var context = NewContext();
        // CatalogItemId is a required (non-nullable) FK - a ServiceRequest always references a
        // real ServiceCatalogItem in production (CatalogController validates this on create), so
        // the seed must too, or EF's required-navigation translation drops the row entirely.
        context.ServiceCatalogItems.Add(new ServiceCatalogItem { Id = 1, Name = "Laptop request" });
        context.ServiceRequests.AddRange(
            new ServiceRequest { Id = 1, CatalogItemId = 1, Status = "Submitted", ApprovalStatus = "Pending", OrganizationId = 1 },
            new ServiceRequest { Id = 2, CatalogItemId = 1, Status = "Submitted", ApprovalStatus = "Pending", OrganizationId = 2 });
        await context.SaveChangesAsync();

        var controller = new ServiceRequestsController(context, null!, TenantContextFor(1), null!)
        {
            // GetServiceRequests only bypasses the "requester's own requests" narrowing for
            // Admin/Manager - give the controller's own User the same Admin role TenantContextFor
            // grants its (separate) HttpContextAccessor, so this test still exercises the
            // org-isolation behavior it's named for rather than the newer per-requester narrowing.
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.Role, "Admin") }, "Test"))
                }
            }
        };
        var result = await controller.GetServiceRequests(null);
        var items = ItemsFrom(result);

        Assert.Single(items);
        Assert.Equal(1, GetProp(items[0], "id"));
    }

    [Fact]
    public async Task AutomationExecutions_OrganizationA_CannotSeeOrganizationBExecutionLog()
    {
        await using var context = NewContext();
        context.AutomationExecutions.AddRange(
            new AutomationExecution { Id = 1, RuleName = "Org A rule", TriggerEvent = "TicketCreated", Status = "Succeeded", OrganizationId = 1, TriggeredAt = DateTime.UtcNow },
            new AutomationExecution { Id = 2, RuleName = "Org B rule", TriggerEvent = "TicketCreated", Status = "Succeeded", OrganizationId = 2, TriggeredAt = DateTime.UtcNow });
        await context.SaveChangesAsync();

        var controller = new AutomationExecutionsController(context, TenantContextFor(1));

        var result = await controller.GetExecutions(null, null, null, 1, 20);
        var ok = Assert.IsType<OkObjectResult>(result);
        var items = Assert.IsAssignableFrom<IEnumerable>(GetProp(ok.Value!, "items")).Cast<AutomationExecution>().ToList();

        Assert.Single(items);
        Assert.Equal("Org A rule", items[0].RuleName);
    }

    [Fact]
    public async Task RecordWithMissingOrganizationId_IsInvisibleToEveryTenant_NotJustTheOwner()
    {
        await using var context = NewContext();
        context.Assets.Add(new Asset { Id = 1, AssetTag = "ORPHAN", Name = "Orphaned asset", OrganizationId = null });
        await context.SaveChangesAsync();

        var orgOneResult = ItemsFrom(await new AssetsController(context, null!, null!, TenantContextFor(1)).GetAssets(null, null, null, null, null));
        var orgTwoResult = ItemsFrom(await new AssetsController(context, null!, null!, TenantContextFor(2)).GetAssets(null, null, null, null, null));

        Assert.Empty(orgOneResult);
        Assert.Empty(orgTwoResult);
    }
}
