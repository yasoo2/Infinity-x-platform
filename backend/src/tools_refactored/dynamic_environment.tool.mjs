// Using native fetch (available in Node.js 18+)
// Removed unused path helpers

/**
 * ⚙️ DynamicEnvironmentTool - Enables JOE to interact with live external APIs and manage environment secrets.
 * This tool is essential for testing and configuration management.
 */
class DynamicEnvironmentTool {
    constructor(dependencies) {
        this.dependencies = dependencies;
        this._initializeMetadata();
    }

    _initializeMetadata() {
        this.queryLiveAPI.metadata = {
            name: "queryLiveAPI",
            description: "Executes a live HTTP request (GET or POST) to an external API using a specified URL and optional headers/body. This is used to test API connectivity, validate API keys, or fetch live data.",
            parameters: {
                type: "object",
                properties: {
                    url: { type: "string", description: "The full URL of the API endpoint to query." },
                    method: { type: "string", enum: ["GET", "POST"], description: "The HTTP method to use (GET or POST)." },
                    headers: { type: "string", description: "A JSON string of HTTP headers to include (e.g., '{\"Authorization\": \"Bearer <token>\", \"Content-Type\": \"application/json\"}')." },
                    body: { type: "string", description: "A JSON string of the request body for POST requests." }
                },
                required: ["url", "method"]
            }
        };
    }

    async queryLiveAPI({ url, method, headers, body }) {
        try {
            const parsedHeaders = headers ? JSON.parse(headers) : {};
            const options = {
                method: method,
                headers: parsedHeaders,
            };

            if (method === 'POST' && body) {
                options.body = body;
            }

            const response = await fetch(url, options);
            const responseText = await response.text();

            let responseBody;
            try {
                responseBody = JSON.parse(responseText);
            } catch (e) {
                responseBody = responseText;
            }

            return {
                success: response.ok,
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries()),
                body: responseBody,
                summary: `API Query to ${url} completed with status ${response.status}. Success: ${response.ok}.`
            };

        } catch (error) {
            return {
                success: false,
                error: `Failed to execute API query: ${error.message}`,
                summary: `Critical failure during API query: ${error.message}`
            };
        }
    }
}

export default DynamicEnvironmentTool;
