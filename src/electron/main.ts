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

import {
  discoverRemoteLogs
} from "./log-discovery.js";

import {
  bootstrapStartup
} from "./startup.js";

import {
  restartConfiguredLiveCollector,
  startConfiguredLiveCollector,
  stopConfiguredLiveCollector
} from "./live-collector-service.js";

import type {
  LiveCollectorStatus,
  LiveRequestEvent,
  LiveRotationEvent
} from "./live-collector.js";
import {
  getSmartActivitySnapshot,
  pushSmartActivity,
  shouldSurfaceSmartActivity
} from "./smart-activity.js";

import {
  forgetSshPassphrase,
  hasSshPassphrase,
  rememberSshPassphrase
} from "./secure-credentials.js";

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

function applyLaunchAtLogin(
  enabled: boolean
): void {
  if (
    process.platform !== "win32"
  ) {
    return;
  }

  if (!app.isPackaged) {
    /*
     * Development Electron must never become a real
     * Windows login item.
     */
    app.setLoginItemSettings({
      openAtLogin: false,
      path: process.execPath,
      args: [
        app.getAppPath()
      ]
    });

    return;
  }

  app.setLoginItemSettings({
    openAtLogin: enabled
  });
}

const LIVE_REQUEST_BUFFER_LIMIT = 250;

let latestCollectorStatus:
  LiveCollectorStatus | null = null;

const recentLiveRequests:
  LiveRequestEvent[] = [];

const latestLogRotations =
  new Map<string, LiveRotationEvent>();

function broadcastLiveEvent(
  channel: string,
  payload: unknown
): void {
  for (
    const window
    of BrowserWindow.getAllWindows()
  ) {
    if (
      window.isDestroyed() ||
      window.webContents.isDestroyed()
    ) {
      continue;
    }

    window.webContents.send(
      channel,
      payload
    );
  }
}

