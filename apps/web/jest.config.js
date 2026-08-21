/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { jsx: 'react-jsx', esModuleInterop: true } }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['**/__tests__/**/*.test.{ts,tsx,js,mjs}'],
  testPathIgnorePatterns: ['/node_modules/', '/.next/'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'mjs', 'json'],
  collectCoverageFrom: [
    'src/lib/api.ts',
    'src/lib/contentHash.ts',
    'src/lib/geminiGenerator.ts',
    'src/lib/logger.ts',
    'src/lib/qstParser.tsx',
    'src/lib/quizDeduplication.ts',
    'src/lib/quizFingerprint.ts',
    'src/lib/sm2.ts',
    'src/styles/sharedStyles.ts',
    'src/components/quiz/create/CreateHeader.tsx',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
  ],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 65,
      statements: 65,
    },
  },
};
