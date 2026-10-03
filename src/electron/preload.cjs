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
    )
});

contextBridge.exposeInMainWorld(
  "areaLiveLogs",
  api
);