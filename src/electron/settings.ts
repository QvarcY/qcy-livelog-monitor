import {
  mkdir,
  readFile,
  writeFile
} from "node:fs/promises";

import path from "node:path";

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
}

function getDefaultPreferences(
  locale: string
): AppPreferences {
  return {
    language:
      locale.toLowerCase().startsWith("lv")
        ? "lv"
        : "en",

    theme: "dark",
    alwaysOnTop: false
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
  if (
    value === "en" ||
    value === "lv"
  ) {
    return value;
  }

  return fallback;
}

function normalizeTheme(
  value: unknown,
  fallback: AppTheme
): AppTheme {
  if (
    value === "dark" ||
    value === "light"
  ) {
    return value;
  }

  return fallback;
}

function normalizeBoolean(
  value: unknown,
  fallback: boolean
): boolean {
  return typeof value === "boolean"
    ? value
    : fallback;
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
    getDefaultPreferences(locale);

  try {
    const raw = await readFile(
      preferencesFile(userDataPath),
      "utf8"
    );

    const parsed: unknown =
      JSON.parse(raw);

    if (!isRecord(parsed)) {
      return defaults;
    }

    return {
      language: normalizeLanguage(
        parsed.language,
        defaults.language
      ),

      theme: normalizeTheme(
        parsed.theme,
        defaults.theme
      ),

      alwaysOnTop: normalizeBoolean(
        parsed.alwaysOnTop,
        defaults.alwaysOnTop
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
    language: normalizeLanguage(
      input.language,
      current.language
    ),

    theme: normalizeTheme(
      input.theme,
      current.theme
    ),

    alwaysOnTop: normalizeBoolean(
      input.alwaysOnTop,
      current.alwaysOnTop
    )
  };

  await mkdir(
    userDataPath,
    {
      recursive: true
    }
  );

  await writeFile(
    preferencesFile(userDataPath),
    JSON.stringify(
      next,
      null,
      2
    ) + "\n",
    "utf8"
  );

  return next;
}