const {
  contextBridge,
  ipcRenderer
} = require("electron");

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
    )
});

contextBridge.exposeInMainWorld(
  "qcyLiveLog",
  api
);