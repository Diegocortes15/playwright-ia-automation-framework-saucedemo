import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter';
import { isThirdParty, signatureFor } from './signature';
import { ATTACHMENT_NAME, type Observation, type ObservationEvent } from './types';

// Aggregates the per-test observation attachments produced by the `_observations`
// fixture and writes one deduplicated file per feature (ADR-0021).
//
// Why a reporter and not a direct write from the fixture: tests run in parallel
// worker processes, and several workers writing the same file would interleave and
// corrupt it. Attachments travel to the main process over Playwright's own IPC, so
// the reporter is the single writer.
//
// CI does not commit what this writes — it uploads it and posts a count to Slack.
// Committing is a human action (or /from-issue staging its own run's file), which
// keeps scheduled runs from churning `main` with a commit per night.

const OUTPUT_DIR = '.observations';

export default class ObservationsReporter implements Reporter {
  private readonly byFeature = new Map<string, Map<string, Observation>>();
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
      const bucket = this.byFeature.get(feature) ?? new Map<string, Observation>();

      for (const event of events) {
        const signature = signatureFor(event);
        const existing = bucket.get(signature);
        if (existing) {
          existing.count += 1;
          continue;
        }
        bucket.set(signature, {
          signature,
          kind: event.kind,
          thirdParty: isThirdParty(event.url, this.baseUrl),
          count: 1,
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
      this.byFeature.set(feature, bucket);
    } catch {
      // Never let observation bookkeeping affect a run's outcome.
    }
  }

  onEnd(): void {
    try {
      if (this.byFeature.size === 0) return;
      if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

      for (const [feature, bucket] of this.byFeature) {
        const path = join(OUTPUT_DIR, `${feature}.json`);
        const merged = new Map<string, Observation>();

        // Existing entries first, so human triage (`status`) and `firstSeen` survive.
        for (const previous of readExisting(path)) merged.set(previous.signature, previous);

        for (const [signature, fresh] of bucket) {
          const previous = merged.get(signature);
          merged.set(
            signature,
            previous
              ? { ...previous, count: fresh.count, lastSeen: fresh.lastSeen, sample: fresh.sample }
              : fresh,
          );
        }

        // Sorted so the file diffs cleanly instead of reshuffling every run.
        const observations = [...merged.values()].sort(
          (a, b) => a.kind.localeCompare(b.kind) || a.signature.localeCompare(b.signature),
        );
        writeFileSync(path, `${JSON.stringify({ feature, observations }, null, 2)}\n`, 'utf-8');
      }
    } catch {
      // Same contract as onTestEnd: observations never break a run.
    }
  }
}

function readExisting(path: string): Observation[] {
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf-8')) as { observations?: Observation[] };
    return parsed.observations ?? [];
  } catch {
    return [];
  }
}
