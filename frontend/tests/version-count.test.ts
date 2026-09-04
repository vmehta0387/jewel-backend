import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveVersionCounts } from '../src/pages/products/version-count.ts';

test('reports accurate counts after creating 50 versions', () => {
  const versions = Array.from({ length: 51 }, (_, index) => ({ version: `V${index + 1}` }));
  const firstPage = versions.slice(0, 50);

  assert.deepEqual(resolveVersionCounts(firstPage, versions.length, 51), {
    totalVersionCount: 51,
    existingCount: 51,
    latestVersionNumber: 51,
    nextVersion: 52,
  });
});

test('next version follows the actual maximum instead of row count', () => {
  const firstPage = Array.from({ length: 50 }, (_, index) => ({ version: `V${index + 1}` }));

  assert.deepEqual(resolveVersionCounts(firstPage, 53, 57), {
    totalVersionCount: 53,
    existingCount: 53,
    latestVersionNumber: 57,
    nextVersion: 58,
  });
});

test('existing count reflects every design record returned for the family', () => {
  const loadedRows = [
    { version: 'V1' },
    { version: 'V2' },
    { version: 'V2' },
    { version: 'V3' },
  ];

  assert.deepEqual(resolveVersionCounts(loadedRows, 4, 3), {
    totalVersionCount: 4,
    existingCount: 4,
    latestVersionNumber: 3,
    nextVersion: 4,
  });
});
