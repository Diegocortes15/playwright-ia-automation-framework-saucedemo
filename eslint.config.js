import tseslint from 'typescript-eslint';
import playwrightPlugin from 'eslint-plugin-playwright';

export default [
  {
    ignores: ['node_modules/', 'test-results/', 'playwright-report/', 'auth/', 'data/**/*.json'],
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    plugins: { playwright: playwrightPlugin },
    rules: {
      ...playwrightPlugin.configs['flat/recommended'].rules,
      'playwright/no-wait-for-timeout': 'error',
      'playwright/no-conditional-in-test': 'warn',
      'playwright/expect-expect': 'error',
      'playwright/no-skipped-test': 'warn',
      'playwright/prefer-web-first-assertions': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['**/*.setup.ts'],
    rules: {
      'playwright/expect-expect': 'off',
    },
  },
];
