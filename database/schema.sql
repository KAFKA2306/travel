-- Wayweave canonical store
-- PostgreSQL 18 + PostGIS 3.x

create extension if not exists postgis;
create extension if not exists pg_trgm;

create schema if not exists travel;
set search_path = travel, public;

-- Every record keeps a stable internal identity. Domain tables below add meaning.
create table entity (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in (
    'place', 'accommodation', 'room', 'activity', 'operator', 'route', 'service',
    'offer', 'trip_plan', 'itinerary_item'
  )),
  canonical_name text not null,
  description text,
  attributes jsonb not null default '{}'::jsonb,
  search_document tsvector generated always as (
    to_tsvector('simple', coalesce(canonical_name, '') || ' ' || coalesce(description, ''))
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index entity_search_idx on entity using gin (search_document);
create index entity_name_trgm_idx on entity using gin (canonical_name gin_trgm_ops);
create index entity_attributes_idx on entity using gin (attributes jsonb_path_ops);

create table entity_name (
  entity_id uuid not null references entity(id) on delete cascade,
  language_code text not null,
  name text not null,
  name_kind text not null default 'preferred' check (name_kind in ('preferred', 'alternate', 'historic', 'short')),
  primary key (entity_id, language_code, name, name_kind)
);

create index entity_name_lookup_idx on entity_name using gin (name gin_trgm_ops);

-- Geography: a place can be a region, city, stop, property or POI.
create table place (
  entity_id uuid primary key references entity(id) on delete cascade,
  place_kind text not null check (place_kind in (
    'country', 'administrative_area', 'city', 'neighborhood', 'transport_stop',
    'accommodation', 'attraction', 'restaurant', 'natural_feature', 'event_venue'
  )),
  parent_place_id uuid references place(entity_id),
  timezone text,
  point geography(point, 4326),
  boundary geography(multipolygon, 4326),
  address jsonb not null default '{}'::jsonb
);

create index place_point_gix on place using gist (point);
create index place_boundary_gix on place using gist (boundary);
create index place_parent_idx on place (parent_place_id);

create table place_relation (
  subject_place_id uuid not null references place(entity_id) on delete cascade,
  relation_type text not null check (relation_type in ('contains', 'near', 'part_of', 'entrance_to', 'serves')),
  object_place_id uuid not null references place(entity_id) on delete cascade,
  distance_m integer check (distance_m is null or distance_m >= 0),
  primary key (subject_place_id, relation_type, object_place_id)
);

-- Supply: lodging, rooms, amenities and bookable offers are deliberately separate.
create table accommodation (
  entity_id uuid primary key references place(entity_id) on delete cascade,
  accommodation_kind text not null check (accommodation_kind in (
    'hotel', 'ryokan', 'hostel', 'guesthouse', 'apartment', 'camping', 'resort'
  )),
  check_in_time time,
  check_out_time time,
  star_rating numeric(2,1) check (star_rating between 0 and 5),
  contact jsonb not null default '{}'::jsonb
);

create table amenity (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  category text not null check (category in ('room', 'property', 'accessibility', 'transport', 'experience'))
);

create table entity_amenity (
  entity_id uuid not null references entity(id) on delete cascade,
  amenity_id uuid not null references amenity(id) on delete cascade,
  availability text not null default 'yes' check (availability in ('yes', 'no', 'limited', 'unknown')),
  details jsonb not null default '{}'::jsonb,
  primary key (entity_id, amenity_id)
);

create table room_type (
  entity_id uuid primary key references entity(id) on delete cascade,
  accommodation_id uuid not null references accommodation(entity_id) on delete cascade,
  capacity_min smallint not null default 1 check (capacity_min > 0),
  capacity_max smallint not null check (capacity_max >= capacity_min),
  bed_configuration jsonb not null default '[]'::jsonb,
  view_codes text[] not null default '{}'
);

create table offer (
  entity_id uuid primary key references entity(id) on delete cascade,
  offered_entity_id uuid not null references entity(id) on delete cascade,
  provider_entity_id uuid references entity(id),
  currency char(3) not null,
  base_price numeric(12,2) check (base_price is null or base_price >= 0),
  party_size smallint not null default 1 check (party_size > 0),
  valid_during tstzrange,
  booking_url text,
  cancellation_terms jsonb not null default '{}'::jsonb
);

-- Price and inventory change frequently, so snapshots are append-only and monthly partitioned.
create table availability_snapshot (
  id bigint generated always as identity,
  offer_id uuid not null references offer(entity_id) on delete cascade,
  stay_date date not null,
  inventory_status text not null check (inventory_status in ('available', 'limited', 'sold_out', 'request', 'unknown')),
  price numeric(12,2) check (price is null or price >= 0),
  captured_at timestamptz not null,
  source_record_id uuid,
  primary key (id, captured_at)
) partition by range (captured_at);

create table availability_snapshot_default partition of availability_snapshot default;
create index availability_offer_date_idx on availability_snapshot (offer_id, stay_date, captured_at desc);

-- Mobility: mirrors GTFS concepts without coupling internal IDs to one feed.
create table transport_operator (
  entity_id uuid primary key references entity(id) on delete cascade,
  website_url text,
  phone text,
  fare_url text
);

create table transport_stop (
  entity_id uuid primary key references place(entity_id) on delete cascade,
  operator_entity_id uuid references transport_operator(entity_id),
  platform_code text,
  wheelchair_boarding text check (wheelchair_boarding in ('yes', 'no', 'unknown'))
);

create table transport_route (
  entity_id uuid primary key references entity(id) on delete cascade,
  operator_entity_id uuid not null references transport_operator(entity_id),
  route_code text,
  transport_mode text not null check (transport_mode in ('rail', 'metro', 'tram', 'bus', 'coach', 'ferry', 'air', 'taxi', 'walk', 'bike')),
  color char(6)
);

create table service_calendar (
  id uuid primary key default gen_random_uuid(),
  service_code text not null,
  active_dates daterange not null,
  monday boolean not null,
  tuesday boolean not null,
  wednesday boolean not null,
  thursday boolean not null,
  friday boolean not null,
  saturday boolean not null,
  sunday boolean not null
);

create table service_exception (
  service_calendar_id uuid not null references service_calendar(id) on delete cascade,
  service_date date not null,
  exception_type text not null check (exception_type in ('added', 'removed')),
  primary key (service_calendar_id, service_date)
);

create table transport_trip (
  entity_id uuid primary key references entity(id) on delete cascade,
  route_entity_id uuid not null references transport_route(entity_id),
  service_calendar_id uuid not null references service_calendar(id),
  headsign text,
  direction_id smallint check (direction_id in (0, 1)),
  booking_required boolean not null default false,
  booking_deadline interval
);

create table scheduled_call (
  trip_entity_id uuid not null references transport_trip(entity_id) on delete cascade,
  stop_entity_id uuid not null references transport_stop(entity_id),
  stop_sequence integer not null check (stop_sequence > 0),
  arrival_offset interval,
  departure_offset interval,
  pickup_type text not null default 'regular' check (pickup_type in ('regular', 'none', 'phone', 'coordinate')),
  dropoff_type text not null default 'regular' check (dropoff_type in ('regular', 'none', 'phone', 'coordinate')),
  primary key (trip_entity_id, stop_sequence)
);

create index scheduled_call_stop_idx on scheduled_call (stop_entity_id, trip_entity_id);

-- Provenance: source, external identifier and claim are first-class data.
create table source (
  id uuid primary key default gen_random_uuid(),
  publisher text not null,
  title text not null,
  source_url text not null,
  source_kind text not null check (source_kind in ('official', 'operator', 'standard', 'government', 'partner', 'editorial', 'user')),
  license text,
  retrieved_at timestamptz not null,
  content_hash text
);

create table source_record (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references source(id) on delete cascade,
  external_namespace text not null,
  external_id text not null,
  entity_id uuid references entity(id) on delete set null,
  raw_payload jsonb not null default '{}'::jsonb,
  observed_at timestamptz,
  valid_during tstzrange,
  unique (source_id, external_namespace, external_id)
);

alter table availability_snapshot
  add constraint availability_source_record_fk
  foreign key (source_record_id) references source_record(id);

create table claim (
  id uuid primary key default gen_random_uuid(),
  subject_entity_id uuid not null references entity(id) on delete cascade,
  predicate text not null,
  object_entity_id uuid references entity(id),
  value jsonb,
  source_record_id uuid not null references source_record(id) on delete cascade,
  confidence numeric(4,3) not null default 1.0 check (confidence between 0 and 1),
  valid_during tstzrange,
  asserted_at timestamptz not null default now(),
  check ((object_entity_id is null) <> (value is null))
);

create index claim_subject_predicate_idx on claim (subject_entity_id, predicate);
create index claim_validity_idx on claim using gist (valid_during);

-- Planning: preferences are inputs; constraint evaluations explain the output.
create table traveler_profile (
  id uuid primary key default gen_random_uuid(),
  display_name text,
  locale text not null default 'ja-JP',
  home_place_id uuid references place(entity_id),
  accessibility_needs jsonb not null default '{}'::jsonb
);

create table trip_plan (
  entity_id uuid primary key references entity(id) on delete cascade,
  owner_profile_id uuid references traveler_profile(id) on delete set null,
  destination_place_id uuid references place(entity_id),
  travel_dates daterange not null,
  party_size smallint not null check (party_size > 0),
  room_count smallint check (room_count is null or room_count > 0),
  status text not null default 'draft' check (status in ('draft', 'ready', 'booked', 'travelling', 'completed', 'archived')),
  currency char(3) not null default 'JPY'
);

create table trip_preference (
  trip_plan_id uuid not null references trip_plan(entity_id) on delete cascade,
  preference_code text not null,
  weight numeric(4,3) not null check (weight between 0 and 1),
  value jsonb not null,
  primary key (trip_plan_id, preference_code)
);

create table itinerary_item (
  entity_id uuid primary key references entity(id) on delete cascade,
  trip_plan_id uuid not null references trip_plan(entity_id) on delete cascade,
  item_kind text not null check (item_kind in ('transport', 'stay', 'activity', 'meal', 'buffer')),
  linked_entity_id uuid references entity(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  start_place_id uuid references place(entity_id),
  end_place_id uuid references place(entity_id),
  sequence integer not null check (sequence > 0),
  booking_status text not null default 'unbooked' check (booking_status in ('unbooked', 'held', 'booked', 'cancelled')),
  check (ends_at > starts_at),
  unique (trip_plan_id, sequence)
);

create index itinerary_time_idx on itinerary_item (trip_plan_id, starts_at);

create table constraint_evaluation (
  id uuid primary key default gen_random_uuid(),
  trip_plan_id uuid not null references trip_plan(entity_id) on delete cascade,
  itinerary_item_id uuid references itinerary_item(entity_id) on delete cascade,
  constraint_code text not null,
  outcome text not null check (outcome in ('pass', 'warn', 'fail', 'unknown')),
  explanation text not null,
  evidence_claim_ids uuid[] not null default '{}',
  evaluated_at timestamptz not null default now()
);

create index constraint_trip_outcome_idx on constraint_evaluation (trip_plan_id, outcome);

comment on schema travel is 'Operational travel ontology aligned to Schema.org, GTFS, PROV-O and OWL-Time concepts.';
comment on column entity.attributes is 'Extension point only; query-critical attributes belong in typed columns.';
comment on table claim is 'A provenance-bearing statement. retrieved_at lives on source; validity lives on the claim.';
