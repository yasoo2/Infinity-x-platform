import axios from 'axios';
import { githubTools } from './githubTools.mjs';
import { renderTools } from './renderTools.mjs';
import { mongodbTools } from './mongodbTools.mjs';

/**
 * Self-Testing Tools for JOE
 * Automated testing, error detection, and auto-fix
 */

class TestingTools {
  constructor() {
    this.baseURL = process.env.API_BASE_URL || 'https://admin.xelitesolutions.com';
  }

  /**
   * Run health checks
   */
  async runHealthChecks() {
    console.log('🧪 Running health checks...');
    
    const checks = {
      api: await this.checkAPI(),
      database: await this.checkDatabase(),
      github: await this.checkGitHub(),
      render: await this.checkRender()
    };

    const allHealthy = Object.values(checks).every(c => c.healthy);

    console.log(allHealthy ? '✅ All checks passed' : '⚠️ Some checks failed');
    
    return {
      success: true,
      healthy: allHealthy,
      checks
    };
  }

  /**
   * Check API
   */
  async checkAPI() {
    try {
      const response = await axios.get(`${this.baseURL}/health`, {
        timeout: 5000
      });

      return {
        healthy: response.status === 200,
        status: response.status,
        data: response.data
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message
      };
    }
  }

  /**
   * Check Database
   */
  async checkDatabase() {
    try {
      const result = await mongodbTools.listCollections();
      return {
        healthy: result.success,
        collections: result.count
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message
      };
    }
  }

  /**
   * Check GitHub
   */
  async checkGitHub() {
    try {
      // Simple check: can we access GitHub token?
      const hasToken = !!process.env.GITHUB_TOKEN;
      return {
        healthy: hasToken,
        message: hasToken ? 'GitHub token available' : 'GitHub token missing'
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message
      };
    }
  }

  /**
   * Check Render
   */
  async checkRender() {
    try {
      const result = await renderTools.healthCheck();
      return {
        healthy: result.healthy,
        ...result
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message
      };
    }
  }

