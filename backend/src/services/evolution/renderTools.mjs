
import axios from 'axios';

const RENDER_API_KEY = process.env.RENDER_API_KEY;
const RENDER_API_URL = 'https://api.render.com/v1';

const renderApi = axios.create({
    baseURL: RENDER_API_URL,
    headers: {
        'Authorization': `Bearer ${RENDER_API_KEY}`,
        'Content-Type': 'application/json',
    },
});

/**
 * Triggers a new deployment for a given service ID.
 * @param {object} options
 * @param {string} options.serviceId - The ID of the service to deploy on Render.
 * @returns {Promise<object>} The new deployment object.
 */
const deployService = async ({ serviceId }) => {
    console.log(`[RenderTools] Triggering deployment for service: ${serviceId}`);
    if (!RENDER_API_KEY) {
        console.warn("[RenderTools] RENDER_API_KEY is not set. Using mock deployment.");
        return { 
            id: `dep_${Date.now()}`,
            serviceId,
            status: 'created', 
            mock: true 
        };
    }

    try {
        const response = await renderApi.post(`/services/${serviceId}/deploys`);
        console.log("[RenderTools] Deployment triggered successfully:", response.data);
        return response.data;
    } catch (error) {
        console.error('[RenderTools] Error triggering deployment:', error.response ? error.response.data : error.message);
        throw new Error('Failed to trigger Render deployment.');
    }
};

export const renderTools = {
    deployService,
};
