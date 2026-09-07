#!/usr/bin/env node
//
// Gates for ADR decisions a machine can check, but that no existing lint covers.
//
// `docs/adr/README.md`: "If a decision states something a machine can check, write the check
// — ADR-0023 exists because one didn't." Most ADRs here are already gated by eslint, by the
// shape of playwright.config.ts, or by a unit test. This file is for the leftovers: decisions
// about configuration files, which no code linter reads.
//
// Adding one: state the ADR, quote the sentence being enforced, and fail with a message that
// names the ADR. A check whose failure does not say which decision it protects teaches people
// to silence it.

import { existsSync, readFileSync } from 'node:fs';

const failures = [];

// --- ADR-0007: "Use the `gh` CLI directly. Do not install a GitHub MCP server." ------------
//
// Scoped by ADR-0011 to: gh for GitHub, the Atlassian MCP for Jira. Installing an MCP server
// is a one-command action and `.mcp.json` is not read by any linter, so this decision could be
// reversed by accident and leave no trace. That is the whole reason it needs a gate and, say,
// ADR-0020 does not: nothing about this one depends on an agent's judgment.
//
// Deliberately literal. It checks what ADR-0007 decided — no GitHub MCP server — and NOT the
// broader "no MCP server may appear without an ADR". That would be a stricter rule than any
// record here contains, and inventing a decision inside its own enforcement is backwards.
{
  const path = '.mcp.json';
  if (existsSync(path)) {
    const servers = JSON.parse(readFileSync(path, 'utf-8')).mcpServers ?? {};
    for (const [name, config] of Object.entries(servers)) {
      const haystack = `${name} ${JSON.stringify(config)}`.toLowerCase();
      if (haystack.includes('github')) {
        failures.push(
          `ADR-0007: .mcp.json configures a GitHub MCP server ("${name}"), and that ADR ` +
            'decided against one — GitHub access goes through the `gh` CLI. Remove it, or ' +
            'supersede ADR-0007 with a record that says why it changed.',
        );
      }
    }
  }
}

if (failures.length > 0) {
  console.error('check-adr-invariants: an ADR decision is contradicted by configuration.\n');
  for (const f of failures) console.error(`  ${f}\n`);
  process.exit(1);
}

console.log('check-adr-invariants: configuration agrees with every ADR that gates one.');
