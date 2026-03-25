# Project Context

- **Project:** tsg-sockets
- **Requested by:** Bert Temme
- **Created:** 2026-03-25
- **Goal:** Build a static English GitHub Pages client for TSG dataspace participant messages with runtime OAuth login and participant switching.
- **Stack:** HTML, CSS, vanilla JavaScript, Socket.IO client, GitHub Pages

## Core Context

Lambert owns the static UI: login flow, participant switching, message display, and English copy.

## Recent Updates

📌 Team hired on 2026-03-25 for the initial app build.

📌 **2026-03-25 (Host Field Fix):** Lambert consolidated login form into a single participant-host textbox as the authoritative source of truth:
- Unified "Participant/Profile Name" and "Host" inputs into one "Participant Host" field.
- Selector now uses host value as both profile key and display label (eliminates duplication).
- Removed all real participant host examples from source code; now uses `participant.example.org` placeholders.
- UI fix prevents participant/host misalignment and simplifies selector display.
- Ready for Parker transport integration and Brett acceptance testing.

## Learnings

- Runtime credentials must stay out of source control.
- The client secret must remain masked in the UI.
- GitHub Pages compatibility is a hard constraint for the implementation.
- Single source of truth (participant-host field) eliminates drift risk and simplifies selector UX.
- Generic example hosts (e.g., `participant.example.org`) must be used in source; no real participant hosts should ever be committed.
- Selector deduplication works when profile name and host are the same value; avoids confusing repeated labels in the dropdown.
