using Microsoft.AspNetCore.Identity;

namespace ITSM.Portal.API.Models
{
    public class ApplicationUser : IdentityUser
    {
        public string Role { get; set; } = "User";
    }
}