import type { Observation, ObservationKind, ObservationsFile } from './types';

// The human-readable half of ADR-0021.
//
// `.observations/<feature>.json` is a machine index: signatures, counts, triage state,
// built to deduplicate and to diff cleanly in git. It is not a log — reading it means
// parsing colon-delimited keys and knowing what `kind: "page-error"` implies.
//
// This renders the same data as prose, so the question "what did the app do?" is answered
// by reading a sentence. Pure function, no LLM: one template per kind.

function httpMeaning(status: number | undefined): string {
  if (status === undefined) return '';
  if (status === 401 || status === 403) return ' — the request was rejected as unauthorised';
  if (status === 404) return ' — the address was not found on the server';
  if (status === 408 || status === 429) return ' — the server refused to serve it right now';
  if (status >= 500) return ' — the server itself failed';
  return '';
}

/** The fields the prose needs, shared by a raw event and a stored observation. */
export interface Describable {
  message: string;
  url?: string;
  method?: string;
  httpStatus?: number;
  dialogType?: string;
}

/** Which devtools tab a reader would go looking in. */
export type ObservationGroup = 'Network' | 'Console' | 'Dialogs';

export function groupOf(kind: ObservationKind): ObservationGroup {
  if (kind === 'failed-request') return 'Network';
  if (kind === 'dialog') return 'Dialogs';
  return 'Console';
}

/** One plain-language sentence describing what the app did. */
export function describeEvent(
  kind: ObservationKind,
  sample: Describable,
  thirdParty: boolean,
): string {
  switch (kind) {
    case 'failed-request': {
      const who = thirdParty ? 'a third-party service' : 'the application';
      return (
        `The page asked ${who} for \`${sample.method ?? 'GET'} ${sample.url ?? 'an address'}\` ` +
        `and got back **${sample.httpStatus ?? 'an error'}**${httpMeaning(sample.httpStatus)}.`
      );
    }
    case 'console-error':
      return `The page wrote an error to the browser console: _"${sample.message}"_.`;
    case 'page-error':
      return `JavaScript on the page threw an error nobody caught: _"${sample.message}"_.`;
    case 'dialog':
      return (
        `The page opened a native \`${sample.dialogType ?? 'dialog'}\` box saying ` +
        `_"${sample.message}"_. The test dismissed it and carried on.`
      );
    default:
      return sample.message;
  }
}

/** Same sentence, for an entry already folded into `.observations/<feature>.json`. */
export function describeObservation(observation: Observation): string {
  return describeEvent(observation.kind, observation.sample, observation.thirdParty);
}

/**
 * Severity at a glance, the way a console does it.
 *
 * Four icons, deliberately. The group heading already says what KIND of thing this is
 * (Network / Console / Dialogs) and the sentence underneath already says the precise status
 * — "rejected as unauthorised", "was not found on the server". So the icon only has to carry
 * the one distinction that changes what you do about it: did the application break, or did
 * it simply refuse or not have something?
 *
 * An earlier version had eight, splitting 401 from 404 from 429. It needed a legend to be
 * readable, which is the tell that the encoding was doing too much: the icon was repeating
 * text that sat one line below it.
 */
export function iconFor(kind: ObservationKind, httpStatus?: number): string {
  if (kind === 'console-error') return '❗';
  if (kind === 'dialog') return '💬';
  if (kind === 'page-error') return '🔥'; // uncaught exception — the page broke
  if (httpStatus !== undefined && httpStatus >= 500) return '🔥'; // the server itself failed
  return '⚠️'; // 4xx and anything unclassified: refused or missing, not broken
}

function headline(observation: Observation): string {
  const tag = observation.thirdParty ? ' _(third party)_' : '';
  const muted = observation.status !== 'new' ? ' _(reviewed)_' : '';
  const icon = iconFor(observation.kind, observation.sample.httpStatus);
  return `#### ${icon} ${observation.kind.replace('-', ' ')}${tag}${muted}`;
}

/** The facts about one observation: what happened, how often, and where. No verdict. */
function renderFact(observation: Observation): string {
  const { count, firstSeen, lastSeen, sample, seenIn } = observation;
  const times = count === 1 ? 'Once' : `${count} times`;
  // `count` refreshes per run while `firstSeen` survives (see reporter.ts) — so the two must
  // not share a sentence. "Seen 3 times between 2026-09-04 and 2026-09-07" reads as a total
  // and is not one: it was three times in the last run alone.
  const when =
    firstSeen === lastSeen
      ? `in the run on ${lastSeen}`
      : `in the most recent run that recorded it (${lastSeen}); first recorded ${firstSeen}`;
  const where =
    seenIn.length === 1
      ? `the \`${seenIn[0]}\` tests`
      : `${seenIn.length} features (\`${seenIn.join('`, `')}\`)`;

  const lines = [
    headline(observation),
    '',
    describeObservation(observation),
    '',
    `${times} ${when}. Seen across ${where}. Example: _"${sample.test}"_ (${sample.project}).`,
  ];

  // The one thing the index could never say before: this did not happen when it had the
  // chance to. Deliberately reported as a fact with both readings named, never as a verdict.
  //
  // The first version of this line said "if that is a fix, delete this entry" and was wrong in
  // a way only running it revealed: three intermittent console errors -- each having occurred
  // exactly once, ever -- were marked the first time a run did not reproduce them. Telling
  // someone to delete those trains them to ignore the line, which is the same objection this
  // project raises against any gate that cries wolf.
  if (observation.absentSince) {
    lines.push(
      '',
      `**Not seen since ${observation.absentSince}**, in runs that did exercise ${where}. ` +
        'Two readings, and this file does not pick one: the cause was fixed, or it never fired ' +
        'reliably in the first place — a low count above is the tell for the second. The mark ' +
        "clears itself if it reappears; removing the entry is a person's call.",
    );
  }

  return lines.join('\n');
}

