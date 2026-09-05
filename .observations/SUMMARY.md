# What the app did that no test asserted on

Generated 2026-09-05 from the last run. Do not edit — it is rebuilt every time.
To change how an entry is classified, edit its `status` and `note` in the matching
`.observations/<feature>.json`; marking one `ignored` also stops it annotating the
Playwright report.

**8 not yet reviewed · 12 reviewed.**

## Not yet reviewed

### `_framework_validation`

#### 🔎 console error

The page wrote an error to the browser console: _"OBSERVATION_PROBE console failure"_.

Seen once on 2026-09-05. First noticed while running _"console-error detector records a console error raised by the page"_ (chromium-no-auth).

**Not yet reviewed.**

#### 🔎 console error

The page wrote an error to the browser console: _"OBSERVATION_PROBE from a failing test"_.

Seen once on 2026-09-05. First noticed while running _"a failing test still records its observations (expected to fail, reported green)"_ (chromium-no-auth).

**Not yet reviewed.**

#### 🔎 dialog

The page opened a native `alert` box saying _"Sorting is broken! This error has been reported to Backtrace."_. The test dismissed it and carried on.

Seen once on 2026-09-05. First noticed while running _"dialog detector records a real alert, and dismissing it keeps the test running"_ (chromium-no-auth).

**Not yet reviewed.**

#### 🔎 page error

JavaScript on the page threw an error nobody caught: _"OBSERVATION_PROBE uncaught failure"_.

Seen once on 2026-09-05. First noticed while running _"page-error detector records an uncaught exception in page context"_ (chromium-no-auth).

**Not yet reviewed.**

### `login`

#### 🔎 failed request _(third party)_

The page asked a third-party service for `POST https://events.backtrace.io/api/summed-events/submit?universe=UNIVERSE&token=TOKEN` and got back **401** — the request was rejected as unauthorised.

Seen once on 2026-09-05. First noticed while running _"performance_glitch_user logs in successfully and lands on inventory"_ (chromium-no-auth).

**Not yet reviewed.**

#### 🔎 failed request _(third party)_

The page asked a third-party service for `POST https://events.backtrace.io/api/unique-events/submit?universe=UNIVERSE&token=TOKEN` and got back **401** — the request was rejected as unauthorised.

Seen once on 2026-09-05. First noticed while running _"performance_glitch_user logs in successfully and lands on inventory"_ (chromium-no-auth).

**Not yet reviewed.**

### `logout`

#### 🔎 failed request _(third party)_

The page asked a third-party service for `POST https://events.backtrace.io/api/summed-events/submit?universe=UNIVERSE&token=TOKEN` and got back **401** — the request was rejected as unauthorised.

Seen 6 times on 2026-09-05. First noticed while running _"standard_user logs out from the menu and returns to the login page"_ (chromium-no-auth).

**Not yet reviewed.**

#### 🔎 failed request _(third party)_

The page asked a third-party service for `POST https://events.backtrace.io/api/unique-events/submit?universe=UNIVERSE&token=TOKEN` and got back **401** — the request was rejected as unauthorised.

Seen 6 times on 2026-09-05. First noticed while running _"standard_user logs out from the menu and returns to the login page"_ (chromium-no-auth).

**Not yet reviewed.**

## Already reviewed

### `burger_menu`

#### 🔇 failed request

The page asked the application for `GET https://www.saucedemo.com/cart.html` and got back **404** — the address was not found on the server.

Seen 2 times between 2026-09-04 and 2026-09-05. First noticed while running _"Reset App State clears the cart badge, reverts buttons, and empties the cart"_ (chromium-standard).

**Reviewed — marked `ignored`.** saucedemo is hosted on GitHub Pages with the spa-github-pages shim: the server 404s every deep link and the SPA renders it client-side. Intentional for this app; would be a real finding anywhere else.

#### 🔇 failed request

The page asked the application for `GET https://www.saucedemo.com/inventory.html` and got back **404** — the address was not found on the server.

Seen 6 times between 2026-09-04 and 2026-09-05. First noticed while running _"burger menu lists the All Items, About, and Reset App State options"_ (chromium-standard).

**Reviewed — marked `ignored`.** saucedemo is hosted on GitHub Pages with the spa-github-pages shim: the server 404s every deep link and the SPA renders it client-side. Intentional for this app; would be a real finding anywhere else.

### `cart`

#### 🔇 failed request

The page asked the application for `GET https://www.saucedemo.com/inventory.html` and got back **404** — the address was not found on the server.

Seen 8 times between 2026-09-04 and 2026-09-05. First noticed while running _"adding a product shows a cart badge count of one"_ (chromium-standard).

**Reviewed — marked `ignored`.** saucedemo is hosted on GitHub Pages with the spa-github-pages shim: the server 404s every deep link and the SPA renders it client-side. Intentional for this app; would be a real finding anywhere else.

