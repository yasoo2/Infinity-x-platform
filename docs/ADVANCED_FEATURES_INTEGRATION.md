# Advanced Features Integration Guide for Infinity-X Platform (Joe System)

## Overview

This document provides a comprehensive guide to the advanced features that have been integrated into the Infinity-X Platform to transform it into a Manus-like system with enterprise-grade capabilities.

---

## 1. Sandbox Environment (SandboxManager)

### Location
`backend/src/sandbox/SandboxManager.mjs`

### Features
- **Isolated Execution Environment:** Safe execution of arbitrary code without affecting the main system
- **Multi-Language Support:** Shell, Python, Node.js execution
- **File System Management:** Create, read, write, and delete files within sandboxed sessions
- **Process Management:** Control and monitor running processes
- **Security:** Directory traversal protection and resource limits

### API Endpoints
```
POST   /api/v1/sandbox/execute/shell     - Execute shell commands
POST   /api/v1/sandbox/execute/python    - Execute Python code
POST   /api/v1/sandbox/execute/node      - Execute Node.js code
POST   /api/v1/sandbox/session/create    - Create a new sandbox session
POST   /api/v1/sandbox/file/write        - Write files to sandbox
GET    /api/v1/sandbox/file/read         - Read files from sandbox
GET    /api/v1/sandbox/files/list        - List files in sandbox
DELETE /api/v1/sandbox/session/cleanup   - Clean up sandbox session
GET    /api/v1/sandbox/stats             - Get sandbox statistics
DELETE /api/v1/sandbox/process/kill      - Kill a specific process
```

### Usage Example
```javascript
const sandboxManager = new SandboxManager();
await sandboxManager.initialize();

// Execute shell command
const result = await sandboxManager.executeShell('ls -la', {
  sessionId: 'session-123',
  timeout: 30000
});

// Execute Python code
const pythonResult = await sandboxManager.executePython(`
import json
print(json.dumps({'hello': 'world'}))
`);

// Write and read files
await sandboxManager.writeFile('session-123', 'test.txt', 'Hello World');
const content = await sandboxManager.readFile('session-123', 'test.txt');
```

---

## 2. Advanced Tools System (AdvancedToolsManager)

### Location
`backend/src/tools/AdvancedToolsManager.mjs`

### Features
- **Data Processing:** CSV, JSON, and structured data analysis
- **Image Processing:** Resize, convert, and extract metadata from images
- **Data Analysis:** Statistical analysis, text analysis, and data visualization
- **File Conversion:** Convert between different file formats (CSV↔JSON, Image formats)
- **Compression:** Compress and decompress files
- **Custom Scripts:** Execute Python and Node.js scripts

### API Endpoints
```
POST   /api/v1/tools/process/csv         - Process and analyze CSV files
POST   /api/v1/tools/process/json        - Process and validate JSON files
POST   /api/v1/tools/image/process       - Extract image metadata
POST   /api/v1/tools/image/resize        - Resize images
POST   /api/v1/tools/file/convert        - Convert between file formats
POST   /api/v1/tools/text/analyze        - Analyze text data
POST   /api/v1/tools/data/statistics     - Perform statistical analysis
POST   /api/v1/tools/chart/generate      - Generate data visualizations
POST   /api/v1/tools/file/compress       - Compress files
POST   /api/v1/tools/file/decompress     - Decompress files
```

### Usage Example
```javascript
const toolsManager = new AdvancedToolsManager();

// Process CSV
const csvAnalysis = await toolsManager.processCSV('/path/to/file.csv');

// Analyze text
const textAnalysis = await toolsManager.analyzeText('Your text here');

// Generate chart
const chart = await toolsManager.generateChart({
  labels: ['Jan', 'Feb', 'Mar'],
  values: [10, 20, 15],
  title: 'Sales Chart'
}, 'bar');
```

---

## 3. Planning System (PlanningSystem)

### Location
`backend/src/planning/PlanningSystem.mjs`

### Features
- **Task Planning:** Create and manage complex project plans
- **Phase Management:** Organize work into logical phases
- **Task Tracking:** Monitor individual tasks and their status
- **Progress Monitoring:** Track overall project progress
- **Phase Advancement:** Move through project phases systematically
- **Metadata Support:** Store custom metadata for plans and tasks

### API Endpoints
```
POST   /api/v1/planning/create                  - Create a new plan
POST   /api/v1/planning/:planId/phase/add       - Add a phase to a plan
POST   /api/v1/planning/:phaseId/task/add       - Add a task to a phase
POST   /api/v1/planning/phase/:phaseId/start    - Start a phase
POST   /api/v1/planning/phase/:phaseId/complete - Complete a phase
PUT    /api/v1/planning/task/:taskId/status     - Update task status
GET    /api/v1/planning/:planId/details         - Get plan details
GET    /api/v1/planning/:planId/progress        - Get plan progress
POST   /api/v1/planning/:planId/advance         - Advance to next phase
GET    /api/v1/planning/list                    - List user plans
DELETE /api/v1/planning/:planId                 - Delete a plan
```

