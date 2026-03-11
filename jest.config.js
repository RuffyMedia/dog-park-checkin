module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  collectCoverageFrom: [
    'src/utils/**/*.ts',
    'src/services/**/*.ts',
    '!src/**/*.d.ts',
    '!src/types/**',
  ],
};
