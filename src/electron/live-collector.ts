import {
  readFile
} from "node:fs/promises";

import {
  Client,
  type ConnectConfig
} from "ssh2";

import {
  classify,
  type LogCategory
} from "../classifier.js";

import {
  discoverLogs,
  type DiscoveredLog
} from "../discovery.js";

import {
  calculateObservedDelayMs
} from "../log-time.js";

import {
  parseAccessLogLine
} from "../parser.js";

import {
  parseTailControlLine
} from "../tail-events.js";

import type {
  ServerProfile
} from "../server-profile.js";

import {
  createSshHostKeyGuard,
  hostKeyMismatchError
} from "./ssh-host-key.js";

export type LiveCollectorState =
  | "connecting"
  | "connected"
  | "monitoring"
  | "reconnecting"
  | "stopped";

export interface LiveCollectorStatus {
  state: LiveCollectorState;
  attempt: number;
  retryInMs?: number;
  projectCount?: number;
  message?: string;
}

export interface LiveRequestEvent {
  sequence: number;
  receivedAt: string;

  domain: string;
  category: LogCategory;

  ip: string;
  timestamp: string;

  method: string;
  path: string;
  protocol: string;

  status: number;
  bytes: string;

  referer: string;
  userAgent: string;

  observedDelayMs:
    number | null;
}

export interface LiveRotationEvent {
  domain: string;

  state:
    | "unavailable"
    | "following";

  remotePath: string;
}

export interface LiveCollectorHooks {
  onStatus?:
    (
      status: LiveCollectorStatus
    ) => void;

  onRequest?:
    (
      event: LiveRequestEvent
    ) => void;

  onRotation?:
    (
      event: LiveRotationEvent
    ) => void;

  onRawLine?:
    (
      domain: string,
      line: string
    ) => void;
}

function shellQuote(
  value: string
): string {
  return `'${value.replace(
    /'/g,
    `'\\''`
  )}'`;
}

function buildTailCommand(
  logs: DiscoveredLog[]
): string {
  const paths =
    logs
      .map(
        log =>
          shellQuote(
            log.remotePath
          )
      )
      .join(" ");

  return (
    "tail --sleep-interval=0.2 " +
    "-n 0 -F --verbose " +
    paths
  );
}

async function connectClient(
  client: Client,
  config: ConnectConfig
): Promise<void> {
  await new Promise<void>(
    (
      resolve,
      reject
    ) => {
      const onReady =
        (): void => {
          client.off(
            "error",
            onError
          );

          resolve();
        };

      const onError =
        (
          error: Error
        ): void => {
          client.off(
            "ready",
            onReady
          );

          reject(error);
        };

      client.once(
        "ready",
        onReady
      );

      client.once(
        "error",
        onError
      );

      client.connect(
        config
      );
    }
  );
}

export class LiveCollector {
  private readonly profile:
    ServerProfile;

  private readonly passphrase:
    string | null;

  private readonly hooks:
    LiveCollectorHooks;

  private activeClient:
    Client | null = null;

  private stopping = false;
  private running = false;

  private retryTimer:
    ReturnType<
      typeof setTimeout
    > | null = null;

  private retryResolve:
    (() => void) | null =
      null;

  private sequence = 0;

  constructor(
    profile: ServerProfile,
    passphrase:
      string | null,
    hooks: LiveCollectorHooks = {}
  ) {
    this.profile =
      profile;

    this.passphrase =
      passphrase;

    this.hooks =
      hooks;
  }

  private monitoredDomains:
    Set<string> | null =
      null;

  setMonitoredDomains(
    domains:
      readonly string[] | null
  ): void {
    this.monitoredDomains =
      domains === null
        ? null
        : new Set(
            domains.map(
              domain =>
                domain
                  .trim()
                  .toLowerCase()
            )
          );
  }
  private emitStatus(
    status: LiveCollectorStatus
  ): void {
    this.hooks
      .onStatus?.(
        status
      );
  }

  private async wait(
    milliseconds: number
  ): Promise<void> {
    if (this.stopping) {
      return;
    }

    await new Promise<void>(
      resolve => {
        let settled =
          false;

        const finish =
          (): void => {
            if (settled) {
              return;
            }

            settled =
              true;

            if (
              this.retryTimer !==
              null
            ) {
              clearTimeout(
                this.retryTimer
              );

              this.retryTimer =
                null;
            }

            this.retryResolve =
              null;

            resolve();
          };

        this.retryResolve =
          finish;

        this.retryTimer =
          setTimeout(
            finish,
            milliseconds
          );
      }
    );
  }

