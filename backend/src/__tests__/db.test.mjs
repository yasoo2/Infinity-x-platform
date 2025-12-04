/* eslint-env jest */
/* globals describe, beforeEach, it, expect */
import { jest } from '@jest/globals';

const mockConnect = jest.fn();
const mockSet = jest.fn();
const mockConnection = {
  on: jest.fn(),
  once: jest.fn(),
};

jest.unstable_mockModule('mongoose', () => ({
  default: {
    connect: mockConnect,
    set: mockSet,
    connection: mockConnection,
  },
}));

describe('connectDB', () => {
  beforeEach(() => {
    mockConnect.mockReset();
    mockSet.mockReset();
    mockConnection.on.mockReset();
    mockConnection.once.mockReset();
  });

  it('rethrows connection errors so callers can handle them', async () => {
    mockConnect.mockRejectedValue(new Error('connection failed'));

    const { connectDB } = await import('../db.mjs');

    await expect(connectDB()).rejects.toThrow('connection failed');
  });
});
