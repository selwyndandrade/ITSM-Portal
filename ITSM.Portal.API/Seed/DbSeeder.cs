using ITSM.Portal.API.Data;
using ITSM.Portal.API.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace ITSM.Portal.API.Seed
{
    public static class DbSeeder
    {
        // Roles are core RBAC infrastructure (not credentials/demo data), so these are always
        // seeded regardless of environment - the app can't authorize anyone without them.
        public static async Task SeedRolesAsync(RoleManager<IdentityRole> roleManager)
        {
            // "PlatformAdmin" is a distinct role from "Admin" (organization admin) - it is the ONLY
            // way to obtain cross-tenant/platform-level access (see TenantContextService.IsPlatformAdmin).
            string[] roles = { "Admin", "Technician", "User", "Manager", "Employee", "PlatformAdmin" };

            foreach (var role in roles)
            {
                if (!await roleManager.RoleExistsAsync(role))
                {
                    await roleManager.CreateAsync(new IdentityRole(role));
                }
            }
        }

        // Creates a default admin account with a well-known password. Callers must only invoke this
        // in local development / demo environments - never in production.
        public static async Task SeedDefaultAdminUserAsync(UserManager<ApplicationUser> userManager)
        {
            var adminEmail = "admin@itsm.local";
            var existingAdmin = await userManager.FindByEmailAsync(adminEmail);

            if (existingAdmin == null)
            {
                var admin = new ApplicationUser
                {
                    UserName = adminEmail,
                    Email = adminEmail,
                    EmailConfirmed = true,
                    Role = "Admin",
                    DisplayName = "Kyro Administrator"
                };

                var result = await userManager.CreateAsync(admin, "Admin@123");

                if (result.Succeeded)
                {
                    await userManager.AddToRoleAsync(admin, "Admin");
                }
            }
        }

        // Creates a dedicated platform-level administrator account with a well-known password.
        // Callers must only invoke this in local development / demo environments - never in production.
        // Intentionally has no OrganizationId: platform admins are not scoped to any single tenant.
        public static async Task SeedPlatformAdminUserAsync(UserManager<ApplicationUser> userManager)
        {
            var platformAdminEmail = "platformadmin@itsm.local";
            var existingPlatformAdmin = await userManager.FindByEmailAsync(platformAdminEmail);

            if (existingPlatformAdmin == null)
            {
                var platformAdmin = new ApplicationUser
                {
                    UserName = platformAdminEmail,
                    Email = platformAdminEmail,
                    EmailConfirmed = true,
                    Role = "PlatformAdmin",
                    DisplayName = "Kyro Platform Administrator"
                };

                var result = await userManager.CreateAsync(platformAdmin, "PlatformAdmin@123");

                if (result.Succeeded)
                {
                    await userManager.AddToRoleAsync(platformAdmin, "PlatformAdmin");
                }
            }
        }

        // Department roster for the "Northwind Digital" demo organization. Shared by initial
        // seeding and by ResetDemoDataAsync (kept in sync so a reset lines up with the same users).
        private static readonly (string Name, string Description)[] DemoDepartments =
        {
            ("Service Desk", "Front-door support"),
            ("Infrastructure", "Networks and devices"),
            ("Security", "Access and compliance"),
            ("Engineering", "Product and platform engineering"),
            ("Sales & Marketing", "Customer-facing teams")
        };

        // (Email, DisplayName, Role, DepartmentName)
        private static readonly (string Email, string DisplayName, string Role, string DepartmentName)[] DemoUsers =
        {
            ("manager@northwind.demo", "Mina Patel", "Manager", "Service Desk"),
            ("technician@northwind.demo", "Leo Chen", "Technician", "Infrastructure"),
            ("employee@northwind.demo", "Sofia Rivera", "Employee", "Service Desk"),
            ("technician2@northwind.demo", "David Kim", "Technician", "Security"),
            ("technician3@northwind.demo", "Priya Nair", "Technician", "Engineering"),
            ("employee2@northwind.demo", "James Walsh", "Employee", "Sales & Marketing"),
            ("employee3@northwind.demo", "Amara Okafor", "Employee", "Engineering"),
            ("manager2@northwind.demo", "Marcus Cole", "Manager", "Infrastructure"),
            ("employee4@northwind.demo", "Grace Liu", "Employee", "Security")
        };

        public static async Task SeedDemoEnvironmentAsync(
            ApplicationDbContext context,
            UserManager<ApplicationUser> userManager,
            RoleManager<IdentityRole> roleManager)
        {
            if (await context.Organizations.AnyAsync()) return;

            var organization = new Organization
            {
                Name = "Northwind Digital",
                Slug = "northwind-digital",
                Description = "Demo customer environment for a modern ITSM rollout.",
                PrimaryContactEmail = "ops@northwind.demo",
                SubscriptionTier = "Growth",
                SettingsJson = "{\"defaultDepartmentCreationEnabled\":true,\"demoMode\":true}",
                CreatedDate = DateTime.UtcNow
            };

            context.Organizations.Add(organization);
            await context.SaveChangesAsync();

            var departments = DemoDepartments
                .Select(d => new Department { OrganizationId = organization.Id, Name = d.Name, Description = d.Description, IsActive = true, CreatedDate = DateTime.UtcNow })
                .ToArray();
            context.Departments.AddRange(departments);
            await context.SaveChangesAsync();
            var departmentsByName = departments.ToDictionary(d => d.Name);

            foreach (var spec in DemoUsers)
            {
                var user = new ApplicationUser
                {
                    UserName = spec.Email,
                    Email = spec.Email,
                    EmailConfirmed = true,
                    Role = spec.Role,
                    OrganizationId = organization.Id,
                    DepartmentId = departmentsByName[spec.DepartmentName].Id,
                    DisplayName = spec.DisplayName,
                    IsActive = true
                };
                var createResult = await userManager.CreateAsync(user, "Northwind@123");
                if (createResult.Succeeded)
                {
                    await userManager.AddToRoleAsync(user, user.Role);
                }
            }

            var adminUser = await userManager.FindByEmailAsync("admin@itsm.local");
            if (adminUser != null)
            {
                adminUser.OrganizationId = organization.Id;
                adminUser.DepartmentId = departmentsByName["Service Desk"].Id;
                await userManager.UpdateAsync(adminUser);
            }

            // Global/shared content - not tied to a single org's demo lifecycle, so it is
            // seeded once here and left untouched by ResetDemoDataAsync.
            context.ServiceCatalogItems.AddRange(
                new ServiceCatalogItem { Name = "Password Reset", Description = "Recover account access for a user with verified identity.", Category = "Access", Icon = "⟳", EstimatedCompletionTime = "Same day", RequiresApproval = false },
                new ServiceCatalogItem { Name = "New Laptop Request", Description = "Request a new corporate device for a role change or replacement.", Category = "Hardware", Icon = "💻", EstimatedCompletionTime = "3-5 business days", RequiresApproval = true },
                new ServiceCatalogItem { Name = "VPN Access", Description = "Grant secure remote access for approved employees.", Category = "Access", Icon = "🔐", EstimatedCompletionTime = "1-2 business days", RequiresApproval = true },
                new ServiceCatalogItem { Name = "Software Installation", Description = "Install or update standard business software.", Category = "Software", Icon = "⬢", EstimatedCompletionTime = "1 business day", RequiresApproval = false },
                new ServiceCatalogItem { Name = "New Employee Setup", Description = "Start onboarding essentials including accounts and device readiness.", Category = "Onboarding", Icon = "👤", EstimatedCompletionTime = "2-3 business days", RequiresApproval = true },
                new ServiceCatalogItem { Name = "Hardware Replacement", Description = "Replace damaged or outdated corporate hardware.", Category = "Hardware", Icon = "🛠️", EstimatedCompletionTime = "2-4 business days", RequiresApproval = true }
            );

            context.KnowledgeArticles.AddRange(
                new KnowledgeArticle { Category = "Access", Title = "Reset your password", Content = "If you are unable to sign in, use the password reset link on the sign-in screen and verify your identity. For urgent access problems, open a ticket and include your manager's approval if needed.", CreatedBy = "demo-seed", CreatedDate = DateTime.UtcNow.AddDays(-20), UpdatedDate = DateTime.UtcNow.AddDays(-2) },
                new KnowledgeArticle { Category = "Hardware", Title = "Laptop troubleshooting checklist", Content = "Restart the device, confirm Wi-Fi connectivity, and check whether the issue persists after the latest OS update. If the device still fails, submit a hardware ticket with the serial number.", CreatedBy = "demo-seed", CreatedDate = DateTime.UtcNow.AddDays(-18), UpdatedDate = DateTime.UtcNow.AddDays(-1) },
                new KnowledgeArticle { Category = "Service", Title = "How to request a new employee setup", Content = "Use the Service Catalog to request onboarding. Provide the employee name, start date, equipment needs, and manager approval. The request will route to the Service Desk for follow-up.", CreatedBy = "demo-seed", CreatedDate = DateTime.UtcNow.AddDays(-12), UpdatedDate = DateTime.UtcNow.AddDays(-1) },
                new KnowledgeArticle { Category = "Network", Title = "Troubleshooting VPN connection drops", Content = "Confirm the VPN client is on the latest version, check for captive portal Wi-Fi networks, and verify the corporate certificate has not expired. Escalate to Infrastructure if the tunnel repeatedly disconnects.", CreatedBy = "demo-seed", CreatedDate = DateTime.UtcNow.AddDays(-15), UpdatedDate = DateTime.UtcNow.AddDays(-3) },
                new KnowledgeArticle { Category = "Security", Title = "Reporting a suspicious email", Content = "Do not click links or open attachments. Use the Report Phishing button, or forward the message to security@northwind.demo and open a Security ticket with a screenshot.", CreatedBy = "demo-seed", CreatedDate = DateTime.UtcNow.AddDays(-9), UpdatedDate = DateTime.UtcNow.AddDays(-4) },
                new KnowledgeArticle { Category = "Software", Title = "Fixing sync issues in productivity apps", Content = "Sign out and back in, clear the local cache, and confirm the app is on the latest supported version. If syncing still fails after a restart, submit a Software ticket with the error message.", CreatedBy = "demo-seed", CreatedDate = DateTime.UtcNow.AddDays(-6), UpdatedDate = DateTime.UtcNow.AddDays(-1) },
                new KnowledgeArticle { Category = "Onboarding", Title = "New hire IT checklist", Content = "Confirm department, manager, and start date; provision accounts, assign a device from the spare pool, and grant baseline access. Notify the new hire's manager once provisioning is complete.", CreatedBy = "demo-seed", CreatedDate = DateTime.UtcNow.AddDays(-25), UpdatedDate = DateTime.UtcNow.AddDays(-5) }
            );

            context.AutomationRules.AddRange(
                new AutomationRule { OrganizationId = organization.Id, Name = "Escalate high priority incidents", TriggerType = "TicketCreated", Description = "Escalate urgent tickets to the infrastructure queue.", IsActive = true, CreatedDate = DateTime.UtcNow },
                new AutomationRule { OrganizationId = organization.Id, Name = "Send status update notification", TriggerType = "TicketUpdated", Description = "Notify the requester on ticket progress updates.", IsActive = true, CreatedDate = DateTime.UtcNow },
                new AutomationRule { OrganizationId = organization.Id, Name = "Route new service requests for approval", TriggerType = "ServiceRequestSubmitted", Description = "Notify the approving manager when a new service request is submitted.", IsActive = true, CreatedDate = DateTime.UtcNow },
                new AutomationRule { OrganizationId = organization.Id, Name = "Confirm asset assignment", TriggerType = "AssetAssigned", Description = "Notify the employee when a corporate asset is assigned to them.", IsActive = true, CreatedDate = DateTime.UtcNow }
            );

            await context.SaveChangesAsync();

            await SeedTransactionalDemoDataAsync(context, organization.Id, departments, DemoUsers.Select(u => u.Email).ToArray());
        }

        // Deletes and regenerates a demo organization's tickets, assets, service requests,
        // approvals, automation activity, and notifications - safe to call any number of times
        // during a live sales demo without risking the environment. Users, departments, knowledge
        // articles, the service catalog, and configured automation rules are left untouched.
        public static async Task ResetDemoDataAsync(ApplicationDbContext context, int organizationId)
        {
            var departments = await context.Departments.Where(d => d.OrganizationId == organizationId).ToArrayAsync();
            var userEmails = await context.Users.Where(u => u.OrganizationId == organizationId).Select(u => u.Email!).ToArrayAsync();

            var ticketIds = context.Tickets.Where(t => t.OrganizationId == organizationId).Select(t => t.Id);
            await context.TicketComments.Where(c => ticketIds.Contains(c.TicketId)).ExecuteDeleteAsync();
            await context.TicketHistories.Where(h => ticketIds.Contains(h.TicketId)).ExecuteDeleteAsync();
            await context.TicketAttachments.Where(a => ticketIds.Contains(a.TicketId)).ExecuteDeleteAsync();
            await context.ApprovalDecisions.Where(a => a.OrganizationId == organizationId).ExecuteDeleteAsync();
            await context.ServiceRequests.Where(r => r.OrganizationId == organizationId).ExecuteDeleteAsync();
            await context.AutomationExecutions.Where(e => e.OrganizationId == organizationId).ExecuteDeleteAsync();
            var assetIds = context.Assets.Where(a => a.OrganizationId == organizationId).Select(a => a.Id);
            await context.AssetHistories.Where(h => assetIds.Contains(h.AssetId)).ExecuteDeleteAsync();
            await context.Tickets.Where(t => t.OrganizationId == organizationId).ExecuteDeleteAsync();
            await context.Assets.Where(a => a.OrganizationId == organizationId).ExecuteDeleteAsync();
            await context.Notifications.Where(n => n.OrganizationId == organizationId).ExecuteDeleteAsync();

            await SeedTransactionalDemoDataAsync(context, organizationId, departments, userEmails);
        }

        private static async Task SeedTransactionalDemoDataAsync(ApplicationDbContext context, int organizationId, Department[] departments, string[] userEmails)
        {
            var departmentsByName = departments.ToDictionary(d => d.Name);
            var usersByEmail = await context.Users
                .Where(u => u.OrganizationId == organizationId && userEmails.Contains(u.Email))
                .ToDictionaryAsync(u => u.Email!);

            string? UserId(string email) => usersByEmail.TryGetValue(email, out var u) ? u.Id : null;
            int? DeptId(string name) => departmentsByName.TryGetValue(name, out var d) ? d.Id : null;

            var assetSpecs = new (string Tag, string Name, string Category, string Manufacturer, string Model, string Status, string? AssignedEmail, string? DeptName, double DaysAgoPurchased, double? DaysUntilWarrantyExpires)[]
            {
                ("NW-1001", "Surface Laptop 7", "Hardware", "Microsoft", "Surface Laptop 7", "Active", "employee@northwind.demo", "Infrastructure", 300, 65),
                ("NW-1002", "Cisco VPN Gateway", "Network", "Cisco", "ASA 5506", "In Maintenance", "technician@northwind.demo", "Infrastructure", 900, -30),
                ("NW-1003", "Dell Latitude 5540", "Hardware", "Dell", "Latitude 5540", "Active", "technician2@northwind.demo", "Security", 120, 600),
                ("NW-1004", "iPhone 15", "Mobile", "Apple", "iPhone 15", "Deployed", "employee2@northwind.demo", "Sales & Marketing", 200, 165),
                ("NW-1005", "Microsoft 365 E5 License Pool", "Software", "Microsoft", "365 E5", "Active", null, null, 60, null),
                ("NW-1006", "HP LaserJet Printer", "Hardware", "HP", "LaserJet Pro M404", "Retired", null, "Service Desk", 1500, -200),
                ("NW-1007", "Meraki Access Point", "Network", "Cisco Meraki", "MR46", "Active", null, "Infrastructure", 400, 250),
                ("NW-1008", "ThinkPad X1 Carbon", "Hardware", "Lenovo", "X1 Carbon Gen 11", "Available", null, "Engineering", 60, 700)
            };

            var assets = assetSpecs.Select(spec => new Asset
            {
                OrganizationId = organizationId,
                DepartmentId = spec.DeptName != null ? DeptId(spec.DeptName) : null,
                AssetTag = spec.Tag,
                Name = spec.Name,
                Category = spec.Category,
                Manufacturer = spec.Manufacturer,
                Model = spec.Model,
                Status = spec.Status,
                AssignedUserId = spec.AssignedEmail != null ? UserId(spec.AssignedEmail) : null,
                PurchaseDate = DateTime.UtcNow.AddDays(-spec.DaysAgoPurchased),
                WarrantyExpirationDate = spec.DaysUntilWarrantyExpires.HasValue ? DateTime.UtcNow.AddDays(spec.DaysUntilWarrantyExpires.Value) : null,
                CreatedDate = DateTime.UtcNow.AddDays(-spec.DaysAgoPurchased),
                UpdatedDate = DateTime.UtcNow.AddDays(-1)
            }).ToArray();

            context.Assets.AddRange(assets);
            await context.SaveChangesAsync();
            var assetsByTag = assets.ToDictionary(a => a.AssetTag);

            var ticketSpecs = new (string Title, string Description, string Status, string Priority, string Category, string CreatedByEmail, string? AssignedToEmail, string DeptName, string? AssetTag, double DaysAgoCreated, double? DaysAgoResolved)[]
            {
                ("VPN keeps disconnecting during video calls", "Remote employee reports the VPN tunnel drops every 10-15 minutes during video calls, forcing a reconnect.", "In Progress", "High", "Network", "employee2@northwind.demo", "technician2@northwind.demo", "Infrastructure", "NW-1002", 2, null),
                ("Cannot access shared drive after password reset", "User reset their password this morning and can no longer reach the shared Security drive.", "Open", "Medium", "Access", "employee4@northwind.demo", null, "Security", null, 1, null),
                ("Laptop screen flickering intermittently", "Screen flickers a few times per hour, especially when the laptop is on battery power.", "Open", "Medium", "Hardware", "employee3@northwind.demo", null, "Engineering", null, 3, null),
                ("Outlook mailbox failing to sync", "Employee mailbox is failing to sync after the latest security update.", "In Progress", "High", "Software", "employee@northwind.demo", "technician@northwind.demo", "Service Desk", "NW-1001", 4, null),
                ("New starter needs full IT provisioning", "New engineering hire starts Monday and needs accounts, laptop, and repo access provisioned.", "Pending", "Medium", "Access", "manager2@northwind.demo", "technician3@northwind.demo", "Engineering", null, 1, null),
                ("Production API returning intermittent 500 errors", "Customer-facing API is intermittently returning 500 errors under load, impacting the release.", "In Progress", "Critical", "Software", "manager2@northwind.demo", "technician3@northwind.demo", "Engineering", null, 0.25, null),
                ("Guest Wi-Fi certificate expired", "Guest Wi-Fi network is rejecting all connections after the SSL certificate expired overnight.", "Resolved", "High", "Network", "manager@northwind.demo", "technician@northwind.demo", "Infrastructure", null, 3, 1),
                ("Printer in Level 2 not responding", "Rear office printer has stopped responding after the network refresh.", "Resolved", "Low", "Hardware", "employee4@northwind.demo", "technician2@northwind.demo", "Security", null, 7, 5),
                ("Phishing email reported by finance team", "Finance employee reported a suspicious invoice email requesting a wire transfer.", "Resolved", "Critical", "Security", "employee2@northwind.demo", "technician2@northwind.demo", "Security", null, 5, 4),
                ("Slack notifications not syncing to mobile", "Mobile app stopped showing new message badges a few days ago.", "Closed", "Low", "Software", "employee3@northwind.demo", "technician@northwind.demo", "Engineering", null, 12, 10),
                ("Request for second monitor", "Employee is requesting a second monitor to support their workflow.", "Closed", "Low", "Hardware", "employee@northwind.demo", "technician2@northwind.demo", "Service Desk", null, 20, 18),
                ("VPN access request", "Sales team member needs temporary remote access for travel.", "Open", "Medium", "Access", "manager@northwind.demo", "technician@northwind.demo", "Security", "NW-1002", 1, null),
                ("Onboarding laptop imaging delayed", "The imaging process for the new hire's laptop has stalled at 60%.", "In Progress", "Medium", "Hardware", "manager2@northwind.demo", "technician2@northwind.demo", "Infrastructure", null, 2, null),
                ("Quarterly access review flagged stale accounts", "Security review flagged 4 accounts with access that no longer matches their role.", "Open", "Medium", "Access", "manager@northwind.demo", null, "Security", null, 0.33, null)
            };

            var tickets = ticketSpecs.Select(spec =>
            {
                var createdDate = DateTime.UtcNow.AddDays(-spec.DaysAgoCreated);
                var resolutionDate = spec.DaysAgoResolved.HasValue ? DateTime.UtcNow.AddDays(-spec.DaysAgoResolved.Value) : (DateTime?)null;
                return new Ticket
                {
                    OrganizationId = organizationId,
                    DepartmentId = DeptId(spec.DeptName),
                    Title = spec.Title,
                    Description = spec.Description,
                    Status = spec.Status,
                    Priority = spec.Priority,
                    Category = spec.Category,
                    CreatedBy = UserId(spec.CreatedByEmail),
                    AssignedTo = spec.AssignedToEmail != null ? UserId(spec.AssignedToEmail) : null,
                    AssetId = spec.AssetTag != null && assetsByTag.TryGetValue(spec.AssetTag, out var asset) ? asset.Id : null,
                    CreatedDate = createdDate,
                    UpdatedDate = resolutionDate ?? createdDate.AddHours(2),
                    ResolutionDate = resolutionDate
                };
            }).ToArray();

            context.Tickets.AddRange(tickets);
            await context.SaveChangesAsync();

            var ticketHistories = new List<TicketHistory>();
            for (var i = 0; i < tickets.Length; i++)
            {
                var spec = ticketSpecs[i];
                var ticket = tickets[i];
                ticketHistories.Add(new TicketHistory { TicketId = ticket.Id, Action = "Created", Details = $"Ticket created for {spec.Title}", CreatedBy = "demo-seed", CreatedDate = ticket.CreatedDate });
                if (spec.AssignedToEmail != null)
                {
                    ticketHistories.Add(new TicketHistory { TicketId = ticket.Id, Action = "Assigned", Details = $"Assigned to {spec.AssignedToEmail}", CreatedBy = "demo-seed", CreatedDate = ticket.CreatedDate.AddHours(1) });
                }
                if (spec.Status is "Resolved" or "Closed")
                {
                    ticketHistories.Add(new TicketHistory { TicketId = ticket.Id, Action = "StatusChanged", Details = $"Status changed to {spec.Status}", CreatedBy = "demo-seed", CreatedDate = ticket.UpdatedDate ?? ticket.CreatedDate });
                }
            }
            context.TicketHistories.AddRange(ticketHistories);

            var catalogItemIdByName = await context.ServiceCatalogItems.ToDictionaryAsync(c => c.Name, c => c.Id);
            var serviceRequestSpecs = new (string CatalogItem, string RequestedByEmail, string Status, string ApprovalStatus, string Description, double DaysAgo)[]
            {
                ("Password Reset", "employee4@northwind.demo", "Submitted", "Pending", "Password reset request after returning from leave.", 0.2),
                ("New Employee Setup", "manager@northwind.demo", "Approved", "Approved", "New employee setup for the Engineering team.", 1),
                ("New Laptop Request", "employee3@northwind.demo", "Submitted", "Pending", "Replacement laptop request - current device is out of warranty.", 0.5),
                ("VPN Access", "employee2@northwind.demo", "Rejected", "Rejected", "VPN access request for a personal device (declined per policy).", 2),
                ("Hardware Replacement", "employee@northwind.demo", "Approved", "Approved", "Monitor replacement approved for ergonomic reasons.", 4)
            };

            var serviceRequests = serviceRequestSpecs.Select(spec => new ServiceRequest
            {
                OrganizationId = organizationId,
                CatalogItemId = catalogItemIdByName.GetValueOrDefault(spec.CatalogItem, 1),
                RequestedByUserId = UserId(spec.RequestedByEmail),
                Status = spec.Status,
                ApprovalStatus = spec.ApprovalStatus,
                TicketDescription = spec.Description,
                CreatedDate = DateTime.UtcNow.AddDays(-spec.DaysAgo),
                CompletedDate = spec.ApprovalStatus != "Pending" ? DateTime.UtcNow.AddDays(-spec.DaysAgo + 0.5) : null
            }).ToArray();

            context.ServiceRequests.AddRange(serviceRequests);
            await context.SaveChangesAsync();

            var approvalDecisions = new List<ApprovalDecision>();
            for (var i = 0; i < serviceRequests.Length; i++)
            {
                var spec = serviceRequestSpecs[i];
                var request = serviceRequests[i];
                approvalDecisions.Add(new ApprovalDecision
                {
                    ServiceRequestId = request.Id,
                    OrganizationId = organizationId,
                    Decision = spec.ApprovalStatus,
                    Comments = spec.ApprovalStatus switch
                    {
                        "Approved" => "Approved - meets policy and budget.",
                        "Rejected" => "Rejected - does not meet current policy.",
                        _ => "Awaiting manager review."
                    },
                    DecisionByUserId = UserId("manager@northwind.demo"),
                    CreatedDate = request.CreatedDate.AddHours(3)
                });
            }
            context.ApprovalDecisions.AddRange(approvalDecisions);

            var ruleIdByName = await context.AutomationRules.Where(r => r.OrganizationId == organizationId).ToDictionaryAsync(r => r.Name, r => r.Id);
            var executionSpecs = new (string RuleName, string TriggerEvent, string RelatedType, int RelatedIndex, string Status, string Message, double HoursAgo)[]
            {
                ("Escalate high priority incidents", "TicketCreated", "Ticket", 5, "Succeeded", "Critical ticket auto-escalated to the Engineering on-call queue.", 6),
                ("Escalate high priority incidents", "TicketCreated", "Ticket", 8, "Succeeded", "Critical ticket auto-escalated to the Security response queue.", 120),
                ("Escalate high priority incidents", "TicketCreated", "Ticket", 0, "Succeeded", "High priority ticket auto-escalated to Infrastructure.", 48),
                ("Send status update notification", "TicketUpdated", "Ticket", 6, "Succeeded", "Requester notified that the Guest Wi-Fi issue was resolved.", 24),
                ("Send status update notification", "TicketUpdated", "Ticket", 9, "Succeeded", "Requester notified of resolution for the phishing report.", 96),
                ("Send status update notification", "TicketUpdated", "Ticket", 3, "Skipped", "Notification skipped - requester has notifications disabled.", 30),
                ("Route new service requests for approval", "ServiceRequestSubmitted", "ServiceRequest", 1, "Succeeded", "Manager notified of a new employee setup request awaiting approval.", 24),
                ("Route new service requests for approval", "ServiceRequestSubmitted", "ServiceRequest", 3, "Succeeded", "Manager notified of a VPN access request awaiting approval.", 48),
                ("Route new service requests for approval", "ServiceRequestSubmitted", "ServiceRequest", 0, "Failed", "Notification delivery failed - manager mailbox unavailable.", 5),
                ("Confirm asset assignment", "AssetAssigned", "Asset", 0, "Succeeded", "Employee notified that Surface Laptop 7 (NW-1001) was assigned to them.", 240)
            };

            var executions = executionSpecs.Select(spec => new AutomationExecution
            {
                RuleId = ruleIdByName.GetValueOrDefault(spec.RuleName),
                OrganizationId = organizationId,
                RuleName = spec.RuleName,
                TriggerEvent = spec.TriggerEvent,
                RelatedEntityType = spec.RelatedType,
                RelatedEntityId = spec.RelatedType switch
                {
                    "Ticket" when spec.RelatedIndex < tickets.Length => tickets[spec.RelatedIndex].Id,
                    "ServiceRequest" when spec.RelatedIndex < serviceRequests.Length => serviceRequests[spec.RelatedIndex].Id,
                    "Asset" when spec.RelatedIndex < assets.Length => assets[spec.RelatedIndex].Id,
                    _ => (int?)null
                },
                Status = spec.Status,
                Message = spec.Message,
                TriggeredAt = DateTime.UtcNow.AddHours(-spec.HoursAgo)
            }).ToArray();
            context.AutomationExecutions.AddRange(executions);

            context.Notifications.AddRange(
                new Notification { OrganizationId = organizationId, UserId = UserId("employee@northwind.demo"), Title = "Welcome to Kyro", Message = "You can now track service requests and knowledge articles in one place.", Type = "Announcement", IsRead = false, CreatedDate = DateTime.UtcNow.AddHours(-2) },
                new Notification { OrganizationId = organizationId, UserId = UserId("technician@northwind.demo"), Title = "Demo environment ready", Message = "New sample tickets and approvals are ready for review.", Type = "Announcement", IsRead = false, CreatedDate = DateTime.UtcNow.AddHours(-1) },
                new Notification { OrganizationId = organizationId, UserId = UserId("manager@northwind.demo"), Title = "Approval waiting", Message = "A new service request is waiting for your decision.", Type = "Approval", IsRead = false, CreatedDate = DateTime.UtcNow.AddHours(-3) },
                new Notification { OrganizationId = organizationId, UserId = UserId("technician2@northwind.demo"), Title = "Ticket assigned to you", Message = "A new Security ticket has been assigned to you.", Type = "Ticket", IsRead = false, CreatedDate = DateTime.UtcNow.AddHours(-5) },
                new Notification { OrganizationId = organizationId, UserId = UserId("manager2@northwind.demo"), Title = "New hire provisioning due", Message = "IT provisioning for Monday's new hire is still pending.", Type = "Reminder", IsRead = false, CreatedDate = DateTime.UtcNow.AddHours(-10) }
            );

            await context.SaveChangesAsync();
        }
    }
}
