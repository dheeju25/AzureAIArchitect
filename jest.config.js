module.exports = {
  preset:              'ts-jest',
  testEnvironment:     'node',
  roots:               ['<rootDir>/src/tests'],
  testMatch:           ['**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/tests/**'],
  coverageDirectory:   'coverage',
  moduleNameMapper: {
    '^../utils/fileProcessor$': '<rootDir>/src/__mocks__/fileProcessor.ts',
    '^../utils/logger$':        '<rootDir>/src/__mocks__/logger.ts',
    '^../services/tracing$':    '<rootDir>/src/__mocks__/tracing.ts',
    '^../services/traceQuery$': '<rootDir>/src/__mocks__/traceQuery.ts',
    '^../services/websocket$':  '<rootDir>/src/__mocks__/websocket.ts',
  },
  globals: {
    'ts-jest': {
      tsconfig: { strict: false },
    },
  },
};
