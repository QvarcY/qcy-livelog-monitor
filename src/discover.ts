import fs from "node:fs";
import {
  Client,
  type ConnectConfig
} from "ssh2";
import { password } from "@inquirer/prompts";

import { getConfig } from "./config.js";
import {
  discoverLogs,
  getRemoteLogDir
} from "./discovery.js";

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

async function main(): Promise<void> {
  const config = getConfig();

  if (!fs.existsSync(config.privateKeyPath)) {
    throw new Error(
      `SSH private key nav atrasta: ${config.privateKeyPath}`
    );
  }

  console.log("");
  console.log("AREA Live Logs — discovery");
  console.log("==========================");
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

  try {
    const logs = await discoverLogs(
      client,
      getRemoteLogDir()
    );

    console.log(`Atrasti HTTPS logi: ${logs.length}`);
    console.log("");

    for (const log of logs) {
      console.log(`- ${log.domain}`);
      console.log(`  ${log.remotePath}`);
    }

    console.log("");

    if (logs.length === 0) {
      throw new Error(
        "Netika atrasts neviens *-ssl_log fails."
      );
    }
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