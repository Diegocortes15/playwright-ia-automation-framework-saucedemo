import { test, expect } from '@playwright/test';
import { logicalKey, orphanedIds, mergeMap } from './map-store';
import type { QaseMap } from './types';

test('logicalKey joins suite path + title stably', () => {
  expect(logicalKey(['Regression', 'login', 'no auth', 'Positive'], 'standard_user logs in')).toBe(
    'Regression › login › no auth › Positive › standard_user logs in',
  );
});

test('orphanedIds returns ids in the old map whose key is no longer present', () => {
  const oldMap: QaseMap = { 'a › t1': 10, 'b › t2': 20, 'c › t3': 30 };
  const currentKeys = ['a › t1', 'c › t3'];
  expect(orphanedIds(oldMap, currentKeys)).toEqual([20]); // b › t2 vanished
});

test('mergeMap keeps only current keys with their (new) ids', () => {
  const oldMap: QaseMap = { 'a › t1': 10, 'b › t2': 20 };
  const fresh = { 'a › t1': 10, 'd › t4': 40 }; // t2 gone, t4 new
  expect(mergeMap(oldMap, fresh)).toEqual({ 'a › t1': 10, 'd › t4': 40 });
});
