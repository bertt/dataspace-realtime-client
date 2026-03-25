const elements = {
  loginForm: document.getElementById("login-form"),
  profileNameInput: document.getElementById("profile-name-input"),
  hostInput: document.getElementById("host-input"),
  clientIdInput: document.getElementById("client-id-input"),
  clientSecretInput: document.getElementById("client-secret-input"),
  saveProfileButton: document.getElementById("save-profile-button"),
  profileSelect: document.getElementById("profile-select"),
  connectButton: document.getElementById("connect-button"),
  disconnectButton: document.getElementById("disconnect-button"),
  statusDot: document.getElementById("status-dot"),
  statusText: document.getElementById("status-text"),
  errorBanner: document.getElementById("error-banner"),
  runtimeWarning: document.getElementById("runtime-warning"),
  messageList: document.getElementById("message-list"),
  emptyState: document.getElementById("empty-state"),
  clearMessagesButton: document.getElementById("clear-messages-button"),
};

const statusDefaults = {
  disconnected: "Not connected",
  connecting: "Connecting…",
  connected: "Connected",
  error: "Connection error",
};

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "medium",
});

const eventTitleMap = {
  "negotiation:create": "Negotiation created",
  "negotiation:update": "Negotiation updated",
  "transfer:create": "Transfer created",
  "transfer:update": "Transfer updated",
};

let isBusyState = false;

function toTitleCase(value) {
  return value.replace(/\b\w/g, (character) => character.toUpperCase());
}

function getParticipantHostValue() {
  return elements.hostInput?.value.trim() ?? "";
}

function syncProfileNameInput() {
  const participantHost = getParticipantHostValue();

  if (elements.profileNameInput) {
    elements.profileNameInput.value = participantHost;
  }

  return participantHost;
}

function updateProfileSelectorState() {
  const hasProfiles = Array.from(elements.profileSelect?.options ?? []).some(
    (option) => option.value,
  );

  if (elements.profileSelect) {
    elements.profileSelect.disabled = isBusyState || !hasProfiles;
  }
}

function updateMessageState() {
  const hasMessages = Boolean(elements.messageList?.children.length);

  if (elements.emptyState) {
    elements.emptyState.hidden = hasMessages;
  }

  if (elements.clearMessagesButton) {
    elements.clearMessagesButton.disabled = !hasMessages;
  }
}

function serializeValue(value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  return String(value);
}

function resolveEventName(entry) {
  if (!entry || typeof entry !== "object") {
    return "";
  }

  const value = entry.eventName ?? entry.event ?? entry.type ?? "";
  return typeof value === "string" ? value.trim() : "";
}

function resolveEventGroup(entry) {
  const eventName = resolveEventName(entry);

  if (eventName.startsWith("negotiation:")) {
    return "negotiation";
  }

  if (eventName.startsWith("transfer:")) {
    return "transfer";
  }

  return "generic";
}

function resolveEventTitle(entry) {
  const eventName = resolveEventName(entry);

  if (!eventName) {
    return "Incoming Socket.IO event";
  }

  if (eventTitleMap[eventName]) {
    return eventTitleMap[eventName];
  }

  return toTitleCase(eventName.replace(/[:._-]+/g, " "));
}

function resolvePayloadLabel(entry) {
  const eventGroup = resolveEventGroup(entry);
  const payload = entry?.body ?? entry?.payload ?? entry?.message ?? entry?.data;
  const isScalarPayload =
    typeof payload === "string" ||
    typeof payload === "number" ||
    typeof payload === "boolean";

  if (eventGroup === "negotiation" && isScalarPayload) {
    return "Negotiation ID";
  }

  if (eventGroup === "transfer" && isScalarPayload) {
    return "Transfer ID";
  }

  return "Payload";
}

function resolveMessageText(entry) {
  if (entry === null || entry === undefined) {
    return "";
  }

  if (typeof entry !== "object") {
    return serializeValue(entry);
  }

  const candidates = [
    entry.message,
    entry.payload,
    entry.content,
    entry.body,
    entry.text,
    entry.data,
  ];

  for (const candidate of candidates) {
    if (candidate !== undefined) {
      return serializeValue(candidate);
    }
  }

  return serializeValue(entry);
}

function resolveSourceLabel(entry) {
  if (entry && typeof entry === "object") {
    const label =
      entry.profileName ??
      entry.participantName ??
      entry.participantId ??
      entry.source ??
      entry.sender;

    if (label) {
      return String(label);
    }
  }

  const selectedLabel = elements.profileSelect?.selectedOptions?.[0]?.textContent?.trim();
  return selectedLabel || "Active participant host";
}

function resolveTimestamp(entry) {
  const rawValue =
    entry && typeof entry === "object"
      ? entry.receivedAt ??
        entry.timestamp ??
        entry.dateTime ??
        entry.createdAt ??
        entry.date ??
        entry.time
      : undefined;

  const candidate = rawValue ?? new Date().toISOString();
  const normalizedCandidate =
    typeof candidate === "number" && candidate < 1_000_000_000_000
      ? candidate * 1000
      : candidate;
  const date =
    normalizedCandidate instanceof Date
      ? normalizedCandidate
      : new Date(normalizedCandidate);

  if (Number.isNaN(date.getTime())) {
    return {
      dateTime: "",
      label: String(candidate),
    };
  }

  return {
    dateTime: date.toISOString(),
    label: dateTimeFormatter.format(date),
  };
}

