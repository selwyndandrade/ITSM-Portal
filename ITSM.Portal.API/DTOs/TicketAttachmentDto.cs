using System;

namespace ITSM.Portal.API.DTOs
{
    public class TicketAttachmentDto
    {
        public int Id { get; set; }

        public int TicketId { get; set; }

        public string FileName { get; set; } = string.Empty;

        public string ContentType { get; set; } = string.Empty;

        public long FileSizeBytes { get; set; }

        public string UploadedBy { get; set; } = string.Empty;

        public DateTime UploadedDate { get; set; }
    }
}
