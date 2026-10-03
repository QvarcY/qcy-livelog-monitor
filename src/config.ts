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
    host: process.env.AREA_SSH_HOST ?? "server50.areait.lv",
    port: Number(process.env.AREA_SSH_PORT ?? "22"),
    username: process.env.AREA_SSH_USER ?? "kasidlv",
    privateKeyPath:
      process.env.AREA_SSH_KEY ??
      path.join(os.homedir(), ".ssh", "area_logviewer_ed25519"),
    remoteLogPath:
      process.env.AREA_REMOTE_LOG ??
      "/usr/local/apache/domlogs/kasidlv/rekini.craftin.lv-ssl_log"
  };
}