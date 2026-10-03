const {
  contextBridge,
  ipcRenderer
} = require("electron");

function subscribe(
  channel,
  callback
) {
  const listener = (
    _event,
    payload
  ) => {
    callback(payload);
  };

  ipcRenderer.on(
    channel,
    listener
  );

  return () => {
    ipcRenderer.removeListener(
      channel,
      listener
    );
  };
}

const api = Object.freeze({
  getAppInfo: () =>
    ipcRenderer.invoke(
      "app:get-info"
    ),

  openBrandLink: (kind) =>
    ipcRenderer.invoke(
      "brand:open-link",
      kind
    ),

  getPreferences: () =>
    ipcRenderer.invoke(
      "settings:get"
    ),

  updatePreferences: (patch) =>
    ipcRenderer.invoke(
      "settings:update",
      patch
    ),

  setAlwaysOnTop: (enabled) =>
    ipcRenderer.invoke(
      "window:set-always-on-top",
      enabled
    ),

  listServerProfiles: () =>
    ipcRenderer.invoke(
      "profiles:list"
    ),

  saveServerProfile: (profile) =>
    ipcRenderer.invoke(
      "profiles:save",
      profile
    ),

  deleteServerProfile: (profileId) =>
    ipcRenderer.invoke(
      "profiles:delete",
      profileId
    ),

  selectPrivateKey: () =>
    ipcRenderer.invoke(
      "ssh:select-private-key"
    ),

  testSshConnection: (
    ssh,
    passphrase
  ) =>
    ipcRenderer.invoke(
      "ssh:test",
      ssh,
      passphrase
    ),

  discoverLogs: (
    request,
    passphrase
  ) =>
    ipcRenderer.invoke(
      "logs:discover",
      request,
      passphrase
    ),

  updateStartupPreferences: (
    patch
  ) =>
    ipcRenderer.invoke(
      "startup:update",
      patch
    ),

  bootstrapStartup: () =>
    ipcRenderer.invoke(
      "startup:bootstrap"
    ),

  rememberPassphrase: (
    profileId,
    passphrase
  ) =>
    ipcRenderer.invoke(
      "credentials:remember",
      profileId,
      passphrase
    ),

  forgetPassphrase: (
    profileId
  ) =>
    ipcRenderer.invoke(
      "credentials:forget",
      profileId
    ),

  hasRememberedPassphrase: (
    profileId
  ) =>
    ipcRenderer.invoke(
      "credentials:has",
      profileId
    ),

  getLiveSnapshot: () =>
    ipcRenderer.invoke(
      "live:get-snapshot"
    ),

  onCollectorStatus: (
    callback
  ) =>
    subscribe(
      "live:status",
      callback
    ),

  onLiveRequest: (
    callback
  ) =>
    subscribe(
      "live:request",
      callback
    ),

  onLogRotation: (
    callback
  ) =>
    subscribe(
      "live:rotation",
      callback
    )
});

contextBridge.exposeInMainWorld(
  "qcyLiveLog",
  api
);