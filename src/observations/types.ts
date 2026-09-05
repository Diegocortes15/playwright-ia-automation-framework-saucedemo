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

export interface ObservationsFile {
  feature: string;
  observations: Observation[];
}

/** Attachment name the fixture uses and the reporter reads. */
export const ATTACHMENT_NAME = 'observations';

/** Per-test cap, so a pathological page can't flood a run. */
export const MAX_EVENTS_PER_TEST = 200;

/**
 * How many distinct observations become report annotations before the rest collapse into a
 * "…and N more" line. Annotations are chips under the test title: a handful reads at a
 * glance, fifty is wallpaper. Full detail always stays in the attachment.
 */
export const ANNOTATION_CAP = 5;
