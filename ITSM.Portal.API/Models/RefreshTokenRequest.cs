using System.ComponentModel.DataAnnotations;

namespace ITSM.Portal.API.Models
{
    public class RefreshTokenRequest
    {
        [Required]
        public string RefreshToken { get; set; } = string.Empty;
    }
}