### `checkout`

#### 🔇 failed request

The page asked the application for `GET https://www.saucedemo.com/checkout-step-one.html` and got back **404** — the address was not found on the server.

Seen 9 times between 2026-09-04 and 2026-09-05. First noticed while running _"mandatory fields show their placeholder text"_ (chromium-standard).

**Reviewed — marked `ignored`.** saucedemo is hosted on GitHub Pages with the spa-github-pages shim: the server 404s every deep link and the SPA renders it client-side. Intentional for this app; would be a real finding anywhere else.

#### 🔇 failed request

The page asked the application for `GET https://www.saucedemo.com/inventory.html` and got back **404** — the address was not found on the server.

Seen 11 times between 2026-09-04 and 2026-09-05. First noticed while running _"checkout button on the cart page navigates to Checkout: Your Information"_ (chromium-standard).

**Reviewed — marked `ignored`.** saucedemo is hosted on GitHub Pages with the spa-github-pages shim: the server 404s every deep link and the SPA renders it client-side. Intentional for this app; would be a real finding anywhere else.

### `footer`

#### 🔇 failed request

The page asked the application for `GET https://www.saucedemo.com/inventory.html` and got back **404** — the address was not found on the server.

Seen 4 times between 2026-09-04 and 2026-09-05. First noticed while running _"footer Twitter link points to its Sauce Labs URL"_ (chromium-standard).

**Reviewed — marked `ignored`.** saucedemo is hosted on GitHub Pages with the spa-github-pages shim: the server 404s every deep link and the SPA renders it client-side. Intentional for this app; would be a real finding anywhere else.

### `inventory`

#### 🔇 failed request

The page asked the application for `GET https://www.saucedemo.com/inventory.html` and got back **404** — the address was not found on the server.

Seen 11 times between 2026-09-04 and 2026-09-05. First noticed while running _"all six product images render with distinct, non-empty sources"_ (chromium-standard).

**Reviewed — marked `ignored`.** saucedemo is hosted on GitHub Pages with the spa-github-pages shim: the server 404s every deep link and the SPA renders it client-side. Intentional for this app; would be a real finding anywhere else.

### `logout`

#### 🔇 failed request

The page asked the application for `GET https://www.saucedemo.com/cart.html` and got back **404** — the address was not found on the server.

Seen once on 2026-09-05. First noticed while running _"direct access to /cart.html while logged out is blocked with an error"_ (chromium-no-auth).

**Reviewed — marked `ignored`.** saucedemo is hosted on GitHub Pages with the spa-github-pages shim: the server 404s every deep link and the SPA renders it client-side. Intentional for this app; would be a real finding anywhere else.

#### 🔇 failed request

The page asked the application for `GET https://www.saucedemo.com/checkout-complete.html` and got back **404** — the address was not found on the server.

Seen once on 2026-09-05. First noticed while running _"direct access to /checkout-complete.html while logged out is blocked with an error"_ (chromium-no-auth).

**Reviewed — marked `ignored`.** saucedemo is hosted on GitHub Pages with the spa-github-pages shim: the server 404s every deep link and the SPA renders it client-side. Intentional for this app; would be a real finding anywhere else.

#### 🔇 failed request

The page asked the application for `GET https://www.saucedemo.com/checkout-step-one.html` and got back **404** — the address was not found on the server.

Seen once on 2026-09-05. First noticed while running _"direct access to /checkout-step-one.html while logged out is blocked with an error"_ (chromium-no-auth).

**Reviewed — marked `ignored`.** saucedemo is hosted on GitHub Pages with the spa-github-pages shim: the server 404s every deep link and the SPA renders it client-side. Intentional for this app; would be a real finding anywhere else.

#### 🔇 failed request

The page asked the application for `GET https://www.saucedemo.com/checkout-step-two.html` and got back **404** — the address was not found on the server.

Seen once on 2026-09-05. First noticed while running _"direct access to /checkout-step-two.html while logged out is blocked with an error"_ (chromium-no-auth).

**Reviewed — marked `ignored`.** saucedemo is hosted on GitHub Pages with the spa-github-pages shim: the server 404s every deep link and the SPA renders it client-side. Intentional for this app; would be a real finding anywhere else.

#### 🔇 failed request

The page asked the application for `GET https://www.saucedemo.com/inventory.html` and got back **404** — the address was not found on the server.

Seen once on 2026-09-05. First noticed while running _"direct access to /inventory.html while logged out is blocked with an error"_ (chromium-no-auth).

**Reviewed — marked `ignored`.** saucedemo is hosted on GitHub Pages with the spa-github-pages shim: the server 404s every deep link and the SPA renders it client-side. Intentional for this app; would be a real finding anywhere else.
