---
name: scaffold-page-object
description: Generate a draft Page Object class from a live page snapshot, composing framework components when detected.
allowed-tools: Bash(playwright-cli:*) Bash(npx:*) Bash(rm:*) Read Glob Grep Write
---

# scaffold-page-object

Given a URL + page name + optional storageState, this skill produces a draft Page Object class file at `src/pages/<Name>.ts` (or `scratch/<Name>.ts` for experimentation). The output follows the framework's POM-by-component conventions: `readonly` locator fields, constructor wiring, action methods inferred from the live page, and composition of framework components detected on the page.

## How to use it

Tell Claude what you want:

> Use the scaffold-page-object skill to create a `CheckoutCompletePage` from https://www.saucedemo.com/checkout-complete.html using `auth/standard.json`.

Or for experimentation, send the output to `scratch/`:

> Use the scaffold-page-object skill to create a `LoginPage` from https://www.saucedemo.com — no auth needed. Write to `scratch/LoginPage.ts`.

## Workflow

The full 12-step procedural workflow is in [`references/workflow.md`](references/workflow.md). Read that file before executing the skill.

## References

- [`references/workflow.md`](references/workflow.md) — the 12-step procedural workflow
- [`references/page-object-template.md`](references/page-object-template.md) — canonical TS template for generated files
- [`references/component-detection.md`](references/component-detection.md) — signatures for recognizing framework components in a page

## See also

- [`docs/scaffold-page-object.md`](../../../docs/scaffold-page-object.md) — learning guide with worked examples
- [`docs/adr/0008-custom-skills-pattern.md`](../../../docs/adr/0008-custom-skills-pattern.md) — why custom skills follow this layout
