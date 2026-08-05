using ITSM.Portal.API.Data;
using ITSM.Portal.API.DTOs;
using ITSM.Portal.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ITSM.Portal.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ProfileController : ControllerBase
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IWebHostEnvironment _environment;
        private readonly ApplicationDbContext _context;

        public ProfileController(UserManager<ApplicationUser> userManager, IWebHostEnvironment environment, ApplicationDbContext context)
        {
            _userManager = userManager;
            _environment = environment;
            _context = context;
        }

        private static readonly Dictionary<string, string> AllowedAvatarTypes = new(StringComparer.OrdinalIgnoreCase)
        {
            [".jpg"] = "image/jpeg",
            [".jpeg"] = "image/jpeg",
            [".png"] = "image/png",
            [".webp"] = "image/webp"
        };

        [HttpPost("avatar")]
        public async Task<IActionResult> UploadAvatar(IFormFile file)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(new { message = "No file was uploaded." });
            }

            var extension = Path.GetExtension(file.FileName);
            if (string.IsNullOrWhiteSpace(extension) || !AllowedAvatarTypes.TryGetValue(extension, out var expectedContentType))
            {
                return BadRequest(new { message = "Unsupported image type. Please upload JPG, PNG, or WEBP." });
            }

            if (!string.Equals(file.ContentType, expectedContentType, StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new { message = "Unsupported image type. Please upload JPG, PNG, or WEBP." });
            }

            if (file.Length > 2 * 1024 * 1024)
            {
                return BadRequest(new { message = "Image is too large. Maximum size is 2MB." });
            }

            var user = await _userManager.GetUserAsync(User);
            if (user == null)
            {
                return Unauthorized();
            }

            var profileUser = await _context.Users.Include(u => u.Department).FirstOrDefaultAsync(u => u.Id == user.Id);
            if (profileUser == null)
            {
                return Unauthorized();
            }

            var uploadsRoot = Path.Combine(_environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), "uploads", "profile-images");
            Directory.CreateDirectory(uploadsRoot);

            // Use the validated, normalized extension (not the client-supplied file name) to avoid
            // path traversal or double-extension tricks (e.g. "avatar.jpg.html").
            var fileName = $"{user.Id}_{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
            var filePath = Path.Combine(uploadsRoot, fileName);

            await using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var publicUrl = $"/uploads/profile-images/{fileName}";
            profileUser.ProfileImageUrl = publicUrl;
            var updateResult = await _userManager.UpdateAsync(profileUser);
            if (!updateResult.Succeeded)
            {
                return BadRequest(new { message = "Failed to save profile image.", errors = updateResult.Errors.Select(e => e.Description) });
            }

            return Ok(new { message = "Profile image updated.", profileImageUrl = publicUrl });
        }

        [HttpPut]
        public async Task<IActionResult> UpdateProfile([FromBody] ProfileUpdateRequestDto request)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null)
            {
                return Unauthorized();
            }

            var profileUser = await _context.Users.Include(u => u.Department).FirstOrDefaultAsync(u => u.Id == user.Id);
            if (profileUser == null)
            {
                return Unauthorized();
            }

            if (request.ClearProfileImage)
            {
                profileUser.ProfileImageUrl = null;
            }

            if (request.DisplayName != null)
            {
                profileUser.DisplayName = string.IsNullOrWhiteSpace(request.DisplayName) ? null : request.DisplayName.Trim();
            }

            if (request.Bio != null)
            {
                profileUser.Bio = string.IsNullOrWhiteSpace(request.Bio) ? null : request.Bio.Trim();
            }

            if (request.LinkedInUrl != null)
            {
                profileUser.LinkedInUrl = string.IsNullOrWhiteSpace(request.LinkedInUrl) ? null : request.LinkedInUrl.Trim();
            }

            if (request.GitHubUrl != null)
            {
                profileUser.GitHubUrl = string.IsNullOrWhiteSpace(request.GitHubUrl) ? null : request.GitHubUrl.Trim();
            }

            if (request.PortfolioUrl != null)
            {
                profileUser.PortfolioUrl = string.IsNullOrWhiteSpace(request.PortfolioUrl) ? null : request.PortfolioUrl.Trim();
            }

            var result = await _userManager.UpdateAsync(profileUser);
            if (!result.Succeeded)
            {
                return BadRequest(new { message = "Failed to update profile.", errors = result.Errors.Select(e => e.Description) });
            }

            return Ok(new
            {
                id = profileUser.Id,
                email = profileUser.Email,
                role = profileUser.Role,
                displayName = profileUser.DisplayName,
                bio = profileUser.Bio,
                linkedInUrl = profileUser.LinkedInUrl,
                gitHubUrl = profileUser.GitHubUrl,
                portfolioUrl = profileUser.PortfolioUrl,
                profileImageUrl = profileUser.ProfileImageUrl,
                departmentName = profileUser.Department?.Name
            });
        }

        [HttpGet]
        public async Task<IActionResult> GetProfile()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null)
            {
                return Unauthorized();
            }

            var profileUser = await _context.Users.Include(u => u.Department).FirstOrDefaultAsync(u => u.Id == user.Id);
            if (profileUser == null)
            {
                return Unauthorized();
            }

            return Ok(new
            {
                id = profileUser.Id,
                email = profileUser.Email,
                role = profileUser.Role,
                displayName = profileUser.DisplayName,
                bio = profileUser.Bio,
                linkedInUrl = profileUser.LinkedInUrl,
                gitHubUrl = profileUser.GitHubUrl,
                portfolioUrl = profileUser.PortfolioUrl,
                profileImageUrl = profileUser.ProfileImageUrl,
                departmentName = profileUser.Department?.Name
            });
        }
    }
}
