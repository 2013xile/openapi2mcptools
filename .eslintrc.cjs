module.exports = {
  extends: ['google'],
  parserOptions: {
    ecmaVersion: 12,
  },
  env: {
    browser: true,
    es2021: true,
  },
  rules: {
    'require-jsdoc': 'off',
    'semi': 'error',
    'indent': ['error', 2],
    'max-len': ['error', 120],
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
  },
  ignorePatterns: ['dist'],
};
