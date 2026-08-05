using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using ITSM.Portal.API.DTOs;
using Microsoft.Extensions.Options;
namespace ITSM.Portal.API.Services
{
    public class OpenAIProvider : IAIProvider
    {
        private readonly HttpClient _client; private readonly AISettings _settings;
        public OpenAIProvider(HttpClient client, IOptions<AISettings> settings) { _client = client; _settings = settings.Value; }
        public async Task<string> GenerateResponseAsync(string message, IReadOnlyList<KnowledgeArticleDTO> articles, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(_settings.ApiKey)) return Fallback(articles);

            var endpoint = BuildEndpoint();
            var payload = BuildPayload(message);
            using var request = new HttpRequestMessage(HttpMethod.Post, endpoint) { Content = new StringContent(payload, Encoding.UTF8, "application/json") };
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _settings.ApiKey);

            try
            {
                using var response = await _client.SendAsync(request, cancellationToken);
                if (!response.IsSuccessStatusCode)
                {
                    return Fallback(articles);
                }

                using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync(cancellationToken));
                return json.RootElement.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString() ?? Fallback(articles);
            }
            catch (HttpRequestException) { return Fallback(articles); }
            catch (Exception) { return Fallback(articles); }
        }

        private string BuildEndpoint()
        {
            if (!string.IsNullOrWhiteSpace(_settings.Endpoint) && !string.IsNullOrWhiteSpace(_settings.DeploymentName))
            {
                var baseUri = _settings.Endpoint.TrimEnd('/');
                return $"{baseUri}/openai/deployments/{_settings.DeploymentName}/chat/completions?api-version={_settings.ApiVersion}";
            }

            return "https://api.openai.com/v1/chat/completions";
        }

        private static readonly string[] AllowedCategories = { "Network", "Hardware", "Access", "Software", "General" };
        private static readonly string[] AllowedPriorities = { "Low", "Medium", "High", "Critical" };

        private string BuildPayload(string message)
        {
            var model = !string.IsNullOrWhiteSpace(_settings.Model)
                ? _settings.Model
                : !string.IsNullOrWhiteSpace(_settings.DeploymentName)
                    ? _settings.DeploymentName
                    : "gpt-4o-mini";

            return JsonSerializer.Serialize(new
            {
                model,
                messages = new[]
                {
                    new { role = "system", content = "You are an enterprise IT support technician. Give concise safe troubleshooting steps." },
                    new { role = "user", content = message }
                }
            });
        }

        public async Task<AITicketAnalysisResult?> AnalyzeTicketAsync(string issueText, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(_settings.ApiKey) || string.IsNullOrWhiteSpace(issueText)) return null;

            var endpoint = BuildEndpoint();
            var payload = BuildAnalysisPayload(issueText);
            using var request = new HttpRequestMessage(HttpMethod.Post, endpoint) { Content = new StringContent(payload, Encoding.UTF8, "application/json") };
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _settings.ApiKey);

            try
            {
                using var response = await _client.SendAsync(request, cancellationToken);
                if (!response.IsSuccessStatusCode) return null;

                using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync(cancellationToken));
                var content = json.RootElement.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString();
                return ParseAnalysis(content);
            }
            catch (HttpRequestException) { return null; }
            catch (Exception) { return null; }
        }

        private string BuildAnalysisPayload(string issueText)
        {
            var model = !string.IsNullOrWhiteSpace(_settings.Model)
                ? _settings.Model
                : !string.IsNullOrWhiteSpace(_settings.DeploymentName)
                    ? _settings.DeploymentName
                    : "gpt-4o-mini";

            var systemPrompt = "You are an IT service desk triage assistant. Analyze the reported issue and respond with ONLY a single JSON object " +
                "(no markdown, no commentary) with these exact keys: \"category\" (one of: Network, Hardware, Access, Software, General), " +
                "\"priority\" (one of: Low, Medium, High, Critical), \"title\" (a short ticket title under 120 characters), " +
                "\"description\" (a clear 1-3 sentence ticket description for a technician), " +
                "\"suggestedAssignmentGroup\" (the support team best suited to handle it).";

            return JsonSerializer.Serialize(new
            {
                model,
                messages = new[]
                {
                    new { role = "system", content = systemPrompt },
                    new { role = "user", content = issueText }
                },
                temperature = 0.2
            });
        }

        private static AITicketAnalysisResult? ParseAnalysis(string? content)
        {
            if (string.IsNullOrWhiteSpace(content)) return null;

            var start = content.IndexOf('{');
            var end = content.LastIndexOf('}');
            if (start < 0 || end <= start) return null;

            try
            {
                using var doc = JsonDocument.Parse(content[start..(end + 1)]);
                var root = doc.RootElement;

                string? ReadString(string propertyName) =>
                    root.TryGetProperty(propertyName, out var value) && value.ValueKind == JsonValueKind.String
                        ? value.GetString()
                        : null;

                var category = ReadString("category");
                var priority = ReadString("priority");

                return new AITicketAnalysisResult
                {
                    Category = AllowedCategories.FirstOrDefault(c => string.Equals(c, category, StringComparison.OrdinalIgnoreCase)),
                    Priority = AllowedPriorities.FirstOrDefault(p => string.Equals(p, priority, StringComparison.OrdinalIgnoreCase)),
                    Title = ReadString("title"),
                    Description = ReadString("description"),
                    SuggestedAssignmentGroup = ReadString("suggestedAssignmentGroup")
                };
            }
            catch (JsonException)
            {
                return null;
            }
        }

        internal static string Fallback(IReadOnlyList<KnowledgeArticleDTO> articles) => articles.Count > 0 ? "Review the recommended knowledge article steps first. If the issue continues after those steps, create a ticket for the support team." : "Check connections, restart the affected device or application, and confirm any recent changes. If the issue continues, create a ticket for the support team.";
    }
}

