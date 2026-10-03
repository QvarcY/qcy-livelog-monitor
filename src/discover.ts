import fs from "node:fs";
import { Client } from "ssh2";
import { password } from "@inquirer/prompts";

import { getConfig } from "./config.js";

interface DiscoveredLog {
  domain: string;
  fileName: string;
  remotePath: string;
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

async function discoverLogs(): Promise<DiscoveredLog[]> {
  const config = getConfig();

  const remoteLogDir =
    process.env.AREA_REMOTE_LOG_DIR ??
    "/usr/local/apache/domlogs/kasidlv";

  if (!fs.existsSync(config.privateKeyPath)) {
    throw new Error(
      `SSH private key nav atrasta: ${config.privateKeyPath}`
    );
  }

  const passphrase = await password({
    message: "SSH key passphrase:",
    mask: "*"
  });

  const privateKey = fs.readFileSync(config.privateKeyPath);

  return await new Promise<DiscoveredLog[]>((resolve, reject) => {
    const client = new Client();

    client.on("ready", () => {
      const command =
        `find ${shellQuote(remoteLogDir)} ` +
        "-maxdepth 1 -type f -name '*-ssl_log' " +
        "-printf '%f\\n' | sort";

      client.exec(command, (error, stream) => {
        if (error) {
          client.end();
          reject(error);
          return;
        }

        let stdout = "";
        let stderr = "";

        stream.on("data", (data: Buffer) => {
          stdout += data.toString("utf8");
        });

        stream.stderr.on("data", (data: Buffer) => {
          stderr += data.toString("utf8");
        });

        stream.on("close", (code: number | null) => {
          client.end();

          if (code !== 0) {
            reject(
              new Error(
                stderr.trim() ||
                  `Remote discovery command failed with code ${code}`
              )
            );
            return;
          }

          const fileNames = stdout
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);

          const logs = fileNames.map((fileName) => ({
            domain: fileName.replace(/-ssl_log$/, ""),
            fileName,
            remotePath: `${remoteLogDir}/${fileName}`
          }));

          resolve(logs);
        });
      });
    });

    client.on("error", reject);

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
  });
}

async function main(): Promise<void> {
  console.log("");
  console.log("AREA Live Logs — discovery");
  console.log("==========================");
  console.log("");

  const logs = await discoverLogs();

  console.log(`Atrasti HTTPS logi: ${logs.length}`);
  console.log("");

  for (const log of logs) {
    console.log(`- ${log.domain}`);
    console.log(`  ${log.remotePath}`);
  }

  console.log("");

  if (logs.length === 0) {
    throw new Error("Netika atrasts neviens *-ssl_log fails.");
  }
}

main().catch((error: unknown) => {
  console.error("");
  console.error(
    error instanceof Error ? error.message : String(error)
  );
  process.exit(1);
});