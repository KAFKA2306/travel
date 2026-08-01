# Wayweave

A reference implementation for a large-scale travel knowledge product. It combines a decision-oriented UI, a general travel ontology, and a PostgreSQL/PostGIS schema that can ingest accommodation, mobility, place, itinerary and provenance data without collapsing everything into one JSON document.

The current interface uses a car-free, solo Sado Island trip as a realistic seed scenario: Osaka → Niigata → Ryotsu → Futatsugame → Aikawa, with live-data caveats exposed as evidence rather than hidden in a score.

The typed seed layer is intentionally additive: Sado remains the active scenario while `tripCatalog`, `places` and `arimaItinerary` retain an additional Arima Onsen / Hotel Harvest Arima Rokusa(i) scenario. Destination records can therefore accumulate in one generic travel dataset without replacing the current trip.

## Why this stack

- **React + TypeScript + Vite** keeps the reference UI fast, typed and deployable to GitHub Pages.
- **PostgreSQL** is the transactional source of truth for relationships, validity windows and integrity constraints.
- **PostGIS** handles nearby, containment, corridor and geographic filtering with spatial indexes.
- **Range partitions** isolate high-volume availability and price snapshots by capture time.
- **Parquet exports** are the better boundary for analytical scans and data distribution; they do not replace the operational database.
- **Schema.org + GTFS + PROV-O** keep external mappings explicit and avoid an isolated in-house vocabulary.

## Product views

1. **Travel planner** — saved trip selection, explainable filters, spatial context and a feasibility-aware itinerary.
2. **Knowledge model** — five domain groups and the recommended storage pipeline.
3. **Evidence drawer** — source, publisher and retrieval date for the claims currently shaping the plan.

## Run locally

```bash
npm install
npm run dev
```

Production checks:

```bash
npm run typecheck
npm run build
```

## Repository map

```text
src/                 Interactive reference UI and typed seed data
database/schema.sql  PostgreSQL/PostGIS operational schema
docs/ontology.md     Concepts, mappings and identity rules
.github/workflows/   GitHub Pages deployment
```

## Database rollout

1. Provision PostgreSQL with PostGIS.
2. Apply `database/schema.sql` through a migration tool rather than manually in production.
3. Create monthly partitions for `availability_snapshot` ahead of ingestion; the default partition is only a safety net.
4. Ingest raw records into `source` and `source_record`, then resolve canonical entities.
5. Materialize claims and typed domain rows in one transaction.
6. Expose planner-specific read models through an API; do not send raw normalized tables directly to the browser.

## UX principle

The primary unit is a **decision**, not a place card. A result should answer four questions together: does it match the traveler, can they reach it, is it available for the party and date, and what source supports that conclusion?
