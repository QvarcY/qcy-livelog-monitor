import {
  randomUUID
} from "node:crypto";

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
  dialog,
  session,
  shell,
  type IpcMainInvokeEvent
} from "electron";

import {
  BRAND,
  getBrandLink
} from "../brand.js";

import {
  readPreferences,
  updatePreferences
} from "./settings.js";

import {
  deleteServerProfile,
  readServerProfiles,
  upsertServerProfile
} from "./server-profiles.js";

import {
  testSshConnection
} from "./ssh-test.js";

import type {
  ServerProfileInput
} from "../server-profile.js";

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
  ipcMain.handle(
    "settings:get",
    async (
      event: IpcMainInvokeEvent
    ) => {
      assertTrustedSender(event);

      return readPreferences(
        app.getPath("userData"),
        app.getLocale()
      );
    }
  );

  ipcMain.handle(
    "settings:update",
    async (
      event: IpcMainInvokeEvent,
      patch: unknown
    ) => {
      assertTrustedSender(event);

      return updatePreferences(
        app.getPath("userData"),
        app.getLocale(),
        patch
      );
    }
  );
  ipcMain.handle(
    "window:set-always-on-top",
    (
      event: IpcMainInvokeEvent,
      enabled: unknown
    ) => {
      assertTrustedSender(event);

      if (typeof enabled !== "boolean") {
        throw new Error(
          "Invalid always-on-top value."
        );
      }

      const window =
        BrowserWindow.fromWebContents(
          event.sender
        );

      if (!window) {
        throw new Error(
          "Renderer window not found."
        );
      }

      window.setAlwaysOnTop(
        enabled
      );

      return window.isAlwaysOnTop();
    }
  );

  ipcMain.handle(
    "profiles:list",
    async (
      event: IpcMainInvokeEvent
    ) => {
      assertTrustedSender(event);

      return readServerProfiles(
        app.getPath("userData")
      );
    }
  );

  ipcMain.handle(
    "profiles:save",
    async (
      event: IpcMainInvokeEvent,
      input: unknown
    ) => {
      assertTrustedSender(event);

      if (
        typeof input !== "object" ||
        input === null ||
        Array.isArray(input)
      ) {
        throw new Error(
          "Invalid server profile."
        );
      }

      const source =
        input as ServerProfileInput;

      const existingId =
        typeof source.id === "string"
          ? source.id.trim()
          : "";

      const profileInput: ServerProfileInput = {
        ...source,
        id:
          existingId !== ""
            ? existingId
            : `server-${randomUUID()}`
      };

      return upsertServerProfile(
        app.getPath("userData"),
        profileInput
      );
    }
  );

  ipcMain.handle(
    "profiles:delete",
    async (
      event: IpcMainInvokeEvent,
      profileId: unknown
    ) => {
      assertTrustedSender(event);

      if (
        typeof profileId !== "string" ||
        profileId.trim() === ""
      ) {
        throw new Error(
          "Invalid server profile id."
        );
      }

      return deleteServerProfile(
        app.getPath("userData"),
        profileId.trim()
      );
    }
  );

  ipcMain.handle(
    "ssh:select-private-key",
    async (
      event: IpcMainInvokeEvent
    ) => {
      assertTrustedSender(event);

      const window =
        BrowserWindow.fromWebContents(
          event.sender
        );

      const options = {
        title:
          "Select SSH private key",
        properties: [
          "openFile"
        ] as Array<"openFile">
      };

      const result =
        window
          ? await dialog.showOpenDialog(
              window,
              options
            )
          : await dialog.showOpenDialog(
              options
            );

      if (
        result.canceled ||
        result.filePaths.length === 0
      ) {
        return null;
      }

      return result.filePaths[0];
    }
  );

  ipcMain.handle(
    "ssh:test",
    async (
      event: IpcMainInvokeEvent,
      ssh: unknown,
      passphrase: unknown
    ) => {
      assertTrustedSender(event);

      return testSshConnection(
        ssh,
        passphrase
      );
    }
  );
}

function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1380,
    height: 860,
    minWidth: 360,
    minHeight: 240,
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