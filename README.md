# TSG Participant Monitor

Demo: https://bertt.github.io/dataspace-realtime-client/

A small, framework-free web client for GitHub Pages that:

- asks for a participant-specific `host`, `client id`, and `client secret` at runtime
- masks the client secret in the UI
- connects to a TSG dataspace participant with Socket.IO
- shows incoming messages with a readable date/time
- lets you save multiple participant hosts for the current browser tab and switch between them

## Project structure

- `index.html` — single-page app shell
- `css/style.css` — styling
- `js/auth.js` — OAuth token request
- `js/transport.js` — Socket.IO connection handling
- `js/ui.js` — DOM updates and safe message rendering
- `js/app.js` — application wiring and profile switching

## How it works

1. Enter the full participant host, client ID, and client secret. For example: `participant.example.org`.
2. Click `Save host` if you want to keep that participant host available in the current tab.
3. Click `Connect` to request an access token from `https://{host}/api/oauth/token`. If you entered only the hostname, the app adds `https://` automatically.
4. The app then opens a Socket.IO connection on `https://{host}/socket.io`.
5. Any non-lifecycle Socket.IO event is shown in the message feed with a timestamp.

## Security notes

- No host, client ID, or client secret values are stored in the source code.
- Secrets are kept in browser memory only for the current page session.
- Refreshing the page clears the in-memory participant hosts.
- Message content is rendered with `textContent`, not `innerHTML`, to avoid XSS issues.

## GitHub Pages deployment

This project is a static site, so it can be deployed directly from the repository root on GitHub Pages:

1. Push the files to GitHub.
2. Open the repository settings.
3. Go to `Pages`.
4. Choose `Deploy from a branch`.
5. Select your main branch and the `/ (root)` folder.
6. Save and wait for the site to publish.

## Important runtime requirement

Because this app runs in the browser from `*.github.io`, the TSG host must allow the GitHub Pages origin for:

- the OAuth token request to `/api/oauth/token`
- the Socket.IO handshake on `/socket.io`

If the TSG server does not allow that origin, the browser will block the connection even if the client code is correct.

For control-plane events, the control plane must also report `controlPlaneInteractions: "manual"`. This client checks `/control-plane/api/settings` first and falls back to `/settings`; it first tries a plain `GET` and only falls back to a bearer-authenticated `GET` if needed. If the reported mode is not `manual`, it shows a warning because negotiation and transfer Socket.IO updates will otherwise stay empty.

## Known limitations

- The app assumes switching participants means switching between user-entered hosts in the same page session.
- Saved entries use the host value as both the selector label and the participant/profile key so the login target stays aligned with the active selection.
- The current transport implementation prefers Socket.IO and sends the bearer token through both the Socket.IO `auth` payload and the polling-header configuration. Whether the connection succeeds depends on the TSG server accepting a browser-based auth flow.
- There is no server-side proxy, token storage, or replay buffer, which keeps the site GitHub Pages-compatible but means a page refresh resets the session.
