import type { Client } from "ssh2";

export interface DiscoveredLog {
  domain: string;
  fileName: string;
  remotePath: string;
}

export function getRemoteLogDir(): string {
  return (
    process.env.AREA_REMOTE_LOG_DIR ??
    "/usr/local/apache/domlogs/kasidlv"
  );
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export async function discoverLogs(
  client: Client,
  remoteLogDir = getRemoteLogDir()
): Promise<DiscoveredLog[]> {
  return await new Promise<DiscoveredLog[]>((resolve, reject) => {
    const command =
      `find ${shellQuote(remoteLogDir)} ` +
      "-maxdepth 1 -type f -name '*-ssl_log' " +
      "-printf '%f\\n' | sort";

    client.exec(command, (error, stream) => {
      if (error) {
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

        resolve(
          fileNames.map((fileName) => ({
            domain: fileName.replace(/-ssl_log$/, ""),
            fileName,
            remotePath: `${remoteLogDir}/${fileName}`
          }))
        );
      });
    });
  });
}