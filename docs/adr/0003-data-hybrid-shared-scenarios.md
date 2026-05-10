# 0003 — Hybrid Data Layout (`shared/` + `scenarios/`) with Typed Loaders

**Date:** 2026-05-09
**Status:** Accepted

## Context

Test data needs structure that supports two distinct purposes:

- **Reference data** that many tests read (the 6 products and their prices)
- **Scenario data** that drives parameterized tests (lists of valid/invalid checkout inputs)

Three layout patterns were evaluated. The decision shapes where AI agents put new data, so it needs to be predictable and scale to many features.

## Decision

**Hybrid layout: `data/shared/` for reference, `data/scenarios/<feature>/` for parameterized inputs.**

- Reference data: `data/shared/products.json` (and future siblings)
- Scenario data: `data/scenarios/<feature>/<scenario-set>.json` (e.g., `checkout/valid-checkout.json`)
- Type definitions: `data/types.ts` (one source of truth for shapes)
- Typed loaders: `data/fixtures.ts` exports one loader per JSON source (`load<Subject>(): <Subject>[]`)
- A `getProductById(id: string): Product` helper provides fail-fast lookup

Tests import via the `@data/*` path alias. JSON imports use ESM import attributes (see ADR-0005).

## Consequences

- Adding a new feature's parameterized data = `mkdir data/scenarios/<feature>/` + JSON file + add a `load<Feature>()` loader
- Adding a new shared dataset = JSON file in `data/shared/` + a loader
- Tests don't see raw JSON paths — they import typed loaders, getting full IntelliSense and compile-time safety
- The `as <Type>[]` casts in `fixtures.ts` are intentional (JSON imports come in with wider types); spec accepts this
- A future migration to runtime validation (Zod, etc.) would only need to wrap the existing loaders
- AI agents follow the `load<Subject>(): <Subject>[]` naming convention by example

## Alternatives considered

- **Flat `data/` with all files at the same level** — rejected: doesn't scale past 5-10 files; no obvious place for parameterized inputs
- **Mirror the POM (`data/pages/<PageName>.data.json`)** — rejected: tightly couples data to pages; bad for shared data (e.g., products used on inventory + cart + checkout)
- **Per-test fixtures (`<test-name>.data.json` next to each spec)** — rejected: duplication of shared data; no way to share scenarios across tests
