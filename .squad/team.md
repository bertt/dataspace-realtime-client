# Squad Team

> tsg-sockets

## Coordinator

| Name | Role | Notes |
|------|------|-------|
| Squad | Coordinator | Routes work, enforces handoffs and reviewer gates. |

## Members

| Name | Role | Charter | Status |
|------|------|---------|--------|
| Ripley | Lead | `.squad/agents/ripley/charter.md` | ✅ Active |
| Lambert | Frontend Dev | `.squad/agents/lambert/charter.md` | ✅ Active |
| Parker | Backend Dev | `.squad/agents/parker/charter.md` | ✅ Active |
| Brett | Tester | `.squad/agents/brett/charter.md` | ✅ Active |
| Scribe | Session Logger | `.squad/agents/scribe/charter.md` | ✅ Active |
| Ralph | Work Monitor | `.squad/agents/ralph/charter.md` | 🔄 Monitor |

## Project Context

- **Project:** tsg-sockets
- **Created:** 2026-03-25
- **Requested by:** Bert Temme
- **Goal:** Build a static English web client for TSG dataspace participants that logs in with runtime credentials, receives websocket messages, shows timestamps, and makes it easy to switch participants.
- **Stack:** HTML, CSS, vanilla JavaScript, Socket.IO client, GitHub Pages
- **Constraints:** Keep `host`, `client id`, and `client secret` out of source code; keep the secret masked in the UI; avoid frameworks unless needed.
