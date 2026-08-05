using ITSM.Portal.API.DTOs;
using ITSM.Portal.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ITSM.Portal.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class SubscriptionController : ControllerBase
    {
        private readonly SubscriptionPlanService _subscriptionPlanService;

        public SubscriptionController(SubscriptionPlanService subscriptionPlanService)
        {
            _subscriptionPlanService = subscriptionPlanService;
        }

        [HttpGet("plans")]
        public IActionResult GetPlans()
        {
            var plans = _subscriptionPlanService.GetPlans().Values
                .Select(plan => new SubscriptionPlanDto
                {
                    Name = plan.Name,
                    Description = plan.Description,
                    UserLimit = plan.UserLimit,
                    AssetLimit = plan.AssetLimit,
                    AiUsageLimit = plan.AiUsageLimit,
                    Features = plan.Features
                })
                .ToList();

            return Ok(plans);
        }
    }
}
