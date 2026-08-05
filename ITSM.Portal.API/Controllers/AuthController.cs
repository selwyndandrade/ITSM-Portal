using ITSM.Portal.API.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using ITSM.Portal.API.Services;
using ITSM.Portal.API.Data;

namespace ITSM.Portal.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly IConfiguration _configuration;
        private readonly IWebHostEnvironment _environment;
        private readonly AuditLogService _auditLog;
        private readonly ApplicationDbContext _context;

        public AuthController(
            UserManager<ApplicationUser> userManager,
            SignInManager<ApplicationUser> signInManager,
            IConfiguration configuration,
            IWebHostEnvironment environment,
            AuditLogService auditLog,
            ApplicationDbContext context)
        {
            _userManager = userManager;
            _signInManager = signInManager;
            _configuration = configuration;
            _environment = environment;
            _auditLog = auditLog;
            _context = context;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register(RegisterModel model)
        {
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();
                return BadRequest(new
                {
                    message = "Validation failed",
                    errors = errors
                });
            }

            var existingUser = await _userManager.FindByEmailAsync(model.Email);

            if (existingUser != null)
            {
                return BadRequest(new
                {
                    message = "User already exists"
                });
            }

            // Determine which organization (tenant) this self-registered user belongs to.
            // Without this, new users end up with OrganizationId = null, which the tenant
            // filter treats as "belongs to no organization" and hides all org-scoped data
            // from them (tickets, assets, notifications, etc.).
            var emailDomain = model.Email.Split('@').LastOrDefault()?.ToLowerInvariant();
            int? matchedOrganizationId = null;

            if (!string.IsNullOrEmpty(emailDomain))
            {
                matchedOrganizationId = await _context.Users
                    .Where(u => u.OrganizationId != null && u.Email != null && u.Email.ToLower().EndsWith("@" + emailDomain))
                    .Select(u => u.OrganizationId)
                    .FirstOrDefaultAsync();
            }

            if (matchedOrganizationId == null)
            {
                var organizationCount = await _context.Organizations.CountAsync();
                if (organizationCount == 1)
                {
                    matchedOrganizationId = await _context.Organizations.Select(o => (int?)o.Id).FirstAsync();
                }
            }

            var user = new ApplicationUser
            {
                UserName = model.Email,
                Email = model.Email,
                Role = "Employee",
                OrganizationId = matchedOrganizationId
            };

            var result = await _userManager.CreateAsync(user, model.Password);

            if (!result.Succeeded)
            {
                var errors = result.Errors.Select(e => e.Description).ToList();
                return BadRequest(new
                {
                    message = "Registration failed",
                    errors = errors
                });
            }

            await _auditLog.WriteAsync("UserRegistered", $"User '{user.Email}' registered", "User", null, user);

            var registrationMessage = matchedOrganizationId != null
                ? "Registration successful"
                : "Registration successful. An administrator must assign your account to an organization before you can access tickets.";

            return Ok(new
            {
                message = registrationMessage
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

            var passwordSignIn = await _signInManager.CheckPasswordSignInAsync(user, model.Password, lockoutOnFailure: true);

            if (passwordSignIn.IsLockedOut)
            {
                await _auditLog.WriteAsync("LoginLockedOut", $"Account '{model.Email}' locked out after repeated failed attempts", "User", null, user);
                return StatusCode(StatusCodes.Status423Locked, new
                {
                    message = "Too many failed sign-in attempts. Please try again later."
                });
            }

            if (!passwordSignIn.Succeeded)
            {
                await _auditLog.WriteAsync("LoginFailed", $"Failed login attempt for '{model.Email}'", "User", null, user);
                return Unauthorized(new
                {
                    message = "Invalid email or password"
                });
            }

            user.RefreshToken = Guid.NewGuid().ToString("N");
            user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);
            await _userManager.UpdateAsync(user);

            var token = GenerateJwtToken(user);

            // Set JWT as an HttpOnly cookie for local development.
            var cookieOptions = CreateCookieOptions(expires: true);
            Response.Cookies.Append("jwt", token, cookieOptions);

            await _auditLog.WriteAsync("LoginSucceeded", $"User '{user.Email}' signed in", "User", null, user);

            return Ok(new
            {
                message = "Login successful",
                token,
                refreshToken = user.RefreshToken,
                id = user.Id,
                email = user.Email,
                role = user.Role,
                organizationId = user.OrganizationId,
                displayName = user.DisplayName,
                profileImageUrl = user.ProfileImageUrl
            });
        }

        [HttpPost("refresh")]
        public async Task<IActionResult> Refresh([FromBody] RefreshTokenRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.RefreshToken)) return BadRequest(new { message = "Refresh token is required" });

            var user = await _userManager.Users.FirstOrDefaultAsync(u => u.RefreshToken == request.RefreshToken);
            if (user is null || user.RefreshTokenExpiryTime is null || user.RefreshTokenExpiryTime <= DateTime.UtcNow)
            {
                return Unauthorized(new { message = "Refresh token is invalid or expired" });
            }

            // Rotate the refresh token on every use so a stolen/replayed token can only be used once.
            user.RefreshToken = Guid.NewGuid().ToString("N");
            user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);
            await _userManager.UpdateAsync(user);

            var token = GenerateJwtToken(user);
            return Ok(new { token, refreshToken = user.RefreshToken, role = user.Role, organizationId = user.OrganizationId });
        }

        [HttpPost("logout")]
        public IActionResult Logout()
        {
            // Remove the cookie
            if (Request.Cookies.ContainsKey("jwt"))
            {
                var cookieOptions = CreateCookieOptions(expires: false);
                Response.Cookies.Append("jwt", string.Empty, cookieOptions);
            }

            return Ok(new { message = "Logged out" });
        }

        [HttpGet("me")]
        public async Task<IActionResult> Me()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return Unauthorized();

            return Ok(new
            {
                id = user.Id,
                email = user.Email,
                role = user.Role,
                organizationId = user.OrganizationId,
                displayName = user.DisplayName,
                profileImageUrl = user.ProfileImageUrl
            });
        }

        private CookieOptions CreateCookieOptions(bool expires)
        {
            return new CookieOptions
            {
                HttpOnly = true,
                Secure = !_environment.IsDevelopment(),
                SameSite = SameSiteMode.Lax,
                Expires = expires ? DateTime.UtcNow.AddHours(2) : DateTime.UtcNow.AddDays(-1),
                Path = "/"
            };
        }

        private string GenerateJwtToken(ApplicationUser user)
        {
            var claims = new List<Claim>
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id),
                new Claim(JwtRegisteredClaimNames.Email, user.Email ?? ""),
                new Claim(ClaimTypes.Role, user.Role),
                new Claim("organization_id", user.OrganizationId?.ToString() ?? "0"),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            var jwtKey = _configuration["Jwt:Key"];
            if (string.IsNullOrWhiteSpace(jwtKey))
            {
                throw new InvalidOperationException("Jwt:Key is not configured.");
            }
            var jwtIssuer = _configuration["Jwt:Issuer"] ?? "ITSM.Portal.API";
            var jwtAudience = _configuration["Jwt:Audience"] ?? "ITSM.Portal.Client";

            var key = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwtKey)
            );

            var credentials = new SigningCredentials(
                key,
                SecurityAlgorithms.HmacSha256
            );

            var token = new JwtSecurityToken(
                issuer: jwtIssuer,
                audience: jwtAudience,
                claims: claims,
                expires: DateTime.UtcNow.AddHours(2),
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}