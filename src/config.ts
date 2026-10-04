import os from "node:os";
import path from "node:path";

export interface AppConfig {
  host: string;
  port: number;
  username: string;
  privateKeyPath: string;
  remoteLogPath: string;
}

export function getConfig(): AppConfig {
  return {
    host: process.env.QCY_SSH_HOST ?? "example.com",
    port: Number(process.env.QCY_SSH_PORT ?? "22"),
    username: process.env.QCY_SSH_USER ?? "user",
    privateKeyPath:
      process.env.QCY_SSH_KEY ??
      path.join(os.homedir(), ".ssh", "id_ed25519"),
    remoteLogPath:
      process.env.QCY_REMOTE_LOG ??
      "/var/log/nginx/access.log"
  };
}