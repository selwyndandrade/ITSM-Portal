using ITSM.Portal.API.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace ITSM.Portal.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly SignInManager<ApplicationUser> _signInManager;

        public AuthController(
            UserManager<ApplicationUser> userManager,
            SignInManager<ApplicationUser> signInManager)
        {
            _userManager = userManager;
            _signInManager = signInManager;
        }


        [HttpPost("register")]
        public async Task<IActionResult> Register(RegisterModel model)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var existingUser = await _userManager.FindByEmailAsync(model.Email);

            if (existingUser != null)
            {
                return BadRequest(new
                {
                    message = "User already exists"
                });
            }


            var user = new ApplicationUser
            {
                UserName = model.Email,
                Email = model.Email,
                Role = "User"
            };


            var result = await _userManager.CreateAsync(
                user,
                model.Password
            );


            if (!result.Succeeded)
            {
                return BadRequest(result.Errors);
            }


            return Ok(new
            {
                message = "Registration successful"
            });
        }



        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginModel model)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }


            var user = await _userManager.FindByEmailAsync(model.Email);


            if (user == null)
            {
                return Unauthorized(new
                {
                    message = "Invalid email or password"
                });
            }


            var result = await _signInManager.CheckPasswordSignInAsync(
                user,
                model.Password,
                false
            );


            if (!result.Succeeded)
            {
                return Unauthorized(new
                {
                    message = "Invalid email or password"
                });
            }


            return Ok(new
            {
                message = "Login successful",
                email = user.Email,
                role = user.Role
            });
        }
    }
}