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
}

export interface AppPreferencesPatch {
  language?: AppLanguage;
  theme?: AppTheme;
  alwaysOnTop?: boolean;
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
}

declare global {
  interface Window {
    qcyLiveLog: QcYLiveLogApi;
  }
}

export {};