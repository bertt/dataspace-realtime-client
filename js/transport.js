const RESERVED_EVENTS = new Set([
  "connect",
  "connect_error",
  "disconnect",
  "reconnect",
  "reconnect_attempt",
  "reconnect_error",
  "reconnect_failed",
]);

const MAX_RECONNECT_ATTEMPTS = 5;

let currentSocket = null;

function buildAuthPayload(token, profileName) {
  return {
    token,
    accessToken: token,
    authorization: `Bearer ${token}`,
    participant: profileName,
    participantId: profileName,
    profileName,
  };
}

function buildSocketOptions(token, profileName) {
  const authorization = `Bearer ${token}`;

  return {
    path: "/socket.io",
    transports: ["polling", "websocket"],
    timeout: 20000,
    reconnection: true,
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
    reconnectionDelay: 5000,
    reconnectionDelayMax: 20000,
    auth: buildAuthPayload(token, profileName),
    extraHeaders: {
      Authorization: authorization,
    },
    transportOptions: {
      polling: {
        extraHeaders: {
          Authorization: authorization,
        },
      },
    },
  };
}

function parseTimestampCandidate(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const candidate = new Date(value);

  return Number.isNaN(candidate.getTime()) ? null : candidate.toISOString();
}

function parseTimestamp(payload) {
  const queue = [payload];
  const seen = new Set();

  while (queue.length) {
    const current = queue.shift();

    if (!current) {
      continue;
    }

    if (Array.isArray(current)) {
      queue.push(...current);
      continue;
    }

    if (typeof current !== "object") {
      continue;
    }

    if (seen.has(current)) {
      continue;
    }

    seen.add(current);

    for (const key of ["timestamp", "createdAt", "receivedAt"]) {
      const timestamp = parseTimestampCandidate(current[key]);

      if (timestamp) {
        return timestamp;
      }
    }

    for (const key of ["payload", "body", "data", "message"]) {
      if (current[key] !== undefined) {
        queue.push(current[key]);
      }
    }
  }

  return null;
}

function describeConnectionError(error) {
  const parts = [error?.message, error?.description];

  if (error?.context?.status) {
    parts.push(`HTTP ${error.context.status}`);
  }

  const message = parts.filter(Boolean).join(" ").trim() || "Unknown connection failure";
  const normalized = message.toLowerCase();

  if (
    normalized.includes("xhr poll error") ||
    normalized.includes("network error") ||
    normalized.includes("cors")
  ) {
    return "Socket polling failed before the WebSocket upgrade. This usually means the TSG host is unreachable, rejected the bearer token, or is missing CORS headers for your GitHub Pages origin.";
  }

  if (
    normalized.includes("401") ||
    normalized.includes("403") ||
    normalized.includes("unauthorized") ||
    normalized.includes("forbidden")
  ) {
    return "Socket connection was rejected. Check the participant profile, client ID, and client secret.";
  }

  if (normalized.includes("timeout")) {
    return "Socket connection timed out. Confirm the host and Socket.IO endpoint are reachable from the browser.";
  }

  if (normalized.includes("websocket")) {
    return "The WebSocket upgrade failed. The TSG host may block browser upgrades or require a different Socket.IO configuration.";
  }

  return `Socket connection failed: ${message}`;
}

function normalizeMessage(profileName, eventName, payload) {
  const receivedAt = new Date().toISOString();
  const timestamp = parseTimestamp(payload) || receivedAt;

  return {
    profileName,
    eventName,
    body: payload,
    timestamp,
    receivedAt: timestamp,
  };
}

function clearCurrentSocket(socket) {
  if (currentSocket === socket) {
    currentSocket = null;
  }
}

function disposeSocket(socket) {
  if (!socket) {
    return;
  }

  socket.removeAllListeners();
  socket.io?.removeAllListeners?.();
  socket.disconnect();
  clearCurrentSocket(socket);
}

export function disconnectSocket() {
  disposeSocket(currentSocket);
}

export function connectSocket({ baseUrl, token, profileName, onMessage, onStatus, onError }) {
  if (!baseUrl) {
    return Promise.reject(new Error("Please enter a host before connecting."));
  }

  if (!token) {
    return Promise.reject(new Error("No access token is available for the Socket.IO connection."));
  }

  if (!profileName) {
    return Promise.reject(new Error("Please enter a participant name before connecting."));
  }

  if (typeof window === "undefined" || typeof window.io !== "function") {
    return Promise.reject(new Error("Socket.IO is not available. Check that the CDN script loaded correctly."));
  }

  disconnectSocket();
  onStatus?.("connecting", `Opening Socket.IO session for ${profileName}…`);

  return new Promise((resolve, reject) => {
    let settled = false;
    const socket = window.io(baseUrl, buildSocketOptions(token, profileName));

    currentSocket = socket;

    socket.once("connect", () => {
      onStatus?.("connected", `Connected to ${profileName}`);

      if (!settled) {
        settled = true;
        resolve(socket);
      }
    });

    socket.once("connect_error", (error) => {
      const message = describeConnectionError(error);
      onStatus?.("error", "Connection failed");

      if (!settled) {
        settled = true;
        disposeSocket(socket);
        reject(new Error(message));
        return;
      }

      onError?.(message);
    });

    socket.on("disconnect", (reason) => {
      if (reason === "io client disconnect") {
        clearCurrentSocket(socket);
        onStatus?.("disconnected", `Disconnected from ${profileName}`);
        return;
      }

      if (reason === "io server disconnect") {
        const message = `The TSG host closed the Socket.IO session for ${profileName}. Please reconnect.`;
        onStatus?.("error", "Disconnected by server");
        onError?.(message);
        disposeSocket(socket);
        return;
      }

      onStatus?.("connecting", `Connection lost. Reconnecting to ${profileName}…`);
    });

    socket.io.on("reconnect_attempt", (attempt) => {
      onStatus?.(
        "connecting",
        `Reconnecting to ${profileName}… attempt ${attempt} of ${MAX_RECONNECT_ATTEMPTS}`,
      );
    });

    socket.io.on("reconnect", () => {
      onStatus?.("connected", `Connected to ${profileName}`);
    });

    socket.io.on("reconnect_error", () => {
      onStatus?.("connecting", `Reconnect attempt failed for ${profileName}. Retrying…`);
    });

    socket.io.on("reconnect_failed", () => {
      const message =
        "Socket reconnection stopped after several attempts. Check the TSG host, bearer token, and browser CORS configuration.";

      onStatus?.("error", "Reconnect failed");
      onError?.(message);
      disposeSocket(socket);
    });

    socket.onAny((eventName, ...args) => {
      if (RESERVED_EVENTS.has(eventName)) {
        return;
      }

      const payload = args.length <= 1 ? args[0] : args;
      onMessage?.(normalizeMessage(profileName, eventName, payload));
    });
  });
}
