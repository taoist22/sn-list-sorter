module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/test/host.js'],
  testMatch: ['<rootDir>/__tests__/**/*.test.{ts,tsx,js}'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|sn-plugin-lib)/)',
  ],
  coverageThreshold: {
    global: {branches: 70, functions: 70, lines: 70, statements: 70},
  },
  collectCoverageFrom: ['App.tsx', 'src/**/*.{ts,tsx}', '!src/types.ts'],
};