  private async monitorLogs(
    client: Client,
    logs: DiscoveredLog[]
  ): Promise<void> {
    const domainByPath =
      new Map(
        logs.map(
          log => [
            log.remotePath,
            log.domain
          ]
        )
      );

    const command =
      buildTailCommand(
        logs
      );

    await new Promise<void>(
      (
        resolve,
        reject
      ) => {
        client.exec(
          command,
          (
            error,
            stream
          ) => {
            if (error) {
              reject(error);
              return;
            }

            let buffer = "";
            let stderrBuffer = "";

            let currentDomain:
              string | null =
                null;

            const handleTailMessage =
              (
                rawLine: string
              ): void => {
                const line =
                  rawLine.trim();

                if (line === "") {
                  return;
                }

                const event =
                  parseTailControlLine(
                    line
                  );

                if (!event) {
                  return;
                }

                const domain =
                  domainByPath.get(
                    event.remotePath
                  ) ??
                  event.remotePath;

                this.hooks
                  .onRotation?.({
                    domain,

                    state:
                      event.type ===
                      "LOG_UNAVAILABLE"
                        ? "unavailable"
                        : "following",

                    remotePath:
                      event.remotePath
                  });
              };

            stream.on(
              "data",
              (
                data: Buffer
              ) => {
                buffer +=
                  data.toString(
                    "utf8"
                  );

                const lines =
                  buffer.split(
                    /\r?\n/
                  );

                buffer =
                  lines.pop() ??
                  "";

                for (
                  const line
                  of lines
                ) {
                  if (
                    line.trim() ===
                    ""
                  ) {
                    continue;
                  }

                  const header =
                    line.match(
                      /^==> (.+) <==$/
                    );

                  if (header) {
                    currentDomain =
                      domainByPath.get(
                        header[1]
                      ) ??
                      header[1];

                    continue;
                  }

                  if (
                    !currentDomain
                  ) {
                    continue;
                  }

                  const entry =
                    parseAccessLogLine(
                      line
                    );

                  if (!entry) {
                    this.hooks
                      .onRawLine?.(
                        currentDomain,
                        line
                      );

                    continue;
                  }

                  this.sequence +=
                    1;

                  this.hooks
                    .onRequest?.({
                      sequence:
                        this.sequence,

                      receivedAt:
                        new Date()
                          .toISOString(),

                      domain:
                        currentDomain,

                      category:
                        classify(
                          entry
                        ),

                      ip:
                        entry.ip,

                      timestamp:
                        entry.timestamp,

                      method:
                        entry.method,

                      path:
                        entry.path,

                      protocol:
                        entry.protocol,

                      status:
                        entry.status,

                      bytes:
                        entry.bytes,

                      referer:
                        entry.referer,

                      userAgent:
                        entry.userAgent,

                      observedDelayMs:
                        calculateObservedDelayMs(
                          entry.timestamp
                        )
                    });
                }
              }
            );

            stream.stderr.on(
              "data",
              (
                data: Buffer
              ) => {
                stderrBuffer +=
                  data.toString(
                    "utf8"
                  );

                const lines =
                  stderrBuffer
                    .split(
                      /\r?\n/
                    );

                stderrBuffer =
                  lines.pop() ??
                  "";

                for (
                  const line
                  of lines
                ) {
                  handleTailMessage(
                    line
                  );
                }
              }
            );

            stream.once(
              "error",
              reject
            );

            stream.once(
              "close",
              () => {
                if (
                  stderrBuffer
                    .trim() !==
                  ""
                ) {
                  handleTailMessage(
                    stderrBuffer
                  );
                }

                resolve();
              }
            );
          }
        );
      }
    );
  }

  stop(): void {
    if (this.stopping) {
      return;
    }

    this.stopping =
      true;

    this.retryResolve?.();

    this.retryResolve =
      null;

    this.activeClient
      ?.end();

    this.activeClient =
      null;
  }

