# Project Context

- **Project:** tsg-sockets
- **Requested by:** Bert Temme
- **Created:** 2026-03-25
- **Goal:** Build a static English GitHub Pages client for TSG dataspace participant messages with runtime OAuth login and participant switching.
- **Stack:** HTML, CSS, vanilla JavaScript, Socket.IO client, GitHub Pages

## Core Context

Ripley leads architecture, cross-file review, and implementation trade-offs for the static client.

## Recent Updates

📌 Team hired on 2026-03-25 for the initial app build.

📌 **2026-03-25:** Ripley completed auth & transport architecture decision (socket.io-client from CDN with extraHeaders for Bearer token; OAuth client_credentials flow; polling→WebSocket upgrade). Critical blocker: CORS must be enabled on TSG server for GitHub Pages origin. Confirmed module boundaries with Parker and Lambert. (See `.squad/decisions.md` for pending clarifications on message schema, timestamp format, participant discovery, Socket.IO namespace.)

## Learnings

- Runtime credentials must stay out of source control.
- The client secret must remain masked in the UI.
- GitHub Pages compatibility is a hard constraint for the implementation.
- Socket.IO client library from CDN is browser-compatible and works with polling-first transport order.
- CORS blockers are outside our control; must be surfaced as a clear error to the user if TSG server denies the origin.
- Token refresh on 401 is critical for seamless reconnect.

