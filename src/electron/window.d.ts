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
}

declare global {
  interface Window {
    qcyLiveLog: QcYLiveLogApi;
  }
}

export {};