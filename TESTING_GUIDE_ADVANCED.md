# Advanced Features Testing Guide

## Overview
This guide provides comprehensive testing procedures for all advanced features added to the Infinity-X Platform.

---

## 1. Sandbox Environment Testing

### Test 1.1: Shell Command Execution
```bash
curl -X POST http://localhost:3000/api/v1/sandbox/execute/shell \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "command": "echo Hello World && ls -la",
    "sessionId": "test-session-1",
    "timeout": 30000
  }'
```

**Expected Response:**
```json
{
  "ok": true,
  "result": {
    "code": 0,
    "stdout": "Hello World\n...",
    "stderr": "",
    "success": true,
    "sessionId": "test-session-1"
  }
}
```

### Test 1.2: Python Execution
```bash
curl -X POST http://localhost:3000/api/v1/sandbox/execute/python \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "code": "import json\nprint(json.dumps({\"status\": \"ok\"}))",
    "sessionId": "test-session-1"
  }'
```

### Test 1.3: File Operations
```bash
# Write file
curl -X POST http://localhost:3000/api/v1/sandbox/file/write \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "sessionId": "test-session-1",
    "filePath": "test.txt",
    "content": "Hello World"
  }'

# Read file
curl -X GET "http://localhost:3000/api/v1/sandbox/file/read?sessionId=test-session-1&filePath=test.txt" \
  -H "Authorization: Bearer YOUR_TOKEN"

# List files
curl -X GET "http://localhost:3000/api/v1/sandbox/files/list?sessionId=test-session-1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test 1.4: Sandbox Statistics
```bash
curl -X GET http://localhost:3000/api/v1/sandbox/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 2. Planning System Testing

### Test 2.1: Create a Plan
```bash
curl -X POST http://localhost:3000/api/v1/planning/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Build E-Commerce Platform",
    "description": "Complete e-commerce solution",
    "goal": "Launch a fully functional platform",
    "metadata": {"budget": 50000}
  }'
```

**Expected Response:**
```json
{
  "ok": true,
  "plan": {
    "_id": "...",
    "planId": "uuid",
    "title": "Build E-Commerce Platform",
    "status": "planning",
    "phases": [],
    "currentPhaseId": null,
    "createdAt": "2025-11-05T...",
    "updatedAt": "2025-11-05T..."
  }
}
```

### Test 2.2: Add Phases and Tasks
```bash
# Add phase
curl -X POST http://localhost:3000/api/v1/planning/PLAN_ID/phase/add \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Design Phase",
    "description": "UI/UX Design",
    "order": 1,
    "capabilities": {"design": true}
  }'

# Add task
curl -X POST http://localhost:3000/api/v1/planning/PHASE_ID/task/add \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Create Wireframes",
    "description": "Design wireframes for all pages",
    "priority": "high",
    "estimatedDuration": 40
  }'
```

### Test 2.3: Track Progress
```bash
curl -X GET http://localhost:3000/api/v1/planning/PLAN_ID/progress \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:**
```json
{
  "ok": true,
  "progress": {
    "planId": "uuid",
    "status": "planning",
    "phaseProgress": {
      "completed": 0,
      "total": 3,
      "percentage": 0
    },
    "taskProgress": {
      "completed": 0,
      "total": 10,
      "percentage": 0
    }
  }
}
```

---

## 3. Scheduling System Testing

### Test 3.1: Schedule a Cron Task
```bash
curl -X POST http://localhost:3000/api/v1/scheduling/cron/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "cronExpression": "0 2 * * *",
    "taskName": "Daily Backup",
    "description": "Runs daily at 2 AM",
    "handler": "backup_script"
  }'
```

### Test 3.2: Schedule an Interval Task
```bash
curl -X POST http://localhost:3000/api/v1/scheduling/interval/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "interval": 3600,
    "taskName": "Hourly Sync",
    "description": "Syncs data every hour",
    "handler": "sync_script"
  }'
```

### Test 3.3: Get Scheduling Statistics
```bash
curl -X GET http://localhost:3000/api/v1/scheduling/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 4. Browser Automation Testing

### Test 4.1: Create Browser Session
```bash
curl -X POST http://localhost:3000/api/v1/browser/session/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{}'
```

### Test 4.2: Navigate and Extract Content
```bash
# Navigate
curl -X POST http://localhost:3000/api/v1/browser/navigate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "sessionId": "SESSION_ID",
    "url": "https://example.com"
  }'

# Extract content
curl -X GET "http://localhost:3000/api/v1/browser/extract/content?sessionId=SESSION_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test 4.3: Form Interaction
```bash
# Fill form
curl -X POST http://localhost:3000/api/v1/browser/form/fill \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "sessionId": "SESSION_ID",
    "formData": {
      "#email": "user@example.com",
      "#password": "password123"
    }
  }'