function recordLiveRequest(
  event: LiveRequestEvent
): void {
  recentLiveRequests.push(event);

  if (
    recentLiveRequests.length >
    LIVE_REQUEST_BUFFER_LIMIT
  ) {
    recentLiveRequests.splice(
      0,
      recentLiveRequests.length -
        LIVE_REQUEST_BUFFER_LIMIT
    );
  }

  broadcastLiveEvent(
    "live:request",
    event
  );
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
    "startup:update",
    async (
      event: IpcMainInvokeEvent,
      patch: unknown
    ) => {
      assertTrustedSender(event);

      const preferences =
        await updatePreferences(
          app.getPath(
            "userData"
          ),
          app.getLocale(),
          patch
        );

      applyLaunchAtLogin(
        preferences
          .launchAtLogin
      );

      return preferences;
    }
  );

  ipcMain.handle(
    "startup:bootstrap",
    async (
      event: IpcMainInvokeEvent
    ) => {
      assertTrustedSender(event);

      return bootstrapStartup(
        app.getPath(
          "userData"
        ),
        app.getLocale()
      );
    }
  );

  ipcMain.handle(
    "credentials:remember",
    async (
      event: IpcMainInvokeEvent,
      profileId: unknown,
      passphrase: unknown
    ) => {
      assertTrustedSender(event);

      await rememberSshPassphrase(
        app.getPath(
          "userData"
        ),
        profileId,
        passphrase
      );

      return true;
    }
  );

  ipcMain.handle(
    "credentials:forget",
    async (
      event: IpcMainInvokeEvent,
      profileId: unknown
    ) => {
      assertTrustedSender(event);

      await forgetSshPassphrase(
        app.getPath(
          "userData"
        ),
        profileId
      );

      return true;
    }
  );

  ipcMain.handle(
    "credentials:has",
    async (
      event: IpcMainInvokeEvent,
      profileId: unknown
    ) => {
      assertTrustedSender(event);

      return hasSshPassphrase(
        app.getPath(
          "userData"
        ),
        profileId
      );
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

  ipcMain.handle(
    "logs:discover",
    async (
      event: IpcMainInvokeEvent,
      request: unknown,
      passphrase: unknown
    ) => {
      assertTrustedSender(event);

      return discoverRemoteLogs(
        request,
        passphrase
      );
    }
  );

  ipcMain.handle(
    "monitoring:set-projects",
    async (
      event:
        IpcMainInvokeEvent,

      domains:
        unknown
    ) => {
      assertTrustedSender(
        event
      );

      if (
        domains !== null &&
        (
          !Array.isArray(
            domains
          ) ||
          domains.some(
            domain =>
              typeof domain !==
              "string"
          )
        )
      ) {
        throw new Error(
          "Invalid monitored project selection."
        );
      }

      const preferences =
        await updatePreferences(
          app.getPath(
            "userData"
          ),
          app.getLocale(),
          {
            monitoredProjectDomains:
              domains
          }
        );

      await restartConfiguredLiveCollector();

      return (
        preferences
          .monitoredProjectDomains
      );
    }
  );
  ipcMain.handle(
    "live:get-snapshot",
    (
      event: IpcMainInvokeEvent
    ) => {
      assertTrustedSender(event);

      return {
        status:
          latestCollectorStatus,

        requests:
          [...recentLiveRequests],

        rotations:
          [
            ...latestLogRotations.values()
          ]
      };
    }
  );
  ipcMain.handle(
    "smart:get-snapshot",
    (
      event:
        IpcMainInvokeEvent
    ) => {
      assertTrustedSender(
        event
      );

      return (
        getSmartActivitySnapshot()
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

app.once(
  "before-quit",
  () => {
    stopConfiguredLiveCollector();
  }
);

app.whenReady().then(async () => {
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

  const startupPreferences =
    await readPreferences(
      app.getPath(
        "userData"
      ),
      app.getLocale()
    );

  applyLaunchAtLogin(
    startupPreferences
      .launchAtLogin
  );

  registerIpc();
  createWindow();

  void startConfiguredLiveCollector(
    app.getPath(
      "userData"
    ),
    app.getLocale(),
    {
      onStatus:
        status => {
          latestCollectorStatus =
            status;

          broadcastLiveEvent(
            "live:status",
            status
          );

          if (
            !app.isPackaged
          ) {
            const retry =
              status.retryInMs ===
                undefined
                ? ""
                : ` · retry ${status.retryInMs / 1000}s`;

            const projects =
              status.projectCount ===
                undefined
                ? ""
                : ` · ${status.projectCount} projects`;

            const message =
              status.message
                ? ` · ${status.message}`
                : "";

            console.log(
              `[COLLECTOR] ${status.state}${projects}${retry}${message}`
            );
          }
        },

      onRequest:
        event => {
          recordLiveRequest(
            event
          );
          const smartUpdate =
            pushSmartActivity(
              event
            );

          const surfaceSmartUpdate =
            shouldSurfaceSmartActivity(
              smartUpdate.group
            );

          if (
            surfaceSmartUpdate
          ) {
            broadcastLiveEvent(
              "smart:group-update",
              smartUpdate
            );
          }

          if (
            !app.isPackaged &&
            smartUpdate.created &&
            surfaceSmartUpdate
          ) {
            const primary =
              smartUpdate.group
                .primaryRequest;

            console.log(
              "[SMART] NEW · " +
                `${smartUpdate.group.domain} · ` +
                `${smartUpdate.group.layer} · ` +
                (
                  primary
                    ? `${primary.method} ${primary.path}`
                    : "important background activity"
                )
            );
          }

          if (
            !app.isPackaged
          ) {
            console.log(
              `[LIVE] ${event.domain} · ` +
                `${event.category} · ` +
                `${event.status} ` +
                `${event.method} ` +
                `${event.path}`
            );
          }
        },

      onRotation:
        event => {
          latestLogRotations.set(
            event.domain,
            event
          );

          broadcastLiveEvent(
            "live:rotation",
            event
          );

          if (
            !app.isPackaged
          ) {
            console.log(
              `[ROTATION] ${event.domain} · ${event.state}`
            );
          }
        }
    }
  ).catch(
    (
      error: unknown
    ) => {
      if (
        !app.isPackaged
      ) {
        console.error(
          "[COLLECTOR] startup failed:",
          error
        );
      }
    }
  );

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