/** What a person decided about those facts. */
function renderVerdict(status: string, note?: string): string {
  if (status === 'new') return '**Not yet reviewed.**';
  return `**Reviewed — marked \`${status}\`.**${note ? ` ${note}` : ''}`;
}

/** Observations a person gave the same answer to. */
export interface VerdictGroup {
  observations: Observation[];
  status: string;
  note?: string;
}

/**
 * Fold entries whose triage says exactly the same thing into one block.
 *
 * The index deliberately stores one entry per *fact*, each carrying its own complete note:
 * a note has to stand on its own when you grep a single signature out of the file, so
 * self-containment there is correct and worth keeping. Rendered as a document, though, that
 * same property turns into repetition — five `backtrace.io` entries share one root cause, so
 * emptying the triage queue printed one long explanation five times over. Measured on this
 * repository's own index, 32% of the rendered document was duplicated text. Long, repeated
 * blocks are exactly what stops a report being read.
 *
 * The fix belongs here rather than in the JSON, because only the rendering has the problem.
 *
 * Grouping keys on `status` AND `note`, not the note alone: the same explanation filed under
 * two different statuses is two verdicts that happen to share reasoning, and collapsing them
 * would hide the disagreement. An absent note never groups either — "nobody explained this"
 * is not a shared explanation, and pooling unreviewed entries under one heading would invent
 * a judgment nobody made.
 *
 * Order is the first appearance of each group, so the queue's ordering survives.
 */
export function groupByVerdict(observations: Observation[]): VerdictGroup[] {
  const groups: VerdictGroup[] = [];
  const byKey = new Map<string, VerdictGroup>();

  for (const observation of observations) {
    const key = observation.note ? `${observation.status}\u0000${observation.note}` : undefined;
    const existing = key === undefined ? undefined : byKey.get(key);
    if (existing) {
      existing.observations.push(observation);
      continue;
    }
    const group: VerdictGroup = {
      observations: [observation],
      status: observation.status,
      note: observation.note,
    };
    groups.push(group);
    if (key !== undefined) byKey.set(key, group);
  }

  return groups;
}

function renderGroup(group: VerdictGroup): string {
  const { observations, status, note } = group;
  const lines: string[] = [];

  // Only a real group announces itself. A group of one renders exactly as it always did.
  if (observations.length > 1) {
    lines.push(`### ${observations.length} observations, one verdict`, '');
  }
  lines.push(observations.map(renderFact).join('\n\n'));
  lines.push('', renderVerdict(status, note));

  return lines.join('\n');
}

/**
 * Render the whole index as one readable document.
 * Unreviewed entries come first: that is the queue.
 */
export function renderDigest(file: ObservationsFile, generatedOn: string): string {
  const all = file.observations;
  const unreviewed = all.filter((o) => o.status === 'new');
  const reviewed = all.filter((o) => o.status !== 'new');
  // Counted across both groups: whether a thing still happens is a separate question from
  // whether anyone has looked at it.
  const absent = all.filter((o) => o.absentSince);

  const out: string[] = [
    '# What the app did that no test asserted on',
    '',
    `Rendered ${generatedOn} from \`.observations/observations.json\`.`,
    '',
    'Each entry is one fact about the application, not one per feature. To change how one is',
    'classified, edit its `status` and `note` **once** in that file; marking it `ignored` also',
    'stops it annotating the Playwright report, everywhere.',
    '',
    'A count here is what the last run saw, not a lifetime total — and an entry stays until a',
    'person deletes it, so `reviewed` means "someone classified this", never "this still',
    'happens". An entry marked **not seen when last exercised** did not occur in a run that did',
    'execute the features it comes from — which reads as a fix, or as something that was always',
    'intermittent. The record states it; you decide.',
    '',
    absent.length > 0
      ? `**${unreviewed.length} not yet reviewed · ${reviewed.length} reviewed · ` +
        `${absent.length} not seen when last exercised.**`
      : `**${unreviewed.length} not yet reviewed · ${reviewed.length} reviewed.**`,
  ];

  if (all.length === 0) {
    out.push('', 'Nothing recorded.');
    return `${out.join('\n')}\n`;
  }

  for (const [title, group] of [
    ['## Not yet reviewed', unreviewed],
    ['## Already reviewed', reviewed],
  ] as const) {
    if (group.length === 0) continue;
    out.push('', title);
    for (const verdictGroup of groupByVerdict(group)) out.push('', renderGroup(verdictGroup));
  }

  return `${out.join('\n')}\n`;
}
