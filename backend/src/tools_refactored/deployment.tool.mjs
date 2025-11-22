/**
 * Deployment Tool - Bridge to the Advanced Auto-Deployment System
 * @version 1.0.0
 */

import { deploymentSystem } from '../systems/deployment.service.mjs';

/**
 * Deploys a project from a given path to a specified platform.
 * @param {object} params - The parameters for the deployment.
 * @param {string} params.projectPath - The local path to the project to be deployed.
 * @param {string} [params.platform='vercel'] - The target platform (e.g., 'vercel', 'railway').
 * @returns {Promise<object>} - An object containing the deployment result.
 */
async function deployProject({ projectPath, platform }) {
  try {
    const result = await deploymentSystem.deploy(projectPath, { platform });
    return { success: true, ...result };
  } catch (error) {
    console.error('❌ Deployment failed:', error);
    return { success: false, error: `Deployment failed: ${error.message}` };
  }
}

deployProject.metadata = {
    name: "deployProject",
    description: "Initiates an automated deployment for a project located at a specific path. It handles testing, building, and deploying to the specified cloud platform.",
    parameters: {
        type: "object",
        properties: {
            projectPath: { type: "string", description: "The local file system path to the project directory." },
            platform: { type: "string", description: "The target deployment platform, e.g., 'vercel', 'railway'.", optional: true }
        },
        required: ["projectPath"]
    }
};

/**
 * Retrieves the status of a specific deployment.
 * @param {object} params - The parameters for getting deployment status.
 * @param {string} params.deploymentId - The ID of the deployment to check.
 * @returns {Promise<object>} - An object containing the deployment status information.
 */
async function getDeploymentStatus({ deploymentId }) {
    try {
        const status = deploymentSystem.getDeploymentStatus(deploymentId);
        if (!status) {
            return { success: false, error: "Deployment ID not found." };
        }
        return { success: true, status };
    } catch (error) {
        console.error('❌ Failed to get deployment status:', error);
        return { success: false, error: `Could not retrieve status: ${error.message}` };
    }
}

getDeploymentStatus.metadata = {
    name: "getDeploymentStatus",
    description: "Retrieves the current status, logs, and URL of an ongoing or completed deployment.",
    parameters: {
        type: "object",
        properties: {
            deploymentId: { type: "string", description: "The unique ID of the deployment." }
        },
        required: ["deploymentId"]
    }
};

export default { deployProject, getDeploymentStatus };
