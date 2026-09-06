import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter';
import { renderDigest } from './digest';
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
const DIGEST_PATH = join(OUTPUT_DIR, 'SUMMARY.md');

export default class ObservationsReporter implements Reporter {
  private readonly fresh = new Map<string, Observation>();
  private readonly baseUrl: string;

  constructor(options: { baseUrl?: string } = {}) {
    this.baseUrl = options.baseUrl ?? process.env.SAUCEDEMO_BASE_URL ?? 'https://www.saucedemo.com';
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    try {
      const attachment = result.attachments.find((a) => a.name === ATTACHMENT_NAME);
      if (!attachment?.body) return;

      const events = JSON.parse(attachment.body.toString('utf-8')) as ObservationEvent[];
      if (!Array.isArray(events) || events.length === 0) return;

      const feature = basename(dirname(test.location.file));
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
      if (this.fresh.size === 0) return;
      if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

      const observations = mergeObservations(readIndex(), [...this.fresh.values()]);
      writeFileSync(INDEX_PATH, `${JSON.stringify({ observations }, null, 2)}\n`, 'utf-8');
      writeFileSync(
        DIGEST_PATH,
        renderDigest({ observations }, new Date().toISOString().slice(0, 10)),
        'utf-8',
      );
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
 */
export function mergeObservations(previous: Observation[], fresh: Observation[]): Observation[] {
  const merged = new Map<string, Observation>();
  for (const entry of previous) merged.set(entry.signature, entry);

  for (const entry of fresh) {
    const before = merged.get(entry.signature);
    merged.set(
      entry.signature,
      before
        ? {
            ...before,
            count: entry.count,
            lastSeen: entry.lastSeen,
            sample: entry.sample,
            seenIn: [...new Set([...(before.seenIn ?? []), ...entry.seenIn])].sort(),
          }
        : { ...entry, seenIn: [...entry.seenIn].sort() },
    );
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
