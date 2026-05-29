import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import type { QaseMap } from './types';

const SEP = ' › ';

// Stable logical key for a test: its full suite path + title. Used as the
// qase-map.json key and for orphan detection.
export function logicalKey(suitePath: string[], title: string): string {
  return [...suitePath, title].join(SEP);
}

export function loadMap(path: string): QaseMap {
  if (!existsSync(path)) return {};
  return JSON.parse(readFileSync(path, 'utf-8')) as QaseMap;
}

export function saveMap(path: string, map: QaseMap): void {
  // Sorted keys for a stable, diff-friendly committed file.
  const sorted: QaseMap = {};
  for (const key of Object.keys(map).sort()) sorted[key] = map[key];
  writeFileSync(path, JSON.stringify(sorted, null, 2) + '\n', 'utf-8');
}

// Case ids present in the old map but whose key is no longer in the current set.
export function orphanedIds(oldMap: QaseMap, currentKeys: string[]): number[] {
  const present = new Set(currentKeys);
  return Object.entries(oldMap)
    .filter(([key]) => !present.has(key))
    .map(([, id]) => id);
}

// The next map = exactly the fresh (current) entries. (Orphans are archived
// separately, then dropped by virtue of not being in `fresh`.)
export function mergeMap(_oldMap: QaseMap, fresh: QaseMap): QaseMap {
  return { ...fresh };
}
