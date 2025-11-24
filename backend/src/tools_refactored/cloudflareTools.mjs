import axios from 'axios';

/**
 * Cloudflare Tools - Refactored for Stability and Dynamic Initialization
 * This module defines a CloudflareTools class and exports a factory function 
 * to properly instantiate it within the application lifecycle.
 */

class CloudflareTools {
  constructor(dependencies) {
    const { apiToken, accountId } = dependencies.cloudflare ?? {};
    this.apiToken = apiToken || process.env.CLOUDFLARE_API_TOKEN;
    this.accountId = accountId || process.env.CLOUDFLARE_ACCOUNT_ID;

    if (!this.apiToken || !this.accountId) {
        // This won't block server start, but tools will fail.
        console.warn('⚠️ CloudflareTools: API Token or Account ID is missing. Tools will be unavailable.');
    }
    this.baseURL = 'https://api.cloudflare.com/client/v4';
  }

  getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json'
    };
  }

  async listPagesProjects() {
    if (!this.apiToken) return { success: false, error: 'Cloudflare API token not configured.' };
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

  // Add other methods here, ensuring they check for apiToken and handle errors.
}

// --- Metadata for dynamic tool registration ---

CloudflareTools.prototype.listPagesProjects.metadata = {
    name: "listCloudflarePages",
    description: "Lists all Cloudflare Pages projects for the configured account.",
    parameters: { type: "object", properties: {} }
};


/**
 * Factory function for ToolManager.
 * This default export is what the ToolManager will use to create the tool.
 */
export default CloudflareTools;
