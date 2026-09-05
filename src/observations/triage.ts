import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Observation } from './types';

// Human triage, read back at test time so it has a visible consequence.
//
// Without this, every test in a suite carries the same report annotation forever — 49 of 50
// tests showing the same 404 is wallpaper, not signal. Marking an observation `ignored` in
// `.observations/<feature>.json` now silences its annotation, so triage buys quiet.
//
// Only annotations are suppressed. The attachment still records every event, and the
// reporter still counts them: the record stays complete, the report stays readable.

const OUTPUT_DIR = '.observations';
const cache = new Map<string, Set<string>>();

/** Signatures a human marked `ignored` for this feature. Read once per worker, then cached. */
export function ignoredSignatures(feature: string): Set<string> {
  const cached = cache.get(feature);
  if (cached) return cached;

  const ignored = new Set<string>();
  try {
    const parsed = JSON.parse(readFileSync(join(OUTPUT_DIR, `${feature}.json`), 'utf-8')) as {
      observations?: Observation[];
    };
    for (const entry of parsed.observations ?? []) {
      if (entry.status === 'ignored') ignored.add(entry.signature);
    }
  } catch {
    // No file yet for this feature, or unreadable — nothing is ignored.
  }
  cache.set(feature, ignored);
  return ignored;
}
