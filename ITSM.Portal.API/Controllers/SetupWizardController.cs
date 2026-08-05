using ITSM.Portal.API.DTOs;
using ITSM.Portal.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ITSM.Portal.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin")]
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