  async start(): Promise<void> {
    if (this.running) {
      return;
    }

    this.running =
      true;

    this.stopping =
      false;

    if (
      !this.profile.ssh
        .hostKeySha256
    ) {
      this.running =
        false;

      throw new Error(
        "Trusted SSH host key is required before live monitoring."
      );
    }

    let privateKey:
      Buffer;

    try {
      privateKey =
        await readFile(
          this.profile.ssh
            .privateKeyPath
        );
    } catch {
      this.running =
        false;

      throw new Error(
        `Cannot read private key: ${this.profile.ssh.privateKeyPath}`
      );
    }

    let retryAttempt =
      0;

    try {
      while (!this.stopping) {
        const client =
          new Client();

        this.activeClient =
          client;

        let lastClientError:
          Error | null =
            null;

        let connectedAt =
          0;

        client.on(
          "error",
          (
            error: Error
          ) => {
            lastClientError =
              error;
          }
        );

        try {
          this.emitStatus({
            state:
              retryAttempt === 0
                ? "connecting"
                : "reconnecting",

            attempt:
              retryAttempt
          });

          const hostKey =
            createSshHostKeyGuard(
              this.profile.ssh
                .hostKeySha256
            );

          const config:
            ConnectConfig = {
              host:
                this.profile.ssh
                  .host,

              port:
                this.profile.ssh
                  .port,

              username:
                this.profile.ssh
                  .username,

              privateKey,

              hostVerifier:
                hostKey.verifier,

              readyTimeout:
                15000,

              keepaliveInterval:
                10000,

              keepaliveCountMax:
                3
            };

          if (
            this.passphrase !==
              null &&
            this.passphrase !==
              ""
          ) {
            config.passphrase =
              this.passphrase;
          }

          try {
            await connectClient(
              client,
              config
            );
          } catch (
            error: unknown
          ) {
            const mismatch =
              hostKey
                .getMismatch();

            if (mismatch) {
              throw hostKeyMismatchError(
                mismatch
              );
            }

            throw error;
          }

          connectedAt =
            Date.now();

          const disconnected =
            new Promise<never>(
              (
                _resolve,
                reject
              ) => {
                client.once(
                  "close",
                  () => {
                    reject(
                      lastClientError ??
                        new Error(
                          "SSH connection closed."
                        )
                    );
                  }
                );
              }
            );

          this.emitStatus({
            state:
              "connected",

            attempt:
              retryAttempt
          });

          const discoveredLogs =
            await Promise.race([
              discoverLogs(
                client,

                this.profile
                  .logs
                  .directory,

                this.profile
                  .logs
                  .pattern,

                this.profile
                  .logs
                  .projectNameSuffix
              ),

              disconnected
            ]);

          const logs =
            this.monitoredDomains ===
              null
              ? discoveredLogs
              : discoveredLogs.filter(
                  log =>
                    this
                      .monitoredDomains
                      ?.has(
                        log.domain
                          .toLowerCase()
                      ) ??
                    false
                );

          if (
            logs.length ===
            0
          ) {
            throw new Error(
              "No matching remote logs were found."
            );
          }

          this.emitStatus({
            state:
              "monitoring",

            attempt:
              retryAttempt,

            projectCount:
              logs.length
          });

          await Promise.race([
            this.monitorLogs(
              client,
              logs
            ),

            disconnected
          ]);

          if (!this.stopping) {
            throw new Error(
              "Remote log stream closed."
            );
          }
        } catch (
          error: unknown
        ) {
          if (this.stopping) {
            break;
          }

          const connectedDuration =
            connectedAt > 0
              ? Date.now() -
                connectedAt
              : 0;

          if (
            connectedDuration >=
            15000
          ) {
            retryAttempt =
              0;
          }

          const delayMs =
            Math.min(
              30000,
              2000 *
                2 **
                  Math.min(
                    retryAttempt,
                    4
                  )
            );

          retryAttempt +=
            1;

          const message =
            error instanceof Error
              ? error.message
              : String(error);

          this.emitStatus({
            state:
              "reconnecting",

            attempt:
              retryAttempt,

            retryInMs:
              delayMs,

            message
          });

          await this.wait(
            delayMs
          );
        } finally {
          if (
            this.activeClient ===
            client
          ) {
            this.activeClient =
              null;
          }

          client.end();
        }
      }
    } finally {
      this.running =
        false;

      this.activeClient =
        null;

      this.emitStatus({
        state: "stopped",
        attempt: 0
      });
    }
  }
}