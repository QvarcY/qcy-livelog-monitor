import {
  readFile
} from "node:fs/promises";

import {
  Client,
  type ConnectConfig
} from "ssh2";

import {
  discoverLogs,
  type DiscoveredLog
} from "../discovery.js";

import {
  normalizeSshConnectionProfile,
  type SshConnectionProfileInput
} from "../server-profile.js";

import {
  createSshHostKeyGuard,
  hostKeyMismatchError
} from "./ssh-host-key.js";

export interface LogDiscoveryRequest {
  ssh: SshConnectionProfileInput;

  logs: {
    directory: string;
    pattern: string;
    projectNameSuffix?: string;
  };
}

function requireString(
  value: unknown,
  field: string
): string {
  if (typeof value !== "string") {
    throw new Error(
      `${field} must be a string.`
    );
  }

  const result =
    value.trim();

  if (result === "") {
    throw new Error(
      `${field} cannot be empty.`
    );
  }

  return result;
}

export async function discoverRemoteLogs(
  input: unknown,
  passphrase: unknown
): Promise<DiscoveredLog[]> {
  if (
    typeof input !== "object" ||
    input === null ||
    Array.isArray(input)
  ) {
    throw new Error(
      "Invalid log discovery request."
    );
  }

  const request =
    input as Partial<LogDiscoveryRequest>;

  const ssh =
    normalizeSshConnectionProfile(
      request.ssh
    );

  if (
    typeof request.logs !== "object" ||
    request.logs === null
  ) {
    throw new Error(
      "Log source configuration is missing."
    );
  }

  const directory =
    requireString(
      request.logs.directory,
      "Log directory"
    );

  const pattern =
    requireString(
      request.logs.pattern,
      "Log file pattern"
    );

  const projectNameSuffix =
    typeof request.logs.projectNameSuffix === "string"
      ? request.logs.projectNameSuffix.trim()
      : "";

  if (
    passphrase !== undefined &&
    passphrase !== null &&
    typeof passphrase !== "string"
  ) {
    throw new Error(
      "SSH passphrase must be a string."
    );
  }

  if (!ssh.hostKeySha256) {
    throw new Error(
      "Trusted SSH host key is required before log discovery."
    );
  }

  let privateKey: Buffer;

  try {
    privateKey =
      await readFile(
        ssh.privateKeyPath
      );
  } catch {
    throw new Error(
      `Cannot read private key: ${ssh.privateKeyPath}`
    );
  }

  const hostKey =
    createSshHostKeyGuard(
      ssh.hostKeySha256
    );

  const config: ConnectConfig = {
    host: ssh.host,
    port: ssh.port,
    username: ssh.username,
    privateKey,
    hostVerifier:
      hostKey.verifier,
    readyTimeout: 15000,
    keepaliveInterval: 10000,
    keepaliveCountMax: 3
  };

  if (
    typeof passphrase === "string" &&
    passphrase !== ""
  ) {
    config.passphrase =
      passphrase;
  }

  return await new Promise<DiscoveredLog[]>(
    (
      resolve,
      reject
    ) => {
      const client =
        new Client();

      let settled = false;

      const fail = (
        error: unknown
      ): void => {
        if (settled) {
          return;
        }

        settled = true;
        client.end();

        const mismatch =
          hostKey.getMismatch();

        if (mismatch) {
          reject(
            hostKeyMismatchError(
              mismatch
            )
          );

          return;
        }

        reject(
          error instanceof Error
            ? error
            : new Error(
                String(error)
              )
        );
      };

      client.once(
        "error",
        fail
      );

      client.once(
        "ready",
        async () => {
          try {
            const logs =
              await discoverLogs(
                client,
                directory,
                pattern,
                projectNameSuffix
              );

            if (settled) {
              return;
            }

            settled = true;
            client.end();

            resolve(logs);
          } catch (error: unknown) {
            fail(error);
          }
        }
      );

      client.connect(
        config
      );
    }
  );
}