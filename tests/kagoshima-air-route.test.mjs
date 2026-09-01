import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const trip = JSON.parse(
  await readFile(new URL('../public/data/kagoshima-kirishima-2026.json', import.meta.url), 'utf8'),
);

test('Issue 61の三連休ルートを一方向で保持する', () => {
  assert.equal(trip.trip_plan_issue, 61);
  assert.deepEqual(trip.travel_window, {
    start: '2026-10-10',
    end: '2026-10-12',
    paid_leave_days: 0,
  });
  assert.equal(trip.route.length, 3);
  assert.equal(trip.route[2].from, '硫黄谷温泉 霧島ホテル');
  assert.deepEqual(trip.route[2].via, ['鹿児島空港']);
  assert.equal(trip.route[2].to, '大阪');
  assert.equal(trip.route[2].via.includes('鹿児島市'), false);
});

test('対象日のホテル価格をmutableな観測値として保持する', () => {
  const sheraton = trip.hotels.find(({ id }) => id === 'sheraton-kagoshima');
  const kirishima = trip.hotels.find(({ id }) => id === 'kirishima-hotel');

  assert.equal(sheraton.observed_offer.stay_date, '2026-10-10');
  assert.equal(sheraton.observed_offer.party_adults, 2);
  assert.equal(sheraton.observed_offer.minimum_room_price_yen, 51600);
  assert.equal(sheraton.observed_offer.mutable, true);
  assert.equal(sheraton.observed_offer.verification_state, 'VERIFIED_AT_2026_08_31');

  assert.equal(kirishima.observed_offer.stay_date, '2026-10-11');
  assert.equal(kirishima.observed_offer.minimum_room_price_yen, 37840);
  assert.equal(kirishima.observed_offer.mutable, true);
  assert.equal(kirishima.observed_offer.verification_state, 'VERIFIED_AT_2026_08_31');
});

test('別予約の比較下限を応援割の予約価格へ昇格させない', () => {
  assert.equal(trip.observed_cost_floor.hotel_total_for_two_yen, 89440);
  assert.equal(trip.observed_cost_floor.hotel_per_person_yen, 44720);
  assert.equal(trip.observed_cost_floor.cheapest_observed_roundtrip_flight_per_person_yen, 25320);
  assert.equal(trip.observed_cost_floor.separate_booking_floor_per_person_before_local_transport_yen, 70040);
  assert.equal(trip.observed_cost_floor.state, 'CALCULATED_FROM_MUTABLE_OBSERVATIONS');
  assert.equal(trip.observed_cost_floor.bookable_as_single_product, false);
  assert.equal(trip.observed_cost_floor.recovery_discount_eligible, null);

  assert.equal(trip.recovery_discount.canonical_data_path, '/travel/data/kyushu-recovery-discount-2026.json');
  assert.equal(trip.recovery_discount.eligible_two_night_product, null);
  assert.equal(trip.recovery_discount.participating_seller_for_this_route, null);
  assert.equal(trip.recovery_discount.discounted_bookable_price_yen, null);
  assert.equal(trip.recovery_discount.verification_state, 'UNVERIFIED');
});

test('航空便は安さと観光時間を分離しSkyscanner attributionを保持する', () => {
  assert.equal(
    trip.flights.skyscanner.attribution_url,
    'https://skyscanner.net/g/referrals/v1/flights/home?mediaPartnerId=2850210&utm_term=skyscanner_chatgpt_app_data',
  );
  assert.equal(trip.flights.skyscanner.observed_itineraries[0].roundtrip_yen_per_person, 25320);
  assert.equal(trip.flights.skyscanner.observed_itineraries[0].sightseeing_fit, 'LOW');

  const morning = trip.flights.jtb_exact_date_schedule.morning_outbound_options;
  assert.equal(morning.length, 3);
  assert.equal(morning[0].departure, '07:05');
  assert.equal(morning[0].arrival, '08:20');
  assert.equal(Object.hasOwn(morning[0], 'total_flight_price_yen'), false);
});

test('霧島の現行公共交通は運行日を区別し、休日の空港直行便を正しく保持する', () => {
  const access = trip.local_transport.kagoshima_to_kirishima;
  const airport = trip.local_transport.kirishima_hotel_to_airport;

  assert.equal(access.current_timetable_revision_date, '2026-04-01');
  assert.equal(access.target_travel_date, '2026-10-11');
  assert.equal(access.current_sunday_structure.access_bus_daily_connection.departure, '16:10');
  assert.equal(access.current_sunday_structure.access_bus_daily_connection.via, '霧島神宮 16:21');
  assert.equal(access.current_sunday_structure.access_bus_daily_connection.arrival, '16:36');
  assert.equal(access.current_sunday_structure.one_day_ticket_yen, 1500);
  assert.match(access.current_sunday_structure.weekday_only_route_excluded_on_target_weekday, /平日運行/);
  assert.equal(access.target_date_timetable_confirmed, false);

  assert.equal(airport.nearest_bus_stop, '硫黄谷');
  assert.equal(airport.target_travel_date, '2026-10-12');
  assert.equal(airport.target_date_is_national_holiday, true);
  assert.equal(airport.direct_bus_available_on_target_date, true);
  assert.equal(airport.holiday_operating_options.length, 2);
  assert.deepEqual(airport.holiday_operating_options[0], {
    from: '硫黄谷',
    departure: '11:23',
    to: '鹿児島空港',
    arrival: '12:02',
    fare_yen: 710,
  });
  assert.equal(airport.holiday_operating_options[1].departure, '14:23');
  assert.equal(airport.holiday_operating_options[1].arrival, '15:02');
  assert.equal(airport.weekday_only_earlier_options.length, 2);
  assert.equal(airport.target_date_public_transport_timetable_confirmed, true);
  assert.equal(airport.verification_state, 'VERIFIED_CURRENT_OFFICIAL_TIMETABLE');
});

test('対象日公共交通と割引商品を未確認のまま保持する', () => {
  assert.equal(trip.local_transport.sakurajima_ferry.target_date_timetable_confirmed, false);
  assert.equal(trip.local_transport.kagoshima_to_kirishima.target_date_timetable_confirmed, false);
  assert.equal(trip.local_transport.kirishima_hotel_to_airport.target_date_public_transport_timetable_confirmed, true);
  assert.equal(trip.recovery_discount.booking_start_for_kagoshima, null);
});
