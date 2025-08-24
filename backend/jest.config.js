/**
 * Jest Configuration for Sprinkler Repair SaaS Backend
 * Comprehensive testing setup with coverage and security testing
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js',
    '**/__tests__/**/*.js',
  ],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80,
    },
  },
  
  // Files to collect coverage from
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js', // Exclude main server file
    '!src/database/seed.js', // Exclude seed files
    '!src/**/*.config.js', // Exclude config files
    '!src/**/index.js', // Exclude index files
  ],
  
  // Module name mapping for aliases
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
  },
  
  // Test timeout
  testTimeout: 10000,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks between tests
  restoreMocks: true,
  
  // Verbose output
  verbose: true,
  
  // Global variables
  globals: {
    'process.env.NODE_ENV': 'test',
    'process.env.JWT_SECRET': 'test-jwt-secret-key',
    'process.env.SESSION_SECRET': 'test-session-secret',
    'process.env.DATABASE_URL': 'sqlite::memory:',
  },
  
  // Transform configuration
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  
  // Module file extensions
  moduleFileExtensions: ['js', 'json'],
  
  // Test path ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/build/',
    '/dist/',
    '/coverage/',
  ],
  
  // Watch ignore patterns
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/build/',
    '/dist/',
    '/coverage/',
    '/.git/',
  ],
  
  // Force exit after tests complete
  forceExit: true,
  
  // Detect open handles
  detectOpenHandles: true,
  
  // Maximum worker threads
  maxWorkers: '50%',
  
  // Reporters
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: './coverage',
      filename: 'test-report.html',
      expand: true,
    }],
  ],
  
  // Test projects for different types of tests
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/tests/unit/**/*.test.js'],
      testEnvironment: 'node',
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/tests/integration/**/*.test.js'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/tests/integration/setup.js'],
    },
    {
      displayName: 'security',
      testMatch: ['<rootDir>/tests/security/**/*.test.js'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/tests/security/setup.js'],
    },
  ],
};