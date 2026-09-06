import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Observation } from './types';

// Human triage, read back at test time so it has a visible consequence.
//
// Without this, every test in a suite carries the same report annotation forever — 49 of 50
// tests showing the same 404 is wallpaper, not signal. Marking an observation `ignored` in
// `.observations/observations.json` silences its annotation everywhere, so one decision
// buys quiet across the whole suite instead of having to be repeated per feature.
//
// Only annotations are suppressed. The attachment still records every event, and the
// reporter still counts them: the record stays complete, the report stays readable.

const INDEX_PATH = join('.observations', 'observations.json');
let cache: Set<string> | undefined;

/** Signatures a human marked `ignored`. One decision, applied everywhere. Cached per worker. */
export function ignoredSignatures(): Set<string> {
  if (cache) return cache;

  const ignored = new Set<string>();
  try {
    const parsed = JSON.parse(readFileSync(INDEX_PATH, 'utf-8')) as {
      observations?: Observation[];
    };
    for (const entry of parsed.observations ?? []) {
      if (entry.status === 'ignored') ignored.add(entry.signature);
    }
  } catch {
    // No file yet for this feature, or unreadable — nothing is ignored.
  }
  cache = ignored;
  return ignored;
}