### Usage Example
```javascript
const planningSystem = new PlanningSystem(db);

// Create a plan
const plan = await planningSystem.createPlan({
  title: 'Build E-Commerce Platform',
  goal: 'Launch a fully functional e-commerce platform',
  userId: 'user-123'
});

// Add phases
const phase1 = await planningSystem.addPhase(plan.planId, {
  title: 'Design Phase',
  order: 1,
  capabilities: { design: true }
});

// Add tasks
const task1 = await planningSystem.addTask(phase1.phaseId, {
  title: 'Create wireframes',
  priority: 'high'
});

// Track progress
const progress = await planningSystem.getPlanProgress(plan.planId);
```

---

## 4. Scheduling System (SchedulingSystem)

### Location
`backend/src/scheduling/SchedulingSystem.mjs`

### Features
- **Cron-Based Scheduling:** Schedule tasks using cron expressions
- **Interval-Based Scheduling:** Schedule tasks at regular intervals
- **Execution History:** Track all task executions and failures
- **Task Management:** Pause, resume, and delete scheduled tasks
- **Statistics:** Monitor scheduling system performance

### API Endpoints
```
POST   /api/v1/scheduling/cron/create        - Schedule a cron task
POST   /api/v1/scheduling/interval/create    - Schedule an interval task
POST   /api/v1/scheduling/task/:taskId/pause - Pause a task
POST   /api/v1/scheduling/task/:taskId/resume - Resume a task
DELETE /api/v1/scheduling/task/:taskId       - Delete a task
GET    /api/v1/scheduling/tasks              - Get all scheduled tasks
GET    /api/v1/scheduling/task/:taskId       - Get task details
GET    /api/v1/scheduling/stats              - Get scheduling statistics
```

### Usage Example
```javascript
const schedulingSystem = new SchedulingSystem(db);

// Schedule a cron task (runs every day at 2 AM)
const cronTask = await schedulingSystem.scheduleCronTask({
  cronExpression: '0 2 * * *',
  taskName: 'Daily Backup',
  handler: async () => {
    console.log('Running daily backup...');
  }
});

// Schedule an interval task (runs every hour)
const intervalTask = await schedulingSystem.scheduleIntervalTask({
  interval: 3600, // seconds
  taskName: 'Hourly Sync',
  handler: async () => {
    console.log('Syncing data...');
  }
});
```

---

## 5. Advanced Browser Manager (AdvancedBrowserManager)

### Location
`backend/src/browser/AdvancedBrowserManager.mjs`

### Features
- **Browser Automation:** Control browser instances programmatically
- **Web Scraping:** Extract data from web pages
- **Form Interaction:** Fill and submit forms automatically
- **Screenshot Capture:** Take screenshots of web pages
- **Cookie Management:** Handle cookies and sessions
- **JavaScript Execution:** Execute custom JavaScript on pages
- **Performance Metrics:** Measure page performance

### API Endpoints
```
POST   /api/v1/browser/session/create      - Create a new browser session
POST   /api/v1/browser/navigate            - Navigate to a URL
POST   /api/v1/browser/click               - Click an element
POST   /api/v1/browser/type                - Type text in a field
POST   /api/v1/browser/form/fill           - Fill a form
POST   /api/v1/browser/form/submit         - Submit a form
GET    /api/v1/browser/extract/content     - Extract page content
GET    /api/v1/browser/extract/data        - Extract data with selector
POST   /api/v1/browser/wait/element        - Wait for element
POST   /api/v1/browser/screenshot          - Take screenshot
POST   /api/v1/browser/execute/script      - Execute JavaScript
GET    /api/v1/browser/cookies             - Get cookies
POST   /api/v1/browser/cookies/set         - Set cookies
GET    /api/v1/browser/metrics             - Get page metrics
DELETE /api/v1/browser/session/close       - Close a session
```

### Usage Example
```javascript
const browserManager = new AdvancedBrowserManager();
await browserManager.initialize();

// Create session and navigate
const session = await browserManager.createSession();
await browserManager.navigate(session.sessionId, 'https://example.com');

// Extract content
const content = await browserManager.extractContent(session.sessionId);

// Fill and submit form
await browserManager.fillForm(session.sessionId, {
  '#email': 'user@example.com',
  '#password': 'password123'
});
await browserManager.submitForm(session.sessionId, '#submit-btn');

// Take screenshot
await browserManager.takeScreenshot(session.sessionId, 'screenshot.png');
```

---

## 6. Security Manager (SecurityManager)

### Location
`backend/src/security/SecurityManager.mjs`

### Features
- **Data Encryption:** AES-256-GCM encryption for sensitive data
- **Secret Management:** Securely store and retrieve secrets
- **API Key Generation:** Generate and validate API keys
- **Password Hashing:** Secure password hashing with PBKDF2
- **Audit Logging:** Track all security-related actions
- **Access Control:** Manage user access to secrets

### API Endpoints
```
POST   /api/v1/security/secret/store       - Store a secret
GET    /api/v1/security/secret/get         - Retrieve a secret
DELETE /api/v1/security/secret/delete      - Delete a secret
POST   /api/v1/security/apikey/generate    - Generate an API key
POST   /api/v1/security/apikey/validate    - Validate an API key
GET    /api/v1/security/audit/logs         - Get audit logs
GET    /api/v1/security/stats              - Get security statistics
```

