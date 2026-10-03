import path from "node:path";
import {
  fileURLToPath,
  pathToFileURL
} from "node:url";

import {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  session,
  shell,
  type IpcMainInvokeEvent
} from "electron";

import {
  BRAND,
  getBrandLink
} from "../brand.js";

const moduleFile = fileURLToPath(
  import.meta.url
);

const moduleDir = path.dirname(
  moduleFile
);

const rendererFile = path.join(
  moduleDir,
  "renderer",
  "index.html"
);

const rendererUrl = pathToFileURL(
  rendererFile
).toString();

const preloadFile = path.join(
  moduleDir,
  "preload.cjs"
);

function assertTrustedSender(
  event: IpcMainInvokeEvent
): void {
  const senderFrame =
    event.senderFrame;

  if (
    !senderFrame ||
    senderFrame.url !== rendererUrl
  ) {
    throw new Error(
      "Rejected IPC call from untrusted renderer."
    );
  }
}

function registerIpc(): void {
  ipcMain.handle(
    "app:get-info",
    (
      event: IpcMainInvokeEvent
    ) => {
      assertTrustedSender(event);

      return {
        name: BRAND.productName,
        author: BRAND.authorName,
        authorLabel: BRAND.authorLabel,
        githubUrl: BRAND.githubUrl,
        supportLabel: BRAND.supportLabel,
        supportUrl: BRAND.supportUrl,
        version: app.getVersion(),
        platform: process.platform
      };
    }
  );

  ipcMain.handle(
    "brand:open-link",
    async (
      event: IpcMainInvokeEvent,
      kind: unknown
    ) => {
      assertTrustedSender(event);

      const url =
        getBrandLink(kind);

      if (!url) {
        throw new Error(
          "Rejected unknown brand link."
        );
      }

      await shell.openExternal(url);

      return true;
    }
  );
}

function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1380,
    height: 860,
    minWidth: 980,
    minHeight: 640,
    show: false,
    title: BRAND.productName,
    backgroundColor: "#0a0f18",
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadFile,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  });

  window.webContents.setWindowOpenHandler(
    () => ({
      action: "deny"
    })
  );

  window.webContents.on(
    "will-navigate",
    (
      event,
      url
    ) => {
      if (url !== rendererUrl) {
        event.preventDefault();
      }
    }
  );

  window.once(
    "ready-to-show",
    () => {
      window.show();
    }
  );

  void window.loadFile(
    rendererFile
  );

  return window;
}

app.setName(
  BRAND.productName
);

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);

  session.defaultSession
    .setPermissionRequestHandler(
      (
        _webContents,
        _permission,
        callback
      ) => {
        callback(false);
      }
    );

  registerIpc();
  createWindow();

  app.on(
    "activate",
    () => {
      if (
        BrowserWindow.getAllWindows()
          .length === 0
      ) {
        createWindow();
      }
    }
  );
});

app.on(
  "window-all-closed",
  () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  }
);