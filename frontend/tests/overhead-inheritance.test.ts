import assert from 'node:assert/strict';
import test from 'node:test';
import { initializeInheritedOverheads } from '../src/pages/products/overhead-inheritance.ts';

test('inherits the Primary Version overhead and keeps it selected', () => {
  const rows = initializeInheritedOverheads(
    [{ id: 91, overheadRuleId: 7, overheadHead: 'Factory Overhead', ratePercent: 8 }],
    [],
    [{ id: '7', value: 'Factory Overhead', ratePercent: 8 }],
    () => 'generated-id',
  );

  assert.equal(rows.length, 1);
  assert.equal(rows[0].overheadHead, 'Factory Overhead');
  assert.equal(rows[0].ruleId, '7');
  assert.equal(rows[0].ruleSnapshot.value, 'Factory Overhead');
});

test('uses legacy overhead labor only when current overhead rows are absent', () => {
  const rows = initializeInheritedOverheads(
    [],
    [{ id: 12, laborHead: 'Overhead - Legacy Rule' }],
    [{ id: '4', value: 'Legacy Rule' }],
    () => 'generated-id',
  );

  assert.equal(rows.length, 1);
  assert.equal(rows[0].ruleId, '4');
  assert.equal(rows[0].overheadHead, 'Legacy Rule');
});
