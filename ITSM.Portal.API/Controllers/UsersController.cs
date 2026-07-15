using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using ITSM.Portal.API.Models;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Threading.Tasks;

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

        // GET: api/users?query=term
        [HttpGet]
        public async Task<IActionResult> GetUsers([FromQuery] string? query)
        {
            var usersQuery = _userManager.Users.AsQueryable();

            if (!string.IsNullOrEmpty(query))
            {
                var q = query.Trim().ToLower();
                usersQuery = usersQuery.Where(u => u.Email != null && u.Email.ToLower().Contains(q));
            }

            var users = await usersQuery
                .OrderBy(u => u.Email)
                .Select(u => new { id = u.Id, email = u.Email })
                .Take(50)
                .ToListAsync();

            return Ok(users);
        }
    }
}
