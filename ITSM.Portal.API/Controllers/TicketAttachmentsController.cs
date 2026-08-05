using ITSM.Portal.API.Data;
using ITSM.Portal.API.DTOs;
using ITSM.Portal.API.Models;
using ITSM.Portal.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ITSM.Portal.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class TicketAttachmentsController : ControllerBase
    {
        private const long MaxFileSizeBytes = 10 * 1024 * 1024; // 10 MB

        private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
        {
            ".png", ".jpg", ".jpeg", ".gif", ".webp",
            ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv", ".txt", ".log", ".zip"
        };

        private static readonly HashSet<string> AllowedContentTypes = new(StringComparer.OrdinalIgnoreCase)
        {
            "image/png", "image/jpeg", "image/gif", "image/webp",
            "application/pdf",
            "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "text/csv", "text/plain",
            "application/zip", "application/x-zip-compressed",
            "application/octet-stream"
        };

        private readonly ApplicationDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly TenantContextService _tenantContext;
        private readonly IWebHostEnvironment _environment;
        private readonly AuditLogService _auditLog;

        public TicketAttachmentsController(
            ApplicationDbContext context,
            UserManager<ApplicationUser> userManager,
            TenantContextService tenantContext,
            IWebHostEnvironment environment,
            AuditLogService auditLog)
        {
            _context = context;
            _userManager = userManager;
            _tenantContext = tenantContext;
            _environment = environment;
            _auditLog = auditLog;
        }

        private string GetStorageRoot(int ticketId)
        {
            var root = Path.Combine(_environment.ContentRootPath, "Storage", "ticket-attachments", ticketId.ToString());
            Directory.CreateDirectory(root);
            return root;
        }

        // GET: api/ticketattachments?ticketId=5
        [HttpGet]
        public async Task<IActionResult> GetAttachments([FromQuery] int ticketId)
        {
            if (ticketId <= 0) return BadRequest();

            var ticketExists = await _tenantContext.ApplyOrganizationFilter(_context.Tickets).AnyAsync(t => t.Id == ticketId);
            if (!ticketExists) return NotFound();

            var attachments = await _context.TicketAttachments
                .Where(a => a.TicketId == ticketId)
                .OrderByDescending(a => a.UploadedDate)
                .Select(a => new TicketAttachmentDto
                {
                    Id = a.Id,
                    TicketId = a.TicketId,
                    FileName = a.FileName,
                    ContentType = a.ContentType,
                    FileSizeBytes = a.FileSizeBytes,
                    UploadedBy = a.UploadedBy,
                    UploadedDate = a.UploadedDate
                })
                .ToListAsync();

            return Ok(attachments);
        }

        // POST: api/ticketattachments
        [HttpPost]
        [Authorize(Roles = "Admin,Technician,User")]
        [RequestSizeLimit(MaxFileSizeBytes)]
        public async Task<IActionResult> UploadAttachment([FromForm] int ticketId, IFormFile file)
        {
            if (ticketId <= 0) return BadRequest(new { message = "TicketId is required" });
            if (file == null || file.Length == 0) return BadRequest(new { message = "No file was uploaded." });
            if (file.Length > MaxFileSizeBytes) return BadRequest(new { message = "File is too large. Maximum size is 10MB." });

            var extension = Path.GetExtension(file.FileName);
            if (string.IsNullOrWhiteSpace(extension) || !AllowedExtensions.Contains(extension))
            {
                return BadRequest(new { message = "Unsupported file type." });
            }

            if (!AllowedContentTypes.Contains(file.ContentType))
            {
                return BadRequest(new { message = "Unsupported file type." });
            }

            var ticket = await _tenantContext.ApplyOrganizationFilter(_context.Tickets).FirstOrDefaultAsync(t => t.Id == ticketId);
            if (ticket == null) return NotFound();

            var user = await _userManager.GetUserAsync(User);

            var safeFileName = Path.GetFileName(file.FileName);
            var storedFileName = $"{Guid.NewGuid():N}{extension}";
            var storageRoot = GetStorageRoot(ticketId);
            var filePath = Path.Combine(storageRoot, storedFileName);

            await using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var attachment = new TicketAttachment
            {
                TicketId = ticketId,
                FileName = safeFileName,
                StoredFileName = storedFileName,
                ContentType = file.ContentType,
                FileSizeBytes = file.Length,
                UploadedByUserId = user?.Id,
                UploadedBy = user?.Email ?? "System",
                UploadedDate = DateTime.UtcNow
            };

            _context.TicketAttachments.Add(attachment);
            await _context.SaveChangesAsync();

            try
            {
                var history = new TicketHistory
                {
                    TicketId = ticketId,
                    Action = "AttachmentAdded",
                    Details = $"Attachment '{safeFileName}' uploaded",
                    CreatedBy = attachment.UploadedBy,
                    CreatedDate = DateTime.UtcNow
                };
                _context.TicketHistories.Add(history);
                await _context.SaveChangesAsync();
            }
            catch
            {
            }

            await _auditLog.WriteAsync("TicketAttachmentUploaded", $"Attachment '{safeFileName}' uploaded to ticket #{ticketId}", "Ticket", ticketId);

            var dto = new TicketAttachmentDto
            {
                Id = attachment.Id,
                TicketId = attachment.TicketId,
                FileName = attachment.FileName,
                ContentType = attachment.ContentType,
                FileSizeBytes = attachment.FileSizeBytes,
                UploadedBy = attachment.UploadedBy,
                UploadedDate = attachment.UploadedDate
            };

            return Ok(dto);
        }

        // GET: api/ticketattachments/5/download
        [HttpGet("{id}/download")]
        public async Task<IActionResult> DownloadAttachment(int id)
        {
            var attachment = await _context.TicketAttachments.FirstOrDefaultAsync(a => a.Id == id);
            if (attachment == null) return NotFound();

            var ticketAccessible = await _tenantContext.ApplyOrganizationFilter(_context.Tickets).AnyAsync(t => t.Id == attachment.TicketId);
            if (!ticketAccessible) return NotFound();

            var filePath = Path.Combine(GetStorageRoot(attachment.TicketId), attachment.StoredFileName);
            if (!System.IO.File.Exists(filePath)) return NotFound();

            var stream = new FileStream(filePath, FileMode.Open, FileAccess.Read);
            Response.Headers.Append("Content-Disposition", $"attachment; filename=\"{attachment.FileName}\"");
            return File(stream, "application/octet-stream", attachment.FileName);
        }

        // DELETE: api/ticketattachments/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteAttachment(int id)
        {
            var attachment = await _context.TicketAttachments.FirstOrDefaultAsync(a => a.Id == id);
            if (attachment == null) return NotFound();

            var ticketAccessible = await _tenantContext.ApplyOrganizationFilter(_context.Tickets).AnyAsync(t => t.Id == attachment.TicketId);
            if (!ticketAccessible) return NotFound();

            var user = await _userManager.GetUserAsync(User);
            var isOwner = user != null && attachment.UploadedByUserId == user.Id;
            var isPrivileged = User.IsInRole("Admin") || User.IsInRole("Technician");
            if (!isOwner && !isPrivileged) return Forbid();

            var filePath = Path.Combine(GetStorageRoot(attachment.TicketId), attachment.StoredFileName);
            _context.TicketAttachments.Remove(attachment);
            await _context.SaveChangesAsync();

            try
            {
                if (System.IO.File.Exists(filePath)) System.IO.File.Delete(filePath);
            }
            catch
            {
            }

            await _auditLog.WriteAsync("TicketAttachmentDeleted", $"Attachment '{attachment.FileName}' deleted from ticket #{attachment.TicketId}", "Ticket", attachment.TicketId);

            return NoContent();
        }
    }
}
