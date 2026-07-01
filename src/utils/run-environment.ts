import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { version as osVersion } from 'node:os';

// Introspects the environment a test run executes in — OS, Node, Playwright, and the
// bundled Chromium — for display in the HTML report metadata, the Qase run
// description, and the Slack notification. Every source is read SYNCHRONOUSLY with NO
// browser launch (the Chromium version comes from playwright-core's browsers.json, not
// browser.version()), so this is safe to call at Playwright config-eval time.

const require = createRequire(import.meta.url);

export interface RunEnvironment {
  os: string; // e.g. 'Ubuntu 24.04.4 LTS' (CI) or 'Windows 10 Pro' (local)
  node: string; // e.g. '22.15.0' (no leading 'v')
  playwright: string; // e.g. '1.59.1'
  chromium: string; // e.g. '147.0.7727.15'
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

// The bundled Chromium's human version, read from playwright-core's browsers.json.
// No launch — this works during config eval and even before browsers are installed.
function chromiumVersion(): string {
  try {
    const dir = dirname(require.resolve('playwright-core/package.json'));
    const data = JSON.parse(readFileSync(join(dir, 'browsers.json'), 'utf8')) as {
      browsers: { name: string; browserVersion?: string }[];
    };
    return data.browsers.find((b) => b.name === 'chromium')?.browserVersion ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

export function runEnvironment(): RunEnvironment {
  return {
    os: osName(),
    node: process.version.replace(/^v/, ''),
    playwright: (require('playwright-core/package.json') as { version: string }).version,
    chromium: chromiumVersion(),
  };
}

// Major version only, e.g. '147.0.7727.15' → '147', '22.15.0' → '22'.
const major = (v: string): string => v.split('.')[0] || v;

// Compact one-liner for Slack / Qase, e.g.
// 'Ubuntu 24.04.4 LTS · Chromium 147 · Node 22 · Playwright 1.59.1'.
export function formatEnvironmentLine(e: RunEnvironment): string {
  return `${e.os} · Chromium ${major(e.chromium)} · Node ${major(e.node)} · Playwright ${e.playwright}`;
}

// ---- CLI (via tsx): prints the compact line, for the Slack workflow step ----
if (process.argv[1]?.endsWith('run-environment.ts')) {
  console.log(formatEnvironmentLine(runEnvironment()));
}
