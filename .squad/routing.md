# Work Routing

How to decide who handles what.

## Routing Table

| Work Type | Route To | Examples |
|-----------|----------|----------|
| Architecture, scope, and integration decisions | Ripley | Transport choice, GitHub Pages constraints, connection lifecycle |
| Static UI and interaction | Lambert | Login form, participant switcher, message list, English copy |
| Auth, API, and socket integration | Parker | OAuth token request, Socket.IO connection, runtime config handling |
| Testing, verification, and deploy readiness | Brett | Credential masking, edge cases, Pages deploy checks, manual verification |
| Code review | Ripley | Review cross-file changes, quality checks, handoff decisions |
| Testing | Brett | Write tests or checklists, find edge cases, verify fixes |
| Scope & priorities | Ripley | What to build next, trade-offs, decisions |
| Session logging | Scribe | Automatic — never needs routing |

## Issue Routing

| Label | Action | Who |
|-------|--------|-----|
| `squad` | Triage: analyze issue, assign `squad:{member}` label | Lead |
| `squad:ripley` | Pick up issue and complete the work | Ripley |
| `squad:lambert` | Pick up issue and complete the work | Lambert |
| `squad:parker` | Pick up issue and complete the work | Parker |
| `squad:brett` | Pick up issue and complete the work | Brett |

### How Issue Assignment Works

1. When a GitHub issue gets the `squad` label, the **Lead** triages it — analyzing content, assigning the right `squad:{member}` label, and commenting with triage notes.
2. When a `squad:{member}` label is applied, that member picks up the issue in their next session.
3. Members can reassign by removing their label and adding another member's label.
4. The `squad` label is the "inbox" — untriaged issues waiting for Lead review.

## Rules

1. **Eager by default** — spawn all agents who could usefully start work, including anticipatory downstream work.
2. **Scribe always runs** after substantial work, always as `mode: "background"`. Never blocks.
3. **Quick facts → coordinator answers directly.** Don't spawn an agent for "what port does the server run on?"
4. **When two agents could handle it**, pick the one whose domain is the primary concern.
5. **"Team, ..." → fan-out.** Spawn all relevant agents in parallel as `mode: "background"`.
6. **Anticipate downstream work.** If a feature is being built, spawn the tester to write test cases from requirements simultaneously.
7. **Issue-labeled work** — when a `squad:{member}` label is applied to an issue, route to that member. The Lead handles all `squad` (base label) triage.
