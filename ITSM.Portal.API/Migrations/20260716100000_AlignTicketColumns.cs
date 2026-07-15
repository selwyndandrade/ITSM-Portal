using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ITSM.Portal.API.Migrations
{
    public partial class AlignTicketColumns : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Ensure CreatedByID exists and populate from any existing source columns
            migrationBuilder.Sql(@"
IF NOT EXISTS(SELECT 1 FROM sys.columns WHERE Name = 'CreatedByID' AND object_id = OBJECT_ID('dbo.Tickets'))
BEGIN
    ALTER TABLE dbo.Tickets ADD CreatedByID nvarchar(max) NULL;
    IF EXISTS(SELECT 1 FROM sys.columns WHERE Name = 'CreatedBy' AND object_id = OBJECT_ID('dbo.Tickets'))
    BEGIN
        UPDATE dbo.Tickets SET CreatedByID = CreatedBy WHERE CreatedByID IS NULL;
    END
    IF EXISTS(SELECT 1 FROM sys.columns WHERE Name = 'CreatedById' AND object_id = OBJECT_ID('dbo.Tickets'))
    BEGIN
        UPDATE dbo.Tickets SET CreatedByID = CONVERT(nvarchar(max), CreatedById) WHERE CreatedByID IS NULL;
    END
END

-- Ensure AssignedToID exists and populate from any existing source columns
IF NOT EXISTS(SELECT 1 FROM sys.columns WHERE Name = 'AssignedToID' AND object_id = OBJECT_ID('dbo.Tickets'))
BEGIN
    ALTER TABLE dbo.Tickets ADD AssignedToID nvarchar(max) NULL;
    IF EXISTS(SELECT 1 FROM sys.columns WHERE Name = 'AssignedTo' AND object_id = OBJECT_ID('dbo.Tickets'))
    BEGIN
        UPDATE dbo.Tickets SET AssignedToID = AssignedTo WHERE AssignedToID IS NULL;
    END
    IF EXISTS(SELECT 1 FROM sys.columns WHERE Name = 'AssignedToId' AND object_id = OBJECT_ID('dbo.Tickets'))
    BEGIN
        UPDATE dbo.Tickets SET AssignedToID = CONVERT(nvarchar(max), AssignedToId) WHERE AssignedToID IS NULL;
    END
END

-- Ensure UpdatedBy / UpdatedDate exist
IF NOT EXISTS(SELECT 1 FROM sys.columns WHERE Name = 'UpdatedBy' AND object_id = OBJECT_ID('dbo.Tickets'))
BEGIN
    ALTER TABLE dbo.Tickets ADD UpdatedBy nvarchar(max) NULL;
END

IF NOT EXISTS(SELECT 1 FROM sys.columns WHERE Name = 'UpdatedDate' AND object_id = OBJECT_ID('dbo.Tickets'))
BEGIN
    ALTER TABLE dbo.Tickets ADD UpdatedDate datetime2 NULL;
END

");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Only remove the update columns added by this corrective migration; avoid dropping CreatedByID/AssignedToID to prevent data loss
            migrationBuilder.Sql(@"
IF EXISTS(SELECT 1 FROM sys.columns WHERE Name = 'UpdatedBy' AND object_id = OBJECT_ID('dbo.Tickets'))
BEGIN
    ALTER TABLE dbo.Tickets DROP COLUMN UpdatedBy;
END

IF EXISTS(SELECT 1 FROM sys.columns WHERE Name = 'UpdatedDate' AND object_id = OBJECT_ID('dbo.Tickets'))
BEGIN
    ALTER TABLE dbo.Tickets DROP COLUMN UpdatedDate;
END
");
        }
    }
}
