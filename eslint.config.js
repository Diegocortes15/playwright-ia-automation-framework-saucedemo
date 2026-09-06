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

      // XPath is the one selector rule CLAUDE.md states as absolute ("Never use XPath"),
      // and it is the only one worth failing a build over: it encodes document structure,
      // so it breaks on layout changes that touch nothing else.
      //
      // The rest of the preference order ([data-test] -> getByRole -> text -> CSS) stays
      // AUTHORING guidance, not a build gate. A unique, stable locator that works is fine
      // regardless of which level it came from; a rule that fails on `#stable-id` only
      // teaches people to silence it, and eslint-disable sprawl is worse than no rule.
      // Fragility is proven by a test failing, not by an attribute's name.
      'no-restricted-syntax': [
        'error',
        {
          // ADR-0023: JSON is loaded through the typed fs loader in data/fixtures.ts, not
          // ESM import attributes. ADR-0005 chose attributes, they were implemented, and they
          // were removed months later as brittle through Playwright's ESM loader — while the
          // ADR sat 'Accepted' the whole time because nothing checked. This is that check.
          selector: 'ImportDeclaration[attributes.length>0]',
          message:
            "Import attributes are not used in this project (ADR-0023, superseding ADR-0005): they proved brittle through Playwright's ESM loader. Load JSON via the typed loader in data/fixtures.ts.",
        },
        {
          selector:
            "CallExpression[callee.property.name='locator'][arguments.0.value=/^(\\/\\/|\\(|xpath=)/]",
          message:
            'XPath is never allowed (CLAUDE.md). Use [data-test="..."], then getByRole, then text, then CSS.',
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
