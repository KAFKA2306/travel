# Wayweave

A reference implementation for a travel knowledge product. The root is a decision portal: it helps the user choose whether to discover destinations, compare a current decision set, edit a saved itinerary, or verify live official information. The planner is a subordinate workspace rather than the public front page.

**Decision portal:** https://kafka2306.github.io/travel/

**Planner workspace:** https://kafka2306.github.io/travel/planner/

**Travel quick links:** https://kafka2306.github.io/travel/guides/

**Destination atlas:** https://kafka2306.github.io/travel/destinations/

**Site ontology:** https://kafka2306.github.io/travel/sitemap/

**Heat escape 2026 plans:** https://kafka2306.github.io/travel/heat-escape-2026/

**Osaka → Shenzhen route lab:** https://kafka2306.github.io/travel/shenzhen/

The decision portal does not select one saved itinerary on behalf of the visitor. It exposes four primary intents: choose a next-week alternative, discover destinations through official media, edit a saved plan, or check live official information.

The planner workspace retains the car-free, solo Sado Island seed scenario and the Kobe-Sannomiya / Arima day-trip model. These are editable planning records, not the information architecture of the whole site.

The Shenzhen route lab adds an international, multimodal case without replacing the domestic models. It compares a Kansai–Shenzhen direct-flight pattern, an airside transfer from Hong Kong International Airport to Shenzhen Shekou by ferry, and a cross-border coach fallback. Time-sensitive operations remain revalidation constraints linked to official sources.

The travel quick-links hub prioritizes operational pages used on the travel day. The destination atlas connects official visual media to a concrete plan and its official publisher. The heat-escape page converts a user-supplied 2026 ranking into ten alternative, car-free plans from Osaka, each with a target date, route, minimum stay, booking order, removable elements, official sources and a 48-hour go/no-go gate.

## Product views

1. **Decision portal** — the public front page; routes the visitor by intent instead of opening an arbitrary saved itinerary.
2. **Planner workspace** — saved trip selection, explainable filters, spatial context, Google Maps and a feasibility-aware itinerary.
3. **Destination atlas** — official remote visuals connected to concrete plans and publisher pages.
4. **Heat escape 2026** — ten ranked cool-weather destinations converted into next-week-ready alternatives.
5. **Travel quick links** — trip-specific official links for transport, tourism, facilities, weather and entry conditions.
6. **Shenzhen route lab** — direct flight, Hong Kong airside ferry and cross-border coach patterns with route-specific failure conditions.
7. **Site ontology** — the relationship between Decision, TripPlan, Destination, Route, EvidenceSource and MediaAsset.

## Google Maps setup

The planner uses the official **Maps Embed API**. Search, navigation and full-itinerary actions use **Maps URLs**.

Official documentation:

- Maps Embed API: https://developers.google.com/maps/documentation/embed/get-started
- Embed modes and parameters: https://developers.google.com/maps/documentation/embedding-map
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

- **Vite multi-page build** separates the static decision portal from the React planner workspace.
- **React + TypeScript** power the stateful planner without forcing the whole site into one application view.
- **Google Maps Embed API + Maps URLs** provide interactive map handoff without a server-side directions proxy.
- **PostgreSQL + PostGIS** remain the operational model for relationships, validity windows and spatial filtering.
- **Schema.org + GTFS + PROV-O** keep external mappings explicit.
- **Remote official media manifests** preserve publisher attribution and avoid automatic local rehosting.

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
index.html                              Decision-oriented public front page
planner/index.html                      React planner HTML entry
src/                                    Interactive planner UI and typed seed data
src/GoogleMapsDock.tsx                  Maps Embed API and Maps URLs integration
src/google-maps.css                     Responsive Google Maps panel styles
public/destinations/index.html          Official-media destination atlas
public/heat-escape-2026/index.html      Next-week heat-escape alternatives
public/guides/index.html                Trip-specific official quick-links hub
public/shenzhen/index.html              Osaka–Shenzhen multimodal route lab
public/sitemap/index.html               Ontology-driven site map
public/data/*.json                      Destination, media and site ontology data
scripts/                                Deterministic shell and media refresh tasks
database/schema.sql                     PostgreSQL/PostGIS operational schema
docs/ontology.md                        Concepts, mappings and identity rules
.github/workflows/                       Refresh and GitHub Pages deployment
```

## Database rollout

1. Provision PostgreSQL with PostGIS.
2. Apply `database/schema.sql` through a migration tool rather than manually in production.
3. Create monthly partitions for `availability_snapshot` ahead of ingestion.
4. Ingest raw records into `source` and `source_record`, then resolve canonical entities.
5. Materialize claims and typed domain rows in one transaction.
6. Expose planner-specific read models through an API; do not send raw normalized tables directly to the browser.

## UX principle

The primary unit is a **decision**, not a place card and not a saved itinerary. The root should answer “what do you want to do next?” before exposing a stateful planning workspace.
