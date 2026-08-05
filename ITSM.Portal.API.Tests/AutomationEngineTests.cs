using ITSM.Portal.API.Data;
using ITSM.Portal.API.Models;
using ITSM.Portal.API.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace ITSM.Portal.API.Tests;

public class AutomationEngineTests
{
    [Fact]
    public async Task ExecuteAsync_TriggersServiceRequestAutomation_WhenRuleMatches()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        await using var context = new ApplicationDbContext(options);
        var service = new AutomationEngineService(context, null!);

        var rule = new AutomationRule
        {
            Name = "Service request approval automation",
            TriggerType = "ServiceRequestSubmitted",
            Conditions =
            [
                new AutomationCondition { Field = "approvalstatus", Operator = "equals", Value = "Pending" }
            ],
            Actions =
            [
                new AutomationAction { Type = "set-approval-status", Value = "Approved" }
            ],
            IsActive = true
        };

        context.AutomationRules.Add(rule);
        await context.SaveChangesAsync();

        var request = new ServiceRequest
        {
            CatalogItemId = 1,
            ApprovalStatus = "Pending",
            Status = "Submitted"
        };

        var executions = await service.ExecuteAsync(request, "ServiceRequestSubmitted", "ServiceRequest", 42);

        Assert.Single(executions);
        Assert.Equal("Succeeded", executions[0].Status);
        Assert.Equal("ServiceRequestSubmitted", executions[0].TriggerEvent);
        Assert.Equal("Approved", request.ApprovalStatus);
    }

    [Fact]
    public async Task ExecuteAsync_CreatesFollowUpTicket_ForAutomationRule()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        await using var context = new ApplicationDbContext(options);
        var service = new AutomationEngineService(context, null!);

        var rule = new AutomationRule
        {
            Name = "Follow-up maintenance automation",
            TriggerType = "AssetAssigned",
            Conditions =
            [
                new AutomationCondition { Field = "assetstatus", Operator = "equals", Value = "Expired" }
            ],
            Actions =
            [
                new AutomationAction { Type = "create-follow-up-ticket", Value = "Maintenance review", Target = "High" }
            ],
            IsActive = true
        };

        context.AutomationRules.Add(rule);
        await context.SaveChangesAsync();

        var asset = new Asset
        {
            Name = "Laptop",
            AssetTag = "LT-100",
            Status = "Expired"
        };

        var executions = await service.ExecuteAsync(asset, "AssetAssigned", "Asset", 7);

        Assert.Single(executions);
        Assert.Equal("Succeeded", executions[0].Status);
        Assert.Equal(1, context.Tickets.Count());
        Assert.Equal("Maintenance review", context.Tickets.Single().Title);
    }

    [Fact]
    public async Task ExecuteAsync_CreatesNotification_ForTargetedRecipient()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        await using var context = new ApplicationDbContext(options);
        var service = new AutomationEngineService(context, null!);

        var rule = new AutomationRule
        {
            Name = "Notification automation",
            TriggerType = "TicketCreated",
            Conditions =
            [
                new AutomationCondition { Field = "priority", Operator = "equals", Value = "High" }
            ],
            Actions =
            [
                new AutomationAction { Type = "notify", Target = "user-1", Message = "High priority alert" }
            ],
            IsActive = true
        };

        context.AutomationRules.Add(rule);
        await context.SaveChangesAsync();

        var ticket = new Ticket
        {
            Title = "Critical incident",
            Description = "Urgent",
            Priority = "High",
            Status = "Open"
        };

        var executions = await service.ExecuteAsync(ticket, "TicketCreated", "Ticket", 5);

        Assert.Single(executions);
        Assert.Equal("Succeeded", executions[0].Status);
        Assert.Equal(1, context.Notifications.Count());
        Assert.Equal("High priority alert", context.Notifications.Single().Message);
    }

    [Fact]
    public async Task ExecuteAsync_EscalatesTicket_WhenRuleMatches()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        await using var context = new ApplicationDbContext(options);
        var service = new AutomationEngineService(context, null!);

        var rule = new AutomationRule
        {
            Name = "Escalation automation",
            TriggerType = "TicketUpdated",
            Conditions =
            [
                new AutomationCondition { Field = "status", Operator = "equals", Value = "Open" }
            ],
            Actions =
            [
                new AutomationAction { Type = "escalate", Value = "Escalated" }
            ],
            IsActive = true
        };

        context.AutomationRules.Add(rule);
        await context.SaveChangesAsync();

        var ticket = new Ticket
        {
            Title = "No response",
            Description = "Waiting",
            Status = "Open",
            Priority = "Medium"
        };

        var executions = await service.ExecuteAsync(ticket, "TicketUpdated", "Ticket", 8);

        Assert.Single(executions);
        Assert.Equal("Succeeded", executions[0].Status);
        Assert.Equal("Escalated", ticket.EscalationLevel);
        Assert.Equal("High", ticket.Priority);
    }
}
