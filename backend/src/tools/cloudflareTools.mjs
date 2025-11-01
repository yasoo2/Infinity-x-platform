import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

/**
 * Cloudflare Tools for JOE
 * Provides Cloudflare operations: Pages deploy, DNS, Analytics
 */

class CloudflareTools {
  constructor(apiToken, accountId) {
    this.apiToken = apiToken || process.env.CLOUDFLARE_API_TOKEN;
    this.accountId = accountId || process.env.CLOUDFLARE_ACCOUNT_ID;
    this.baseURL = 'https://api.cloudflare.com/client/v4';
  }

  /**
   * Get headers
   */
  getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * List Pages projects
   */
  async listPagesProjects() {
    try {
      const response = await axios.get(
        `${this.baseURL}/accounts/${this.accountId}/pages/projects`,
        { headers: this.getHeaders() }
      );

      console.log(`✅ Found ${response.data.result.length} Pages projects`);
      return {
        success: true,
        projects: response.data.result
      };
    } catch (error) {
      console.error('❌ List Pages projects failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get Pages project
   */
  async getPagesProject(projectName) {
    try {
      const response = await axios.get(
        `${this.baseURL}/accounts/${this.accountId}/pages/projects/${projectName}`,
        { headers: this.getHeaders() }
      );

      console.log(`✅ Got project ${projectName}`);
      return {
        success: true,
        project: response.data.result
      };
    } catch (error) {
      console.error('❌ Get Pages project failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * List deployments
   */
  async listDeployments(projectName) {
    try {
      const response = await axios.get(
        `${this.baseURL}/accounts/${this.accountId}/pages/projects/${projectName}/deployments`,
        { headers: this.getHeaders() }
      );

      console.log(`✅ Found ${response.data.result.length} deployments`);
      return {
        success: true,
        deployments: response.data.result
      };
    } catch (error) {
      console.error('❌ List deployments failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get deployment
   */
  async getDeployment(projectName, deploymentId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/accounts/${this.accountId}/pages/projects/${projectName}/deployments/${deploymentId}`,
        { headers: this.getHeaders() }
      );

      console.log(`✅ Got deployment ${deploymentId}`);
      return {
        success: true,
        deployment: response.data.result
      };
    } catch (error) {
      console.error('❌ Get deployment failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Trigger deployment (via GitHub webhook)
   */
  async triggerDeployment(projectName) {
    try {
      // Note: Cloudflare Pages deploys automatically from GitHub
      // This method gets the latest deployment status
      const deploymentsResult = await this.listDeployments(projectName);
      
      if (!deploymentsResult.success) {
        return deploymentsResult;
      }

      const latestDeployment = deploymentsResult.deployments[0];

      console.log(`✅ Latest deployment: ${latestDeployment.id}`);
      return {
        success: true,
        deployment: latestDeployment,
        message: 'Cloudflare Pages deploys automatically from GitHub'
      };
    } catch (error) {
      console.error('❌ Trigger deployment failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * List zones (domains)
   */
  async listZones() {
    try {
      const response = await axios.get(
        `${this.baseURL}/zones`,
        { headers: this.getHeaders() }
      );

      console.log(`✅ Found ${response.data.result.length} zones`);
      return {
        success: true,
        zones: response.data.result
      };
    } catch (error) {
      console.error('❌ List zones failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get DNS records
   */
  async getDNSRecords(zoneId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/zones/${zoneId}/dns_records`,
        { headers: this.getHeaders() }
      );

      console.log(`✅ Found ${response.data.result.length} DNS records`);
      return {
        success: true,
        records: response.data.result
      };
    } catch (error) {
      console.error('❌ Get DNS records failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create DNS record
   */
  async createDNSRecord(zoneId, record) {
    try {
      const response = await axios.post(
        `${this.baseURL}/zones/${zoneId}/dns_records`,
        record,
        { headers: this.getHeaders() }
      );

      console.log(`✅ Created DNS record: ${record.name}`);
      return {
        success: true,
        record: response.data.result
      };
    } catch (error) {
      console.error('❌ Create DNS record failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update DNS record
   */
  async updateDNSRecord(zoneId, recordId, record) {
    try {
      const response = await axios.put(
        `${this.baseURL}/zones/${zoneId}/dns_records/${recordId}`,
        record,
        { headers: this.getHeaders() }
      );

      console.log(`✅ Updated DNS record: ${recordId}`);
      return {
        success: true,
        record: response.data.result
      };
    } catch (error) {
      console.error('❌ Update DNS record failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete DNS record
   */
  async deleteDNSRecord(zoneId, recordId) {
    try {
      await axios.delete(
        `${this.baseURL}/zones/${zoneId}/dns_records/${recordId}`,
        { headers: this.getHeaders() }
      );

      console.log(`✅ Deleted DNS record: ${recordId}`);
      return {
        success: true
      };
    } catch (error) {
      console.error('❌ Delete DNS record failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get analytics
   */
  async getAnalytics(zoneId, since = '-1440') {
    try {
      const response = await axios.get(
        `${this.baseURL}/zones/${zoneId}/analytics/dashboard`,
        {
          headers: this.getHeaders(),
          params: { since }
        }
      );

      console.log('✅ Got analytics');
      return {
        success: true,
        analytics: response.data.result
      };
    } catch (error) {
      console.error('❌ Get analytics failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Purge cache
   */
  async purgeCache(zoneId, files = null) {
    try {
      const data = files ? { files } : { purge_everything: true };
      
      const response = await axios.post(
        `${this.baseURL}/zones/${zoneId}/purge_cache`,
        data,
        { headers: this.getHeaders() }
      );

      console.log('✅ Cache purged');
      return {
        success: true,
        result: response.data.result
      };
    } catch (error) {
      console.error('❌ Purge cache failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get zone settings
   */
  async getZoneSettings(zoneId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/zones/${zoneId}/settings`,
        { headers: this.getHeaders() }
      );

      console.log('✅ Got zone settings');
      return {
        success: true,
        settings: response.data.result
      };
    } catch (error) {
      console.error('❌ Get zone settings failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update zone setting
   */
  async updateZoneSetting(zoneId, settingId, value) {
    try {
      const response = await axios.patch(
        `${this.baseURL}/zones/${zoneId}/settings/${settingId}`,
        { value },
        { headers: this.getHeaders() }
      );

      console.log(`✅ Updated setting: ${settingId}`);
      return {
        success: true,
        setting: response.data.result
      };
    } catch (error) {
      console.error('❌ Update zone setting failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const zonesResult = await this.listZones();
      if (!zonesResult.success) {
        return {
          healthy: false,
          error: zonesResult.error
        };
      }

      return {
        healthy: true,
        zones: zonesResult.zones.length,
        message: 'Cloudflare API is accessible'
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message
      };
    }
  }
}

// Export singleton
export const cloudflareTools = new CloudflareTools(
  process.env.CLOUDFLARE_API_TOKEN,
  process.env.CLOUDFLARE_ACCOUNT_ID
);

export default CloudflareTools;
