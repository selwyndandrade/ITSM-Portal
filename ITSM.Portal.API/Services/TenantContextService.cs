using System.Security.Claims;
using ITSM.Portal.API.Models;
using Microsoft.EntityFrameworkCore;

namespace ITSM.Portal.API.Services
{
    public class TenantContextService
    {
        private readonly IHttpContextAccessor _httpContextAccessor;

        public TenantContextService(IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        public int? CurrentOrganizationId
        {
            get
            {
                if (_httpContextAccessor.HttpContext?.User?.Identity?.IsAuthenticated != true)
                {
                    return null;
                }

                var claim = _httpContextAccessor.HttpContext.User.FindFirst("organization_id");
                if (claim != null && int.TryParse(claim.Value, out var organizationId))
                {
                    return organizationId;
                }

                return null;
            }
        }

        public bool CanAccessOrganization(int? organizationId)
        {
            if (organizationId is null) return true;
            if (IsPlatformAdmin()) return true;
            return CurrentOrganizationId.HasValue && CurrentOrganizationId.Value == organizationId.Value;
        }

        // Platform-wide access is granted exclusively via the dedicated "PlatformAdmin" role.
        // Do NOT infer platform access from an organization admin having no organization_id -
        // that heuristic was fragile (any Admin user missing an OrganizationId, e.g. due to a
        // future data issue, would silently gain cross-tenant access on next login).
        public bool IsPlatformAdmin()
        {
            return _httpContextAccessor.HttpContext?.User?.IsInRole("PlatformAdmin") == true;
        }

        public IQueryable<T> ApplyOrganizationFilter<T>(IQueryable<T> query) where T : class
        {
            if (_httpContextAccessor.HttpContext?.User?.Identity?.IsAuthenticated != true)
            {
                return query;
            }

            if (IsPlatformAdmin())
            {
                return query;
            }

            var organizationId = CurrentOrganizationId;
            if (organizationId is null)
            {
                // Fail closed: a non-platform-admin with no organization context must see nothing,
                // never everything.
                return query.Where(_ => false);
            }

            var entityType = typeof(T);
            var organizationProperty = entityType.GetProperty("OrganizationId");
            if (organizationProperty == null)
            {
                return query;
            }

            var parameter = System.Linq.Expressions.Expression.Parameter(entityType, "e");
            var property = System.Linq.Expressions.Expression.Property(parameter, organizationProperty);
            var constant = System.Linq.Expressions.Expression.Constant(organizationId.Value, property.Type);
            var equality = System.Linq.Expressions.Expression.Equal(property, constant);
            var lambda = System.Linq.Expressions.Expression.Lambda<Func<T, bool>>(equality, parameter);
            return query.Where(lambda);
        }
    }
}