# Submit form
curl -X POST http://localhost:3000/api/v1/browser/form/submit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "sessionId": "SESSION_ID",
    "selector": "#submit-btn"
  }'
```

### Test 4.4: Take Screenshot
```bash
curl -X POST http://localhost:3000/api/v1/browser/screenshot \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "sessionId": "SESSION_ID",
    "filePath": "/tmp/screenshot.png"
  }'
```

---

## 5. Security Manager Testing

### Test 5.1: Store and Retrieve Secret
```bash
# Store secret
curl -X POST http://localhost:3000/api/v1/security/secret/store \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "secretName": "DATABASE_PASSWORD",
    "secretValue": "super-secret-password",
    "metadata": {"type": "database"}
  }'

# Retrieve secret
curl -X GET "http://localhost:3000/api/v1/security/secret/get?secretId=SECRET_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test 5.2: Generate API Key
```bash
curl -X POST http://localhost:3000/api/v1/security/apikey/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "keyName": "MyApplication"
  }'
```

### Test 5.3: Get Audit Logs
```bash
curl -X GET http://localhost:3000/api/v1/security/audit/logs \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 6. Advanced Tools Testing

### Test 6.1: Process CSV
```bash
# First, upload a CSV file
curl -X POST http://localhost:3000/api/v1/tools/process/csv \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "filePath": "/path/to/data.csv"
  }'
```

### Test 6.2: Analyze Text
```bash
curl -X POST http://localhost:3000/api/v1/tools/text/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "text": "Your text to analyze goes here. This is a sample text for analysis."
  }'
```

### Test 6.3: Generate Chart
```bash
curl -X POST http://localhost:3000/api/v1/tools/chart/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "data": {
      "labels": ["Jan", "Feb", "Mar", "Apr"],
      "values": [10, 20, 15, 25],
      "title": "Monthly Sales"
    },
    "chartType": "bar"
  }'
```

---

## 7. Integration Testing

### Test 7.1: Complete Workflow
```
1. Create a sandbox session
2. Execute Python code to process data
3. Create a planning project
4. Add phases and tasks
5. Schedule monitoring tasks
6. Use browser to verify results
7. Store results securely
```

### Test 7.2: Error Handling
Test each system with invalid inputs:
- Missing required parameters
- Invalid session IDs
- Timeout scenarios
- Resource limits

---

## 8. Performance Testing

### Test 8.1: Concurrent Sandbox Execution
```javascript
// Execute multiple sandbox commands simultaneously
const promises = [];
for (let i = 0; i < 10; i++) {
  promises.push(
    fetch('/api/v1/sandbox/execute/shell', {
      method: 'POST',
      body: JSON.stringify({ command: 'echo test' })
    })
  );
}
await Promise.all(promises);
```

### Test 8.2: Large Data Processing
- Process CSV files with 100k+ rows
- Analyze large text documents
- Monitor memory usage

### Test 8.3: Browser Session Management
- Create 50+ concurrent browser sessions
- Monitor resource usage
- Test session cleanup

---

## 9. Security Testing

### Test 9.1: Directory Traversal Protection
```bash
curl -X POST http://localhost:3000/api/v1/sandbox/file/write \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "sessionId": "test",
    "filePath": "../../../etc/passwd",
    "content": "malicious"
  }'
# Should return error: "Invalid file path: directory traversal detected"
```

### Test 9.2: Encryption Verification
```bash
# Store a secret and verify it's encrypted
# Retrieve from database and confirm encrypted format
```

### Test 9.3: Audit Log Verification
```bash
# Perform sensitive operations
# Verify audit logs record all actions
```

---

## 10. Automated Test Suite

Create a test file: `backend/tests/advanced-features.test.mjs`

```javascript
import assert from 'assert';
import SandboxManager from '../src/sandbox/SandboxManager.mjs';
import PlanningSystem from '../src/planning/PlanningSystem.mjs';

describe('Advanced Features', () => {
  describe('Sandbox Manager', () => {
    it('should execute shell commands', async () => {
      const sandbox = new SandboxManager();
      await sandbox.initialize();
      const result = await sandbox.executeShell('echo test');
      assert.strictEqual(result.code, 0);
    });
  });

  describe('Planning System', () => {
    it('should create a plan', async () => {
      // Test implementation
    });
  });
});
```

Run tests with:
```bash
npm test
```

---

## Checklist

- [ ] Sandbox execution (Shell, Python, Node.js)
- [ ] File operations (Create, Read, Write, Delete)
- [ ] Planning system (Create, Update, Track)
- [ ] Scheduling (Cron, Interval)
- [ ] Browser automation (Navigate, Extract, Interact)
- [ ] Security (Encryption, API Keys, Audit)
- [ ] Tools (CSV, JSON, Images, Text)
- [ ] Error handling
- [ ] Performance under load
- [ ] Security vulnerabilities
- [ ] Integration between systems

---

**Testing Status:** Ready for Execution ✅
