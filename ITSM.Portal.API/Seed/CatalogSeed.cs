using ITSM.Portal.API.Data;
using ITSM.Portal.API.Models;
using Microsoft.EntityFrameworkCore;

namespace ITSM.Portal.API.Seed
{
    public static class CatalogSeed
    {
        public static async Task SeedCatalogItems(ApplicationDbContext context)
        {
            try
            {
                if (!await context.Database.CanConnectAsync()) return;
                if (await context.ServiceCatalogItems.AnyAsync()) return;

                var items = new[]
                {
                    new ServiceCatalogItem { Name = "Password Reset", Description = "Recover account access for a user with verified identity.", Category = "Access", Icon = "⟳", EstimatedCompletionTime = "Same day", RequiresApproval = false },
                    new ServiceCatalogItem { Name = "New Laptop Request", Description = "Request a new corporate device for a role change or replacement.", Category = "Hardware", Icon = "💻", EstimatedCompletionTime = "3-5 business days", RequiresApproval = true },
                    new ServiceCatalogItem { Name = "VPN Access", Description = "Grant remote access for approved employees.", Category = "Access", Icon = "🔐", EstimatedCompletionTime = "1-2 business days", RequiresApproval = true },
                    new ServiceCatalogItem { Name = "Software Installation", Description = "Install or update standard business software.", Category = "Software", Icon = "⬢", EstimatedCompletionTime = "1 business day", RequiresApproval = false },
                    new ServiceCatalogItem { Name = "New Employee Setup", Description = "Start onboarding essentials including accounts and device readiness.", Category = "Onboarding", Icon = "👤", EstimatedCompletionTime = "2-3 business days", RequiresApproval = true },
                    new ServiceCatalogItem { Name = "Hardware Replacement", Description = "Replace damaged or outdated corporate hardware.", Category = "Hardware", Icon = "🛠️", EstimatedCompletionTime = "2-4 business days", RequiresApproval = true }
                };

                context.ServiceCatalogItems.AddRange(items);
                await context.SaveChangesAsync();
            }
            catch
            {
                // ignore local seed failures so the app can still run
            }
        }
    }
}
