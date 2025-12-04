/* eslint-env jest */
/* globals describe, it, expect */
import { jest } from '@jest/globals';

process.env.NODE_ENV = 'test';

const mockInitMongo = jest.fn().mockResolvedValue('db');
const mockConnectDB = jest.fn().mockRejectedValue(new Error('connection failed'));

jest.unstable_mockModule('../src/core/database.mjs', () => ({
  initMongo: mockInitMongo,
  closeMongoConnection: jest.fn(),
}));

jest.unstable_mockModule('../src/db.mjs', () => ({
  connectDB: mockConnectDB,
}));

jest.unstable_mockModule('../src/core/setup-admin.mjs', () => ({
  setupSuperAdmin: jest.fn().mockResolvedValue(undefined),
}));

jest.unstable_mockModule('../src/planning/PlanningSystem.mjs', () => ({
  default: jest.fn(),
}));

jest.unstable_mockModule('../src/scheduling/SchedulingSystem.mjs', () => ({
  default: jest.fn(),
}));

jest.unstable_mockModule('../src/middleware/auth.mjs', () => ({
  setupAuth: jest.fn(),
  requireRole: jest.fn(() => jest.fn()),
  optionalAuth: jest.fn(() => jest.fn()),
}));

jest.unstable_mockModule('../src/core/event-bus.mjs', () => ({
  default: {},
}));

jest.unstable_mockModule('../src/services/tools/tool-manager.service.mjs', () => ({
  default: {
    initialize: jest.fn(),
    _registerModule: jest.fn(),
    execute: jest.fn(),
  },
}));

jest.unstable_mockModule('../src/sandbox/SandboxManager.mjs', () => ({
  default: class SandboxManager {
    initializeConnections() {
      return Promise.resolve({});
    }
  },
}));

jest.unstable_mockModule('../src/services/memory/memory.service.mjs', () => ({
  default: class MemoryManager {},
}));

jest.unstable_mockModule('../src/services/joeAgentWebSocket.mjs', () => ({
  JoeAgentWebSocketServer: class JoeAgentWebSocketServer {},
}));

jest.unstable_mockModule('../src/services/browserWebSocket.mjs', () => ({
  default: class BrowserWebSocketServer {},
}));

jest.unstable_mockModule('../src/systems/collaboration.service.mjs', () => ({
  collaborationSystem: {
    initialize: jest.fn(),
    io: {},
  },
}));

jest.unstable_mockModule('../src/services/tools/tool-discovery.tool.mjs', () => ({
  default: jest.fn(),
}));

jest.unstable_mockModule('../src/services/tools/tool-integration.tool.mjs', () => ({
  default: jest.fn(),
}));

jest.unstable_mockModule('../src/services/tools/tool-pip-integration.tool.mjs', () => ({
  default: jest.fn(),
}));

jest.unstable_mockModule('../src/services/tools/tool-bulk-seeder.mjs', () => ({
  default: jest.fn(),
}));

jest.unstable_mockModule('../src/services/tools/tool-code-diagnostics.tool.mjs', () => ({
  default: jest.fn(),
}));

jest.unstable_mockModule('../src/services/tools/tool-code-search.tool.mjs', () => ({
  default: jest.fn(),
}));

jest.unstable_mockModule('../src/services/tools/tool-code-refactor.tool.mjs', () => ({
  default: jest.fn(),
}));

jest.unstable_mockModule('../src/services/tools/tool-auto-fix.tool.mjs', () => ({
  default: jest.fn(),
}));

jest.unstable_mockModule('../src/services/tools/tool-system-connectors.tool.mjs', () => ({
  default: jest.fn(),
}));

jest.unstable_mockModule('../src/services/liveStreamingService.mjs', () => ({
  liveStreamingService: {},
}));

jest.unstable_mockModule('../src/services/liveStreamWebSocket.mjs', () => ({
  default: class LiveStreamWebSocketServer {},
}));

const { setupDependencies, startServer } = await import('../server.mjs');

describe('server startup', () => {
  it('fails fast when Mongo connection cannot be established', async () => {
    await expect(setupDependencies()).rejects.toThrow('connection failed');
    expect(mockConnectDB).toHaveBeenCalledTimes(1);
    expect(mockInitMongo).toHaveBeenCalledTimes(1);
  });

  it('exits the process when startup fails', async () => {
    const failingInitializer = jest.fn().mockRejectedValue(new Error('boot failure'));
    const exitSpy = jest.fn();

    await expect(startServer({ dependencyInitializer: failingInitializer, exit: exitSpy })).rejects.toThrow('boot failure');

    expect(failingInitializer).toHaveBeenCalledTimes(1);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
