import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter';
import { isThirdParty, signatureFor } from './signature';
import {
  ATTACHMENT_NAME,
  type Observation,
  type ObservationEvent,
  type ObservationsFile,
} from './types';

// Aggregates the per-test observation attachments produced by the `_observations` fixture
// into one signature-keyed index (ADR-0021).
//
// Why a reporter and not a direct write from the fixture: tests run in parallel worker
// processes, and several workers writing the same file would interleave and corrupt it.
// Attachments travel to the main process over Playwright's own IPC, so the reporter is the
// single writer.
//
// CI does not commit what this writes — it uploads it and posts a count to Slack.

const OUTPUT_DIR = '.observations';
const INDEX_PATH = join(OUTPUT_DIR, 'observations.json');

export default class ObservationsReporter implements Reporter {
  private readonly fresh = new Map<string, Observation>();
  /** Every feature this run executed, whether or not it observed anything. */
  private readonly coveredFeatures = new Set<string>();
  private readonly baseUrl: string;

  constructor(options: { baseUrl?: string } = {}) {
    this.baseUrl = options.baseUrl ?? process.env.SAUCEDEMO_BASE_URL ?? 'https://www.saucedemo.com';
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    try {
      const feature = basename(dirname(test.location.file));
      // Recorded before the attachment check, and that ordering is the point: a feature that
      // ran and saw nothing is exactly the evidence that something stopped happening.
      this.coveredFeatures.add(feature);

      const attachment = result.attachments.find((a) => a.name === ATTACHMENT_NAME);
      if (!attachment?.body) return;

      const events = JSON.parse(attachment.body.toString('utf-8')) as ObservationEvent[];
      if (!Array.isArray(events) || events.length === 0) return;

      const today = new Date().toISOString().slice(0, 10);
      const project = test.parent.project()?.name ?? 'unknown';

      for (const event of events) {
        const signature = signatureFor(event);
        const existing = this.fresh.get(signature);
        if (existing) {
          existing.count += 1;
          if (!existing.seenIn.includes(feature)) existing.seenIn.push(feature);
          continue;
        }
        this.fresh.set(signature, {
          signature,
          kind: event.kind,
          thirdParty: isThirdParty(event.url, this.baseUrl),
          count: 1,
          seenIn: [feature],
          firstSeen: today,
          lastSeen: today,
          status: 'new',
          sample: {
            message: event.message,
            url: event.url,
            method: event.method,
            httpStatus: event.httpStatus,
            dialogType: event.dialogType,
            test: test.title,
            project,
          },
        });
      }
    } catch {
      // Never let observation bookkeeping affect a run's outcome.
    }
  }

  onEnd(): void {
    try {
      // A run that observed nothing still has something to say, as long as it ran something.
      if (this.fresh.size === 0 && this.coveredFeatures.size === 0) return;
      if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

      const observations = mergeObservations(readIndex(), [...this.fresh.values()], {
        coveredFeatures: this.coveredFeatures,
        today: new Date().toISOString().slice(0, 10),
      });
      // Only the record is written. The prose digest is a view, rendered on demand by
      // `npm run observations` — a derived file does not belong in version control.
      writeFileSync(INDEX_PATH, `${JSON.stringify({ observations }, null, 2)}\n`, 'utf-8');
    } catch {
      // Same contract as onTestEnd: observations never break a run.
    }
  }
}

/**
 * Fold this run's observations into what the index already held.
 *
 * The contract that matters: a human's triage must survive a re-run. `status`, `note` and
 * `firstSeen` come from the previous entry and are never overwritten; `count`, `lastSeen`
 * and `sample` refresh, and `seenIn` accumulates so one fact records every feature that
 * trips it instead of forking into one entry per feature.
 *
 * Output is sorted so the committed file diffs cleanly instead of reshuffling every run.
 *
 * Nothing is ever deleted, and the absence signal does not delete either. An entry whose cause
 * was fixed used to sit here forever, frozen at its old count, indistinguishable from one still
 * happening — the digest could say "14 reviewed" when some of those fourteen had stopped. The
 * framework already solves this for the other half: a `test.fail()` test reports "Expected to
 * fail, but passed." the day its defect is fixed. Observations were the half with no such
 * notice.
 *
 * `absentSince` is that notice, and it is deliberately conservative. It is set only when the run
 * exercised **every** feature in the entry's `seenIn` and still did not see it — absence proves
 * nothing when the code that produces it never ran. A single-project run therefore marks nothing,
 * which is the whole reason the naive version (compare `lastSeen` to the newest run) was rejected:
 * running one project would have declared every other entry dead.
 *
 * Removing a stale entry stays a human act, per ADR-0021 — the record never judges, it reports.
 * That matters more than it first appears: an intermittent event is marked the first run it
 * fails to reappear, so this signal is evidence, never a verdict. The digest names both readings
 * rather than telling anyone to delete something.
 */
export function mergeObservations(
  previous: Observation[],
  fresh: Observation[],
  options: { coveredFeatures?: Set<string>; today?: string } = {},
): Observation[] {
  const merged = new Map<string, Observation>();
  const seenNow = new Set(fresh.map((e) => e.signature));
  const covered = options.coveredFeatures;
  const today = options.today ?? new Date().toISOString().slice(0, 10);

  for (const entry of previous) {
    const exercisedAndSilent =
      covered !== undefined &&
      !seenNow.has(entry.signature) &&
      entry.seenIn.every((f) => covered.has(f));
    merged.set(
      entry.signature,
      exercisedAndSilent ? { ...entry, absentSince: entry.absentSince ?? today } : entry,
    );
  }

  for (const entry of fresh) {
    const before = merged.get(entry.signature);
    if (before) {
      // It is back. Whatever we concluded about its absence is no longer true.
      const revived = { ...before };
      delete revived.absentSince;
      merged.set(entry.signature, {
        ...revived,
        count: entry.count,
        lastSeen: entry.lastSeen,
        sample: entry.sample,
        seenIn: [...new Set([...(before.seenIn ?? []), ...entry.seenIn])].sort(),
      });
    } else {
      merged.set(entry.signature, { ...entry, seenIn: [...entry.seenIn].sort() });
    }
  }

  return [...merged.values()].sort(
    (a, b) => a.kind.localeCompare(b.kind) || a.signature.localeCompare(b.signature),
  );
}

function readIndex(): Observation[] {
  try {
    const parsed = JSON.parse(readFileSync(INDEX_PATH, 'utf-8')) as Partial<ObservationsFile>;
    return parsed.observations ?? [];
  } catch {
    return [];
  }
}
