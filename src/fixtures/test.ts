import { basename, dirname } from 'node:path';
import { test as base, expect } from '@playwright/test';
import { LoginPage } from '@pages/LoginPage';
import { InventoryPage } from '@pages/InventoryPage';
import { CartPage } from '@pages/CartPage';
import { CheckoutInfoPage } from '@pages/checkout/CheckoutInfoPage';
import { CheckoutOverviewPage } from '@pages/checkout/CheckoutOverviewPage';
import { CheckoutCompletePage } from '@pages/checkout/CheckoutCompletePage';
import { reportAnnotations } from '@utils/report-annotations';
import { describeEvent, groupOf, type ObservationGroup } from '../observations/digest';
import { isThirdParty, signatureFor } from '../observations/signature';
import { ignoredSignatures } from '../observations/triage';
import { ATTACHMENT_NAME, MAX_EVENTS_PER_TEST, type ObservationEvent } from '../observations/types';

type Pages = {
  loginPage: LoginPage;
  inventoryPage: InventoryPage;
  cartPage: CartPage;
  checkoutInfoPage: CheckoutInfoPage;
  checkoutOverviewPage: CheckoutOverviewPage;
  checkoutCompletePage: CheckoutCompletePage;
};

export const test = base.extend<
  Pages & { _reportAnnotation: void; _observations: ObservationEvent[] }
>({
  // Auto fixture — annotate each test in the Playwright report with its Jira
  // ticket link(s) and the acceptance criterion it covers, derived from
  // `.tcms/records/<feature>.json` (feature = the spec's parent dir). No per-test
  // boilerplate; correct for augmented multi-ticket feature files.
  _reportAnnotation: [
    async ({}, use, testInfo) => {
      const feature = basename(dirname(testInfo.file));
      testInfo.annotations.push(...reportAnnotations(feature, testInfo.title));
      await use();
    },
    { auto: true },
  ],

  // Auto fixture — record what the app did that nobody asserted on: console errors,
  // uncaught page errors, 4xx/5xx responses, and dialogs (ADR-0021). Detection is
  // deterministic and never judges; the ObservationsReporter deduplicates and writes.
  // Every handler swallows its own errors: observations must never fail a test.
  _observations: [
    async ({ page, baseURL }, use, testInfo) => {
      const events: ObservationEvent[] = [];
      const record = (event: ObservationEvent): void => {
        if (events.length < MAX_EVENTS_PER_TEST) events.push(event);
      };

      page.on('console', (message) => {
        try {
          if (message.type() !== 'error') return;
          // The browser echoes every failed resource load to the console. The
          // `response` handler already records those with method, status and URL,
          // so keeping both would double-report one event.
          if (message.text().startsWith('Failed to load resource')) return;
          record({ kind: 'console-error', message: message.text(), url: message.location().url });
        } catch {
          /* observations never break a test */
        }
      });

      page.on('pageerror', (error) => {
        try {
          record({ kind: 'page-error', message: error.message, url: page.url() });
        } catch {
          /* observations never break a test */
        }
      });

      page.on('response', (response) => {
        try {
          const httpStatus = response.status();
          if (httpStatus < 400) return;
          record({
            kind: 'failed-request',
            // HTTP/2 responses carry no status text, so fall back to the code alone.
            message: [httpStatus, response.statusText()].filter(Boolean).join(' ').trim(),
            url: response.url(),
            method: response.request().method(),
            httpStatus,
          });
        } catch {
          /* observations never break a test */
        }
      });

      // Registering ANY dialog listener disables Playwright's automatic dismissal,
      // so this handler must dismiss the dialog itself to preserve default behavior.
      // The catch covers a test that registers its own handler and gets there first.
      page.on('dialog', (dialog) => {
        try {
          record({
            kind: 'dialog',
            message: dialog.message(),
            dialogType: dialog.type(),
            url: page.url(),
          });
        } catch {
          /* observations never break a test */
        }
        void dialog.dismiss().catch(() => {});
      });

      // Auto fixtures still provide a value, so a test that names `_observations` can read
      // what the page has produced so far. Nothing else needs it — but without it the
      // detectors below are unassertable, and three of the four had never fired.
      await use(events);

      if (events.length > 0) {
        // Structured record for ObservationsReporter — not meant to be read by a person.
        await testInfo.attach(ATTACHMENT_NAME, {
          body: JSON.stringify(events),
          contentType: 'application/json',
        });

        const ignored = ignoredSignatures();
        const seen = new Map<string, ObservationEvent>();
        for (const event of events) {
          const key = `${event.kind}:${event.httpStatus ?? ''}:${event.url ?? event.message}`;
          if (!seen.has(key) && !ignored.has(signatureFor(event))) seen.set(key, event);
        }

        // Grouped the way a reader would look for them — the devtools tabs they map to.
        const groups = new Map<ObservationGroup, string[]>();
        for (const event of seen.values()) {
          const group = groupOf(event.kind);
          const line = describeEvent(event.kind, event, isThirdParty(event.url, baseURL ?? ''));
          groups.set(group, [...(groups.get(group) ?? []), line]);
        }

        for (const [group, lines] of groups) {
          // text/plain renders inline in the HTML report, so it reads without downloading.
          await testInfo.attach(`observations — ${group}`, {
            body: lines.map((line, i) => `${i + 1}. ${line}`).join('\n\n'),
            contentType: 'text/plain',
          });

          // One chip per group under the test title. The annotation TYPE is shown as its
          // label, so Network and Console separate visually instead of blurring together.
          testInfo.annotations.push({
            type: `observations: ${group.toLowerCase()}`,
            description:
              lines.length === 1
                ? lines[0].slice(0, 300)
                : `${lines.length} — see the "observations — ${group}" attachment`,
          });
        }
      }
    },
    { auto: true },
  ],

  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  inventoryPage: async ({ page }, use) => {
    await use(new InventoryPage(page));
  },
  cartPage: async ({ page }, use) => {
    await use(new CartPage(page));
  },
  checkoutInfoPage: async ({ page }, use) => {
    await use(new CheckoutInfoPage(page));
  },
  checkoutOverviewPage: async ({ page }, use) => {
    await use(new CheckoutOverviewPage(page));
  },
  checkoutCompletePage: async ({ page }, use) => {
    await use(new CheckoutCompletePage(page));
  },
});
export { expect };
