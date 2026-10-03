import {
  mkdir,
  readFile,
  writeFile
} from "node:fs/promises";

import path from "node:path";

import {
  normalizeMonitoredProjectDomains,
  type MonitoredProjectDomains
} from "../project-monitoring.js";

export type AppLanguage =
  | "en"
  | "lv";

export type AppTheme =
  | "dark"
  | "light";

export interface AppPreferences {
  language: AppLanguage;
  theme: AppTheme;
  alwaysOnTop: boolean;

  defaultServerProfileId:
    string | null;

  autoConnect: boolean;
  launchAtLogin: boolean;

  monitoredProjectDomains:
    MonitoredProjectDomains;
}

function getDefaultPreferences(
  locale: string
): AppPreferences {
  return {
    language:
      locale
        .toLowerCase()
        .startsWith("lv")
        ? "lv"
        : "en",

    theme: "dark",
    alwaysOnTop: false,

    defaultServerProfileId:
      null,

    autoConnect: false,
    launchAtLogin: false,

    monitoredProjectDomains:
      null
  };
}

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function normalizeLanguage(
  value: unknown,
  fallback: AppLanguage
): AppLanguage {
  return (
    value === "en" ||
    value === "lv"
  )
    ? value
    : fallback;
}

function normalizeTheme(
  value: unknown,
  fallback: AppTheme
): AppTheme {
  return (
    value === "dark" ||
    value === "light"
  )
    ? value
    : fallback;
}

function normalizeBoolean(
  value: unknown,
  fallback: boolean
): boolean {
  return typeof value === "boolean"
    ? value
    : fallback;
}

function normalizeProfileId(
  value: unknown,
  fallback: string | null
): string | null {
  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return fallback;
  }

  const id =
    value.trim();

  if (
    id === "" ||
    !/^[a-z0-9][a-z0-9._-]*$/iu.test(id)
  ) {
    return fallback;
  }

  return id;
}

function preferencesFile(
  userDataPath: string
): string {
  return path.join(
    userDataPath,
    "preferences.json"
  );
}

export async function readPreferences(
  userDataPath: string,
  locale: string
): Promise<AppPreferences> {
  const defaults =
    getDefaultPreferences(
      locale
    );

  try {
    const raw =
      await readFile(
        preferencesFile(
          userDataPath
        ),
        "utf8"
      );

    const parsed: unknown =
      JSON.parse(raw);

    if (!isRecord(parsed)) {
      return defaults;
    }

    return {
      language:
        normalizeLanguage(
          parsed.language,
          defaults.language
        ),

      theme:
        normalizeTheme(
          parsed.theme,
          defaults.theme
        ),

      alwaysOnTop:
        normalizeBoolean(
          parsed.alwaysOnTop,
          defaults.alwaysOnTop
        ),

      defaultServerProfileId:
        normalizeProfileId(
          parsed.defaultServerProfileId,
          defaults.defaultServerProfileId
        ),

      autoConnect:
        normalizeBoolean(
          parsed.autoConnect,
          defaults.autoConnect
        ),

      launchAtLogin:
        normalizeBoolean(
          parsed.launchAtLogin,
          defaults.launchAtLogin
        ),

      monitoredProjectDomains:
        normalizeMonitoredProjectDomains(
          parsed.monitoredProjectDomains,
          defaults.monitoredProjectDomains
        )
    };
  } catch {
    return defaults;
  }
}

export async function updatePreferences(
  userDataPath: string,
  locale: string,
  patch: unknown
): Promise<AppPreferences> {
  const current =
    await readPreferences(
      userDataPath,
      locale
    );

  const input =
    isRecord(patch)
      ? patch
      : {};

  const next: AppPreferences = {
    language:
      normalizeLanguage(
        input.language,
        current.language
      ),

    theme:
      normalizeTheme(
        input.theme,
        current.theme
      ),

    alwaysOnTop:
      normalizeBoolean(
        input.alwaysOnTop,
        current.alwaysOnTop
      ),

    defaultServerProfileId:
      input.defaultServerProfileId ===
        undefined
        ? current
            .defaultServerProfileId
        : normalizeProfileId(
            input.defaultServerProfileId,
            current
              .defaultServerProfileId
          ),

    autoConnect:
      normalizeBoolean(
        input.autoConnect,
        current.autoConnect
      ),

    launchAtLogin:
      normalizeBoolean(
        input.launchAtLogin,
        current.launchAtLogin
      ),

    monitoredProjectDomains:
      input.monitoredProjectDomains ===
        undefined
        ? current
            .monitoredProjectDomains
        : normalizeMonitoredProjectDomains(
            input.monitoredProjectDomains,
            current
              .monitoredProjectDomains
          )
  };

  await mkdir(
    userDataPath,
    {
      recursive: true
    }
  );

  await writeFile(
    preferencesFile(
      userDataPath
    ),
    JSON.stringify(
      next,
      null,
      2
    ) + "\n",
    "utf8"
  );

  return next;
}