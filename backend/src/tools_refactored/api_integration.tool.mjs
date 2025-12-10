/**
 * 🔗 APIIntegrationTool - Enables JOE to discover, understand, and integrate with external APIs.
 * This tool is essential for connecting JOE's projects to the outside world.
 */
class APIIntegrationTool {
    constructor(dependencies) {
        this.dependencies = dependencies;
        this._initializeMetadata();
    }

    _initializeMetadata() {
        this.searchAPI.metadata = {
            name: "searchAPI",
            description: "Searches for relevant external APIs based on a specific function or service (e.g., 'weather data', 'payment processing', 'stock quotes').",
            parameters: {
                type: "object",
                properties: {
                    query: { type: "string", description: "The function or service the API should provide (e.g., 'real-time stock market data')." }
                },
                required: ["query"]
            }
        };

        this.analyzeAPIDocumentation.metadata = {
            name: "analyzeAPIDocumentation",
            description: "Analyzes the documentation (URL or provided text) of a specific API to understand its endpoints, required parameters, and authentication methods.",
            parameters: {
                type: "object",
                properties: {
                    documentationSource: { type: "string", description: "The URL to the API documentation or a brief text summary of the API." },
                    targetFunction: { type: "string", description: "The specific function or endpoint to analyze (e.g., 'Get user profile', 'Process payment')." }
                },
                required: ["documentationSource", "targetFunction"]
            }
        };

        this.generateIntegrationCode.metadata = {
            name: "generateIntegrationCode",
            description: "Generates the necessary code (e.g., Node.js/JavaScript) to call a specific API endpoint based on the analyzed documentation.",
            parameters: {
                type: "object",
                properties: {
                    apiName: { type: "string", description: "The name of the API being integrated." },
                    endpointURL: { type: "string", description: "The full URL of the API endpoint to call." },
                    method: { type: "string", enum: ["GET", "POST", "PUT", "DELETE"], description: "The HTTP method to use." },
                    parameters: { type: "string", description: "A JSON string of the parameters to be sent in the request body or query string." },
                    authenticationMethod: { type: "string", description: "The required authentication method (e.g., 'Bearer Token', 'API Key in Header')." },
                    outputFilePath: { type: "string", description: "The absolute path where the generated code file should be saved (e.g., /home/joe/api_client.mjs)." }
                },
                required: ["apiName", "endpointURL", "method", "outputFilePath"]
            }
        };
    }

    async searchAPI({ query }) {
        try {
            const q = String(query || '').trim();
            if (!q) return { success: false, error: 'QUERY_REQUIRED' };
            const ddg = 'https://html.duckduckgo.com/html/';
            const targets = [
                `site:rapidapi.com ${q}`,
                `site:github.com openapi ${q}`,
                `site:swagger.io ${q}`,
                `site:programmableweb.com ${q}`
            ];
            const results = [];
            for (const tq of targets) {
                const { data } = await (await import('axios')).default.get(ddg, { params: { q: tq }, headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 12000 });
                const $ = (await import('cheerio')).load(data);
                $('.result').each((i, el) => {
                    const title = $(el).find('.result__a').text().trim();
                    const snippet = $(el).find('.result__snippet').text().trim();
                    let url = $(el).find('.result__url').attr('href') || '';
                    try {
                        const params = new URLSearchParams(url.substring(url.indexOf('?')));
                        const decoded = decodeURIComponent(params.get('uddg') || url);
                        if (/^https?:\/\//.test(decoded)) results.push({ title, url: decoded, snippet });
                    } catch { /* noop */ }
                });
            }
            const dedup = [];
            const seen = new Set();
            for (const r of results) { if (!seen.has(r.url)) { seen.add(r.url); dedup.push(r); } }
            return { success: true, query: q, items: dedup.slice(0, 10) };
        } catch (error) {
            return { success: false, error: error?.message || String(error) };
        }
    }

    async analyzeAPIDocumentation({ documentationSource, targetFunction }) {
        try {
            const src = String(documentationSource || '').trim();
            const fn = String(targetFunction || '').trim();
            if (!src || !fn) return { success: false, error: 'SOURCE_AND_FUNCTION_REQUIRED' };
            const { data } = await (await import('axios')).default.get(src, { timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0' } });
            const $ = (await import('cheerio')).load(data);
            const text = $('body').text().slice(0, 200000);
            const endpoints = [];
            const re = /(GET|POST|PUT|PATCH|DELETE)\s+\/?[A-Za-z0-9_\-/{}.]+/g;
            let m;
            while ((m = re.exec(text)) !== null) { endpoints.push(m[0]); }
            const related = endpoints.filter(e => new RegExp(fn, 'i').test(e));
            const headers = [];
            if (/bearer/i.test(text)) headers.push('Authorization: Bearer <token>');
            if (/x-api-key/i.test(text)) headers.push('X-API-Key: <key>');
            return {
                success: true,
                targetFunction: fn,
                analysis: {
                    endpoints: endpoints.slice(0, 50),
                    relatedEndpoints: related.slice(0, 10),
                    requiredHeaders: headers,
                }
            };
        } catch (error) {
            return { success: false, error: error?.message || String(error) };
        }
    }

    async generateIntegrationCode({ apiName, endpointURL, method, parameters, authenticationMethod, outputFilePath }) {
        // Placeholder for code generation logic
        const codeSnippet = `
// Using native fetch (Node.js 18+)

async function call${apiName.replace(/\s/g, '')}() {
    const response = await fetch('${endpointURL}', {
        method: '${method}',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': '${authenticationMethod}'
        },
        body: ${method !== 'GET' ? JSON.stringify(parameters) : 'null'}
    });
    return response.json();
}

call${apiName.replace(/\s/g, '')}().then(data => console.log(data));
`;
        await this.dependencies.fs.writeFile(outputFilePath, codeSnippet);
        return {
            success: true,
            message: `Integration code for ${apiName} saved to ${outputFilePath}.`,
            outputFile: outputFilePath
        };
    }
}

export default APIIntegrationTool;
