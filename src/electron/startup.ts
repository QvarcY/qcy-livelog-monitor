import type {
  DiscoveredLog
} from "../discovery.js";

import type {
  ServerProfile
} from "../server-profile.js";

import {
  readPreferences
} from "./settings.js";

import {
  readServerProfiles
} from "./server-profiles.js";

import {
  readSshPassphrase
} from "./secure-credentials.js";

import {
  testSshConnection
} from "./ssh-test.js";

import {
  discoverRemoteLogs
} from "./log-discovery.js";

export type StartupBootstrapResult =
  | {
      status: "disabled";
    }
  | {
      status: "profile-missing";
    }
  | {
      status: "host-key-trust-required";
      profile: ServerProfile;
    }
  | {
      status: "passphrase-required";
      profile: ServerProfile;
    }
  | {
      status: "ready";
      profile: ServerProfile;
      logs: DiscoveredLog[];
      latencyMs: number;
    };

function looksLikePassphraseError(
  error: unknown
): boolean {
  const message =
    (
      error instanceof Error
        ? error.message
        : String(error)
    ).toLowerCase();

  return (
    message.includes(
      "passphrase"
    ) ||
    (
      message.includes(
        "encrypted"
      ) &&
      message.includes(
        "private"
      )
    )
  );
}

export async function bootstrapStartup(
  dataDirectory: string,
  locale: string
): Promise<StartupBootstrapResult> {
  const preferences =
    await readPreferences(
      dataDirectory,
      locale
    );

  if (
    !preferences.autoConnect ||
    preferences
      .defaultServerProfileId ===
      null
  ) {
    return {
      status: "disabled"
    };
  }

  const profiles =
    await readServerProfiles(
      dataDirectory
    );

  const profile =
    profiles.find(
      candidate =>
        candidate.id ===
        preferences
          .defaultServerProfileId
    );

  if (!profile) {
    return {
      status:
        "profile-missing"
    };
  }

  if (
    !profile.ssh
      .hostKeySha256
  ) {
    return {
      status:
        "host-key-trust-required",

      profile
    };
  }

  const passphrase =
    await readSshPassphrase(
      dataDirectory,
      profile.id
    );

  let connection;

  try {
    connection =
      await testSshConnection(
        profile.ssh,
        passphrase ??
          undefined
      );
  } catch (error: unknown) {
    if (
      passphrase === null &&
      looksLikePassphraseError(
        error
      )
    ) {
      return {
        status:
          "passphrase-required",

        profile
      };
    }

    throw error;
  }

  if (
    !connection.hostKeyTrusted
  ) {
    throw new Error(
      "Trusted SSH host key verification failed."
    );
  }

  const logs =
    await discoverRemoteLogs(
      {
        ssh:
          profile.ssh,

        logs:
          profile.logs
      },

      passphrase ??
        undefined
    );

  return {
    status: "ready",
    profile,
    logs,

    latencyMs:
      connection.latencyMs
  };
}