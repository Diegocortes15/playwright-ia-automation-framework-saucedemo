// Single source of truth for the authenticated Playwright projects + auth setup.
// /from-issue appends a user here (and nowhere else) the first time a ticket
// needs that user's authenticated page (Phase H / ADR-0014). The clean-room
// branch grows one user at a time — do NOT pre-populate unused users (ADR-0004).
export const AUTH_USERS = ['standard', 'problem'] as const;
