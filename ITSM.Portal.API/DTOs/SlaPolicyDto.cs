namespace ITSM.Portal.API.DTOs
{
    public class SlaPolicyDto
    {
        public string Priority { get; set; } = string.Empty;
        public int ResponseTargetMinutes { get; set; }
        public int ResolutionTargetMinutes { get; set; }
    }

    public class UpdateSlaPolicyRequest
    {
        public int ResponseTargetMinutes { get; set; }
        public int ResolutionTargetMinutes { get; set; }
    }
}
