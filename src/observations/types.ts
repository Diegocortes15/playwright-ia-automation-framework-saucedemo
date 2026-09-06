// Runtime-collected observations: things the app did during a test run that nobody
// asserted on. Detection is deterministic (see ADR-0021) — the collector records
// facts, it never judges them. Triage is a human action via the `status` field.

export type ObservationKind = 'console-error' | 'page-error' | 'failed-request' | 'dialog';

/** One raw occurrence, as seen by the fixture during a single test. */
export interface ObservationEvent {
  kind: ObservationKind;
  /** Human-readable detail: the console text, error message, or dialog message. */
  message: string;
  /** Full URL, query string included — the request's URL, or a console message's source. */
  url?: string;
  method?: string;
  httpStatus?: number;
  dialogType?: string;
}

/** One deduplicated observation, as stored in `.observations/<feature>.json`. */
export interface Observation {
  /** Stable identity across runs. Query strings are stripped so varying ids don't fork it. */
  signature: string;
  kind: ObservationKind;
  /** Request host differs from the app's baseURL host. Computed, never judged. */
  thirdParty: boolean;
  /** Occurrences in the most recent run that saw it — a noise gauge, not a lifetime total. */
  count: number;
  /** Features whose specs have produced it. One fact about the app, not one per feature. */
  seenIn: string[];
  firstSeen: string;
  lastSeen: string;
  /** Human triage. `new` until someone looks: then `triaged`, `ignored`, or `filed:<KEY>`. */
  status: string;
  /** Why it was triaged that way. Written by a human, preserved across runs. */
  note?: string;
  sample: {
    message: string;
    url?: string;
    method?: string;
    httpStatus?: number;
    dialogType?: string;
    test: string;
    project: string;
  };
}

/**
 * The whole index, keyed by signature rather than split per feature.
 *
 * An earlier version wrote `.observations/<feature>.json`, which duplicated one fact about
 * the app across every feature that happened to trip it — the same 404 appeared six times
 * and had to be triaged six times, and a new feature hitting it would have come back `new`
 * again. Triage is a decision about a signature, so the file is keyed by signature and
 * records where it was seen instead.
 */
export interface ObservationsFile {
  observations: Observation[];
}

/** Attachment name the fixture uses and the reporter reads. */
export const ATTACHMENT_NAME = 'observations';

/** Per-test cap, so a pathological page can't flood a run. */
export const MAX_EVENTS_PER_TEST = 200;
