# 0001 — Page Object Model by Component

**Date:** 2026-05-09
**Status:** Accepted

## Context

The framework needs a structural pattern for organizing page interactions. Three industry patterns exist, each with trade-offs for AI code generation, reuse, and complexity:

- Flat POM (one class per page, no separation)
- Page-with-Components (pages compose reusable components)
- Component-tree (everything is a component, no pages)

We needed to pick one for the framework's lifetime. AI-extension friendliness was a primary criterion.

## Decision

**Page composes Components.** Pages orchestrate the user journey on a single URL/route. Components encapsulate reusable UI building blocks (header, product card, sort dropdown). Pages may also hold page-unique locators directly (when the UI isn't reused). Components may compose other components, but nesting is capped at depth 2.

**Pages NEVER return other Pages.** Navigation methods return `void` or data; tests use injected page fixtures to navigate explicitly.

**Components NEVER know about parents.** A component must be context-free — it knows about its own locators (and optionally child components), nothing else.

## Consequences

- Best AI code-gen results because the boundaries are explicit and predictable
- Tests stay close to natural language: `inventoryPage.addProductToCart('X')`
- Components are independently testable and reusable across pages
- A new page that needs the same UI as another page should NOT duplicate locators — refactor into a Component first
- Page files stay small (one URL/route worth of logic)
- Test files become very short (no construction boilerplate; fixtures inject pages)
- The strict "no fluent navigation" rule means tests are explicit about which page they're on at any moment

## Alternatives considered

- **Flat POM** — rejected: leads to duplication once the app grows; no clear pattern for shared UI
- **Component-tree (no pages)** — rejected: elegant but harder for AI to extend without coupling components together; navigation becomes implicit
- **Fluent navigation (Pages return Pages)** — rejected: tests become harder to read for AI; chained returns mask navigation intent; cross-page imports leak between page files
