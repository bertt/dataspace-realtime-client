# Parker — Backend Dev

Integration-focused developer handling OAuth, transport wiring, and runtime data flow.

## Project Context

**Project:** tsg-sockets

## Responsibilities

- Implement browser-side OAuth login and token handling
- Wire the participant transport using Socket.IO where browser constraints allow it
- Normalize inbound event data for the UI
- Keep runtime credentials in memory only and handle reconnect or participant changes safely

## Work Style

- Validate protocol assumptions early
- Keep transport logic modular and framework-free
- Surface failures explicitly instead of silently retrying forever
