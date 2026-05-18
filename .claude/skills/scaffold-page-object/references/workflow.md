# scaffold-page-object Workflow

The 12-step procedural workflow Claude follows when the `scaffold-page-object` skill is invoked.

## Inputs

- **URL** (required) — e.g., `https://www.saucedemo.com/cart.html`
- **Page name** (required) — e.g., `CartPage` (PascalCase, no `.ts` suffix)
- **Output path** (optional) — defaults per step 10; `scratch/<Name>.ts` for verification, `src/pages/<Name>.ts` for real work
- **storageState path** (optional) — e.g., `auth/standard.json`; no auth assumed if omitted

## Steps

### 1. Validate inputs

Check that URL and page name are present. If either is missing, ask the user; don't guess.

### 2. Verify storageState file exists (if provided)

If the user gave a storageState path, use `Read` to confirm it exists. If missing, abort with:

> _"storageState file not found at `<path>`. Run `npm test` (or `npx playwright test --project=setup`) to generate it."_

### 3. Refuse to overwrite

If the resolved output path already exists (use `Glob` or `Read` to check), abort with:

> _"`<path>` exists. `rm` it and re-run, or pick a different output path."_

No merging, no overwriting. Predictable safety.

### 4. Hybrid auto-discover of framework components

Two-source comparison:

**a) Canonical list:** `Glob src/components/*.ts` to get all framework components by filename (e.g., `Header.ts` → `Header`).

**b) Detection signatures:** `Read references/component-detection.md` to get the per-component root-selector signatures.

**Compare:** If the folder contains a component file with no signature in the doc, emit a loud warning and abort:

> _"Found `src/components/<NewName>.ts` but no detection signature in `references/component-detection.md`. Add a signature row before re-running."_

This prevents silently missing newly-added components.

### 5. Open the page via playwright-cli

```bash
# Unauthenticated (no storageState):
playwright-cli open <url>

# Authenticated (storageState provided):
playwright-cli open
playwright-cli state-load <path>
playwright-cli goto <url>
```

**Caveat — `state-load` limitation:** `playwright-cli`'s `state-load` calls `setStorageState` on an existing context, which restores cookies + localStorage but **does NOT restore sessionStorage** (sessionStorage is per-tab and can't be reapplied after page creation). For apps that gate routes on a sessionStorage flag (saucedemo is one such app — `session-username` lives in sessionStorage), `state-load` followed by `goto` redirects back to the login page. If you detect this redirect (page URL doesn't match the target after `goto`), fall back to manual login via `playwright-cli fill` + `click` against the login form, then `goto` the target URL.

### 6. Snapshot the page

```bash
playwright-cli snapshot
```

Returns a structured tree with element refs.

### 7. Detect framework components

Walk the snapshot for each component signature loaded in step 4. For each match, mark the component for composition (not re-generation of its constituent locators).

### 8. Generate locators for non-component elements

For each remaining interactive element (excluding any covered by detected components):

```bash
playwright-cli generate-locator <ref>
```

Pick a semantic field name from the element's accessible name. **Naming rule:**

- Start from the accessible name
- Normalize to camelCase
- Strip filler words: `to`, `the`, `and`, `a`, `of`
- Favor brevity when meaning is preserved
- Examples:
  - `"Continue to Checkout"` → `clickContinue` (not `clickContinueToCheckout`)
  - `"First Name"` → `firstNameInput`
  - `"Add to cart"` → `clickAddToCart` (keeping "to cart" preserves meaning — without it, ambiguous)

Edge cases (e.g., two buttons with the same name on one page) get caught in C.2 review.

### 9. Render the Page Object

Following `references/page-object-template.md`:

- Top-of-file comment block (mandatory; YYYY-MM-DD = today's date in the user's local time)
- Imports (`type Locator`, `type Page` from `@playwright/test`; detected component classes from `@components/*`)
- `readonly` fields — composed components first, page-direct locators second (ADR-0001 rule #6)
- Constructor — wire components first, then page-direct locators in declaration order
- Action methods — one per interactive element type:
  - Button → `click<Name>(): Promise<void>`
  - Input → `fill<Name>(value: string): Promise<void>`
  - Select → `select<Name>(value: string): Promise<void>`

### 10. Write the file

Default output path:

- If the user gave one explicitly, use it
- Else if URL contains `/checkout-step` or `/checkout-complete`, write to `src/pages/checkout/<Name>.ts`
- Else write to `src/pages/<Name>.ts`

Use the `Write` tool. (Step 3 already confirmed the path didn't exist.)

### 11. Isolated typecheck of the generated file

A bare `npx tsc --noEmit <path>` does NOT pick up the project's `tsconfig.json` — it falls back to TS defaults without `paths` aliases, so any file using `@components/*` or `@playwright/test` types would fail with "Cannot find module" errors that aren't real.

Use a one-shot tsconfig that extends the project's settings.

1. **Write a throwaway tsconfig** via the `Write` tool (cross-platform; no shell heredoc) at `.tsconfig.scratch.json`:

   ```json
   {
     "extends": "./tsconfig.json",
     "include": ["<path-to-generated-file>"],
     "exclude": []
   }
   ```

2. **Typecheck via the temp tsconfig** (Bash):

   ```bash
   npx tsc --noEmit -p .tsconfig.scratch.json
   ```

3. **Always clean up** (Bash; whether typecheck passed or failed):

   ```bash
   rm .tsconfig.scratch.json
   ```

This runs the project's strict TS settings (with `paths` aliases) against the single generated file, regardless of whether it landed in `src/pages/` (in `tsconfig.json` include) or `scratch/` (excluded from project-wide typecheck).

- If typecheck **passes**, record the pass for step 12's report
- If typecheck **fails**, leave the file in place and capture the errors verbatim for step 12
- **Always remove `.tsconfig.scratch.json`** before reporting — it must not linger in the working tree

The project-wide `npm run typecheck` is unaffected — `scratch/` stays excluded so half-baked AI files don't break the global build.

### 12. Report what landed

Report to the user:

- Output file path
- List of composed components (if any)
- List of generated page-direct locators (field name → selector)
- List of generated action methods
- Isolated-typecheck result (PASS or list of errors verbatim)
- Confirmation that the top-of-file comment block landed (first 4 lines of the file match the template)
