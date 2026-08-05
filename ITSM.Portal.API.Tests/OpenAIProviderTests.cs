using System.Net;
using System.Text;
using ITSM.Portal.API.DTOs;
using ITSM.Portal.API.Services;
using Microsoft.Extensions.Options;

namespace ITSM.Portal.API.Tests;

public class OpenAIProviderTests
{
    [Fact]
    public async Task GenerateResponseAsync_UsesAzureOpenAIEndpoint_WhenConfigured()
    {
        var handler = new StubHttpMessageHandler(async request =>
        {
            Assert.Equal("https://example.openai.azure.com/openai/deployments/my-deployment/chat/completions?api-version=2024-02-01", request.RequestUri?.ToString());
            Assert.Equal("Bearer test-key", request.Headers.Authorization?.ToString());
            return await Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("{\"choices\":[{\"message\":{\"content\":\"Azure reply\"}}]}", Encoding.UTF8, "application/json")
            });
        });

        var client = new HttpClient(handler);
        var provider = new OpenAIProvider(client, Options.Create(new AISettings
        {
            Provider = "AzureOpenAI",
            ApiKey = "test-key",
            Endpoint = "https://example.openai.azure.com",
            DeploymentName = "my-deployment",
            ApiVersion = "2024-02-01"
        }));

        var response = await provider.GenerateResponseAsync("hello", new List<KnowledgeArticleDTO>());

        Assert.Equal("Azure reply", response);
    }

    private sealed class StubHttpMessageHandler(Func<HttpRequestMessage, Task<HttpResponseMessage>> handler) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) => handler(request);
    }
}
