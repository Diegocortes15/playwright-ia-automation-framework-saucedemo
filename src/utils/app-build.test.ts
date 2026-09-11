import { test, expect } from '@playwright/test';
import { extractFingerprint, formatAppBuild, probeAppBuild, type AppBuild } from './app-build';

const sample: AppBuild = {
  baseUrl: 'https://www.saucedemo.com',
  declared: undefined,
  fingerprint: 'index-DtWleVu9.js',
  probedAt: '2026-09-11T12:00:00.000Z',
};

// The real shape, taken from saucedemo's own served HTML.
const REAL_HTML = `<!DOCTYPE html><html><head>
  <script type="module" crossorigin src="/assets/index-DtWleVu9.js"></script>
  <link rel="stylesheet" href="/assets/index-CxRLXQmL.css">
</head><body></body></html>`;

test('extractFingerprint reads the hashed bundle a redeploy changes', () => {
  expect(extractFingerprint(REAL_HTML)).toBe('index-DtWleVu9.js');
});

test('extractFingerprint falls back to ETag, then Last-Modified, then says so', () => {
  const bare = '<html><head></head><body>no bundled assets here</body></html>';
  expect(extractFingerprint(bare, new Headers({ etag: '"abc123"' }))).toBe('etag:abc123');
  expect(
    extractFingerprint(bare, new Headers({ 'last-modified': 'Wed, 10 Sep 2026 00:00:00 GMT' })),
  ).toBe('last-modified:Wed, 10 Sep 2026 00:00:00 GMT');
  expect(extractFingerprint(bare)).toBe('unidentified');
});

// An unhashed script must NOT be mistaken for a build fingerprint: it never changes, so it
// would report "nothing moved" on every run, which is worse than reporting nothing.
test('extractFingerprint ignores an asset with no hash in its name', () => {
  expect(extractFingerprint('<script src="/js/main.js"></script>')).toBe('unidentified');
});

// The load-bearing property: a probe may never fail a run.
test('probeAppBuild records a failure instead of throwing it', async () => {
  const rejects = (): Promise<Response> => Promise.reject(new Error('ECONNREFUSED'));
  expect((await probeAppBuild('https://example.invalid', undefined, rejects)).fingerprint).toBe(
    'unreachable',
  );

  const notFound = (): Promise<Response> => Promise.resolve(new Response('', { status: 503 }));
  expect((await probeAppBuild('https://example.invalid', undefined, notFound)).fingerprint).toBe(
    'http-503',
  );
});

test('probeAppBuild keeps the declared version, and treats blank as absent', async () => {
  const ok = (): Promise<Response> => Promise.resolve(new Response(REAL_HTML));
  expect((await probeAppBuild('https://x.test', ' 2.4.0-hotfix.1 ', ok)).declared).toBe(
    '2.4.0-hotfix.1',
  );
  expect((await probeAppBuild('https://x.test', '   ', ok)).declared).toBeUndefined();
  expect((await probeAppBuild('https://x.test', undefined, ok)).declared).toBeUndefined();
});

test('formatAppBuild omits the declared half rather than printing "none"', () => {
  expect(formatAppBuild(sample)).toBe('www.saucedemo.com · build index-DtWleVu9.js');
  expect(formatAppBuild({ ...sample, declared: '2.4.0-hotfix.1' })).toBe(
    'www.saucedemo.com · build index-DtWleVu9.js · declared 2.4.0-hotfix.1',
  );
});
