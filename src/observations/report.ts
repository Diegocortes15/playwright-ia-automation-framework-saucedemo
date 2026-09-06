import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderDigest } from './digest';
import type { ObservationsFile } from './types';

// `npm run observations` — print the observation index as prose.
//
// The digest is a VIEW of `.observations/observations.json`, so it is rendered on demand
// rather than written to disk and committed: a derived artifact in version control is diff
// noise, a merge-conflict surface, and a chance for the copy to drift from its source. The
// reviewer's copy of this same prose is generated into the PR body by /from-issue.

const INDEX_PATH = join('.observations', 'observations.json');

function main(): void {
  let file: ObservationsFile;
  try {
    file = JSON.parse(readFileSync(INDEX_PATH, 'utf-8')) as ObservationsFile;
  } catch {
    console.log(`No observations recorded yet (${INDEX_PATH} not found). Run the suite first.`);
    return;
  }
  console.log(renderDigest(file, new Date().toISOString().slice(0, 10)));
}

main();
