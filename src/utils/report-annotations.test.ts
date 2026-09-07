import { test, expect } from '@playwright/test';
import { reportAnnotations } from './report-annotations';

// These read the committed `.tcms/records/` files rather than a fixture, on purpose: the point
// of the annotations is that a reader opening the Playwright report sees the real provenance,
// so the thing worth protecting is the real data resolving. The inventory records used here are
// the SW-13 tests locked to defect SW-14 under ADR-0024.

const SORT_TEST = 'problem_user sorts products by name descending';

test('a test with no matching record is annotated with nothing', () => {
  expect(reportAnnotations('inventory', 'a title no record carries')).toEqual([]);
  expect(reportAnnotations('feature_that_does_not_exist', SORT_TEST)).toEqual([]);
});

test('every test gets its issue links and the criterion it covers', () => {
  const annotations = reportAnnotations('inventory', SORT_TEST);
  const types = annotations.map((a) => a.type);

  expect(types.filter((t) => t === 'issue').length).toBeGreaterThan(0);
  expect(types).toContain('covers');
  // The AC, not the assertion — what a person agreed the system should do.
  expect(annotations.find((a) => a.type === 'covers')?.description).toContain('descending');
});

test('a passing test carries no expected-failure annotation', () => {
  const types = reportAnnotations('inventory', SORT_TEST).map((a) => a.type);
  expect(types).not.toContain('known defect');
  expect(types.some((t) => t.includes('unattributed'))).toBe(false);
});

test('a test.fail() test explains the defect it is locked to', () => {
  const annotations = reportAnnotations('inventory', SORT_TEST, { expectedToFail: true });
  const defect = annotations.find((a) => a.type === 'known defect');

  expect(defect, 'the record carries expectedFailure, so the report must explain it').toBeTruthy();
  // ADR-0024: the annotation must name the defect — an unattributed test.fail() is
  // indistinguishable from a test somebody gave up on.
  expect(defect?.description).toContain('SW-14');
  expect(defect?.description).toContain('browse/SW-14');
  // And it must say what happens when the defect is fixed, or nobody removes the marker.
  expect(defect?.description).toContain('Expected to fail, but passed.');
});

test('a test.fail() test whose record names no defect is flagged, not silently accepted', () => {
  // `footer` records predate ADR-0024 and carry no expectedFailure — exactly the shape of a
  // marker somebody added without filing anything.
  const annotations = reportAnnotations(
    'footer',
    'footer Twitter link points to its Sauce Labs URL',
    { expectedToFail: true },
  );
  const warning = annotations.find((a) => a.type.includes('unattributed'));

  expect(warning, 'an unattributed expected failure must be visible in the report').toBeTruthy();
  expect(warning?.description).toContain('ADR-0024');
  // Detection, never prevention: this must not be able to fail a run.
  expect(annotations.find((a) => a.type === 'known defect')).toBeUndefined();
});
