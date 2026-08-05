namespace ITSM.Portal.API.DTOs
{
    public class CreateServiceRequestDto
    {
        public int CatalogItemId { get; set; }

        public string? TicketDescription { get; set; }
    }
}
