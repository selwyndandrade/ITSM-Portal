using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ITSM.Portal.API.Migrations
{
    /// <inheritdoc />
    public partial class AddTicketUsers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AssignedTo",
                table: "Tickets");

            migrationBuilder.DropColumn(
                name: "RequestedBy",
                table: "Tickets");

            migrationBuilder.AddColumn<int>(
                name: "AssignedToId",
                table: "Tickets",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CreatedById",
                table: "Tickets",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Tickets_AssignedToId",
                table: "Tickets",
                column: "AssignedToId");

            migrationBuilder.CreateIndex(
                name: "IX_Tickets_CreatedById",
                table: "Tickets",
                column: "CreatedById");

            migrationBuilder.AddForeignKey(
                name: "FK_Tickets_Users_AssignedToId",
                table: "Tickets",
                column: "AssignedToId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Tickets_Users_CreatedById",
                table: "Tickets",
                column: "CreatedById",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Tickets_Users_AssignedToId",
                table: "Tickets");

            migrationBuilder.DropForeignKey(
                name: "FK_Tickets_Users_CreatedById",
                table: "Tickets");

            migrationBuilder.DropIndex(
                name: "IX_Tickets_AssignedToId",
                table: "Tickets");

            migrationBuilder.DropIndex(
                name: "IX_Tickets_CreatedById",
                table: "Tickets");

            migrationBuilder.DropColumn(
                name: "AssignedToId",
                table: "Tickets");

            migrationBuilder.DropColumn(
                name: "CreatedById",
                table: "Tickets");

            migrationBuilder.AddColumn<string>(
                name: "AssignedTo",
                table: "Tickets",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "RequestedBy",
                table: "Tickets",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }
    }
}