  /**
   * Scan for errors in logs
   */
  async scanErrors() {
    console.log('🔍 Scanning for errors...');
    
    try {
      const logsResult = await renderTools.searchErrors(100);
      
      if (!logsResult.success) {
        return {
          success: false,
          error: logsResult.error
        };
      }

      // Categorize errors
      const categorized = this.categorizeErrors(logsResult.errors);

      console.log(`✅ Found ${logsResult.count} errors`);
      
      return {
        success: true,
        errors: logsResult.errors,
        count: logsResult.count,
        categorized
      };
    } catch (error) {
      console.error('❌ Scan errors failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Categorize errors
   */
  categorizeErrors(errors) {
    const categories = {
      database: [],
      api: [],
      github: [],
      render: [],
      other: []
    };

    for (const error of errors) {
      const msg = error.message || '';
      
      if (msg.includes('mongo') || msg.includes('database')) {
        categories.database.push(error);
      } else if (msg.includes('api') || msg.includes('endpoint')) {
        categories.api.push(error);
      } else if (msg.includes('github') || msg.includes('git')) {
        categories.github.push(error);
      } else if (msg.includes('render') || msg.includes('deploy')) {
        categories.render.push(error);
      } else {
        categories.other.push(error);
      }
    }

    return categories;
  }

  /**
   * Auto-fix common issues
   */
  async autoFix(errorType) {
    console.log(`🔧 Attempting to fix: ${errorType}`);
    
    try {
      switch (errorType) {
        case 'database':
          return await this.fixDatabaseIssues();
        
        case 'api':
          return await this.fixAPIIssues();
        
        case 'github':
          return await this.fixGitHubIssues();
        
        case 'render':
          return await this.fixRenderIssues();
        
        default:
          return {
            success: false,
            error: 'Unknown error type'
          };
      }
    } catch (error) {
      console.error('❌ Auto-fix failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Fix database issues
   */
  async fixDatabaseIssues() {
    try {
      // Try to reconnect
      await mongodbTools.disconnect();
      const connectResult = await mongodbTools.connect();
      
      if (connectResult.success) {
        console.log('✅ Database reconnected');
        return {
          success: true,
          action: 'reconnect',
          message: 'Database reconnected successfully'
        };
      }

      return {
        success: false,
        error: 'Failed to reconnect to database'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Fix API issues
   */
  async fixAPIIssues() {
    try {
      // Check if API is responding
      const apiCheck = await this.checkAPI();
      
      if (apiCheck.healthy) {
        return {
          success: true,
          message: 'API is healthy'
        };
      }

      // Try to trigger a deploy
      const deployResult = await renderTools.triggerDeploy();
      
      if (deployResult.success) {
        console.log('✅ Deploy triggered');
        return {
          success: true,
          action: 'deploy',
          message: 'Deploy triggered to fix API issues'
        };
      }

      return {
        success: false,
        error: 'Failed to trigger deploy'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Fix GitHub issues
   */
  async fixGitHubIssues() {
    try {
      // Check if GitHub token is available
      if (!process.env.GITHUB_TOKEN) {
        return {
          success: false,
          error: 'GitHub token not configured'
        };
      }

      // Cleanup workspace
      const cleanupResult = await githubTools.cleanup();
      
      if (cleanupResult.success) {
        console.log('✅ GitHub workspace cleaned');
        return {
          success: true,
          action: 'cleanup',
          message: 'GitHub workspace cleaned'
        };
      }

      return {
        success: false,
        error: 'Failed to cleanup workspace'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Fix Render issues
   */
  async fixRenderIssues() {
    try {
      // Check Render health
      const healthCheck = await renderTools.healthCheck();
      
      if (healthCheck.healthy) {
        return {
          success: true,
          message: 'Render is healthy'
        };
      }

      // Try to trigger a deploy
      const deployResult = await renderTools.triggerDeploy();
      
      if (deployResult.success) {
        console.log('✅ Deploy triggered');
        return {
          success: true,
          action: 'deploy',
          message: 'Deploy triggered to fix Render issues'
        };
      }

      return {
        success: false,
        error: 'Failed to trigger deploy'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Run full diagnostic
   */
  async runDiagnostic() {
    console.log('🔬 Running full diagnostic...');
    
    try {
      // 1. Health checks
      const healthResult = await this.runHealthChecks();
      
      // 2. Error scan
      const errorsResult = await this.scanErrors();
      
      // 3. Analyze results
      const analysis = {
        healthy: healthResult.healthy,
        totalErrors: errorsResult.count || 0,
        criticalIssues: [],
        recommendations: []
      };

      // Identify critical issues
      if (!healthResult.checks.database.healthy) {
        analysis.criticalIssues.push('Database connection failed');
        analysis.recommendations.push('Run auto-fix for database');
      }

      if (!healthResult.checks.api.healthy) {
        analysis.criticalIssues.push('API not responding');
        analysis.recommendations.push('Trigger deploy');
      }

      if (errorsResult.count > 10) {
        analysis.criticalIssues.push(`High error count: ${errorsResult.count}`);
        analysis.recommendations.push('Review logs and fix errors');
      }

      console.log('✅ Diagnostic complete');
      
      return {
        success: true,
        health: healthResult,
        errors: errorsResult,
        analysis
      };
    } catch (error) {
      console.error('❌ Diagnostic failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Test endpoint
   */
  async testEndpoint(endpoint, method = 'GET', data = null) {
    try {
      const url = `${this.baseURL}${endpoint}`;
      
      const config = {
        method,
        url,
        timeout: 10000
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);

      console.log(`✅ ${method} ${endpoint}: ${response.status}`);
      
      return {
        success: true,
        status: response.status,
        data: response.data
      };
    } catch (error) {
      console.error(`❌ ${method} ${endpoint} failed:`, error.message);
      return {
        success: false,
        error: error.message,
        status: error.response?.status
      };
    }
  }

  /**
   * Run integration tests
   */
  async runIntegrationTests() {
    console.log('🧪 Running integration tests...');
    
    const tests = [
      { name: 'Health Check', endpoint: '/health', method: 'GET' },
      { name: 'JOE Chat', endpoint: '/api/joe/chat', method: 'POST', data: { message: 'test', userId: 'test' } },
      { name: 'GitHub Manager', endpoint: '/api/github-manager/scan', method: 'POST', data: { owner: 'yasoo2', repo: 'Infinity-x-platform' } }
    ];

    const results = [];
    
    for (const test of tests) {
      const result = await this.testEndpoint(test.endpoint, test.method, test.data);
      results.push({
        name: test.name,
        success: result.success,
        status: result.status
      });
    }

    const allPassed = results.every(r => r.success);

    console.log(allPassed ? '✅ All tests passed' : '⚠️ Some tests failed');
    
    return {
      success: true,
      passed: allPassed,
      results
    };
  }
}

// Export singleton
export const testingTools = new TestingTools();
export default TestingTools;
