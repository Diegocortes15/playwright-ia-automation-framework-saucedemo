import type { TcmsCase, TcmsStep, TcmsStatus, TestRecord } from './types';

const NO_STEPS_ACTION = 'Automated test (no granular steps recorded)';

// Map a /from-issue record + executed test.step names + run status → a TcmsCase.
// Pure: no I/O, no Qase knowledge. Human-readable steps are composed here.
export function mapToCase(
  record: TestRecord,
  stepTitles: string[],
  status: TcmsStatus,
  meta: { jiraKey: string; sourceUrl: string },
): TcmsCase {
  return {
    suitePath: [record.feature, record.contextLabel, record.bucket],
    title: record.title,
    steps: toSteps(stepTitles, record.acText),
    description: `Covers Jira ${meta.jiraKey} — ${meta.sourceUrl}\n\n${record.acText}`,
    preconditions: record.user === 'no-auth' ? 'No authentication' : `Session: ${record.user}`,
    tags: record.tags,
    bucket: record.bucket,
    jiraKey: meta.jiraKey,
    sourceUrl: meta.sourceUrl,
    status,
  };
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
