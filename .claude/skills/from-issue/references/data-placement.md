# Data Placement Reference

When `/from-issue` renders a test (Step 7 of [`workflow.md`](workflow.md)), it decides **where the test's data lives**: inline in the spec, or externalized to the framework's `data/` directory. This doc is the decision rule. The default is **inline** — externalize only on a concrete trigger.

## The principle: co-locate by default

Test-local parameterization (a list of users to loop over, a small table of input/expected-error cases) belongs **inline in the spec**, right next to the logic that uses it. This is the prevailing modern practice (Playwright's own docs parameterize inline; the locality/YAGNI principle). Externalizing data into separate files adds file-to-file indirection — a reviewer has to jump away from the test to understand it — and only pays off when the data is genuinely shared or large.

**Do NOT externalize just because the framework has a `data/` directory.** Inline is a first-class, correct choice.

## When to externalize → `data/`

Externalize a dataset to `data/` when **any** of these is true:

| Trigger          | Example                                                                 |
| ---------------- | ----------------------------------------------------------------------- |
| **Reused**       | A product catalog referenced by inventory + cart + checkout specs       |
| **Large**        | A dataset big enough that it drowns the test logic in the spec          |
| **Non-eng owned**| Data a BA/product owner edits without touching test code                |
| **Env-specific** | Values that differ per environment (staging vs prod accounts)           |
| **Named scenario** | A rich multi-field business payload with an identity ("valid checkout", "invalid postal code") |

If **none** apply, keep it inline.

## What is NOT data (keep it in the spec regardless)

- **Expected-result strings** (`'Epic sadface: Username is required'`) are the *asserted behavior*, not input data. They stay in the spec with the assertion, even when the inputs are externalized.
- **Locators / selectors** are the Page Object's concern, never test data.

## How to externalize in THIS framework

Per CLAUDE.md "When extending the framework":

- **Reference data** (shared across features) → `data/shared/<name>.json`
- **Scenario data** (named, per-feature payloads) → `data/scenarios/<feature>/<name>.json`
- **Typed loader** → add to `data/fixtures.ts`, import via the `@data/*` alias
- The spec imports the loader (`import { validCheckout } from '@data/fixtures'`), never reads JSON directly.

When the skill externalizes, it MUST also:

1. Create the `data/...` file(s) and the `data/fixtures.ts` loader entry (with a matching type in `data/types.ts` if the framework keeps types there).
2. Stage them in Step 11 alongside the spec.
3. Flag them in the PR body's "Notes for reviewer" as a side effect (same as a scaffolded Page Object), e.g. `⚠️ Externalized N checkout scenarios to data/scenarios/checkout/ + loader in data/fixtures.ts.`

## Worked examples

### Login (INLINE — correct)

The five valid users and the missing-field cases are small, login-only, engineer-owned, not reused. None of the triggers fire.

```ts
const loginUsers = ['standard_user', 'problem_user', 'performance_glitch_user', 'error_user', 'visual_user'];

const requiredFieldCases = [
  { username: '', password: '', error: 'Epic sadface: Username is required', desc: 'no credentials' },
  // ...
];
```

This is the right output. Do not create a `data/scenarios/login/` file for it.

### Checkout (EXTERNALIZE — named scenarios)

A checkout issue brings rich, named, reusable payloads (customer info + expected order total). Externalize:

```jsonc
// data/scenarios/checkout/valid-checkout.json
{ "firstName": "Ada", "lastName": "Lovelace", "postalCode": "12345", "expectedTotal": "$58.29" }
```

```ts
// data/fixtures.ts gains a typed loader
export const validCheckout: CheckoutScenario = load('scenarios/checkout/valid-checkout.json');
```

```ts
// the spec imports it — no inline payload
import { validCheckout } from '@data/fixtures';
```

### Product catalog (EXTERNALIZE — shared reference)

The list of saucedemo products is reference data used by inventory, cart, and checkout specs → `data/shared/products.json`. Reused ⇒ externalize.

## See also

- [`test-principles.md`](test-principles.md) — F.I.R.S.T. (Repeatable/Independent overlap with data choices)
- [`test-template.md`](test-template.md) — the spec the data lands in
- CLAUDE.md "When extending the framework" — the `data/` layout + `@data/*` alias (single source of truth)
