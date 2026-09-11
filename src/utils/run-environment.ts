import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { version as osVersion } from 'node:os';

// Introspects the environment a test run executes in — OS, Node, Playwright, and the
// bundled browser engines — for display in the HTML report metadata, the Qase run
// description, and the Slack notification. Every source is read SYNCHRONOUSLY with NO
// browser launch (engine versions come from playwright-core's browsers.json, not
// browser.version()), so this is safe to call at Playwright config-eval time.
//
// This module stays free of `process.env`: which engines a run used is passed IN, by the
// entry point that knows (the CLI's argv, `run-and-report.ts`'s env). That keeps the
// module callable from the Slack workflow step, which has no secrets in scope and would
// throw if this reached for `env.ts`.

const require = createRequire(import.meta.url);

// The engines a run can execute on. Cross-browser is opt-in and standard-user only
// (ADR-0027), so naming an engine here says which projects exist in the run, never
// which users it covered.
export const ENGINES = ['chromium', 'firefox', 'webkit'] as const;
export type Engine = (typeof ENGINES)[number];

// Playwright's package names are lowercase; these are the products' own spellings, which
// is what a human reading Slack expects to see.
const ENGINE_LABEL: Record<Engine, string> = {
  chromium: 'Chromium',
  firefox: 'Firefox',
  webkit: 'WebKit',
};

export interface RunEnvironment {
  os: string; // e.g. 'Ubuntu 24.04.4 LTS' (CI) or 'Windows 10 Pro' (local)
  node: string; // e.g. '22.15.0' (no leading 'v')
  playwright: string; // e.g. '1.59.1'
  chromium: string; // e.g. '147.0.7727.15'
  firefox: string; // e.g. '148.0.2'
  webkit: string; // e.g. '26.4'
}

// Linux runners expose a human OS name in /etc/os-release; elsewhere fall back to
// Node's os.version() (readable on Windows/macOS).
function osName(): string {
  try {
    const pretty = readFileSync('/etc/os-release', 'utf8').match(/^PRETTY_NAME="?([^"\n]+)/m)?.[1];
    if (pretty) return pretty;
  } catch {
    // not a Linux runner — fall through to os.version()
  }
  return osVersion() || process.platform;
}

// A bundled engine's human version, read from playwright-core's browsers.json. No launch —
// this works during config eval and even before the browsers are installed, which matters
// because the version is reported for engines this run may not have downloaded.
function browserVersion(engine: Engine): string {
  try {
    const dir = dirname(require.resolve('playwright-core/package.json'));
    const data = JSON.parse(readFileSync(join(dir, 'browsers.json'), 'utf8')) as {
      browsers: { name: string; browserVersion?: string }[];
    };
    return data.browsers.find((b) => b.name === engine)?.browserVersion ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

export function runEnvironment(): RunEnvironment {
  return {
    os: osName(),
    node: process.version.replace(/^v/, ''),
    playwright: (require('playwright-core/package.json') as { version: string }).version,
    chromium: browserVersion('chromium'),
    firefox: browserVersion('firefox'),
    webkit: browserVersion('webkit'),
  };
}

// Major version only, e.g. '147.0.7727.15' → '147', '22.15.0' → '22'.
const major = (v: string): string => v.split('.')[0] || v;

// Keeps an unknown string recognisable instead of truncating it to 'unknown'.
const engineVersion = (v: string): string => (v === 'unknown' ? 'unknown' : major(v));

// Narrows arbitrary strings (an env var, argv) to the engines we know, preserving the
// canonical order and dropping anything unrecognised. An empty result means the caller
// named nothing usable, and every consumer falls back to chromium.
export function parseEngines(input: string | undefined): Engine[] {
  const named = new Set((input ?? '').split(/[,\s]+/).filter(Boolean));
  return ENGINES.filter((e) => named.has(e));
}

// Compact one-liner for Slack / Qase, e.g.
// 'Ubuntu 24.04.4 LTS · Chromium 147 · Node 22 · Playwright 1.59.1'.
//
// `engines` names what the run actually executed on. It defaults to chromium because that
// is what an unqualified run is, and because this line used to hardcode `Chromium`: a
// WebKit run reported the Chromium version to Slack, Qase and the report header, which was
// wrong in the one place a reader goes to find out what ran.
export function formatEnvironmentLine(
  e: RunEnvironment,
  engines: readonly Engine[] = ['chromium'],
): string {
  const listed = engines.length > 0 ? engines : (['chromium'] as const);
  const browsers = listed.map((n) => `${ENGINE_LABEL[n]} ${engineVersion(e[n])}`).join(' · ');
  return `${e.os} · ${browsers} · Node ${major(e.node)} · Playwright ${e.playwright}`;
}

// ---- CLI (via tsx): prints the compact line, for the Slack workflow step ----
// Engines come from argv, e.g. `run-environment.ts firefox webkit`; no argument means
// chromium.
if (process.argv[1]?.endsWith('run-environment.ts')) {
  const asked = parseEngines(process.argv.slice(2).join(','));
  console.log(formatEnvironmentLine(runEnvironment(), asked.length > 0 ? asked : ['chromium']));
}
