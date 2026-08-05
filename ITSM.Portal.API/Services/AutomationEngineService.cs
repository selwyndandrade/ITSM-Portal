using ITSM.Portal.API.Controllers;
using ITSM.Portal.API.Data;
using ITSM.Portal.API.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace ITSM.Portal.API.Services
{
    public class AutomationEngineService
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;

        public AutomationEngineService(ApplicationDbContext context, UserManager<ApplicationUser> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

        public async Task<AutomationRuleEvaluationResult> TestRuleAsync(AutomationRule rule, Ticket ticket)
        {
            var evaluation = await EvaluateRuleAsync(rule, ticket);
            return new AutomationRuleEvaluationResult
            {
                Passed = evaluation.Passed,
                Summary = evaluation.Passed ? $"Rule matched {rule.Conditions.Count} condition(s)." : evaluation.Reason,
                Conditions = evaluation.Conditions,
                Actions = rule.Actions
            };
        }

        private static int? GetEntityOrganizationId(object entity) => entity switch
        {
            Ticket ticket => ticket.OrganizationId,
            ServiceRequest serviceRequest => serviceRequest.OrganizationId,
            Asset asset => asset.OrganizationId,
            _ => null
        };

        public async Task<IReadOnlyList<AutomationExecution>> ExecuteAsync(object entity, string triggerType, string? entityType = null, int? entityId = null)
        {
            var executions = new List<AutomationExecution>();

            // Scope rule lookup to the triggering entity's own tenant - without this an
            // organization's automation rules (assignments, notifications, escalations) would
            // fire against every other organization's tickets/assets/service requests too.
            // Fail closed: an entity with no organization context matches no rules, never all of them.
            var organizationId = GetEntityOrganizationId(entity);
            var rules = await _context.AutomationRules
                .Where(r => r.IsActive && r.TriggerType == triggerType && r.OrganizationId == organizationId)
                .ToListAsync();

            foreach (var rule in rules)
            {
                var evaluation = await EvaluateRuleAsync(rule, entity);
                var execution = new AutomationExecution
                {
                    RuleId = rule.Id,
                    RuleName = rule.Name,
                    TriggerEvent = triggerType,
                    RelatedEntityType = entityType,
                    RelatedEntityId = entityId,
                    OrganizationId = organizationId,
                    Status = evaluation.Passed ? "Succeeded" : "Skipped",
                    Message = evaluation.Passed ? $"Matched {rule.Conditions.Count} condition(s)" : "Conditions did not match",
                    TriggeredAt = DateTime.UtcNow
                };

                _context.AutomationExecutions.Add(execution);
                await _context.SaveChangesAsync();

                if (!evaluation.Passed)
                {
                    executions.Add(execution);
                    continue;
                }

                var actionResults = new List<string>();
                foreach (var action in rule.Actions)
                {
                    var actionResult = await ExecuteActionAsync(action, entity, rule, execution);
                    if (actionResult != null)
                    {
                        actionResults.Add(actionResult);
                    }
                }

                if (actionResults.Count > 0)
                {
                    execution.Message = string.IsNullOrWhiteSpace(execution.Message)
                        ? string.Join("; ", actionResults)
                        : $"{execution.Message}; {string.Join("; ", actionResults)}";
                    execution.Status = "Succeeded";
                    await _context.SaveChangesAsync();
                }
                else if (evaluation.Passed)
                {
                    execution.Status = "Failed";
                    execution.Message = "Rule matched but no action could be executed";
                    await _context.SaveChangesAsync();
                }

                executions.Add(execution);
            }

            return executions;
        }

        private async Task<(bool Passed, string? Reason, List<AutomationConditionEvaluation> Conditions)> EvaluateRuleAsync(AutomationRule rule, object entity)
        {
            var conditions = new List<AutomationConditionEvaluation>();
            if (rule.Conditions == null || rule.Conditions.Count == 0)
            {
                return (true, null, conditions);
            }

            var ticket = entity as Ticket;
            var serviceRequest = entity as ServiceRequest;
            var asset = entity as Asset;

            foreach (var condition in rule.Conditions)
            {
                var fieldValue = GetFieldValue(condition.Field, ticket, serviceRequest, asset);
                var passed = MatchesCondition(fieldValue, condition.Operator, condition.Value);
                conditions.Add(new AutomationConditionEvaluation
                {
                    Field = condition.Field,
                    Operator = condition.Operator,
                    Value = condition.Value,
                    Passed = passed,
                    ActualValue = fieldValue,
                    Message = passed ? "Condition matched" : $"Expected {condition.Value}"
                });
            }

            var allPassed = conditions.All(c => c.Passed);
            return (allPassed, allPassed ? null : "One or more conditions failed", conditions);
        }

        private async Task<string?> ExecuteActionAsync(AutomationAction action, object entity, AutomationRule rule, AutomationExecution execution)
        {
            switch (action.Type.ToLowerInvariant())
            {
                case "assign":
                    if (entity is Ticket assignTicket)
                    {
                        if (!string.IsNullOrWhiteSpace(action.Value))
                        {
                            assignTicket.AssignedTo = action.Value;
                            assignTicket.UpdatedDate = DateTime.UtcNow;
                            await _context.SaveChangesAsync();
                            return $"Assigned ticket to {action.Value}";
                        }
                    }
                    break;
                case "set-status":
                    if (entity is Ticket ticketStatus)
                    {
                        ticketStatus.Status = action.Value;
                        ticketStatus.UpdatedDate = DateTime.UtcNow;
                        await _context.SaveChangesAsync();
                        return $"Changed status to {action.Value}";
                    }
                    break;
                case "set-request-status":
                    if (entity is ServiceRequest serviceRequestStatus)
                    {
                        serviceRequestStatus.Status = string.IsNullOrWhiteSpace(action.Value) ? "In Progress" : action.Value;
                        await _context.SaveChangesAsync();
                        return $"Updated request status to {serviceRequestStatus.Status}";
                    }
                    break;
                case "notify":
                    return await SendNotificationsAsync(action, entity, rule, null);
                case "notify-manager":
                    return await SendNotificationsAsync(action, entity, rule, "Manager");
                case "notify-requester":
                    return await SendNotificationsAsync(action, entity, rule, "Requester");
                case "notify-assigned-technician":
                    return await SendNotificationsAsync(action, entity, rule, "AssignedTechnician");
                case "set-approval-status":
                    if (entity is ServiceRequest serviceRequestApproval)
                    {
                        serviceRequestApproval.ApprovalStatus = action.Value;
                        await _context.SaveChangesAsync();
                        return $"Updated approval status to {action.Value}";
                    }
                    break;
                case "create-approval-record":
                    if (entity is ServiceRequest serviceRequestApprovalRecord)
                    {
                        _context.ApprovalDecisions.Add(new ApprovalDecision
                        {
                            ServiceRequestId = serviceRequestApprovalRecord.Id,
                            Decision = string.IsNullOrWhiteSpace(action.Value) ? "Pending" : action.Value,
                            Comments = action.Message,
                            CreatedDate = DateTime.UtcNow
                        });
                        await _context.SaveChangesAsync();
                        return "Approval record created";
                    }
                    break;
                case "create-follow-up-ticket":
                    return await CreateFollowUpTicketAsync(action, entity, rule);
                case "escalate":
                    if (entity is Ticket escalateTicket)
                    {
                        escalateTicket.EscalationLevel = string.IsNullOrWhiteSpace(action.Value) ? "Escalated" : action.Value;
                        escalateTicket.UpdatedDate = DateTime.UtcNow;
                        if (string.IsNullOrWhiteSpace(escalateTicket.Priority) || string.Equals(escalateTicket.Priority, "Medium", StringComparison.OrdinalIgnoreCase))
                        {
                            escalateTicket.Priority = "High";
                        }
                        await _context.SaveChangesAsync();
                        return $"Escalated ticket to {escalateTicket.EscalationLevel}";
                    }
                    if (entity is ServiceRequest escalateRequest)
                    {
                        escalateRequest.Status = string.IsNullOrWhiteSpace(action.Value) ? "Escalated" : action.Value;
                        await _context.SaveChangesAsync();
                        return $"Escalated service request to {escalateRequest.Status}";
                    }
                    break;
                case "escalate-request":
                    if (entity is ServiceRequest requestEscalation)
                    {
                        requestEscalation.Status = string.IsNullOrWhiteSpace(action.Value) ? "Escalated" : action.Value;
                        requestEscalation.ApprovalStatus = "Escalated";
                        if (requestEscalation.Ticket != null)
                        {
                            requestEscalation.Ticket.EscalationLevel = requestEscalation.Status;
                            requestEscalation.Ticket.Priority = "High";
                            requestEscalation.Ticket.UpdatedDate = DateTime.UtcNow;
                        }
                        await _context.SaveChangesAsync();
                        return $"Escalated request to {requestEscalation.Status}";
                    }
                    break;
                case "assign-approval-group":
                    if (entity is ServiceRequest approvalGroupRequest)
                    {
                        var groupName = string.IsNullOrWhiteSpace(action.Target) ? "ApprovalGroup" : action.Target;
                        if (approvalGroupRequest.Ticket != null)
                        {
                            _context.TicketHistories.Add(new TicketHistory
                            {
                                TicketId = approvalGroupRequest.Ticket.Id,
                                Action = "ApprovalGroupAssigned",
                                Details = $"Automation assigned approval group '{groupName}'",
                                CreatedBy = "AutomationEngine",
                                CreatedDate = DateTime.UtcNow
                            });
                        }
                        await _context.SaveChangesAsync();
                        return $"Assigned approval group '{groupName}'";
                    }
                    break;
                case "add-internal-note":
                    if (entity is Ticket noteTicket)
                    {
                        _context.TicketHistories.Add(new TicketHistory
                        {
                            TicketId = noteTicket.Id,
                            Action = "AutomationRule",
                            Details = action.Message ?? $"{rule.Name} executed",
                            CreatedBy = "AutomationEngine",
                            CreatedDate = DateTime.UtcNow
                        });
                        await _context.SaveChangesAsync();
                        return "Internal note added";
                    }
                    if (entity is ServiceRequest noteRequest && noteRequest.Ticket != null)
                    {
                        _context.TicketHistories.Add(new TicketHistory
                        {
                            TicketId = noteRequest.Ticket.Id,
                            Action = "AutomationRule",
                            Details = action.Message ?? $"{rule.Name} executed",
                            CreatedBy = "AutomationEngine",
                            CreatedDate = DateTime.UtcNow
                        });
                        await _context.SaveChangesAsync();
                        return "Internal note added";
                    }
                    break;
                case "audit":
                    if (entity is Ticket auditTicket)
                    {
                        _context.TicketHistories.Add(new TicketHistory
                        {
                            TicketId = auditTicket.Id,
                            Action = "AutomationRule",
                            Details = action.Message ?? $"{rule.Name} executed",
                            CreatedBy = "AutomationEngine",
                            CreatedDate = DateTime.UtcNow
                        });
                        await _context.SaveChangesAsync();
                        return "Audit entry created";
                    }
                    break;
            }

            return null;
        }

        private async Task<string?> SendNotificationsAsync(AutomationAction action, object entity, AutomationRule rule, string? recipientType)
        {
            var targetUserIds = new List<string>();
            if (!string.IsNullOrWhiteSpace(action.Target))
            {
                targetUserIds.Add(action.Target);
            }

            switch (recipientType)
            {
                case "Manager":
                    targetUserIds.AddRange(await ResolveManagerUserIdsAsync());
                    break;
                case "Requester":
                    if (entity is ServiceRequest request && !string.IsNullOrWhiteSpace(request.RequestedByUserId))
                    {
                        targetUserIds.Add(request.RequestedByUserId);
                    }
                    else if (entity is Ticket requesterTicket && !string.IsNullOrWhiteSpace(requesterTicket.CreatedBy))
                    {
                        targetUserIds.Add(requesterTicket.CreatedBy);
                    }
                    break;
                case "AssignedTechnician":
                    if (entity is Ticket assignedTicket && !string.IsNullOrWhiteSpace(assignedTicket.AssignedTo))
                    {
                        targetUserIds.Add(assignedTicket.AssignedTo);
                    }
                    else if (entity is ServiceRequest serviceRequest && serviceRequest.Ticket != null && !string.IsNullOrWhiteSpace(serviceRequest.Ticket.AssignedTo))
                    {
                        targetUserIds.Add(serviceRequest.Ticket.AssignedTo);
                    }
                    break;
                default:
                    if (!string.IsNullOrWhiteSpace(action.Target))
                    {
                        targetUserIds.Add(action.Target);
                    }
                    break;
            }

            targetUserIds = targetUserIds.Where(id => !string.IsNullOrWhiteSpace(id)).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
            if (targetUserIds.Count == 0)
            {
                return null;
            }

            var relatedTicketId = entity switch
            {
                Ticket ticket => ticket.Id,
                ServiceRequest serviceRequest => serviceRequest.TicketId,
                Asset asset => null,
                _ => null
            };

            foreach (var userId in targetUserIds)
            {
                var title = recipientType switch
                {
                    "Manager" => "Automation approval request",
                    "Requester" => "Automation update",
                    "AssignedTechnician" => "Automation assignment",
                    _ => "Automation rule triggered"
                };

                var message = action.Message ?? $"{rule.Name} executed";
                await NotificationsController.CreateAsync(_context, userId, title, message, "AutomationRule", relatedTicketId);
            }

            return $"Notification sent to {targetUserIds.Count} recipient(s)";
        }

        private async Task<List<string>> ResolveManagerUserIdsAsync()
        {
            var users = await _context.Users.Where(u => u.Role == "Admin" || u.Role == "Technician").Select(u => u.Id).ToListAsync();
            return users.Where(id => !string.IsNullOrWhiteSpace(id)).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        }

        private async Task<string?> CreateFollowUpTicketAsync(AutomationAction action, object entity, AutomationRule rule)
        {
            var title = string.IsNullOrWhiteSpace(action.Value) ? "Follow-up ticket" : action.Value;
            var description = action.Message ?? $"Automation-generated follow-up ticket for {rule.Name}";
            var priority = ParsePriority(action.Target, action.Message, action.Value) ?? "Medium";
            var assignee = string.IsNullOrWhiteSpace(action.Target) || IsPriorityValue(action.Target) ? null : action.Target;

            var existingTicket = entity as Ticket;
            var ticket = new Ticket
            {
                Title = title,
                Description = description,
                Status = "Open",
                Priority = priority,
                Category = "Automation",
                CreatedBy = existingTicket?.CreatedBy,
                CreatedDate = DateTime.UtcNow,
                UpdatedDate = DateTime.UtcNow,
                AssignedTo = assignee,
                DepartmentId = existingTicket?.DepartmentId,
                AssetId = existingTicket?.AssetId
            };

            _context.Tickets.Add(ticket);
            await _context.SaveChangesAsync();

            if (!string.IsNullOrWhiteSpace(action.Message))
            {
                _context.TicketHistories.Add(new TicketHistory
                {
                    TicketId = ticket.Id,
                    Action = "AutomationRule",
                    Details = action.Message,
                    CreatedBy = "AutomationEngine",
                    CreatedDate = DateTime.UtcNow
                });
                await _context.SaveChangesAsync();
            }

            return $"Created follow-up ticket #{ticket.Id}";
        }

        private static bool IsPriorityValue(string? value)
        {
            return !string.IsNullOrWhiteSpace(value) && new[] { "low", "medium", "high", "critical" }.Contains(value.Trim().ToLowerInvariant());
        }

        private static string? ParsePriority(params string?[] values)
        {
            foreach (var value in values)
            {
                if (string.IsNullOrWhiteSpace(value)) continue;
                var normalized = value.Trim().ToLowerInvariant();
                if (normalized.Contains("priority:"))
                {
                    var parts = normalized.Split(':', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                    if (parts.Length > 1) return ToTitleCase(parts[1]);
                }
                if (IsPriorityValue(value))
                {
                    return ToTitleCase(value.Trim());
                }
            }
            return null;
        }

        private static string ToTitleCase(string value)
        {
            return value.Trim().ToLowerInvariant() switch
            {
                "low" => "Low",
                "medium" => "Medium",
                "high" => "High",
                "critical" => "Critical",
                _ => value.Trim()
            };
        }

        private static string? GetFieldValue(string field, Ticket? ticket, ServiceRequest? serviceRequest, Asset? asset)
        {
            return field.ToLowerInvariant() switch
            {
                "priority" => ticket?.Priority,
                "status" => ticket?.Status,
                "category" => ticket?.Category,
                "department" => ticket?.DepartmentId?.ToString(),
                "title" => ticket?.Title,
                "requester" => ticket?.CreatedBy,
                "approvalstatus" => serviceRequest?.ApprovalStatus,
                "servicerequeststatus" => serviceRequest?.Status,
                "catalogitem" => serviceRequest?.CatalogItemId.ToString(),
                "assetstatus" => asset?.Status,
                "assetassigneduser" => asset?.AssignedUserId,
                _ => null
            };
        }

        private static bool MatchesCondition(string? fieldValue, string? operatorName, string? expectedValue)
        {
            if (string.IsNullOrWhiteSpace(fieldValue) && string.IsNullOrWhiteSpace(expectedValue)) return true;
            if (string.IsNullOrWhiteSpace(fieldValue)) return false;

            var normalizedFieldValue = fieldValue.Trim();
            var normalizedExpected = expectedValue?.Trim() ?? string.Empty;

            return operatorName?.ToLowerInvariant() switch
            {
                "equals" => string.Equals(normalizedFieldValue, normalizedExpected, StringComparison.OrdinalIgnoreCase),
                "contains" => normalizedFieldValue.Contains(normalizedExpected, StringComparison.OrdinalIgnoreCase),
                "startswith" => normalizedFieldValue.StartsWith(normalizedExpected, StringComparison.OrdinalIgnoreCase),
                "endswith" => normalizedFieldValue.EndsWith(normalizedExpected, StringComparison.OrdinalIgnoreCase),
                _ => string.Equals(normalizedFieldValue, normalizedExpected, StringComparison.OrdinalIgnoreCase)
            };
        }
    }
}
