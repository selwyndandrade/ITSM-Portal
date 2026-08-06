using ITSM.Portal.API.DTOs;
using ITSM.Portal.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ITSM.Portal.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    // Same reasoning as OrganizationsController: provisioning a brand-new organization is a
    // platform-level operation and must never be reachable by an ordinary tenant Admin, or any
    // customer could self-service-create arbitrary new tenants/admins.
    [Authorize(Roles = "PlatformAdmin")]
    public class SetupWizardController : ControllerBase
    {
        private readonly SetupWizardService _setupWizardService;

        public SetupWizardController(SetupWizardService setupWizardService)
        {
            _setupWizardService = setupWizardService;
        }

        [HttpPost]
        public async Task<IActionResult> CreateSetup([FromBody] SetupWizardRequest request)
        {
            try
            {
                var result = await _setupWizardService.CreateSetupAsync(request);
                return Ok(new { organization = result.Organization, departments = result.Departments, automationRules = result.AutomationRules });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
