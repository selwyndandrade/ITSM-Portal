using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ITSM.Portal.API.Migrations
{
    /// <inheritdoc />
    public partial class AddTicketUpdateFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Conditionally rename columns only if the source exists and the target does not.
            migrationBuilder.Sql(@"
IF EXISTS(SELECT 1 FROM sys.columns WHERE Name = 'CreatedBy' AND object_id = OBJECT_ID('dbo.Tickets'))
   AND NOT EXISTS(SELECT 1 FROM sys.columns WHERE Name = 'CreatedByID' AND object_id = OBJECT_ID('dbo.Tickets'))
BEGIN
   EXEC sp_rename 'dbo.Tickets.CreatedBy', 'CreatedByID', 'COLUMN';
END");

            migrationBuilder.Sql(@"
IF EXISTS(SELECT 1 FROM sys.columns WHERE Name = 'AssignedTo' AND object_id = OBJECT_ID('dbo.Tickets'))
   AND NOT EXISTS(SELECT 1 FROM sys.columns WHERE Name = 'AssignedToID' AND object_id = OBJECT_ID('dbo.Tickets'))
BEGIN
   EXEC sp_rename 'dbo.Tickets.AssignedTo', 'AssignedToID', 'COLUMN';
END");

            // Ensure the CreatedByID and AssignedToID columns are nullable nvarchar(max) if they exist.
            migrationBuilder.Sql(@"
IF EXISTS(SELECT 1 FROM sys.columns WHERE Name = 'CreatedByID' AND object_id = OBJECT_ID('dbo.Tickets'))
BEGIN
   ALTER TABLE dbo.Tickets ALTER COLUMN CreatedByID nvarchar(max) NULL;
END");

            migrationBuilder.Sql(@"
IF EXISTS(SELECT 1 FROM sys.columns WHERE Name = 'AssignedToID' AND object_id = OBJECT_ID('dbo.Tickets'))
BEGIN
   ALTER TABLE dbo.Tickets ALTER COLUMN AssignedToID nvarchar(max) NULL;
END");

            // Add UpdatedBy and UpdatedDate only if they do not already exist.
            migrationBuilder.Sql(@"
IF NOT EXISTS(SELECT 1 FROM sys.columns WHERE Name = 'UpdatedBy' AND object_id = OBJECT_ID('dbo.Tickets'))
BEGIN
   ALTER TABLE dbo.Tickets ADD UpdatedBy nvarchar(max) NULL;
END");

            migrationBuilder.Sql(@"
IF NOT EXISTS(SELECT 1 FROM sys.columns WHERE Name = 'UpdatedDate' AND object_id = OBJECT_ID('dbo.Tickets'))
BEGIN
   ALTER TABLE dbo.Tickets ADD UpdatedDate datetime2 NULL;
END");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Drop UpdatedBy/UpdatedDate only if they exist
            migrationBuilder.Sql(@"IF EXISTS(SELECT 1 FROM sys.columns WHERE Name = 'UpdatedBy' AND object_id = OBJECT_ID('dbo.Tickets'))
BEGIN
   ALTER TABLE dbo.Tickets DROP COLUMN UpdatedBy;
END");

            migrationBuilder.Sql(@"IF EXISTS(SELECT 1 FROM sys.columns WHERE Name = 'UpdatedDate' AND object_id = OBJECT_ID('dbo.Tickets'))
BEGIN
   ALTER TABLE dbo.Tickets DROP COLUMN UpdatedDate;
END");

            // Conditionally rename CreatedByID/AssignedToID back to CreatedBy/AssignedTo only if targets don't already exist
            migrationBuilder.Sql(@"
IF EXISTS(SELECT 1 FROM sys.columns WHERE Name = 'CreatedByID' AND object_id = OBJECT_ID('dbo.Tickets'))
   AND NOT EXISTS(SELECT 1 FROM sys.columns WHERE Name = 'CreatedBy' AND object_id = OBJECT_ID('dbo.Tickets'))
BEGIN
   EXEC sp_rename 'dbo.Tickets.CreatedByID', 'CreatedBy', 'COLUMN';
END");

            migrationBuilder.Sql(@"
IF EXISTS(SELECT 1 FROM sys.columns WHERE Name = 'AssignedToID' AND object_id = OBJECT_ID('dbo.Tickets'))
   AND NOT EXISTS(SELECT 1 FROM sys.columns WHERE Name = 'AssignedTo' AND object_id = OBJECT_ID('dbo.Tickets'))
BEGIN
   EXEC sp_rename 'dbo.Tickets.AssignedToID', 'AssignedTo', 'COLUMN';
END");
        }
    }
}
