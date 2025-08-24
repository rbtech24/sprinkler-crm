/**
 * Jest Test Setup
 * Global setup for all tests including database and mocks
 */

const { TextEncoder, TextDecoder } = require('util');

// Polyfills for Node.js environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';
process.env.SESSION_SECRET = 'test-session-secret-for-testing';
process.env.DATABASE_URL = 'sqlite::memory:';
process.env.REDIS_URL = 'disabled'; // Disable Redis for tests

// Global test timeout
jest.setTimeout(10000);

// Suppress console logs in tests (uncomment if needed)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };

// Global setup before all tests
beforeAll(async () => {
  // Any global setup can go here
});

// Global cleanup after all tests
afterAll(async () => {
  // Clean up any global resources
});

// Setup before each test
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

// Cleanup after each test
afterEach(() => {
  // Reset any test state
});