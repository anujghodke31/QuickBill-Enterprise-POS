const globals = require('globals');
const js = require('@eslint/js');
const prettier = require('eslint-plugin-prettier/recommended');

module.exports = [
  {
    ignores: ['node_modules/', 'client/', 'dist/', 'build/', 'coverage/', 'scripts/'],
  },
  js.configs.recommended,
  prettier,
  {
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
    },
  },
  {
    files: ['app.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        Chart: 'readonly',
      },
    },
  },
];
