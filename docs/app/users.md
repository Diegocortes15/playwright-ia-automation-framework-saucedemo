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
  1. **Wrong product images** — every product on the inventory page renders the same broken-image asset, regardless of which product it is. Captured by `tests/visual/inventory-images.spec.ts`.
  2. **Broken sort dropdown** — selecting any sort option (Z→A, low→high, high→low) leaves the inventory in default A→Z order. The sort dropdown UI accepts the click but does not re-order. This is why `@sort-functional` excludes `problem_user`.
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
