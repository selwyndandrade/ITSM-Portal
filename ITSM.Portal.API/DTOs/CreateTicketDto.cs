using System.ComponentModel.DataAnnotations;

namespace ITSM.Portal.API.DTOs
{
    public class CreateTicketDto
    {
        [Required]
        public string Title { get; set; } = string.Empty;


        [Required]
        public string Description { get; set; } = string.Empty;


        public string Priority { get; set; } = "Medium";
    }
}