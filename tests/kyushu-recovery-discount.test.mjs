import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const data = JSON.parse(
  await readFile(new URL('../public/data/kyushu-recovery-discount-2026.json', import.meta.url), 'utf8'),
);
const crossing = JSON.parse(
  await readFile(new URL('../public/data/kyushu-crossing-2026-11.json', import.meta.url), 'utf8'),
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

test('九州横断案は現行交通と対象日確認状態を分離する', () => {
  assert.equal(crossing.trip_plan_issue, 45);
  assert.equal(crossing.current_bus_timetable.revision_date, '2025-10-01');
  assert.equal(crossing.current_bus_timetable.target_date_validity_confirmed, false);
  assert.equal(crossing.current_bus_timetable.aso_dwell_minutes, 295);
  assert.equal(crossing.current_bus_timetable.minimum_required_aso_dwell_minutes, 180);
  assert.equal(crossing.current_bus_timetable.meets_minimum_dwell_on_current_timetable, true);
  assert.deepEqual(crossing.current_bus_timetable.candidate_segments, [
    {
      from: '熊本駅前',
      to: '阿蘇駅前',
      departure: '07:23',
      arrival: '09:14',
      service: '1号',
    },
    {
      from: '阿蘇駅前',
      to: '黒川温泉',
      departure: '14:09',
      arrival: '15:00',
      service: '7号',
    },
    {
      from: '黒川温泉',
      to: '由布院駅前バスセンター',
      departure: '11:15',
      arrival: '12:48',
      service: '3号',
    },
  ]);

  assert.equal(crossing.current_yufurin_timetable.revision_date, '2026-03-14');
  assert.equal(crossing.current_yufurin_timetable.target_date_validity_confirmed, false);
  assert.deepEqual(crossing.current_yufurin_timetable.candidate_segment, {
    from: '由布院駅前バスセンター',
    to: '別府駅前',
    departure: '14:25',
    arrival: '15:31',
    service: '観光快速 ゆふりん',
  });
  assert.equal(crossing.current_yufurin_timetable.beppu_station_arrival_minutes_before_ferry_check_in_deadline, 134);
  assert.equal(crossing.current_yufurin_timetable.last_mile_to_ferry_terminal.target_date_timetable_confirmed, false);

  assert.equal(crossing.current_ferry_timetable.target_date_operating_schedule_confirmed, true);
  assert.equal(crossing.current_ferry_timetable.departure.departure, '18:45');
  assert.equal(crossing.current_ferry_timetable.departure.arrival_next_day, '06:35');
  assert.equal(crossing.current_ferry_timetable.walk_on_check_in_deadline, '17:45');
});
