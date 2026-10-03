import {
  mkdir,
  readFile,
  writeFile
} from "node:fs/promises";

import path from "node:path";

import {
  normalizeServerProfile,
  type ServerProfile,
  type ServerProfileInput
} from "../server-profile.js";

interface ServerProfileFile {
  version: 1;
  profiles: ServerProfile[];
}

function profileFilePath(
  dataDirectory: string
): string {
  return path.join(
    dataDirectory,
    "server-profiles.json"
  );
}

function emptyProfileFile():
  ServerProfileFile {
  return {
    version: 1,
    profiles: []
  };
}

export async function readServerProfiles(
  dataDirectory: string
): Promise<ServerProfile[]> {
  try {
    const raw = await readFile(
      profileFilePath(dataDirectory),
      "utf8"
    );

    const parsed: unknown =
      JSON.parse(raw);

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return [];
    }

    const record =
      parsed as Record<string, unknown>;

    if (
      record.version !== 1 ||
      !Array.isArray(record.profiles)
    ) {
      return [];
    }

    const profiles: ServerProfile[] = [];

    for (const item of record.profiles) {
      try {
        profiles.push(
          normalizeServerProfile(
            item as ServerProfileInput
          )
        );
      } catch {
        // Invalid saved profiles are ignored.
      }
    }

    return profiles;
  } catch {
    return [];
  }
}

export async function writeServerProfiles(
  dataDirectory: string,
  profiles: ServerProfile[]
): Promise<void> {
  const normalized =
    profiles.map(
      (
        profile
      ) =>
        normalizeServerProfile(
          profile
        )
    );

  const payload: ServerProfileFile = {
    version: 1,
    profiles: normalized
  };

  await mkdir(
    dataDirectory,
    {
      recursive: true
    }
  );

  await writeFile(
    profileFilePath(dataDirectory),
    JSON.stringify(
      payload,
      null,
      2
    ) + "\n",
    "utf8"
  );
}

export async function upsertServerProfile(
  dataDirectory: string,
  input: ServerProfileInput
): Promise<ServerProfile[]> {
  const profile =
    normalizeServerProfile(
      input
    );

  const profiles =
    await readServerProfiles(
      dataDirectory
    );

  const existingIndex =
    profiles.findIndex(
      (
        existing
      ) =>
        existing.id === profile.id
    );

  if (existingIndex === -1) {
    profiles.push(profile);
  } else {
    profiles[existingIndex] =
      profile;
  }

  await writeServerProfiles(
    dataDirectory,
    profiles
  );

  return profiles;
}

export async function deleteServerProfile(
  dataDirectory: string,
  profileId: string
): Promise<ServerProfile[]> {
  const profiles =
    await readServerProfiles(
      dataDirectory
    );

  const next =
    profiles.filter(
      (
        profile
      ) =>
        profile.id !== profileId
    );

  await writeServerProfiles(
    dataDirectory,
    next
  );

  return next;
}