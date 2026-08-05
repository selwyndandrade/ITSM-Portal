using ITSM.Portal.API.DTOs;
using ITSM.Portal.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ITSM.Portal.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    // Provisioning a brand-new organization plus its first Admin account is a platform-level
    // operation (like PlatformAdminController) - it must never be reachable by an ordinary
    // authenticated user, or any tenant could self-service-create arbitrary new tenants/admins.
    [Authorize(Roles = "PlatformAdmin")]
    public class OrganizationsController : ControllerBase
    {
        private readonly OrganizationService _organizationService;

        public OrganizationsController(OrganizationService organizationService)
        {
            _organizationService = organizationService;
        }

        [HttpPost("onboard")]
        public async Task<IActionResult> Onboard([FromBody] OrganizationOnboardingRequest request)
        {
            try
            {
                var result = await _organizationService.CreateOrganizationAsync(request);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
