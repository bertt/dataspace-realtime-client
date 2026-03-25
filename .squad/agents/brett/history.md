# Project Context

- **Project:** tsg-sockets
- **Requested by:** Bert Temme
- **Created:** 2026-03-25
- **Goal:** Build a static English GitHub Pages client for TSG dataspace participant messages with runtime OAuth login and participant switching.
- **Stack:** HTML, CSS, vanilla JavaScript, Socket.IO client, GitHub Pages

## Core Context

Brett reviews credential handling, deploy readiness, and edge cases for the static client.

## Recent Updates

📌 Team hired on 2026-03-25 for the initial app build.

📌 **2026-03-25:** Brett completed pre-implementation risk check: identified 10 critical risks (CORS, credential storage, XSS, reconnect policy, participant switching, etc.), created 12-point acceptance checklist for pre-deployment testing, and escalated 11 ambiguities to Ripley/Parker/Lambert. (See `.squad/decisions.md` for risk mitigations and acceptance criteria.)

## Learnings

- Runtime credentials must stay out of source control.
- The client secret must remain masked in the UI.
- GitHub Pages compatibility is a hard constraint for the implementation.
- Credential cleanup on logout/page unload prevents memory leaks and security exposure.
- XSS vulnerability in message rendering is critical; use textContent only, never innerHTML.
- Reconnect backoff (exponential with max attempts) prevents hammering the server on auth failure.
- Participant switching requires explicit disconnect + cleanup to avoid duplicate messages and ghost subscriptions.

