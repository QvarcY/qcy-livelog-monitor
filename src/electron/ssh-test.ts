import {
  readFile
} from "node:fs/promises";

import {
  Client,
  type ConnectConfig
} from "ssh2";

import {
  normalizeSshConnectionProfile,
  type SshConnectionProfile
} from "../server-profile.js";

import {
  createSshHostKeyGuard,
  hostKeyMismatchError
} from "./ssh-host-key.js";

export interface SshConnectionTestResult {
  ok: true;
  target: string;
  latencyMs: number;
  hostKeySha256: string;
  hostKeyTrusted: boolean;
}

function targetLabel(
  ssh: SshConnectionProfile
): string {
  return (
    `${ssh.username}@` +
    `${ssh.host}:` +
    `${ssh.port}`
  );
}

export async function testSshConnection(
  input: unknown,
  passphrase: unknown
): Promise<SshConnectionTestResult> {
  const ssh =
    normalizeSshConnectionProfile(
      input
    );

  if (
    passphrase !== undefined &&
    passphrase !== null &&
    typeof passphrase !== "string"
  ) {
    throw new Error(
      "SSH passphrase must be a string."
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

  const startedAt =
    Date.now();

  return await new Promise<SshConnectionTestResult>(
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
        () => {
          client.exec(
            "printf 'QCY_SSH_OK'",
            (
              error,
              stream
            ) => {
              if (error) {
                fail(error);
                return;
              }

              let stdout = "";
              let stderr = "";

              stream.on(
                "data",
                (
                  data: Buffer
                ) => {
                  stdout +=
                    data.toString(
                      "utf8"
                    );
                }
              );

              stream.stderr.on(
                "data",
                (
                  data: Buffer
                ) => {
                  stderr +=
                    data.toString(
                      "utf8"
                    );
                }
              );

              stream.once(
                "error",
                fail
              );

              stream.once(
                "close",
                (
                  code: number | null
                ) => {
                  if (settled) {
                    return;
                  }

                  if (
                    code !== 0 ||
                    stdout.trim() !==
                      "QCY_SSH_OK"
                  ) {
                    fail(
                      new Error(
                        stderr.trim() ||
                          "SSH connected, but remote command execution failed."
                      )
                    );

                    return;
                  }

                  const fingerprint =
                    hostKey.getObserved();

                  if (!fingerprint) {
                    fail(
                      new Error(
                        "SSH server host key was not observed."
                      )
                    );

                    return;
                  }

                  settled = true;

                  const result:
                    SshConnectionTestResult = {
                      ok: true,

                      target:
                        targetLabel(
                          ssh
                        ),

                      latencyMs:
                        Date.now() -
                        startedAt,

                      hostKeySha256:
                        fingerprint,

                      hostKeyTrusted:
                        ssh.hostKeySha256 ===
                        fingerprint
                    };

                  client.end();
                  resolve(result);
                }
              );
            }
          );
        }
      );

      client.connect(
        config
      );
    }
  );
}