import axios from 'axios';

/**
 * Cloudflare Tools - Refactored for Stability and Dynamic Initialization
 * This module defines a CloudflareTools class and exports a factory function 
 * to properly instantiate it within the application lifecycle.
 */

class CloudflareTools {
  constructor(apiToken, accountId) {
    if (!apiToken || !accountId) {
        throw new Error("Cloudflare API Token and Account ID are required.");
    }
    this.apiToken = apiToken;
    this.accountId = accountId;
    this.baseURL = 'https://api.cloudflare.com/client/v4';
  }

  getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json'
    };
  }

  // ... (all other methods like listPagesProjects, getDNSRecords, etc. remain the same)

  async listPagesProjects() {
    try {
      const response = await axios.get(
        `${this.baseURL}/accounts/${this.accountId}/pages/projects`,
        { headers: this.getHeaders() }
      );
      return { success: true, projects: response.data.result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

/**
 * Factory function to create an instance of CloudflareTools.
 * This ensures that the class is instantiated with the correct, resolved environment variables
 * during the server's initialization phase, not at the module load time.
 */
function cloudflareToolsFactory() {
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;

    // Create a new instance of the class
    const cloudflareInstance = new CloudflareTools(apiToken, accountId);

    // The ToolManager expects an object of functions, so we extract them.
    // We also need to ensure 'this' is correctly bound to the instance.
    const tools = {
        listCloudflarePages: cloudflareInstance.listPagesProjects.bind(cloudflareInstance),
        // ... bind other methods that you want to expose as tools
    };

    // Attach metadata to each tool function
    tools.listCloudflarePages.metadata = {
        name: "listCloudflarePages",
        description: "Lists all Cloudflare Pages projects for the configured account.",
        parameters: { type: "object", properties: {} }
    };

    return tools;
}

export default cloudflareToolsFactory;
