module.exports = {
  rootDir: '..',
  preset: 'react-native',
  testMatch: ['<rootDir>/audit/*.audit.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|sn-plugin-lib)/)',
  ],
};
