import {
  clearSensitiveState,
  requestAccessToken,
  requestRuntimeSettings,
} from "./auth.js";
import { connectSocket, disconnectSocket } from "./transport.js";
import {
  appendMessage,
  clearError,
  clearMessages,
  clearRuntimeWarning,
  getLoginValues,
  renderProfiles,
  setBusy,
  setStatus,
  showError,
  showRuntimeWarning,
} from "./ui.js";

const state = {
  profiles: [],
  activeProfileName: "",
  connectedProfileName: "",
  authRequestController: null,
  isBusy: false,
};

function getElement(id) {
  return document.getElementById(id);
}

function getProfile(name) {
  return state.profiles.find((profile) => profile.name === name) || null;
}

function setFormValues(profile) {
  getElement("profile-name-input").value = profile.name || "";
  getElement("host-input").value = profile.host || "";
  getElement("client-id-input").value = profile.clientId || "";
  getElement("client-secret-input").value = profile.clientSecret || "";
}

function normalizeProfile(values) {
  return {
    name: values.profileName.trim(),
    host: values.host.trim(),
    clientId: values.clientId.trim(),
    clientSecret: values.clientSecret,
  };
}

function validateProfile(values) {
  const profile = normalizeProfile(values);

  if (!profile.name || !profile.host || !profile.clientId || !profile.clientSecret) {
    throw new Error("Please enter a participant name, host, client ID, and client secret.");
  }

  return profile;
}

function upsertProfile(profile) {
  const existingIndex = state.profiles.findIndex((candidate) => candidate.name === profile.name);

  if (existingIndex === -1) {
    state.profiles.push(profile);
  } else {
    state.profiles.splice(existingIndex, 1, profile);
  }

  state.activeProfileName = profile.name;
  renderProfiles(state.profiles, state.activeProfileName);

  return profile;
}

function syncButtons() {
  const connectButton = getElement("connect-button");
  const disconnectButton = getElement("disconnect-button");

  connectButton.textContent = state.connectedProfileName ? "Reconnect" : "Connect";
  disconnectButton.disabled = state.isBusy || !state.connectedProfileName;
}

function abortPendingAuthRequest() {
  state.authRequestController?.abort();
  state.authRequestController = null;
}

function beginBusy(statusText) {
  state.isBusy = true;
  setBusy(true);
  setStatus("connecting", statusText);
  syncButtons();
}

function endBusy() {
  state.isBusy = false;
  setBusy(false);
  syncButtons();
}

function describeRuntimeWarning(profileName, controlPlaneInteractions) {
  return `${profileName} reports controlPlaneInteractions="${controlPlaneInteractions}". Switch the control plane to "manual" or this client will not receive negotiation and transfer events.`;
}

function refreshRuntimeWarning(profileName, baseUrl, token, signal) {
  void requestRuntimeSettings({ baseUrl, token, signal })
    .then((runtimeSettings) => {
      if (state.connectedProfileName !== profileName) {
        return;
      }

      if (
        runtimeSettings?.controlPlaneInteractions &&
        runtimeSettings.controlPlaneInteractions !== "manual"
      ) {
        showRuntimeWarning(
          describeRuntimeWarning(
            profileName,
            runtimeSettings.controlPlaneInteractions,
          ),
        );
        return;
      }

      clearRuntimeWarning();
    })
    .catch((error) => {
      if (error?.name === "AbortError") {
        return;
      }

      if (state.connectedProfileName === profileName) {
        clearRuntimeWarning();
      }
    });
}

function handleSocketStatus(kind, text) {
  setStatus(kind, text);

  if (kind === "disconnected" || kind === "error") {
    clearSensitiveState();
    clearRuntimeWarning();
    state.connectedProfileName = "";
  }

  syncButtons();
}

function handleSocketError(message) {
  clearSensitiveState();
  clearRuntimeWarning();
  showError(message);
  state.connectedProfileName = "";
  syncButtons();
}

