/* eslint-env jest */
/* global describe, it, expect, beforeEach, afterEach */

import fs from 'fs/promises';
import os from 'os';
import path from 'path';

import JoeSetup from '../setup.mjs';

describe('JoeSetup.createConfigFiles', () => {
  const originalCwd = process.cwd();
  let tempDir;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'joe-setup-'));
    process.chdir(tempDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('writes nginx and app configs with websocket upgrade support', async () => {
    const setup = new JoeSetup();
    await setup.createConfigFiles();

    const nginxContent = await fs.readFile(path.join(tempDir, 'nginx.conf'), 'utf8');
    expect(nginxContent).toContain('map $http_upgrade $connection_upgrade');
    expect(nginxContent).toContain('location /socket.io/');
    expect(nginxContent).toContain('proxy_buffering off;');
    expect(nginxContent).toContain('proxy_read_timeout 60s;');
    expect(nginxContent).toContain('set $backend_upstream');

    const configContent = await fs.readFile(path.join(tempDir, 'config.js'), 'utf8');
    expect(configContent).toContain('module.exports');
  });
});
