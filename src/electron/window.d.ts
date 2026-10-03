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

export interface AreaLiveLogsApi {
  getAppInfo(): Promise<AppInfo>;

  openBrandLink(
    kind: BrandLinkKind
  ): Promise<boolean>;
}

declare global {
  interface Window {
    areaLiveLogs: AreaLiveLogsApi;
  }
}

export {};