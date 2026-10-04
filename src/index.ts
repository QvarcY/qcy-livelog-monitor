import fs from "node:fs";
import { Client } from "ssh2";
import { password } from "@inquirer/prompts";

import { getConfig } from "./config.js";
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

function printEntry(line: string): void {
  const entry = parseAccessLogLine(line);

  if (!entry) {
    console.log(`[RAW] ${line}`);
    return;
  }

  const category = classify(entry);
  const color = COLORS[category];

  console.log(
    `${color}[${category.padEnd(14)}]${RESET} ` +
      `${entry.status} ` +
      `${entry.method.padEnd(6)} ` +
      `${entry.path} ` +
      `(${entry.ip})`
  );

  if (category === "GREETING") {
    console.log(
      `${color}  ↳ ${entry.userAgent}${RESET}`
    );
  }
}

async function main(): Promise<void> {
  const config = getConfig();

  if (!fs.existsSync(config.privateKeyPath)) {
    throw new Error(
      `SSH private key nav atrasta: ${config.privateKeyPath}`
    );
  }

  console.log("");
  console.log("QcY LiveLog Monitor");
  console.log("==============");
  console.log(`Host: ${config.host}:${config.port}`);
  console.log(`User: ${config.username}`);
  console.log(`Log:  ${config.remoteLogPath}`);
  console.log("");

  const passphrase = await password({
    message: "SSH key passphrase:",
    mask: "*"
  });

  const privateKey = fs.readFileSync(
    config.privateKeyPath
  );

  const client = new Client();

  client.on("ready", () => {
    console.log("");
    console.log("SSH connected");
    console.log("Waiting for new log entries...");
    console.log("Ctrl+C to stop");
    console.log("");

    const command =
      "tail --sleep-interval=0.2 -n 0 -F " +
      shellQuote(config.remoteLogPath);

    client.exec(command, (error, stream) => {
      if (error) {
        console.error(
          "Neizdevās palaist remote tail:",
          error.message
        );

        client.end();
        process.exitCode = 1;
        return;
      }

      let buffer = "";

      stream.on("data", (data: Buffer) => {
        buffer += data.toString("utf8");

        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.trim() !== "") {
            printEntry(line);
          }
        }
      });

      stream.stderr.on(
        "data",
        (data: Buffer) => {
          process.stderr.write(data);
        }
      );

      stream.on("close", () => {
        console.log("");
        console.log("Remote log stream closed.");
        client.end();
      });
    });
  });

  client.on("error", (error) => {
    console.error("");
    console.error(
      "SSH error:",
      error.message
    );

    process.exitCode = 1;
  });

  client.connect({
    host: config.host,
    port: config.port,
    username: config.username,
    privateKey,
    passphrase,
    readyTimeout: 15000,
    keepaliveInterval: 10000,
    keepaliveCountMax: 3
  });

  process.on("SIGINT", () => {
    console.log("");
    console.log("Stopping...");
    client.end();
    process.exit(0);
  });
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