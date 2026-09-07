# Saucedemo — Users

Saucedemo provides 6 user accounts. The password is the same for all (`secret_sauce`, also documented in [`overview.md`](overview.md)). Each user surfaces a different intentional behavior, and each maps to a Playwright project in `playwright.config.ts`.

## Summary

| Username                  | Project(s)                                           | Intent                                                      |
| ------------------------- | ---------------------------------------------------- | ----------------------------------------------------------- |
| `standard_user`           | `standard`, `firefox-standard`, `webkit-standard`    | Happy path — everything works                               |
| `locked_out_user`         | `no-auth` (login test only — no storageState exists) | Login fails with a lockout error                            |
| `problem_user`            | `problem`                                            | Wrong product images; broken sort dropdown                  |
| `performance_glitch_user` | `performance_glitch`                                 | ~10s artificial delay on every navigation                   |
| `error_user`              | `error`                                              | Broken sort dropdown (same as problem); intermittent errors |
| `visual_user`             | `visual`                                             | Intentional visual regressions (font sizes, colors)         |

## Per-user details

### `standard_user`

- **Behavior:** Fully functional. Sort works. Cart add/remove works. Checkout flow works.
- **Used by:** `standard` chromium project, `firefox-standard`, `webkit-standard`.
- **Test scope:** Default user for happy-path tests. Cross-browser smoke runs against this user only.

### `locked_out_user`

- **Behavior:** Login fails. Saucedemo returns the error: _"Epic sadface: Sorry, this user has been locked out."_
- **Used by:** Login spec only (`tests/login/login.spec.ts`, tagged `@no-auth`).
- **Why no storageState:** Authentication never succeeds, so there is no session to save. This user is the only reason the `no-auth` Playwright project exists.

### `problem_user`

- **Behavior:** Two known intentional bugs:
  1. **Wrong product images** — every product on the inventory page renders the same broken-image asset, regardless of which product it is. Captured by `tests/inventory/inventory.spec.ts` (the `@problem` context's Edge bucket).
  2. **Broken sort dropdown** — the control **discards the selection entirely**: after selecting any option, the `<select>`'s own `value` reverts to `az`, the active-option label stays "Name (A to Z)", and the order never changes. Measured live 2026-09-07 against `standard_user` as a control, which returns `value: "lohi"` and reorders correctly on identical steps.

     This corrects an earlier description here — "accepts the click but does not re-order" — which implied the control registered the selection. It does not. The distinction matters: a test that asserts only the resulting order would pass through the wrong mechanism.

     Filed as **SW-14**, and covered by the `test.fail()`-annotated tests in the `@problem` context of `tests/inventory/inventory.spec.ts` (ADR-0024). **This entry is a defect log, not a specification** — it records that the bug is known, not that the behaviour is correct.

- **Used by:** `problem` chromium project.

### `performance_glitch_user`

- **Behavior:** Artificially slow. Each page navigation takes ~10 seconds (saucedemo injects a deliberate delay). Functionality is otherwise correct.
- **Used by:** `performance_glitch` chromium project.
- **Special config:** `playwright.config.ts` gives this project a `navigationTimeout: 30_000` override (the global default is 15s, which would flake under load).

### `error_user`

- **Behavior:** Same broken sort dropdown as `problem_user`. Some intermittent UI errors. Functional flows (cart, checkout) work.
- **Used by:** `error` chromium project.
- **Excluded from:** `@sort-functional` tests (sort doesn't work for this user).

### `visual_user`

- **Behavior:** Intentional visual regressions — font sizes wrong, button colors off. Functional flows are correct.
- **Used by:** `visual` chromium project.
- **Test scope:** Cart, browse, sort tests pass functionally; visual differences would be caught by visual regression tests (Phase D).

## Tag mapping

For the per-tag → per-project mapping, see [`CLAUDE.md`](../../CLAUDE.md) (section "Tag conventions").