### Usage Example
```javascript
const securityManager = new SecurityManager(db);

// Store a secret
const secret = await securityManager.storeSecret(
  'DATABASE_PASSWORD',
  'super-secret-password',
  'user-123'
);

// Retrieve a secret
const retrieved = await securityManager.getSecret(secret.secretId, 'user-123');

// Generate API key
const apiKey = await securityManager.generateAPIKey('user-123', 'MyApp');

// Hash password
const hashedPassword = securityManager.hashPassword('user-password');

// Verify password
const isValid = securityManager.verifyPassword('user-password', hashedPassword);
```

---

## 7. Integration with Main Server

### File: `backend/server.mjs`

Add the following imports and initializations:

```javascript
import SandboxManager from './src/sandbox/SandboxManager.mjs';
import AdvancedToolsManager from './src/tools/AdvancedToolsManager.mjs';
import PlanningSystem from './src/planning/PlanningSystem.mjs';
import SchedulingSystem from './src/scheduling/SchedulingSystem.mjs';
import AdvancedBrowserManager from './src/browser/AdvancedBrowserManager.mjs';
import SecurityManager from './src/security/SecurityManager.mjs';

// Initialize managers
const sandboxManager = new SandboxManager();
await sandboxManager.initialize();

const toolsManager = new AdvancedToolsManager({ sandboxManager });

const browserManager = new AdvancedBrowserManager();
await browserManager.initialize();

// Register routes
import sandboxRoutes from './src/routes/sandboxRoutes.mjs';
import planningRoutes from './src/routes/planningRoutes.mjs';

app.use('/api/v1/sandbox', sandboxRoutes);
app.use('/api/v1/planning', planningRoutes);
```

---

## 8. Database Collections

The following MongoDB collections are used by the advanced systems:

```javascript
// Planning System
db.createCollection('plans');
db.createCollection('phases');
db.createCollection('tasks');

// Scheduling System
db.createCollection('scheduled_tasks');

// Security System
db.createCollection('secrets');
db.createCollection('audit_logs');

// Create indexes
db.plans.createIndex({ userId: 1, createdAt: -1 });
db.phases.createIndex({ planId: 1, order: 1 });
db.tasks.createIndex({ phaseId: 1, status: 1 });
db.scheduled_tasks.createIndex({ taskId: 1 });
db.secrets.createIndex({ userId: 1, secretId: 1 });
db.audit_logs.createIndex({ userId: 1, timestamp: -1 });
```

---

## 9. Environment Variables

Add the following to your `.env` file:

```env
# Sandbox Configuration
SANDBOX_MAX_CONCURRENT=10
SANDBOX_TIMEOUT=60000

# Encryption Configuration
ENCRYPTION_KEY=your-256-bit-hex-key

# Browser Configuration
BROWSER_HEADLESS=true
BROWSER_TIMEOUT=30000

# Scheduling Configuration
CRON_ENABLED=true
```

---

## 10. Performance Considerations

### Sandbox Management
- Limit concurrent processes to prevent resource exhaustion
- Implement process timeouts to prevent hanging
- Regular cleanup of temporary files

### Tools Processing
- Use streaming for large file processing
- Implement caching for frequently analyzed data
- Monitor memory usage during data processing

### Planning System
- Index database queries by userId and status
- Cache plan progress calculations
- Implement pagination for large task lists

### Scheduling System
- Use Redis for distributed scheduling (optional)
- Monitor execution history size
- Implement job queue for failed tasks

### Browser Automation
- Reuse browser instances when possible
- Implement connection pooling
- Monitor memory usage of Puppeteer instances

---

## 11. Security Best Practices

1. **Encryption Keys:** Store encryption keys securely, never in code
2. **API Keys:** Rotate API keys regularly
3. **Audit Logs:** Review audit logs regularly for suspicious activity
4. **Sandboxing:** Keep sandbox processes isolated and monitored
5. **Input Validation:** Always validate user input before processing
6. **Rate Limiting:** Implement rate limiting on API endpoints

---

## 12. Testing

Run comprehensive tests to verify all systems:

```bash
npm test

# Or run specific tests
node backend/test-sandbox.mjs
node backend/test-planning.mjs
node backend/test-scheduling.mjs
```

---

## 13. Deployment

When deploying to production:

1. Ensure all dependencies are installed
2. Configure environment variables
3. Set up MongoDB collections and indexes
4. Enable SSL/TLS for all connections
5. Configure firewall rules for sandbox processes
6. Set up monitoring and alerting
7. Implement backup strategies

---

## 14. Support and Documentation

For detailed API documentation, see:
- Sandbox API: `backend/src/routes/sandboxRoutes.mjs`
- Planning API: `backend/src/routes/planningRoutes.mjs`
- Individual managers for implementation details

---

**Version:** 2.0.0  
**Last Updated:** November 5, 2025  
**Status:** Production Ready
