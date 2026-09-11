import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

// Records WHICH BUILD OF THE APPLICATION a run exercised.
//
// `run-environment.ts` answers "what did we run WITH" — OS, engines, Node, Playwright.
// This answers "what did we run AGAINST", and that is the field triage actually turns on:
// when a test fails, the first question is whether anything changed on our side or on
// theirs, and without this the second half is unanswerable.
//
// Two values, deliberately, because they fail in different ways:
//
//   declared    — what a person says is under test ('2.4.0-hotfix.1'). Matches how a team
//                 already talks about a run, and is the only one that carries meaning.
//                 It can also be stale, copied from the last run, or simply wrong.
//   fingerprint — what the deployment actually served. Carries no meaning on its own and
//                 cannot lie. A change in it is proof the app moved.
//
// The fingerprint is not a nicety. On 2026-09-11 two tests broke because saucedemo had
// been redeployed with `role="button"` added to a card's links, and the only reason that
// was provable rather than suspected is that a bundle URL happened to be sitting in the
// observations index. This makes that evidence deliberate instead of accidental.

export interface AppBuild {
  baseUrl: string;
  declared: string | undefined;
  fingerprint: string;
  probedAt: string; // ISO-8601, so two runs can be compared without guessing which is older
}

// A hashed asset filename, e.g. `index-DtWleVu9.js`. Bundlers rename these on every build
// whose content changed, which is exactly the property wanted here.
const HASHED_ASSET = /["'][^"']*?\/([A-Za-z0-9._-]+-[A-Za-z0-9_-]{6,}\.(?:js|css))["']/;

// Header fallbacks, in the order they are worth trusting. An ETag is usually derived from
// content; Last-Modified only says when the file was written.
const HEADER_FALLBACKS = ['etag', 'last-modified'] as const;

export function extractFingerprint(html: string, headers?: Headers): string {
  const asset = html.match(HASHED_ASSET)?.[1];
  if (asset) return asset;
  for (const name of HEADER_FALLBACKS) {
    const value = headers?.get(name)?.trim();
    if (value) return `${name}:${value.replace(/^"|"$/g, '')}`;
  }
  return 'unidentified';
}

// NEVER throws and NEVER rejects. A build probe that can fail a run is a probe that gets
// deleted the first time the network hiccups, and then the field is missing on exactly the
// run someone needed it for. An unreachable app is itself worth recording: it is the
// likeliest explanation for a suite that failed all at once.
export async function probeAppBuild(
  baseUrl: string,
  declared?: string,
  fetchImpl: typeof fetch = fetch,
): Promise<AppBuild> {
  const base: Omit<AppBuild, 'fingerprint'> = {
    baseUrl,
    declared: declared?.trim() || undefined,
    probedAt: new Date().toISOString(),
  };
  try {
    const response = await fetchImpl(baseUrl);
    if (!response.ok) return { ...base, fingerprint: `http-${response.status}` };
    return { ...base, fingerprint: extractFingerprint(await response.text(), response.headers) };
  } catch {
    return { ...base, fingerprint: 'unreachable' };
  }
}

// One line for Slack, the Qase run description and the report header, e.g.
// 'saucedemo.com · build index-DtWleVu9.js · declared 2.4.0-hotfix.1'.
// The declared half is omitted rather than printed as "none", because a run with nothing
// declared is the normal case and a line full of "none" stops being read.
export function formatAppBuild(b: AppBuild): string {
  const host = b.baseUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const declared = b.declared ? ` · declared ${b.declared}` : '';
  return `${host} · build ${b.fingerprint}${declared}`;
}

// Where the probe's result is written, for the Slack step and the Qase record to read.
// One file, so nothing has to agree about how to re-derive it.
export const APP_BUILD_FILE = 'test-results/app-build.json';

// Reads what the probe recorded for THIS run. Returns undefined rather than throwing when
// the file is absent, because a consumer's job is to report the run, not to fail over a
// missing label.
export function readAppBuild(
  readFile: (p: string) => string = (path) => readFileSync(path, 'utf-8'),
): AppBuild | undefined {
  try {
    return JSON.parse(readFile(APP_BUILD_FILE)) as AppBuild;
  } catch {
    return undefined;
  }
}

// ---- CLI (via tsx): probes, writes APP_BUILD_FILE, prints the line ----
// Called by `scripts/run-suite.sh` BEFORE Playwright starts, because the HTML report's
// header chips come from the config, the config is evaluated synchronously in every worker,
// and `globalSetup` mutating `config.metadata` does NOT reach the report — measured on
// Playwright 1.59.1. An env var does reach a worker (ADR-0027 records why argv does not),
// so the shell probes first and exports the line.
if (process.argv[1]?.endsWith('app-build.ts')) {
  const baseUrl = process.env.SAUCEDEMO_BASE_URL ?? 'https://www.saucedemo.com';
  const build = await probeAppBuild(baseUrl, process.env.APP_BUILD);
  mkdirSync('test-results', { recursive: true });
  writeFileSync(APP_BUILD_FILE, `${JSON.stringify(build, null, 2)}\n`);
  console.log(formatAppBuild(build));
}
