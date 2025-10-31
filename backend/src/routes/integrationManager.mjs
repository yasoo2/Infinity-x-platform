import express from 'express';
import axios from 'axios';
import { Octokit } from '@octokit/rest';

const router = express.Router();

// ==================
// RENDER INTEGRATION
// ==================

// Deploy to Render
router.post('/render/deploy', async (req, res) => {
  try {
    const { apiKey, serviceId, clearCache } = req.body;

    if (!apiKey || !serviceId) {
      return res.json({ ok: false, error: 'API Key and Service ID required' });
    }

    const response = await axios.post(
      `https://api.render.com/v1/services/${serviceId}/deploys`,
      { clearCache: clearCache || false },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json({
      ok: true,
      deployId: response.data.id,
      status: response.data.status,
      message: 'Deployment started successfully'
    });

  } catch (error) {
    console.error('Render deploy error:', error);
    res.json({ ok: false, error: error.message });
  }
});

// Get Render service status
router.post('/render/status', async (req, res) => {
  try {
    const { apiKey, serviceId } = req.body;

    if (!apiKey || !serviceId) {
      return res.json({ ok: false, error: 'API Key and Service ID required' });
    }

    const response = await axios.get(
      `https://api.render.com/v1/services/${serviceId}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );

    res.json({
      ok: true,
      service: {
        name: response.data.name,
        type: response.data.type,
        status: response.data.suspended,
        url: response.data.serviceDetails?.url
      }
    });

  } catch (error) {
    console.error('Render status error:', error);
    res.json({ ok: false, error: error.message });
  }
});

// =======================
// CLOUDFLARE INTEGRATION
// =======================

// Deploy to Cloudflare Pages
router.post('/cloudflare/deploy', async (req, res) => {
  try {
    const { apiToken, accountId, projectName, branch = 'main' } = req.body;

    if (!apiToken || !accountId || !projectName) {
      return res.json({ ok: false, error: 'API Token, Account ID, and Project Name required' });
    }

    // Trigger deployment
    const response = await axios.post(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${projectName}/deployments`,
      { branch },
      {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json({
      ok: true,
      deploymentId: response.data.result?.id,
      url: response.data.result?.url,
      message: 'Cloudflare Pages deployment started'
    });

  } catch (error) {
    console.error('Cloudflare deploy error:', error);
    res.json({ ok: false, error: error.message });
  }
});

// Get Cloudflare Pages project status
router.post('/cloudflare/status', async (req, res) => {
  try {
    const { apiToken, accountId, projectName } = req.body;

    if (!apiToken || !accountId || !projectName) {
      return res.json({ ok: false, error: 'API Token, Account ID, and Project Name required' });
    }

    const response = await axios.get(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${projectName}`,
      {
        headers: {
          'Authorization': `Bearer ${apiToken}`
        }
      }
    );

    res.json({
      ok: true,
      project: {
        name: response.data.result?.name,
        subdomain: response.data.result?.subdomain,
        domains: response.data.result?.domains,
        latestDeployment: response.data.result?.latest_deployment
      }
    });

  } catch (error) {
    console.error('Cloudflare status error:', error);
    res.json({ ok: false, error: error.message });
  }
});

// ==================
// GOOGLE INTEGRATION
// ==================

// Google Search
router.post('/google/search', async (req, res) => {
  try {
    const { query, apiKey, searchEngineId } = req.body;

    if (!query) {
      return res.json({ ok: false, error: 'Search query required' });
    }

    // Use Google Custom Search API if credentials provided
    if (apiKey && searchEngineId) {
      const response = await axios.get(
        `https://www.googleapis.com/customsearch/v1`,
        {
          params: {
            key: apiKey,
            cx: searchEngineId,
            q: query
          }
        }
      );

      const results = response.data.items?.map(item => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet
      })) || [];

      res.json({ ok: true, results });
    } else {
      // Fallback: return mock results
      res.json({
        ok: true,
        results: [
          {
            title: `Search results for: ${query}`,
            link: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
            snippet: 'Please provide Google API credentials for real search results'
          }
        ]
      });
    }

  } catch (error) {
    console.error('Google search error:', error);
    res.json({ ok: false, error: error.message });
  }
});

// ======================
// FULL AUTO-DEPLOY
// ======================

// Deploy to both Render and Cloudflare
router.post('/auto-deploy', async (req, res) => {
  try {
    const {
      githubToken,
      githubOwner,
      githubRepo,
      renderApiKey,
      renderServiceId,
      cloudflareApiToken,
      cloudflareAccountId,
      cloudflareProjectName
    } = req.body;

    const results = {
      github: { ok: false },
      render: { ok: false },
      cloudflare: { ok: false }
    };

    // Step 1: Verify GitHub repo exists
    if (githubToken && githubOwner && githubRepo) {
      try {
        const octokit = new Octokit({ auth: githubToken });
        await octokit.repos.get({ owner: githubOwner, repo: githubRepo });
        results.github = { ok: true, message: 'Repository verified' };
      } catch (err) {
        results.github = { ok: false, error: err.message };
      }
    }

    // Step 2: Deploy to Render
    if (renderApiKey && renderServiceId) {
      try {
        const renderRes = await axios.post(
          `https://api.render.com/v1/services/${renderServiceId}/deploys`,
          {},
          {
            headers: {
              'Authorization': `Bearer ${renderApiKey}`,
              'Content-Type': 'application/json'
            }
          }
        );
        results.render = { ok: true, deployId: renderRes.data.id };
      } catch (err) {
        results.render = { ok: false, error: err.message };
      }
    }

    // Step 3: Deploy to Cloudflare Pages
    if (cloudflareApiToken && cloudflareAccountId && cloudflareProjectName) {
      try {
        const cfRes = await axios.post(
          `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/pages/projects/${cloudflareProjectName}/deployments`,
          { branch: 'main' },
          {
            headers: {
              'Authorization': `Bearer ${cloudflareApiToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        results.cloudflare = { ok: true, deploymentId: cfRes.data.result?.id };
      } catch (err) {
        results.cloudflare = { ok: false, error: err.message };
      }
    }

    const allSuccess = results.github.ok && 
                       (renderServiceId ? results.render.ok : true) &&
                       (cloudflareProjectName ? results.cloudflare.ok : true);

    res.json({
      ok: allSuccess,
      results,
      message: allSuccess ? 'All deployments successful' : 'Some deployments failed'
    });

  } catch (error) {
    console.error('Auto-deploy error:', error);
    res.json({ ok: false, error: error.message });
  }
});

export default router;
