import type { TcmsCase, TcmsStep, TcmsStatus, TestRecord } from './types';

const NO_STEPS_ACTION = 'Automated test (no granular steps recorded)';

// Map a /from-issue record + executed test.step names + run status → a TcmsCase.
// Pure: no I/O, no Qase knowledge. Human-readable steps are composed here.
export function mapToCase(record: TestRecord, stepTitles: string[], status: TcmsStatus): TcmsCase {
  return {
    suitePath: [record.feature, record.contextLabel, record.bucket],
    title: record.title,
    steps: toSteps(stepTitles, record.acText),
    description: buildDescription(record.jira, record.acText),
    preconditions: record.user === 'no-auth' ? 'No authentication' : `Session: ${record.user}`,
    tags: record.tags,
    bucket: record.bucket,
    jira: record.jira,
    status,
  };
}

// Provenance header — one "Covers Jira <KEY> — <url>" line per ticket (a case may
// trace to several) — followed by the AC text as the expected outcome.
function buildDescription(jira: TcmsCase['jira'], acText: string): string {
  const provenance = jira.map((j) => `Covers Jira ${j.key} — ${j.url}`).join('\n');
  return provenance ? `${provenance}\n\n${acText}` : acText;
}

// Step actions = the executed test.step names; the covered AC text is the
// human-readable expected outcome, attached to the LAST step. A test with no
// test.step still yields one step carrying the AC as its expected result.
function toSteps(stepTitles: string[], acText: string): TcmsStep[] {
  if (stepTitles.length === 0) return [{ action: NO_STEPS_ACTION, expected: acText }];
  return stepTitles.map((action, i) => ({
    action,
    expected: i === stepTitles.length - 1 ? acText : '',
  }));
}
