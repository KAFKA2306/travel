# Canonical travel decision flow

Wayweave has one canonical decision path:

```text
verified/dated source evidence
  -> destination / route / trip-plan records
  -> comparison and feasibility checks
  -> one decision-ready itinerary or explicit no-go
  -> public decision views / planner
  -> user re-checks time-sensitive official sources before booking/departure
```

The repository does not treat a growing list of destinations, research notes, generated pages, or database projections as separate sources of truth. `public/data/` and typed planner data are the maintained inputs used by the public views; future PostgreSQL/PostGIS storage is an operational projection until an explicit migration changes that contract.

## Repository KPIs

At repository level, keep at most these three outcome metrics:

1. `decision_ready_candidates` — candidates with enough verified evidence to make a go/no-go decision.
2. `freshness_pass_rate` — time-sensitive facts whose explicit freshness/re-check contract passes.
3. `manual_research_actions` — human research/check steps needed before a decision-ready output.

Unknown or uninstrumented values are not converted to zero.

## Non-goals

- Accumulating duplicate destination notes in multiple formats.
- Treating generated/static projections as independent canonical data.
- Running unrelated repository research automation that does not feed the decision path.
- Automating booking or purchase side effects.

## Change rule

A new dataset, workflow, page, or abstraction must identify which stage above it owns and why an existing stage cannot represent the requirement. Duplicate or superseded paths should be removed rather than retained as historical storage; history belongs in commits, PRs, issues, and evidence artifacts.
