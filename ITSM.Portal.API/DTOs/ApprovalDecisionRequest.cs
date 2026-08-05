namespace ITSM.Portal.API.DTOs
{
    // Request body for approving/rejecting a service request. Deliberately does not include
    // DecisionByUserId - who made the decision is always derived from the authenticated caller.
    public class ApprovalDecisionRequest
    {
        public string? Comments { get; set; }
    }
}
