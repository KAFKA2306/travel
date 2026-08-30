import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const data = JSON.parse(
  await readFile(new URL('../public/data/kyushu-recovery-discount-2026.json', import.meta.url), 'utf8'),
);

test('九州ふっこう応援割の観光庁公表条件を保持する', () => {
  assert.equal(data.program_name, '九州ふっこう応援割');
  assert.equal(data.publisher, '観光庁');
  assert.equal(data.official_source_url, 'https://www.mlit.go.jp/kankocho/topics04_00093.html');
  assert.equal(data.eligible_stay_start, '2026-10-01');

  const rates = Object.fromEntries(
    data.eligible_prefectures.map(({ prefecture, discount_rate }) => [prefecture, discount_rate]),
  );
  assert.deepEqual(rates, {
    '福岡県': 0.5,
    '佐賀県': 0.5,
    '長崎県': 0.5,
    '熊本県': 0.6,
    '大分県': 0.5,
    '宮崎県': 0.5,
    '鹿児島県': 0.6,
  });

  assert.deepEqual(data.discount_caps_yen, {
    lodging_only: 20000,
    transport_with_lodging_1_night: 20000,
    transport_with_lodging_2_or_more_nights: 30000,
    multi_prefecture_2_or_more_prefectures: 35000,
  });
});

test('未発表項目を推測値で埋めない', () => {
  assert.equal(data.booking_start, null);
  assert.equal(data.eligible_stay_end, null);
  assert.equal(data.participating_sellers, null);
  assert.deepEqual(data.unverified_fields, [
    'booking_start',
    'eligible_stay_end',
    'participating_sellers',
  ]);
});