export function getLoginValues() {
  const participantHost = syncProfileNameInput();

  return {
    profileName: participantHost,
    host: participantHost,
    clientId: elements.clientIdInput?.value.trim() ?? "",
    clientSecret: elements.clientSecretInput?.value ?? "",
    selectedProfileName: elements.profileSelect?.value ?? "",
  };
}

export function setBusy(isBusy) {
  isBusyState = Boolean(isBusy);

  document.body.classList.toggle("is-busy", isBusyState);

  if (elements.loginForm) {
    elements.loginForm.setAttribute("aria-busy", String(isBusyState));
  }

  [
    elements.profileNameInput,
    elements.hostInput,
    elements.clientIdInput,
    elements.clientSecretInput,
    elements.saveProfileButton,
    elements.connectButton,
  ].forEach((element) => {
    if (element) {
      element.disabled = isBusyState;
    }
  });

  updateProfileSelectorState();
  updateMessageState();
}

export function setStatus(kind, text) {
  const normalizedKind = statusDefaults[kind] ? kind : "disconnected";
  const label = text?.trim() || statusDefaults[normalizedKind];

  if (elements.statusDot) {
    elements.statusDot.dataset.kind = normalizedKind;
  }

  if (elements.statusText) {
    elements.statusText.textContent = label;
  }

  if (elements.connectButton) {
    elements.connectButton.disabled = isBusyState || normalizedKind === "connecting";
  }

  if (elements.disconnectButton) {
    const canDisconnect = normalizedKind === "connecting" || normalizedKind === "connected";
    elements.disconnectButton.disabled = !canDisconnect;
  }
}

export function showError(message) {
  if (!elements.errorBanner) {
    return;
  }

  const text = serializeValue(message)
    .replace(
      "participant name, host, client ID, and client secret",
      "participant host, client ID, and client secret",
    )
    .replace("participant name before connecting", "participant host before connecting")
    .replace("participant profile, client ID, and client secret", "participant host, client ID, and client secret");

  elements.errorBanner.textContent = text || "An unexpected error occurred.";
  elements.errorBanner.hidden = false;
}

export function clearError() {
  if (!elements.errorBanner) {
    return;
  }

  elements.errorBanner.textContent = "";
  elements.errorBanner.hidden = true;
}

export function showRuntimeWarning(message) {
  if (!elements.runtimeWarning) {
    return;
  }

  elements.runtimeWarning.textContent =
    serializeValue(message) ||
    "This control plane is not set to manual mode. Socket updates may stay empty until controlPlaneInteractions is switched to manual.";
  elements.runtimeWarning.hidden = false;
}

export function clearRuntimeWarning() {
  if (!elements.runtimeWarning) {
    return;
  }

  elements.runtimeWarning.textContent = "";
  elements.runtimeWarning.hidden = true;
}

export function appendMessage(entry) {
  if (!elements.messageList) {
    return;
  }

  const timestamp = resolveTimestamp(entry);
  const item = document.createElement("li");
  const meta = document.createElement("div");
  const summary = document.createElement("div");
  const source = document.createElement("span");
  const time = document.createElement("time");
  const title = document.createElement("p");
  const eventCode = document.createElement("code");
  const payloadLabel = document.createElement("p");
  const body = document.createElement("pre");

  item.className = "message-item";
  item.dataset.eventGroup = resolveEventGroup(entry);
  meta.className = "message-meta";
  summary.className = "message-summary";
  source.className = "message-source";
  time.className = "message-time";
  title.className = "message-title";
  eventCode.className = "message-event-code";
  payloadLabel.className = "message-payload-label";
  body.className = "message-body";

  source.textContent = resolveSourceLabel(entry);
  time.textContent = timestamp.label;
  title.textContent = resolveEventTitle(entry);
  eventCode.textContent = resolveEventName(entry) || "socket.io";
  payloadLabel.textContent = resolvePayloadLabel(entry);

  if (timestamp.dateTime) {
    time.dateTime = timestamp.dateTime;
  }

  body.textContent = resolveMessageText(entry);

  meta.append(source, time);
  summary.append(title);

  if (resolveEventName(entry)) {
    summary.append(eventCode);
  }

  item.append(meta, summary, payloadLabel, body);
  elements.messageList.prepend(item);

  updateMessageState();
}

export function clearMessages() {
  elements.messageList?.replaceChildren();
  updateMessageState();
}

export function renderProfiles(profiles, activeProfileName) {
  if (!elements.profileSelect) {
    return;
  }

  const safeProfiles = Array.isArray(profiles) ? profiles : [];
  const options = [];

  if (!safeProfiles.length) {
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "No saved hosts yet";
    options.push(placeholder);
  } else {
    for (const profile of safeProfiles) {
      const option = document.createElement("option");
      const name =
        typeof profile === "string"
          ? profile
          : profile?.name ?? profile?.profileName ?? "";
      const host = typeof profile === "object" ? profile?.host?.trim() ?? "" : "";
      const label = host && host !== name ? `${name} — ${host}` : name || host;

      option.value = name;
      option.textContent = label;
      option.selected = name === activeProfileName;
      options.push(option);
    }
  }

  elements.profileSelect.replaceChildren(...options);
  updateProfileSelectorState();
}

clearError();
clearRuntimeWarning();
clearMessages();
setStatus("disconnected", statusDefaults.disconnected);
updateProfileSelectorState();
syncProfileNameInput();

elements.hostInput?.addEventListener("input", syncProfileNameInput);
elements.hostInput?.addEventListener("change", syncProfileNameInput);
