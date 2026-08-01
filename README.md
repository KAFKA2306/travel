# Wayweave

A reference implementation for a large-scale travel knowledge product. It combines a decision-oriented UI, a general travel ontology, and a PostgreSQL/PostGIS schema that can ingest accommodation, mobility, place, itinerary and provenance data without collapsing everything into one JSON document.

**Live site:** https://kafka2306.github.io/travel/

The current interface uses a car-free, solo Sado Island trip as a realistic seed scenario: Osaka → Niigata → Ryotsu → Futatsugame → Aikawa, with live-data caveats exposed as evidence rather than hidden in a score.

The typed seed layer is intentionally additive. Sado remains the initial scenario, while the second saved model now uses two nights near Kobe-Sannomiya and treats Arima Onsen as a day trip. Hotel Harvest Arima Rokusa(i) remains in the dataset as a higher-priced comparison candidate rather than the executed stay. Destination records can therefore accumulate without replacing prior scenarios, and a price constraint can change the itinerary without deleting the rejected option.

## Product views

1. **Travel planner** — saved trip selection, explainable filters, spatial context and a feasibility-aware itinerary.
2. **Google Maps panel** — an embedded place view that follows the selected location, trip-aware transit directions, current-location navigation and a full-itinerary link.
3. **Knowledge model** — five domain groups and the recommended storage pipeline.
4. **Evidence drawer** — source, publisher and retrieval date for the claims currently shaping the plan.

## Google Maps setup

The in-page map uses the official **Maps Embed API**. Search, navigation and full-itinerary actions use **Maps URLs**.

Official documentation:

- Maps Embed API: https://developers.google.com/maps/documentation/embed/get-started
- Embed modes and parameters: https://developers.google.com/maps/documentation/embed/embedding-map
- Maps URLs: https://developers.google.com/maps/documentation/urls/get-started
- API key security: https://developers.google.com/maps/api-security-best-practices

### GitHub Pages production configuration

1. Create or select a Google Cloud project and enable billing.
2. Enable **Maps Embed API**.
3. Create a browser API key.
4. Apply **Websites** application restrictions:
   - `https://kafka2306.github.io/travel/*`
   - `http://localhost:5173/*`
   - `http://127.0.0.1:5173/*`
5. Apply an API restriction allowing only **Maps Embed API**.
6. Open **Settings → Secrets and variables → Actions** in this repository.
7. Create a repository secret named `GOOGLE_MAPS_API_KEY`.
8. Re-run **Deploy to GitHub Pages**, or push another commit to `main`.

The Pages workflow injects the secret as `VITE_GOOGLE_MAPS_API_KEY` during `npm run build`. A browser API key is visible to site visitors after deployment by design. The GitHub secret prevents accidental source-control disclosure; website and API restrictions provide the effective protection.

Without the key, external Google Maps links remain available and the embedded panel displays a setup notice.

## Why this stack

- **React + TypeScript + Vite** keeps the reference UI fast, typed and deployable to GitHub Pages.
- **Google Maps Embed API + Maps URLs** provide an interactive map and cross-platform handoff without adding a server-side directions proxy.
- **PostgreSQL** is the transactional source of truth for relationships, validity windows and integrity constraints.
- **PostGIS** handles nearby, containment, corridor and geographic filtering with spatial indexes.
- **Range partitions** isolate high-volume availability and price snapshots by capture time.
- **Parquet exports** are the better boundary for analytical scans and data distribution; they do not replace the operational database.
- **Schema.org + GTFS + PROV-O** keep external mappings explicit and avoid an isolated in-house vocabulary.

## Run locally

```bash
cp .env.example .env.local
# Set a restricted browser key in .env.local.
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
src/GoogleMapsDock.tsx  Maps Embed API and Maps URLs integration
src/google-maps.css     Responsive Google Maps panel styles
src/                    Interactive reference UI and typed seed data
database/schema.sql     PostgreSQL/PostGIS operational schema
docs/ontology.md        Concepts, mappings and identity rules
.github/workflows/      GitHub Pages deployment
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
