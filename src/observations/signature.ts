import type { ObservationEvent } from './types';

// Pure helpers: identity and provenance of an observation. No I/O, no Playwright —
// so they stay unit-testable and behave identically in the fixture and the reporter.

/** URL without its query string or hash. Varying ids/tokens must not fork a signature. */
export function stripQuery(url: string): string {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`;
  } catch {
    return url.split('?')[0].split('#')[0];
  }
}

export function hostOf(url: string): string | undefined {
  try {
    return new URL(url).host;
  } catch {
    return undefined;
  }
}

/**
 * True when the URL's host differs from the app under test. Purely mechanical —
 * it marks provenance so a 500 from your own API stands out next to a third-party
 * 401. Third-party observations are recorded, never dropped: in a real app they
 * are often exactly what explains a failure.
 */
export function isThirdParty(url: string | undefined, baseUrl: string): boolean {
  if (!url) return false;
  const host = hostOf(url);
  const base = hostOf(baseUrl);
  if (!host || !base) return false;
  return host !== base;
}

/** Collapse a message to a stable, bounded signature fragment. */
function normalize(message: string): string {
  return message.replace(/\s+/g, ' ').trim().slice(0, 200);
}

export function signatureFor(event: ObservationEvent): string {
  switch (event.kind) {
    case 'failed-request':
      return [
        'failed-request',
        event.method ?? 'GET',
        stripQuery(event.url ?? ''),
        event.httpStatus ?? 0,
      ].join(':');
    case 'dialog':
      return ['dialog', event.dialogType ?? 'unknown', normalize(event.message)].join(':');
    case 'page-error':
      return ['page-error', normalize(event.message)].join(':');
    case 'console-error':
    default:
      return ['console-error', normalize(event.message)].join(':');
  }
}
