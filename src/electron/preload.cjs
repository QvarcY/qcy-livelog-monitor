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
    )
});

contextBridge.exposeInMainWorld(
  "qcyLiveLog",
  api
);