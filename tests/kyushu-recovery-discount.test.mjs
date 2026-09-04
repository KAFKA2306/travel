import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const data = JSON.parse(
  await readFile(new URL('../public/data/kyushu-recovery-discount-2026.json', import.meta.url), 'utf8'),
);

test('九州ふっこう応援割の観光庁公表条件を保持する', () => {
  assert.equal(data.program_name, '九州ふっこう応援割');
  assert.equal(data.publisher, '観光庁');
  assert.equal(data.official_source_url, 'https://www.mlit.go.jp/kankocho/page13_00002.html');
  assert.equal(data.source_last_updated, '2026-09-03');
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

test('熊本県の予約開始未公表を外部ブロッカーとして保持する', () => {
  const kumamoto = data.prefecture_announcements['熊本県'];
  assert.equal(kumamoto.status, 'UNPUBLISHED_EXTERNAL_BLOCKER');
  assert.equal(kumamoto.booking_start, null);
  assert.equal(kumamoto.eligible_stay_end, null);
  assert.equal(kumamoto.participating_sellers, null);
  assert.equal(kumamoto.source_last_updated, '2026-09-03');

  const target = data.target_trip_issue_86;
  assert.equal(target.issue_number, 86);
  assert.equal(target.status, 'BLOCKED_BY_KUMAMOTO_ANNOUNCEMENT');
  assert.equal(target.decision, 'WAIT_FOR_OFFICIAL_BOOKING_START');
  assert.equal(target.discount_rate, 0.6);
  assert.equal(target.target_dates_after_national_start, true);
  assert.equal(target.target_dates_within_kumamoto_period, null);
  assert.equal(target.existing_reservation_retroactive_eligibility, null);
});

test('11月参考価格は対象日の確定価格と混同しない', () => {
  const [amakusa, kurokawa] = data.target_trip_issue_86.target_stays;
  assert.equal(amakusa.reference_price_yen_2_adults, 30800);
  assert.equal(amakusa.reference_discount_yen_at_60pct, 18480);
  assert.equal(amakusa.reference_net_yen_at_60pct, 12320);
  assert.equal(amakusa.target_date_exact_price_yen, null);
  assert.match(amakusa.reference_price_scope, /11\/20の確定価格ではない/);

  assert.equal(kurokawa.reference_price_yen_2_adults, 33660);
  assert.equal(kurokawa.reference_discount_yen_at_60pct, 20196);
  assert.equal(kurokawa.reference_net_yen_at_60pct, 13464);
  assert.equal(kurokawa.target_date_exact_price_yen, null);
  assert.match(kurokawa.reference_price_scope, /11\/21の確定価格ではない/);
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

  const [beppuProduct, unzenBeppuProduct] = announcement.published_travel_products;
  assert.equal(beppuProduct.product_name, '界 別府に泊まる「ドラマティック船旅湯治プラン」4日間');
  assert.equal(beppuProduct.set_period_start, '2026-10-01');
  assert.equal(beppuProduct.set_period_end, '2027-03-29');
  assert.equal(beppuProduct.adult_price_yen_standard_room_3_person_min, 93000);
  assert.equal(beppuProduct.adult_price_yen_standard_room_3_person_max, 106000);
  assert.equal(beppuProduct.web_application_discount_yen_per_person, 500);
  assert.equal(beppuProduct.target_departure_date_for_comparison, '2026-11-20');
  assert.equal(beppuProduct.target_date_within_published_set_period, true);
  assert.equal(beppuProduct.target_date_availability, null);
  assert.equal(beppuProduct.target_date_exact_price_yen, null);
  assert.equal(beppuProduct.recovery_discount_eligible, null);

  assert.equal(unzenBeppuProduct.product_name, '界 雲仙・界 別府を巡る九州絶景旅 5日間');
  assert.equal(unzenBeppuProduct.set_period_start, '2026-10-01');
  assert.equal(unzenBeppuProduct.set_period_end, '2027-03-28');
  assert.deepEqual(unzenBeppuProduct.lodging_prefectures, ['長崎県', '大分県']);
  assert.equal(unzenBeppuProduct.hotel_nights, 2);
  assert.deepEqual(unzenBeppuProduct.adult_base_price_yen_by_occupancy, {
    '3_person_room': 128000,
    '2_person_room': 151000,
    '1_person_room': 209000,
  });
  assert.equal(unzenBeppuProduct.web_application_discount_yen_per_person, 500);
  assert.equal(unzenBeppuProduct.target_departure_date_for_comparison, '2026-11-20');
  assert.equal(unzenBeppuProduct.target_date_within_published_set_period, true);
  assert.equal(unzenBeppuProduct.target_date_excluded, false);
  assert.equal(unzenBeppuProduct.target_date_availability, null);
  assert.equal(unzenBeppuProduct.target_date_exact_price_yen, null);
  assert.equal(unzenBeppuProduct.recovery_discount_eligible, null);
});
