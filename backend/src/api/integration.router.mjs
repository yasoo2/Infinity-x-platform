import express from 'express';

// This entire router is a candidate for a major refactor into separate services 
// (e.g., deploymentService, webhookService, integrationService).
// For now, we will scaffold it, secure it, and mark endpoints as not implemented.

const integrationRouterFactory = ({ requireRole }) => {
    const router = express.Router();

    const notImplemented = (req, res) => {
        res.status(501).json({ 
            success: false, 
            error: 'NOT_IMPLEMENTED', 
            message: 'This integration endpoint has not been migrated to the new service-oriented architecture yet.' 
        });
    };

    // Webhook endpoint - should be publicly accessible but requires its own signature validation.
    router.post('/webhook/github', notImplemented);

    // Status endpoint for deployments
    router.get('/deploy/status/:jobId', requireRole('ADMIN'), notImplemented);

    // Manual deployment endpoints
    router.post('/render/deploy', requireRole('SUPER_ADMIN'), notImplemented);
    router.post('/cloudflare/deploy', requireRole('SUPER_ADMIN'), notImplemented);
    router.post('/auto-deploy', requireRole('SUPER_ADMIN'), notImplemented);

    // Status endpoints for services
    router.post('/render/status', requireRole('ADMIN'), notImplemented);

    // General Google Search - can be its own service
    router.post('/google/search', requireRole('USER'), notImplemented);
    
    // Health check remains simple
    router.get('/health', (req, res) => {
        res.json({ success: true, status: 'ok', uptime: process.uptime() });
    });

    return router;
};

export default integrationRouterFactory;
