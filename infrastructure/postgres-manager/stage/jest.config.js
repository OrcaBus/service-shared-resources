export const testEnvironment = 'node';
export const roots = ['<rootDir>/tests'];
export const testMatch = ['**/*.test.ts'];
export const transform = {
  '^.+\\.tsx?$': 'ts-jest',
};
