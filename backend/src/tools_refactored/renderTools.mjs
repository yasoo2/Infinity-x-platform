import axios from 'axios';

/**
 * Render API Tools for JOE
 * Provides full Render operations: deploy, logs, env vars, status
 */

class RenderTools {
  constructor(apiKey, serviceId) {
    this.apiKey = apiKey || process.env.RENDER_API_KEY;
    this.serviceId = serviceId || process.env.RENDER_SERVICE_ID || 'srv-d3u7steuk2gs73dld20g';
    this.baseURL = 'https://api.render.com/v1';
  }

  /**
   * Get service info
   */
  async getServiceInfo() {
    try {
      const response = await axios.get(
        `${this.baseURL}/services/${this.serviceId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Got service info');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Get service info failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get environment variables
   */
  async getEnvVars() {
    try {
      const response = await axios.get(
        `${this.baseURL}/services/${this.serviceId}/env-vars`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Got environment variables');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Get env vars failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update environment variable
   */
  async updateEnvVar(key, value) {
    try {
      const response = await axios.put(
        `${this.baseURL}/services/${this.serviceId}/env-vars/${key}`,
        { value },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`✅ Updated ${key}`);
      return {
        success: true,
        key,
        value: response.data.value
      };
    } catch (error) {
      console.error(`❌ Update ${key} failed:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get deploys
   */
  async getDeploys(limit = 10) {
    try {
      const response = await axios.get(
        `${this.baseURL}/services/${this.serviceId}/deploys?limit=${limit}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Got deploys');
      return {
        success: true,
        deploys: response.data
      };
    } catch (error) {
      console.error('❌ Get deploys failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Trigger deploy
   */
  async triggerDeploy() {
    try {
      const response = await axios.post(
        `${this.baseURL}/services/${this.serviceId}/deploys`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Deploy triggered');
      return {
        success: true,
        deploy: response.data
      };
    } catch (error) {
      console.error('❌ Trigger deploy failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get logs
   */
  async getLogs(limit = 100) {
    try {
      const response = await axios.get(
        `${this.baseURL}/services/${this.serviceId}/logs?limit=${limit}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Parse logs (they come as NDJSON)
      const logs = response.data
        .trim()
        .split('\n')
        .map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return { message: line };
          }
        });

      console.log(`✅ Got ${logs.length} logs`);
      return {
        success: true,
        logs,
        count: logs.length
      };
    } catch (error) {
      console.error('❌ Get logs failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Search logs for errors
   */
  async searchErrors(limit = 100) {
    try {
      const logsResult = await this.getLogs(limit);
      if (!logsResult.success) {
        return logsResult;
      }

      const errors = logsResult.logs.filter(log => {
        const msg = log.message || '';
        return msg.includes('error') || 
               msg.includes('Error') || 
               msg.includes('ERROR') ||
               msg.includes('❌') ||
               msg.includes('failed');
      });

      console.log(`✅ Found ${errors.length} errors`);
      return {
        success: true,
        errors,
        count: errors.length
      };
    } catch (error) {
      console.error('❌ Search errors failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get deploy status
   */
  async getDeployStatus(deployId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/services/${this.serviceId}/deploys/${deployId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Got deploy status');
      return {
        success: true,
        status: response.data.status,
        deploy: response.data
      };
    } catch (error) {
      console.error('❌ Get deploy status failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Wait for deploy to complete
   */
  async waitForDeploy(deployId, maxWait = 300000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWait) {
      const result = await this.getDeployStatus(deployId);
      
      if (!result.success) {
        return result;
      }

      const status = result.status;
      
      if (status === 'live') {
        console.log('✅ Deploy completed successfully');
        return {
          success: true,
          status: 'live',
          duration: Date.now() - startTime
        };
      } else if (status === 'build_failed' || status === 'failed') {
        console.error('❌ Deploy failed');
        return {
          success: false,
          status,
          error: 'Deploy failed'
        };
      }

      // Wait 10 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 10000));
    }

    return {
      success: false,
      error: 'Deploy timeout'
    };
  }

  /**
   * Complete workflow: Update env → Deploy → Wait
   */
  async updateEnvAndDeploy(envVars) {
    try {
      // 1. Update environment variables
      const updates = [];
      for (const [key, value] of Object.entries(envVars)) {
        const result = await this.updateEnvVar(key, value);
        updates.push({ key, success: result.success });
      }

      // 2. Trigger deploy
      const deployResult = await this.triggerDeploy();
      if (!deployResult.success) {
        return {
          success: false,
          step: 'deploy',
          error: deployResult.error
        };
      }

      const deployId = deployResult.deploy.id;

      // 3. Wait for deploy (optional)
      // const waitResult = await this.waitForDeploy(deployId);

      console.log('✅ Update and deploy workflow complete');
      return {
        success: true,
        updates,
        deployId,
        message: 'Environment updated and deploy triggered'
      };
    } catch (error) {
      console.error('❌ Update and deploy workflow failed:', error.message);
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
      const serviceInfo = await this.getServiceInfo();
      if (!serviceInfo.success) {
        return {
          healthy: false,
          error: serviceInfo.error
        };
      }

      const service = serviceInfo.data;
      
      return {
        healthy: true,
        name: service.name,
        status: service.serviceDetails?.status || 'unknown',
        url: service.serviceDetails?.url
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
export const renderTools = new RenderTools(
  process.env.RENDER_API_KEY,
  process.env.RENDER_SERVICE_ID
);

RenderTools.prototype.getServiceInfo.metadata = {
    name: "getRenderServiceInfo",
    description: "Retrieves detailed information about the Render service, including status and URL.",
    parameters: { type: "object", properties: {} }
};

RenderTools.prototype.getEnvVars.metadata = {
    name: "getRenderEnvVars",
    description: "Retrieves all environment variables for the Render service.",
    parameters: { type: "object", properties: {} }
};

RenderTools.prototype.updateEnvVar.metadata = {
    name: "updateRenderEnvVar",
    description: "Updates a single environment variable for the Render service.",
    parameters: {
        type: "object",
        properties: {
            key: { type: "string", description: "The name of the environment variable." },
            value: { type: "string", description: "The new value for the environment variable." }
        },
        required: ["key", "value"]
    }
};

RenderTools.prototype.triggerDeploy.metadata = {
    name: "triggerRenderDeploy",
    description: "Triggers a new deployment for the Render service.",
    parameters: { type: "object", properties: {} }
};

RenderTools.prototype.getLogs.metadata = {
    name: "getRenderLogs",
    description: "Retrieves the latest logs for the Render service.",
    parameters: {
        type: "object",
        properties: {
            limit: { type: "number", description: "The maximum number of log lines to retrieve (default 100)." }
        }
    }
};

RenderTools.prototype.searchErrors.metadata = {
    name: "searchRenderErrors",
    description: "Searches the latest logs for common error messages.",
    parameters: {
        type: "object",
        properties: {
            limit: { type: "number", description: "The maximum number of log lines to search (default 100)." }
        }
    }
};

RenderTools.prototype.getDeployStatus.metadata = {
    name: "getRenderDeployStatus",
    description: "Retrieves the status of a specific deployment.",
    parameters: {
        type: "object",
        properties: {
            deployId: { type: "string", description: "The ID of the deployment." }
        },
        required: ["deployId"]
    }
};

RenderTools.prototype.updateEnvAndDeploy.metadata = {
    name: "updateRenderEnvAndDeploy",
    description: "A complete workflow: updates environment variables, triggers a deploy, and returns the deploy ID.",
    parameters: {
        type: "object",
        properties: {
            envVars: { type: "object", description: "An object of key-value pairs for environment variables to update." }
        },
        required: ["envVars"]
    }
};

RenderTools.prototype.healthCheck.metadata = {
    name: "renderHealthCheck",
    description: "Performs a health check on the Render service.",
    parameters: { type: "object", properties: {} }
};

export default RenderTools;
