import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const data = JSON.parse(await readFile('public/data/value-outcomes.json', 'utf8'));

const nullableNumber = (value) => value === null || (Number.isFinite(value) && value >= 0);

test('価値実測は未計測の過去を0扱いしない', () => {
  assert.equal(data.schema_version, 1);
  assert.equal(data.historical_period_before_measurement_start, 'UNMEASURED');
  assert.equal(data.currency, 'JPY');
  assert.ok(Array.isArray(data.events));
});

test('価値イベントは実測値と根拠を保持する', () => {
  for (const event of data.events) {
    assert.match(event.id, /^[a-z0-9][a-z0-9-]*$/);
    assert.match(event.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(typeof event.decision, 'string');
    assert.ok(event.decision.length > 0);

    for (const key of ['direct_savings_yen', 'time_saved_minutes', 'external_revenue_yen']) {
      assert.ok(nullableNumber(event[key]), `${event.id}.${key} must be non-negative number or null`);
    }
    assert.ok(Number.isInteger(event.reuse_count) && event.reuse_count >= 0);

    if (event.direct_savings_yen !== null) {
      assert.ok(event.baseline?.evidence_url, `${event.id}: savings require baseline evidence`);
      assert.ok(event.realized?.evidence_url, `${event.id}: savings require realized evidence`);
      assert.equal(
        event.direct_savings_yen,
        event.baseline.amount_yen - event.realized.amount_yen,
        `${event.id}: savings must equal baseline minus realized amount`,
      );
    }

    if (event.time_saved_minutes !== null) {
      assert.ok(Number.isFinite(event.time?.baseline_minutes));
      assert.ok(Number.isFinite(event.time?.actual_minutes));
      assert.equal(event.time_saved_minutes, event.time.baseline_minutes - event.time.actual_minutes);
    }
  }
});
