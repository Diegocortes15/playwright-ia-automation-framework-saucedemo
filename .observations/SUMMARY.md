# What the app did that no test asserted on

Generated 2026-09-06 from the last run. Do not edit — it is rebuilt every time.
Each entry is one fact about the application, not one per feature: to change how it is
classified, edit its `status` and `note` **once** in `.observations/observations.json`.
Marking an entry `ignored` also stops it annotating the Playwright report, everywhere.

**6 not yet reviewed · 5 reviewed.**

## Not yet reviewed

#### ❗ console error

The page wrote an error to the browser console: _"OBSERVATION_PROBE console failure"_.

Seen once between 2026-09-05 and 2026-09-06, across the `_framework_validation` tests. Example: _"console-error detector records a console error raised by the page"_ (chromium-no-auth).

**Not yet reviewed.**

#### ❗ console error

The page wrote an error to the browser console: _"OBSERVATION_PROBE from a failing test"_.

Seen once between 2026-09-05 and 2026-09-06, across the `_framework_validation` tests. Example: _"a failing test still records its observations (expected to fail, reported green)"_ (chromium-no-auth).

**Not yet reviewed.**

#### 💬 dialog

The page opened a native `alert` box saying _"Sorting is broken! This error has been reported to Backtrace."_. The test dismissed it and carried on.

Seen once between 2026-09-05 and 2026-09-06, across the `_framework_validation` tests. Example: _"dialog detector records a real alert, and dismissing it keeps the test running"_ (chromium-no-auth).

**Not yet reviewed.**

#### ⚠️ failed request _(third party)_

The page asked a third-party service for `POST https://events.backtrace.io/api/summed-events/submit?universe=UNIVERSE&token=TOKEN` and got back **401** — the request was rejected as unauthorised.

Seen 7 times between 2026-09-05 and 2026-09-06, across 2 features (`login`, `logout`). Example: _"standard_user logs out from the menu and returns to the login page"_ (chromium-no-auth).

**Not yet reviewed.**

#### ⚠️ failed request _(third party)_

The page asked a third-party service for `POST https://events.backtrace.io/api/unique-events/submit?universe=UNIVERSE&token=TOKEN` and got back **401** — the request was rejected as unauthorised.

Seen 7 times between 2026-09-05 and 2026-09-06, across 2 features (`login`, `logout`). Example: _"standard_user logs out from the menu and returns to the login page"_ (chromium-no-auth).

**Not yet reviewed.**

#### 🔥 page error

JavaScript on the page threw an error nobody caught: _"OBSERVATION_PROBE uncaught failure"_.

Seen once between 2026-09-05 and 2026-09-06, across the `_framework_validation` tests. Example: _"page-error detector records an uncaught exception in page context"_ (chromium-no-auth).

**Not yet reviewed.**

## Already reviewed

#### ⚠️ failed request _(reviewed)_

The page asked the application for `GET https://www.saucedemo.com/cart.html` and got back **404** — the address was not found on the server.

Seen once between 2026-09-04 and 2026-09-06, across 2 features (`burger_menu`, `logout`). Example: _"direct access to /cart.html while logged out is blocked with an error"_ (chromium-no-auth).

**Reviewed — marked `ignored`.** saucedemo is hosted on GitHub Pages with the spa-github-pages shim: the server 404s every deep link and the SPA renders it client-side. Intentional for this app; would be a real finding anywhere else.

#### ⚠️ failed request _(reviewed)_

The page asked the application for `GET https://www.saucedemo.com/checkout-complete.html` and got back **404** — the address was not found on the server.

Seen once between 2026-09-05 and 2026-09-06, across the `logout` tests. Example: _"direct access to /checkout-complete.html while logged out is blocked with an error"_ (chromium-no-auth).

**Reviewed — marked `ignored`.** saucedemo is hosted on GitHub Pages with the spa-github-pages shim: the server 404s every deep link and the SPA renders it client-side. Intentional for this app; would be a real finding anywhere else.

#### ⚠️ failed request _(reviewed)_

The page asked the application for `GET https://www.saucedemo.com/checkout-step-one.html` and got back **404** — the address was not found on the server.

Seen once between 2026-09-04 and 2026-09-06, across 2 features (`checkout`, `logout`). Example: _"direct access to /checkout-step-one.html while logged out is blocked with an error"_ (chromium-no-auth).

**Reviewed — marked `ignored`.** saucedemo is hosted on GitHub Pages with the spa-github-pages shim: the server 404s every deep link and the SPA renders it client-side. Intentional for this app; would be a real finding anywhere else.

#### ⚠️ failed request _(reviewed)_

The page asked the application for `GET https://www.saucedemo.com/checkout-step-two.html` and got back **404** — the address was not found on the server.

Seen once between 2026-09-05 and 2026-09-06, across the `logout` tests. Example: _"direct access to /checkout-step-two.html while logged out is blocked with an error"_ (chromium-no-auth).

**Reviewed — marked `ignored`.** saucedemo is hosted on GitHub Pages with the spa-github-pages shim: the server 404s every deep link and the SPA renders it client-side. Intentional for this app; would be a real finding anywhere else.

#### ⚠️ failed request _(reviewed)_

The page asked the application for `GET https://www.saucedemo.com/inventory.html` and got back **404** — the address was not found on the server.

Seen once between 2026-09-04 and 2026-09-06, across 6 features (`burger_menu`, `cart`, `checkout`, `footer`, `inventory`, `logout`). Example: _"direct access to /inventory.html while logged out is blocked with an error"_ (chromium-no-auth).

**Reviewed — marked `ignored`.** saucedemo is hosted on GitHub Pages with the spa-github-pages shim: the server 404s every deep link and the SPA renders it client-side. Intentional for this app; would be a real finding anywhere else.