async function connectProfile(profile) {
  clearError();
  clearRuntimeWarning();
  const previousProfileName = state.connectedProfileName;
  const authRequestController = new AbortController();
  const statusText =
    previousProfileName && previousProfileName !== profile.name
      ? `Switching from ${previousProfileName} to ${profile.name}…`
      : `Logging in for ${profile.name}…`;

  beginBusy(statusText);
  abortPendingAuthRequest();
  state.authRequestController = authRequestController;

  try {
    if (previousProfileName) {
      disconnectSocket();
      clearSensitiveState();
      state.connectedProfileName = "";
      syncButtons();
    }

    upsertProfile(profile);
    setFormValues(profile);

    const tokenResult = await requestAccessToken({
      host: profile.host,
      clientId: profile.clientId,
      clientSecret: profile.clientSecret,
      signal: authRequestController.signal,
    });

    setStatus("connecting", `Connecting to ${profile.name}…`);

    await connectSocket({
      baseUrl: tokenResult.baseUrl,
      token: tokenResult.accessToken,
      profileName: profile.name,
      onMessage: (entry) => {
        clearError();
        appendMessage(entry);
      },
      onStatus: handleSocketStatus,
      onError: handleSocketError,
    });

    state.connectedProfileName = profile.name;
    state.activeProfileName = profile.name;
    renderProfiles(state.profiles, state.activeProfileName);
    setStatus("connected", `Connected to ${profile.name}`);
    refreshRuntimeWarning(
      profile.name,
      tokenResult.baseUrl,
      tokenResult.accessToken,
      authRequestController.signal,
    );
  } catch (error) {
    if (error.message === "Connection attempt was cancelled.") {
      setStatus("disconnected", "Connection cancelled");
      return;
    }

    clearSensitiveState();
    clearRuntimeWarning();
    state.connectedProfileName = "";
    setStatus("error", "Connection failed");
    showError(error.message);
  } finally {
    if (state.authRequestController === authRequestController) {
      state.authRequestController = null;
    }

    endBusy();
  }
}

function saveCurrentProfile() {
  clearError();

  try {
    const profile = validateProfile(getLoginValues());
    upsertProfile(profile);
    setFormValues(profile);

    if (!state.connectedProfileName) {
      setStatus("disconnected", `${profile.name} is saved for this tab only.`);
    }
  } catch (error) {
    showError(error.message);
  }
}

async function handleFormSubmit(event) {
  event.preventDefault();

  try {
    const profile = validateProfile(getLoginValues());
    await connectProfile(profile);
  } catch (error) {
    showError(error.message);
  }
}

async function handleProfileChange(event) {
  const selectedName = event.target.value;

  if (!selectedName) {
    return;
  }

  const profile = getProfile(selectedName);

  if (!profile) {
    return;
  }

  state.activeProfileName = profile.name;
  renderProfiles(state.profiles, state.activeProfileName);
  setFormValues(profile);
  clearError();

  if (state.connectedProfileName && state.connectedProfileName !== profile.name) {
    await connectProfile(profile);
  } else if (!state.connectedProfileName) {
    setStatus("disconnected", `${profile.name} is ready to connect.`);
  }
}

function disconnectCurrentProfile() {
  const connectedProfileName = state.connectedProfileName;

  abortPendingAuthRequest();
  disconnectSocket();
  clearSensitiveState();
  clearRuntimeWarning();
  state.connectedProfileName = "";
  setStatus("disconnected", connectedProfileName ? `Disconnected from ${connectedProfileName}` : "Not connected");
  clearError();
  syncButtons();
}

function clearSessionState() {
  abortPendingAuthRequest();
  disconnectSocket();
  clearSensitiveState();
  clearRuntimeWarning();
  state.connectedProfileName = "";
  state.activeProfileName = "";
  state.profiles = [];
}

function init() {
  renderProfiles(state.profiles, state.activeProfileName);
  setStatus("disconnected", "Not connected");
  syncButtons();

  getElement("login-form").addEventListener("submit", handleFormSubmit);
  getElement("save-profile-button").addEventListener("click", saveCurrentProfile);
  getElement("profile-select").addEventListener("change", (event) => {
    void handleProfileChange(event);
  });
  getElement("disconnect-button").addEventListener("click", disconnectCurrentProfile);
  getElement("clear-messages-button").addEventListener("click", clearMessages);

  window.addEventListener("beforeunload", clearSessionState);
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", init);
}
