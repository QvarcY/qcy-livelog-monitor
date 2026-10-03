import fs from "node:fs";
import {
  Client,
  type ConnectConfig
} from "ssh2";
import { password } from "@inquirer/prompts";

import { getConfig } from "./config.js";
import {
  discoverLogs,
  getRemoteLogDir,
  type DiscoveredLog
} from "./discovery.js";
import { parseAccessLogLine } from "./parser.js";
import {
  classify,
  type LogCategory
} from "./classifier.js";

const RESET = "\x1b[0m";

const COLORS: Record<LogCategory, string> = {
  GREETING: "\x1b[95m",
  WP_PROBE: "\x1b[93m",
  WP_TRAFFIC: "\x1b[94m",
  SECURITY_PROBE: "\x1b[91m",
  BOT: "\x1b[96m",
  SERVER_ERROR: "\x1b[91m",
  NOT_FOUND: "\x1b[90m",
  VISITOR: "\x1b[92m"
};

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

async function connectClient(
  client: Client,
  options: ConnectConfig
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const onReady = () => {
      client.off("error", onError);
      resolve();
    };

    const onError = (error: Error) => {
      client.off("ready", onReady);
      reject(error);
    };

    client.once("ready", onReady);
    client.once("error", onError);
    client.connect(options);
  });
}

function printEntry(
  domain: string,
  line: string
): void {
  const entry = parseAccessLogLine(line);
  const domainLabel = domain.padEnd(28);

  if (!entry) {
    console.log(
      `[${domainLabel}] [RAW           ] ${line}`
    );
    return;
  }

  const category = classify(entry);
  const color = COLORS[category];

  console.log(
    `[${domainLabel}] ` +
      `${color}[${category.padEnd(14)}]${RESET} ` +
      `${entry.status} ` +
      `${entry.method.padEnd(6)} ` +
      `${entry.path} ` +
      `(${entry.ip})`
  );

  if (category === "GREETING") {
    console.log(
      `${" ".repeat(31)}` +
        `${color}↳ ${entry.userAgent}${RESET}`
    );
  }
}

function buildTailCommand(
  logs: DiscoveredLog[]
): string {
  const paths = logs
    .map((log) => shellQuote(log.remotePath))
    .join(" ");

  return (
    "tail --sleep-interval=0.2 " +
    "-n 0 -F --verbose " +
    paths
  );
}

async function monitorLogs(
  client: Client,
  logs: DiscoveredLog[]
): Promise<void> {
  const domainByPath = new Map(
    logs.map((log) => [
      log.remotePath,
      log.domain
    ])
  );

  const command = buildTailCommand(logs);

  await new Promise<void>((resolve, reject) => {
    client.exec(command, (error, stream) => {
      if (error) {
        reject(error);
        return;
      }

      let buffer = "";
      let currentDomain: string | null = null;

      stream.on("data", (data: Buffer) => {
        buffer += data.toString("utf8");

        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.trim() === "") {
            continue;
          }

          const header = line.match(
            /^==> (.+) <==$/
          );

          if (header) {
            currentDomain =
              domainByPath.get(header[1]) ??
              header[1];

            continue;
          }

          if (!currentDomain) {
            console.log(
              `[UNKNOWN                     ] ${line}`
            );
            continue;
          }

          printEntry(
            currentDomain,
            line
          );
        }
      });

      stream.stderr.on(
        "data",
        (data: Buffer) => {
          const message = data
            .toString("utf8")
            .trim();

          if (message !== "") {
            console.error(`[TAIL] ${message}`);
          }
        }
      );

      stream.on("close", () => {
        resolve();
      });
    });
  });
}

async function main(): Promise<void> {
  const config = getConfig();
  const remoteLogDir = getRemoteLogDir();

  if (!fs.existsSync(config.privateKeyPath)) {
    throw new Error(
      `SSH private key nav atrasta: ${config.privateKeyPath}`
    );
  }

  console.log("");
  console.log("AREA Live Logs — multi-project");
  console.log("==============================");
  console.log(`Host: ${config.host}:${config.port}`);
  console.log(`User: ${config.username}`);
  console.log(`Logs: ${remoteLogDir}`);
  console.log("");

  const passphrase = await password({
    message: "SSH key passphrase:",
    mask: "*"
  });

  const client = new Client();

  await connectClient(client, {
    host: config.host,
    port: config.port,
    username: config.username,
    privateKey: fs.readFileSync(config.privateKeyPath),
    passphrase,
    readyTimeout: 15000,
    keepaliveInterval: 10000,
    keepaliveCountMax: 3
  });

  console.log("");
  console.log("SSH connected");
  console.log("Discovering HTTPS logs...");

  const logs = await discoverLogs(
    client,
    remoteLogDir
  );

  if (logs.length === 0) {
    client.end();
    throw new Error(
      "Netika atrasts neviens HTTPS logs."
    );
  }

  console.log("");
  console.log(
    `Monitoring ${logs.length} projects:`
  );

  for (const log of logs) {
    console.log(`  - ${log.domain}`);
  }

  console.log("");
  console.log("Waiting for new log entries...");
  console.log("Ctrl+C to stop");
  console.log("");

  process.once("SIGINT", () => {
    console.log("");
    console.log("Stopping multi-project monitor...");
    client.end();
    process.exit(0);
  });

  try {
    await monitorLogs(client, logs);
  } finally {
    client.end();
  }
}

main().catch((error: unknown) => {
  console.error("");
  console.error(
    error instanceof Error
      ? error.message
      : String(error)
  );
  process.exit(1);
});