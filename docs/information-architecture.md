# Wayweave information architecture

## Fixed hierarchy

1. **Map** — the homepage gives geographic overview first.
2. **Areas** — users choose an area hub before seeing detailed collections.
3. **Plans / facilities** — trip plans, museums, routes, rankings and photo collections are children.
4. **Live information** — schedules, closures, weather and other time-sensitive checks are used last.

## Primary navigation

Primary navigation is fixed to exactly four entries:

- 地図 `/travel/`
- エリア `/travel/destinations/`
- 旅程 `/travel/planner/`
- 当日情報 `/travel/guides/`

A new feature page must not add another primary navigation item.

## Current child pages

- `/travel/kansai-museums/` → エリア
- `/travel/official/` → エリア
- `/travel/heat-escape-2026/` → 旅程
- `/travel/shenzhen/` → 旅程
- `/travel/sitemap/` → 地図 / structure reference

## Addition rule

When adding a museum, attraction, hotel, route, photo collection or seasonal feature:

1. attach its data to an existing area hub or trip plan;
2. link it from that parent page;
3. do not add it to the global navigation;
4. keep detailed photos and source links below the geographic and area context;
5. extend `site-areas.json` only when a genuinely new geographic area is introduced.

`Validate site structure` fails if a child feature leaks into the primary navigation.
