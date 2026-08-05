using ITSM.Portal.API.Data;
using ITSM.Portal.API.Models;
using ITSM.Portal.API.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace ITSM.Portal.API.Tests;

// Regression coverage for the cross-tenant automation leak fixed in AutomationEngineService.ExecuteAsync:
// rule lookup previously had no OrganizationId filter at all, so one organization's automation rules
// (assignment, escalation, notifications) could fire against another organization's tickets/assets/
// service requests - e.g. an Org A technician could be notified about an Org B ticket's title.
public class AutomationEngineTenantIsolationTests
{
    private static ApplicationDbContext NewContext() =>
        new(new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    [Fact]
    public async Task ExecuteAsync_DoesNotTriggerRule_FromDifferentOrganization()
    {
        await using var context = NewContext();
        var service = new AutomationEngineService(context, null!);

        // Rule belongs to Org 1 only.
        var rule = new AutomationRule
        {
            Name = "Org 1 escalation rule",
            TriggerType = "TicketCreated",
            OrganizationId = 1,
            Conditions = [new AutomationCondition { Field = "priority", Operator = "equals", Value = "High" }],
            Actions = [new AutomationAction { Type = "escalate", Value = "Escalated" }],
            IsActive = true
        };
        context.AutomationRules.Add(rule);
        await context.SaveChangesAsync();

        // Ticket belongs to Org 2 - Org 1's rule must not evaluate against it.
        var org2Ticket = new Ticket
        {
            Title = "Org 2 confidential incident",
            Description = "Should stay isolated from Org 1's automation",
            Priority = "High",
            Status = "Open",
            OrganizationId = 2
        };

        var executions = await service.ExecuteAsync(org2Ticket, "TicketCreated", "Ticket", 99);

        Assert.Empty(executions);
        Assert.Empty(context.AutomationExecutions);
        Assert.Null(org2Ticket.EscalationLevel);
    }

    [Fact]
    public async Task ExecuteAsync_TriggersOnlyTheRequestingOrganizationsRule_WhenBothOrganizationsHaveMatchingRules()
    {
        await using var context = NewContext();
        var service = new AutomationEngineService(context, null!);

        var org1Rule = new AutomationRule
        {
            Name = "Org 1 notify rule",
            TriggerType = "TicketCreated",
            OrganizationId = 1,
            Conditions = [],
            Actions = [new AutomationAction { Type = "notify", Target = "org1-technician", Message = "Org 1 alert" }],
            IsActive = true
        };
        var org2Rule = new AutomationRule
        {
            Name = "Org 2 notify rule",
            TriggerType = "TicketCreated",
            OrganizationId = 2,
            Conditions = [],
            Actions = [new AutomationAction { Type = "notify", Target = "org2-technician", Message = "Org 2 alert" }],
            IsActive = true
        };
        context.AutomationRules.AddRange(org1Rule, org2Rule);
        await context.SaveChangesAsync();

        var org1Ticket = new Ticket
        {
            Title = "Org 1 incident",
            Description = "Belongs to Org 1",
            Priority = "Medium",
            Status = "Open",
            OrganizationId = 1
        };

        var executions = await service.ExecuteAsync(org1Ticket, "TicketCreated", "Ticket", 1);

        Assert.Single(executions);
        Assert.Equal(org1Rule.Id, executions[0].RuleId);

        // No leakage: the notification created must be the Org 1 recipient, not Org 2's.
        var notification = Assert.Single(context.Notifications);
        Assert.Equal("org1-technician", notification.UserId);
    }

    [Fact]
    public async Task ExecuteAsync_TagsAutomationExecution_WithTriggeringEntitysOrganizationId()
    {
        await using var context = NewContext();
        var service = new AutomationEngineService(context, null!);

        var rule = new AutomationRule
        {
            Name = "Org 5 audit rule",
            TriggerType = "TicketUpdated",
            OrganizationId = 5,
            Conditions = [],
            Actions = [new AutomationAction { Type = "audit", Message = "logged" }],
            IsActive = true
        };
        context.AutomationRules.Add(rule);
        await context.SaveChangesAsync();

        var ticket = new Ticket { Title = "T", Description = "D", Status = "Open", Priority = "Low", OrganizationId = 5 };

        await service.ExecuteAsync(ticket, "TicketUpdated", "Ticket", 1);

        var execution = Assert.Single(context.AutomationExecutions);
        Assert.Equal(5, execution.OrganizationId);
    }

    [Fact]
    public async Task ExecuteAsync_EntityWithNoOrganization_MatchesNoRules_FailsSafeInsteadOfMatchingEveryTenant()
    {
        await using var context = NewContext();
        var service = new AutomationEngineService(context, null!);

        var org1Rule = new AutomationRule
        {
            Name = "Org 1 rule",
            TriggerType = "TicketCreated",
            OrganizationId = 1,
            Conditions = [],
            Actions = [new AutomationAction { Type = "escalate", Value = "Escalated" }],
            IsActive = true
        };
        context.AutomationRules.Add(org1Rule);
        await context.SaveChangesAsync();

        // Simulates a ticket that (due to a bug elsewhere, or a platform-admin-created record with
        // no tenant context) ended up with OrganizationId = null. It must not be treated as belonging
        // to every organization's rule set.
        var orphanTicket = new Ticket { Title = "Orphan", Description = "No org", Status = "Open", Priority = "High", OrganizationId = null };

        var executions = await service.ExecuteAsync(orphanTicket, "TicketCreated", "Ticket", 1);

        Assert.Empty(executions);
        Assert.Null(orphanTicket.EscalationLevel);
    }
}
