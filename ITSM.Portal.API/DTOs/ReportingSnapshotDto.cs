namespace ITSM.Portal.API.DTOs
{
    public class ReportingSnapshotDto
    {
        public int TotalTickets { get; set; }
        public int OpenTickets { get; set; }
        public int ResolvedTickets { get; set; }
        public double AvgResolutionHours { get; set; }
        public double SlaCompliance { get; set; }
        public int SlaBreaches { get; set; }
        public List<TrendPointDto> VolumeTrend { get; set; } = new();
        public List<MetricBucketDto> PriorityBreakdown { get; set; } = new();
        public List<MetricBucketDto> DepartmentBreakdown { get; set; } = new();
        public List<MetricBucketDto> TechnicianWorkload { get; set; } = new();
        public List<MetricBucketDto> StatusBreakdown { get; set; } = new();
    }

    public class TrendPointDto
    {
        public string Label { get; set; } = string.Empty;
        public int Count { get; set; }
    }

    public class MetricBucketDto
    {
        public string Label { get; set; } = string.Empty;
        public int Count { get; set; }
    }
}
