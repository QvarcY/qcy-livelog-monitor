import {
  LiveCollector,
  type LiveCollectorHooks
} from "./live-collector.js";

import {
  readPreferences
} from "./settings.js";

import {
  readServerProfiles
} from "./server-profiles.js";

import {
  readSshPassphrase
} from "./secure-credentials.js";

export type ConfiguredCollectorStartResult =
  | {
      status: "disabled";
    }
  | {
      status: "profile-missing";
    }
  | {
      status: "started";
      profileId: string;
      profileName: string;
    };

let activeCollector:
  LiveCollector | null =
    null;

export function stopConfiguredLiveCollector():
  void {
  activeCollector?.stop();

  activeCollector =
    null;
}

export async function startConfiguredLiveCollector(
  dataDirectory: string,
  locale: string,
  hooks: LiveCollectorHooks = {}
): Promise<ConfiguredCollectorStartResult> {
  stopConfiguredLiveCollector();

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

  const passphrase =
    await readSshPassphrase(
      dataDirectory,
      profile.id
    );

  const collector =
    new LiveCollector(
      profile,
      passphrase,
      hooks
    );

  activeCollector =
    collector;

  void collector
    .start()
    .catch(
      (
        error: unknown
      ) => {
        const message =
          error instanceof Error
            ? error.message
            : String(error);

        hooks.onStatus?.({
          state:
            "reconnecting",

          attempt: 0,

          message
        });
      }
    );

  return {
    status: "started",
    profileId:
      profile.id,

    profileName:
      profile.name
  };
}