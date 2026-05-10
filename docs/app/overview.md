# Saucedemo — Overview

[Saucedemo](https://www.saucedemo.com) is a public e-commerce demo application provided by Sauce Labs. It is intentionally seeded with bugs across multiple user accounts so that test automation tools and developers can exercise their tooling against realistic-but-controlled failures.

## Why this framework targets it

- **Public and free.** No sign-up, no credentials beyond the published demo password.
- **Stable URL and behavior.** The app rarely changes; tests written against it stay green for years.
- **Deliberate bugs.** Six user accounts each surface different problems — broken images, slow page loads, broken sort dropdowns, validation quirks. Perfect for proving a test framework catches what it should and ignores what it should ignore.
- **Well-known among QA engineers.** Onboarding new contributors (or AI agents) is fast because the app is widely documented.

## Base URL

`https://www.saucedemo.com`

Override locally via `SAUCEDEMO_BASE_URL` in `.env`. Default is set in `playwright.config.ts`.

## Public credentials

The username for each user is documented in [`users.md`](users.md). The password is the same for all users and is the published value `secret_sauce`.

Although `secret_sauce` is public, this framework treats it as a secret in `.env` (loaded via `src/utils/env.ts`). This is intentional — it sets the right pattern for future projects that test apps with real credentials.

## See also

- [`users.md`](users.md) — the 6 user accounts and their per-user behaviors
- [`flows.md`](flows.md) — login, browse, sort, cart, and checkout user journeys
- [`../architecture.md`](../architecture.md) — how this framework is organized
