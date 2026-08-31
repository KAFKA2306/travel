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

test('商船三井さんふらわあの実在商品と応援割対象可否を分離する', () => {
  const [announcement] = data.seller_announcements;
  assert.equal(announcement.seller, '商船三井さんふらわあ');
  assert.equal(announcement.announcement_url, 'https://www.ferry-sunflower.co.jp/travel/news/003057.html');
  assert.equal(announcement.announced_at, '2026-08-31');
  assert.equal(announcement.eligible_products, null);
  assert.equal(announcement.sales_start, null);
  assert.equal(announcement.details_after_prefectural_announcements, true);

  const [product] = announcement.published_travel_products;
  assert.equal(product.product_name, '界 別府に泊まる「ドラマティック船旅湯治プラン」4日間');
  assert.equal(product.set_period_start, '2026-10-01');
  assert.equal(product.set_period_end, '2027-03-29');
  assert.equal(product.adult_price_yen_standard_room_3_person_min, 93000);
  assert.equal(product.adult_price_yen_standard_room_3_person_max, 106000);
  assert.equal(product.web_application_discount_yen_per_person, 500);
  assert.equal(product.target_departure_date_for_comparison, '2026-11-20');
  assert.equal(product.target_date_within_published_set_period, true);
  assert.equal(product.target_date_availability, null);
  assert.equal(product.target_date_exact_price_yen, null);
  assert.equal(product.recovery_discount_eligible, null);
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

  const lastMile = crossing.current_yufurin_timetable.last_mile_to_ferry_terminal;
  assert.equal(lastMile.current_timetable_revision_date, '2026-03-14');
  assert.equal(lastMile.target_date_timetable_confirmed, false);
  assert.deepEqual(lastMile.preferred_current_connection, {
    from: '別府駅前⑤のりば',
    to: 'さんふらわあターミナル別府前',
    departure: '15:58',
    arrival: '16:10',
    service: '26番・26A番 内廻り循環線',
    transfer_minutes_after_yufurin: 27,
    minutes_before_ferry_check_in_deadline: 95,
  });
  assert.deepEqual(lastMile.later_current_connection, {
    from: '別府駅前⑤のりば',
    to: 'さんふらわあターミナル別府前',
    departure: '16:32',
    arrival: '16:44',
    service: '20番 別府大学経由鉄輪線',
    transfer_minutes_after_yufurin: 61,
    minutes_before_ferry_check_in_deadline: 61,
  });

  assert.equal(crossing.current_ferry_timetable.target_date_operating_schedule_confirmed, true);
  assert.equal(crossing.current_ferry_timetable.departure.departure, '18:45');
  assert.equal(crossing.current_ferry_timetable.departure.arrival_next_day, '06:35');
  assert.equal(crossing.current_ferry_timetable.walk_on_check_in_deadline, '17:45');
});

test('11月23日さんふらわあは休日例外を適用した予約開始日時と未確認の空席・実料金を分離する', () => {
  const reservation = crossing.current_ferry_timetable.reservation;
  assert.equal(
    reservation.booking_rule,
    '乗船予定日の3か月前の同日午前9時より受付。予約開始日が日曜・祭日及び当社休業日の場合は翌営業日',
  );
  assert.equal(reservation.booking_open_at, '2026-08-24T09:00:00+09:00');
  assert.equal(reservation.booking_open, true);
  assert.equal(reservation.booking_url, 'https://booking.ferry-sunflower.co.jp/web/yoyaku/');
  assert.equal(reservation.availability, null);
  assert.equal(reservation.target_date_fare_period, null);
  assert.equal(reservation.target_date_exact_fare_yen, null);
  assert.deepEqual(reservation.published_base_fares_yen_2026_oct_dec, {
    A: 15390,
    B: 17800,
    C: 20700,
    D: 22700,
  });

  const roomSurcharges = reservation.published_room_surcharges_yen_2026_oct_dec;
  assert.deepEqual(roomSurcharges['プライベートベッド'], {
    A: 0,
    B: 0,
    C: 0,
    D: 0,
  });
  assert.deepEqual(roomSurcharges['スタンダードシングル'], {
    A: 4000,
    B: 4000,
    C: 6000,
    D: 6000,
  });
  assert.deepEqual(roomSurcharges['スーペリアツイン'], {
    A: 7000,
    B: 7000,
    C: 11000,
    D: 11000,
  });
  assert.deepEqual(roomSurcharges['デラックス'], {
    A: 12000,
    B: 12000,
    C: 17000,
    D: 17000,
  });
  assert.deepEqual(roomSurcharges['スイート'], {
    A: 17000,
    B: 17000,
    C: 23000,
    D: 23000,
  });
});
