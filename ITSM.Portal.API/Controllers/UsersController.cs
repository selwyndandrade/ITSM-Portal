using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using ITSM.Portal.API.Models;

namespace ITSM.Portal.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class UsersController : ControllerBase
    {
        private readonly UserManager<ApplicationUser> _userManager;


        public UsersController(UserManager<ApplicationUser> userManager)
        {
            _userManager = userManager;
        }



        // GET: api/users
        [HttpGet]
        public IActionResult GetUsers()
        {
            var users = _userManager.Users
                .Select(u => new
                {
                    id = u.Id,
                    email = u.Email,
                    role = u.Role
                })
                .ToList();


            return Ok(users);
        }
    }
}