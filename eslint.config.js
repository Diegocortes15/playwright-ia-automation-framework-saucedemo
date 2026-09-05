import tseslint from 'typescript-eslint';
import playwrightPlugin from 'eslint-plugin-playwright';

export default [
  {
    ignores: ['node_modules/', 'test-results/', 'playwright-report/', 'auth/'],
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

      // Selector preference order (CLAUDE.md): [data-test] -> getByRole -> text -> CSS,
      // and never XPath. Prose asked the agent to respect it and nothing checked; these
      // make the floor deterministic (ADR-0022). A fallback is still allowed — it just has
      // to be declared with `eslint-disable-next-line no-restricted-syntax -- <reason>`,
      // which turns an invisible downgrade into a reviewed one.
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.property.name='locator'][arguments.0.value=/^(\\/\\/|\\(|xpath=)/]",
          message:
            'XPath is never allowed (CLAUDE.md). Use [data-test="..."], then getByRole, then text.',
        },
        {
          selector:
            "CallExpression[callee.property.name='locator'][arguments.0.value=/^(?!\\[data-test)/]",
          message:
            'Selector below the preferred level: prefer [data-test="..."], then getByRole/getByText. If no data-test exists, or it cannot express what you need (e.g. an error STATE), keep this and add: eslint-disable-next-line no-restricted-syntax -- <verified reason>.',
        },
      ],
    },
  },
  {
    files: ['**/*.setup.ts'],
    rules: {
      'playwright/expect-expect': 'off',
    },
  },
];
