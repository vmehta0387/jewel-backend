import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveVersionCounts } from '../src/pages/products/version-count.ts';

test('reports accurate counts after creating 50 versions', () => {
  const versions = Array.from({ length: 51 }, (_, index) => ({ version: `V${index + 1}` }));
  const firstPage = versions.slice(0, 50);

  assert.deepEqual(resolveVersionCounts(firstPage, versions.length, 51), {
    existingCount: 51,
    latestVersionNumber: 51,
    nextVersion: 'V52',
  });
});

test('next version follows the actual maximum instead of row count', () => {
  const firstPage = Array.from({ length: 50 }, (_, index) => ({ version: `V${index + 1}` }));

  assert.deepEqual(resolveVersionCounts(firstPage, 53, 57), {
    existingCount: 53,
    latestVersionNumber: 57,
    nextVersion: 'V58',
  });
});

test('duplicate database rows do not inflate the existing version count', () => {
  const loadedRows = [
    { version: 'V1' },
    { version: 'V2' },
    { version: 'V2' },
    { version: 'V3' },
  ];

  assert.deepEqual(resolveVersionCounts(loadedRows, 3, 3), {
    existingCount: 3,
    latestVersionNumber: 3,
    nextVersion: 'V4',
  });
});
