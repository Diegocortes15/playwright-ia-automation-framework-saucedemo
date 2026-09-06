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

function headline(observation: Observation): string {
  const icon = observation.status === 'ignored' ? '🔇' : '🔎';
  const tag = observation.thirdParty ? ' _(third party)_' : '';
  return `#### ${icon} ${observation.kind.replace('-', ' ')}${tag}`;
}

function renderOne(observation: Observation): string {
  const { count, firstSeen, lastSeen, sample, status, note, seenIn } = observation;
  const times = count === 1 ? 'once' : `${count} times`;
  const when = firstSeen === lastSeen ? `on ${firstSeen}` : `between ${firstSeen} and ${lastSeen}`;
  const where =
    seenIn.length === 1
      ? `the \`${seenIn[0]}\` tests`
      : `${seenIn.length} features (\`${seenIn.join('`, `')}\`)`;

  const lines = [
    headline(observation),
    '',
    describeObservation(observation),
    '',
    `Seen ${times} ${when}, across ${where}. Example: _"${sample.test}"_ (${sample.project}).`,
  ];

  if (status === 'new') {
    lines.push('', '**Not yet reviewed.**');
  } else {
    lines.push('', `**Reviewed — marked \`${status}\`.**${note ? ` ${note}` : ''}`);
  }
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

  const out: string[] = [
    '# What the app did that no test asserted on',
    '',
    `Generated ${generatedOn} from the last run. Do not edit — it is rebuilt every time.`,
    'Each entry is one fact about the application, not one per feature: to change how it is',
    'classified, edit its `status` and `note` **once** in `.observations/observations.json`.',
    'Marking an entry `ignored` also stops it annotating the Playwright report, everywhere.',
    '',
    `**${unreviewed.length} not yet reviewed · ${reviewed.length} reviewed.**`,
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
    for (const observation of group) out.push('', renderOne(observation));
  }

  return `${out.join('\n')}\n`;
}
