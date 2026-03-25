const sensitiveState = {
  credentials: null,
  token: null,
};

const runtimeModes = new Set(["automatic", "semi-manual", "manual"]);
const runtimeSettingsPaths = ["/control-plane/api/settings", "/settings"];

function ensureProtocol(host) {
  return /^https?:\/\//i.test(host) ? host : `https://${host}`;
}

function parseHostUrl(host) {
  const value = host?.trim() ?? "";

  if (!value) {
    throw new Error("Please enter a host before connecting.");
  }

  try {
    const url = new URL(ensureProtocol(value));

    if (url.protocol !== "https:") {
      throw new Error("Please enter an HTTPS host. GitHub Pages cannot call insecure HTTP endpoints.");
    }

    return url;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Please enter")) {
      throw error;
    }

    throw new Error("Please enter a valid host name, for example participant.example.com.");
  }
}

export function normalizeBaseUrl(host) {
  return parseHostUrl(host).origin;
}

function buildDefaultHeaders(token) {
  return {
    Accept: "application/json, text/plain;q=0.9, */*;q=0.8",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function readErrorMessage(payload) {
  if (!payload) {
    return null;
  }

  if (typeof payload === "string") {
    return payload.trim() || null;
  }

  if (typeof payload !== "object") {
    return null;
  }

  return (
    payload.error_description ||
    payload.error ||
    payload.message ||
    payload.detail ||
    payload.title ||
    null
  );
}

function describeTokenFailure(response, payload, tokenUrl) {
  const reason = readErrorMessage(payload);

  if ([400, 401, 403].includes(response.status)) {
    return reason
      ? `Token request failed. Check the host, client ID, and client secret. Server says: ${reason}`
      : "Token request failed. Check the host, client ID, and client secret.";
  }

  if (response.status === 404) {
    return `Token request failed because ${tokenUrl.pathname} was not found on ${tokenUrl.origin}.`;
  }

  if (response.status >= 500) {
    return `Token request failed because the TSG host returned HTTP ${response.status}. Try again later or verify the host.`;
  }

  return reason
    ? `Token request failed: ${reason}`
    : `Token request failed with HTTP ${response.status}.`;
}

function parseResponsePayload(response, text) {
  const contentType = response.headers.get("content-type") || "";

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    if (contentType.includes("application/json")) {
      return null;
    }

    return text;
  }
}

async function tryRuntimeSettingsRequest(settingsUrl, token, signal) {
  let response;

  try {
    response = await fetch(settingsUrl, {
      method: "GET",
      headers: buildDefaultHeaders(token),
      cache: "no-store",
      credentials: "omit",
      mode: "cors",
      signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw error;
    }

    return null;
  }

  const responseText = await response.text();
  const payload = parseResponsePayload(response, responseText);

  if (!response.ok || !payload || typeof payload !== "object") {
    return null;
  }

  if (!runtimeModes.has(payload.controlPlaneInteractions)) {
    return null;
  }

  return {
    controlPlaneInteractions: payload.controlPlaneInteractions,
    sourceUrl: settingsUrl.toString(),
  };
}

export async function requestRuntimeSettings({ baseUrl, token, signal }) {
  if (!baseUrl) {
    return null;
  }

  const attemptedUrls = new Set();

  for (const path of runtimeSettingsPaths) {
    const settingsUrl = new URL(path, baseUrl);
    const settingsUrlValue = settingsUrl.toString();

    if (attemptedUrls.has(settingsUrlValue)) {
      continue;
    }

    attemptedUrls.add(settingsUrlValue);
    const unauthenticatedResult = await tryRuntimeSettingsRequest(
      settingsUrl,
      undefined,
      signal,
    );

    if (unauthenticatedResult) {
      return unauthenticatedResult;
    }

    if (!token) {
      continue;
    }

    const authenticatedResult = await tryRuntimeSettingsRequest(
      settingsUrl,
      token,
      signal,
    );

    if (authenticatedResult) {
      return authenticatedResult;
    }
  }

  return null;
}

export async function requestAccessToken({ host, clientId, clientSecret, signal }) {
  if (!host || !clientId || !clientSecret) {
    throw new Error("Host, client ID, and client secret are all required.");
  }

  const baseUrl = normalizeBaseUrl(host);
  const tokenUrl = new URL("/api/oauth/token", baseUrl);
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });

  let response;

  try {
    response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        ...buildDefaultHeaders(),
      },
      body: body.toString(),
      cache: "no-store",
      credentials: "omit",
      mode: "cors",
      signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Connection attempt was cancelled.");
    }

    throw new Error(
      `The token request did not reach ${baseUrl}. Check the host, your network connection, and whether the TSG host allows your GitHub Pages origin (CORS).`,
    );
  }

  const responseText = await response.text();
  const payload = parseResponsePayload(response, responseText);

  if (!response.ok) {
    throw new Error(describeTokenFailure(response, payload, tokenUrl));
  }

  if (!payload?.access_token || typeof payload.access_token !== "string") {
    throw new Error("The token response from /api/oauth/token did not include an access token.");
  }

  sensitiveState.credentials = {
    host: baseUrl,
    clientId,
    clientSecret,
  };
  sensitiveState.token = payload.access_token;

  return {
    accessToken: payload.access_token,
    tokenType: payload.token_type || "Bearer",
    expiresIn: payload.expires_in ?? null,
    baseUrl,
  };
}

export function clearSensitiveState() {
  sensitiveState.credentials = null;
  sensitiveState.token = null;
}
