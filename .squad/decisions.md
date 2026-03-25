# Squad Decisions

## Active Decisions

### Deployment & Security
- Build the app as a static site so it can be deployed to GitHub Pages without a required server-side component.
- `host`, `client id`, and `client secret` are entered at runtime only and must not be committed to source files.
- The UI is in English and keeps the client secret masked in the login form.
- Prefer Socket.IO for the participant connection flow unless browser authentication constraints force a different transport implementation.

### Authentication & Transport (Ripley, 2026-03-25; Parker impl, 2026-03-25)
- Use `socket.io-client` from CDN with `extraHeaders: { Authorization: 'Bearer <token>' }` for browser compatibility.
- OAuth client credentials flow: `POST https://{host}/api/oauth/token` with `grant_type=client_credentials`.
- Socket.IO polling-first → WebSocket upgrade strategy (allows header-based auth on HTTP handshake).
- CORS must be enabled on TSG server for GitHub Pages origin (blocker if not configured).
- If TSG server uses WebSocket-only, fall back to `auth` option in Socket.IO handshake.
- Token refresh on 401 during polling; force re-login if refresh fails.
- On every connect or participant switch, disconnect the old Socket.IO session first, request a fresh bearer token, and authenticate Socket.IO with both the polling `Authorization` header and the `auth` payload.
- Socket.IO reconnect: exponential backoff (5s, 10s, 20s delays) with max 5 failed retries; surface explicit user-facing errors on token request, connection, or reconnect sequence failure.

### Risk Mitigation (Brett, 2026-03-25)
- Credentials stored in JavaScript memory only; never persist to localStorage, sessionStorage, or DOM.
- Clear all credentials from memory on logout/page unload.
- Never log credentials to console.
- Participant switching: explicit disconnect + cleanup before new connection.
- Use `textContent` (never `innerHTML`) for message rendering to prevent XSS.
- Reconnect backoff: exponential (5s, 10s, 20s) with max 3 retries; stop after 5 failures.
- Always mask client secret input as `password` type.

### UI Behavior (Lambert, 2026-03-25; Host field fix, 2026-03-25)
- Use a single participant-host textbox as the source of truth so login always targets the participant-specific host instead of a shared base host.
- Derive the saved profile name from the host value so the saved selection key and actual login target cannot drift apart.
- When a saved entry uses the same value for both name and host, show it once in the selector instead of duplicating the label.
- Use generic participant-host examples such as `participant.example.org` in placeholders and docs; do not commit real participant hosts.
- Treat participant profiles as session-only entries and present them through a single `select` control for quick switching.
- Prepend new messages to the history and format timestamps in the browser's local date/time format.

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction

## Pending Clarifications

### For Ripley
1. Message payload schema from TSG (e.g., `{ sender, text, timestamp }`).
2. Timestamp format (ISO 8601, Unix epoch, etc.) and timezone handling.
3. Participant list: static or fetched from TSG after login?
4. Socket.IO namespace or path for participant routing (e.g., `/participants/{id}`)?

### For Parker
1. Socket.IO client library version compatible with TSG control plane.
2. Auth credential format in handshake (`clientId` vs. `client_id`).
3. Token expiry behavior (permanent or session-limited?).

### For Lambert
1. UI offline indicator (red/yellow/green dot)?
2. Participant switcher UX (dropdown, radio, text input)?
3. Message list scrolling (auto-scroll or fixed)?
