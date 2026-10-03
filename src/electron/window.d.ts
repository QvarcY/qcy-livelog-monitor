import type {
  ServerProfile,
  ServerProfileInput,
  SshConnectionProfileInput
} from "../server-profile.js";

import type {
  SshConnectionTestResult
} from "./ssh-test.js";

import type {
  LogDiscoveryRequest
} from "./log-discovery.js";

import type {
  DiscoveredLog
} from "../discovery.js";

import type {
  StartupBootstrapResult
} from "./startup.js";

export interface AppInfo {
  name: string;
  author: string;
  authorLabel: string;
  githubUrl: string;
  supportLabel: string;
  supportUrl: string;
  version: string;
  platform: string;
}

export type BrandLinkKind =
  | "github"
  | "support";

export type AppLanguage =
  | "en"
  | "lv";

export type AppTheme =
  | "dark"
  | "light";

export interface AppPreferences {
  language: AppLanguage;
  theme: AppTheme;
  alwaysOnTop: boolean;

  defaultServerProfileId:
    string | null;

  autoConnect: boolean;
  launchAtLogin: boolean;
}

export interface AppPreferencesPatch {
  language?: AppLanguage;
  theme?: AppTheme;
  alwaysOnTop?: boolean;

  defaultServerProfileId?:
    string | null;

  autoConnect?: boolean;
  launchAtLogin?: boolean;
}

export type LiveLogCategory =
  | "GREETING"
  | "WP_PROBE"
  | "WP_TRAFFIC"
  | "SECURITY_PROBE"
  | "BOT"
  | "SERVER_ERROR"
  | "NOT_FOUND"
  | "VISITOR";

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
  category: LiveLogCategory;
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

export interface LiveCollectorSnapshot {
  status:
    LiveCollectorStatus | null;

  requests:
    LiveRequestEvent[];

  rotations:
    LiveRotationEvent[];
}

export type LiveEventUnsubscribe =
  () => void;

export interface QcYLiveLogApi {
  getAppInfo(): Promise<AppInfo>;

  openBrandLink(
    kind: BrandLinkKind
  ): Promise<boolean>;

  getPreferences():
    Promise<AppPreferences>;

  updatePreferences(
    patch: AppPreferencesPatch
  ): Promise<AppPreferences>;

  setAlwaysOnTop(
    enabled: boolean
  ): Promise<boolean>;

  updateStartupPreferences(
    patch: AppPreferencesPatch
  ): Promise<AppPreferences>;

  bootstrapStartup():
    Promise<StartupBootstrapResult>;

  rememberPassphrase(
    profileId: string,
    passphrase: string
  ): Promise<boolean>;

  forgetPassphrase(
    profileId: string
  ): Promise<boolean>;

  hasRememberedPassphrase(
    profileId: string
  ): Promise<boolean>;

  listServerProfiles():
    Promise<ServerProfile[]>;

  saveServerProfile(
    profile: ServerProfileInput
  ): Promise<ServerProfile[]>;

  deleteServerProfile(
    profileId: string
  ): Promise<ServerProfile[]>;

  selectPrivateKey():
    Promise<string | null>;

  testSshConnection(
    ssh: SshConnectionProfileInput,
    passphrase?: string
  ): Promise<SshConnectionTestResult>;

  discoverLogs(
    request: LogDiscoveryRequest,
    passphrase?: string
  ): Promise<DiscoveredLog[]>;

  getLiveSnapshot():
    Promise<LiveCollectorSnapshot>;

  onCollectorStatus(
    callback:
      (
        status:
          LiveCollectorStatus
      ) => void
  ): LiveEventUnsubscribe;

  onLiveRequest(
    callback:
      (
        event:
          LiveRequestEvent
      ) => void
  ): LiveEventUnsubscribe;

  onLogRotation(
    callback:
      (
        event:
          LiveRotationEvent
      ) => void
  ): LiveEventUnsubscribe;
}

declare global {
  interface Window {
    qcyLiveLog: QcYLiveLogApi;
  }
}

export {};