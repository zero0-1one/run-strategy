import { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  testRegex: ['.*\\.spec\\.ts$', '.*\\.test\\.ts$', '.*\\.e2e-spec\\.ts$', '.*\\.e2e-test\\.ts$'],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  testTimeout: 30000,
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts',
    '!src/**/*.e2e-spec.ts',
    '!src/**/*.e2e-test.ts',
  ],
  coverageDirectory: 'coverage',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
};

export default config;
