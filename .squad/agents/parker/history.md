# Project Context

- **Project:** tsg-sockets
- **Requested by:** Bert Temme
- **Created:** 2026-03-25
- **Goal:** Build a static English GitHub Pages client for TSG dataspace participant messages with runtime OAuth login and participant switching.
- **Stack:** HTML, CSS, vanilla JavaScript, Socket.IO client, GitHub Pages

## Core Context

Parker owns the OAuth login flow, transport wiring, and runtime data handling for the static client.

## Recent Updates

📌 Team hired on 2026-03-25 for the initial app build.

📌 **2026-03-25 (Implementation):** Parker completed OAuth token acquisition and Socket.IO transport layer:
- Implemented `POST https://{host}/api/oauth/token` endpoint for client credentials flow.
- Socket.IO connection with `extraHeaders: { Authorization: 'Bearer <token>' }` for polling compatibility.
- Participant switching with explicit disconnect + cleanup before new auth.
- Reconnect backoff: exponential (5s, 10s, 20s) with max 5 retries; explicit error surface on failure.
- All credentials in memory only; no persistence, logging, or exposure risk.
- Implementation complete and validated; awaiting Brett acceptance checklist and live TSG testing.

## Learnings

- Runtime credentials must stay out of source control.
- The client secret must remain masked in the UI.
- GitHub Pages compatibility is a hard constraint for the implementation.
- CORS on the TSG server is critical; cannot connect from GitHub Pages if origin is not whitelisted.
- Actual OAuth endpoint is `POST https://{host}/api/oauth/token` (not `/connect/token`); endpoint path is critical and must match TSG server config exactly.
- Credential format in the Socket.IO handshake auth object must match TSG expectations (e.g., `clientId` vs. `client_id`).
- Module boundary: transport.js handles only Socket.IO connection, disconnection, and participant switching; does NOT handle UI rendering.
- Participant switching requires clean disconnect + cleanup before requesting new token, preventing connection state pollution.
- Message schema and timestamp format still pending Ripley clarification for full end-to-end testing.

