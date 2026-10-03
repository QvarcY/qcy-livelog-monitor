export type Language =
  | "en"
  | "lv";

const en = {
  live: "Live",
  history: "History",
  projects: "Projects",
  allProjects: "All projects",
  liveStream: "live stream",
  projectsAfterConnection:
    "Projects will appear after SSH connection.",

  area: "Servers",
  activity: "Activity",
  requestVolume: "request volume",
  liveRange: "live · last 60s",
  waitingStream: "Waiting for live stream",

  searchPlaceholder:
    "Search path, IP, project or user agent",

  filterProject: "Project",
  filterType: "Type",
  filterStatus: "Status",
  pause: "Pause",

  liveRequests: "Live requests",
  eventsZero: "0 events",
  newestFirst: "newest first",
  focusMode: "Focus",
  exitFocusMode: "Exit focus",
  focusModeTitle:
    "Show only live requests (Ctrl+Shift+L)",

  alwaysOnTop: "On top",
  alwaysOnTopActive: "Pinned",
  alwaysOnTopTitle:
    "Keep this window above other windows",

  columnTime: "Time",
  columnRequest: "Project / request",
  columnType: "Type",
  columnStatus: "Status",
  columnDelay: "Delay",

  noRequests: "No requests yet",
  noRequestsHelp:
    "Connect the collector and incoming access-log entries will appear here in real time.",

  eventDetails: "Event details",
  inspectRequest: "inspect request",
  selectRequest: "Select a request",
  selectRequestHelp:
    "Request metadata, IP, user agent, referrer and raw access-log data will appear here.",

  connection: "Connection",
  transport: "Transport",
  collector: "Collector",
  offline: "offline",

  collectorOffline: "collector offline",
  secureRenderer: "secure renderer",

  starting: "Starting",
  shellReady: "Shell ready",
  bridgeError: "Bridge error",

  dark: "Dark",
  light: "Light",
  switchLanguage: "Switch language",
  switchTheme: "Switch theme",

  servers: "Servers",
  addServer: "Add server",
  editServer: "Edit server",
  newServer: "New server",
  saveChanges: "Save changes",
  serverProfiles: "Server profiles",
  noServerProfiles: "No servers configured yet.",

  serverProfileName: "Profile name",
  serverProfileNamePlaceholder: "Production server",

  sshConnection: "SSH connection",
  sshHost: "Host",
  sshPort: "Port",
  sshUsername: "Username",
  sshPrivateKey: "Private key",
  browse: "Browse",
  sshPassphrase: "Key passphrase",
  sshPassphraseNote:
    "Used only for this session and never saved.",

  logSource: "Log source",
  logDirectory: "Log directory",
  logPattern: "File pattern",
  parser: "Parser",
  parserAuto: "Auto detect",
  parserApacheCombined: "Apache Combined",
  projectSuffix: "Project suffix",
  projectSuffixHelp:
    "Optional suffix removed from discovered log filenames.",

  testConnection: "Test connection",
  testingConnection: "Testing SSH connection…",
  connectionSuccess: "SSH connection successful:",
  connectionFailed: "SSH connection failed",

  discoverLogs: "Discover logs",
  discoveringLogs: "Discovering log files…",
  discoveredLogs: "Discovered logs",
  logsFound: "log files found",
  noLogsFound: "No matching log files were found.",
  discoverFailed: "Log discovery failed",
  testBeforeDiscover:
    "Test the SSH connection before discovering logs.",

  saveServer: "Save server",
  savingServer: "Saving server…",
  serverSaved: "Server profile saved.",
  deleteServer: "Delete",
  deleteServerConfirm: "Delete this server profile?",
  serverDeleted: "Server profile deleted.",
  testBeforeSave:
    "Test the SSH connection before saving.",

  cancel: "Cancel",
  close: "Close"
} as const;

export type TranslationKey =
  keyof typeof en;

const lv: Record<
  TranslationKey,
  string
> = {
  live: "Tiešraide",
  history: "Vēsture",
  projects: "Projekti",
  allProjects: "Visi projekti",
  liveStream: "tiešraides plūsma",
  projectsAfterConnection:
    "Projekti parādīsies pēc SSH savienojuma.",

  area: "Serveri",
  activity: "Aktivitāte",
  requestVolume: "pieprasījumu apjoms",
  liveRange: "tiešraide · pēdējās 60s",
  waitingStream: "Gaida tiešraides plūsmu",

  searchPlaceholder:
    "Meklēt ceļu, IP, projektu vai User-Agent",

  filterProject: "Projekts",
  filterType: "Tips",
  filterStatus: "Statuss",
  pause: "Pauze",

  liveRequests: "Tiešie pieprasījumi",
  eventsZero: "0 notikumi",
  newestFirst: "jaunākie vispirms",
  focusMode: "Fokuss",
  exitFocusMode: "Iziet no fokusa",
  focusModeTitle:
    "Rādīt tikai tiešos pieprasījumus (Ctrl+Shift+L)",

  alwaysOnTop: "Virspusē",
  alwaysOnTopActive: "Piesprausts",
  alwaysOnTopTitle:
    "Turēt šo logu virs citiem logiem",

  columnTime: "Laiks",
  columnRequest: "Projekts / pieprasījums",
  columnType: "Tips",
  columnStatus: "Statuss",
  columnDelay: "Aizture",

  noRequests: "Pieprasījumu vēl nav",
  noRequestsHelp:
    "Pieslēdziet kolektoru, un ienākošie access log ieraksti šeit parādīsies reāllaikā.",

  eventDetails: "Notikuma detaļas",
  inspectRequest: "apskatīt pieprasījumu",
  selectRequest: "Izvēlieties pieprasījumu",
  selectRequestHelp:
    "Šeit būs redzami pieprasījuma metadati, IP, User-Agent, referrer un sākotnējais access log ieraksts.",

  connection: "Savienojums",
  transport: "Transports",
  collector: "Kolektors",
  offline: "bezsaistē",

  collectorOffline: "kolektors bezsaistē",
  secureRenderer: "drošs rendereris",

  starting: "Startējas",
  shellReady: "Saskarne gatava",
  bridgeError: "Savienojuma kļūda",

  dark: "Tumšs",
  light: "Gaišs",
  switchLanguage: "Mainīt valodu",
  switchTheme: "Mainīt tēmu",

  servers: "Serveri",
  addServer: "Pievienot serveri",
  editServer: "Rediģēt serveri",
  newServer: "Jauns serveris",
  saveChanges: "Saglabāt izmaiņas",
  serverProfiles: "Serveru profili",
  noServerProfiles: "Neviens serveris vēl nav konfigurēts.",

  serverProfileName: "Profila nosaukums",
  serverProfileNamePlaceholder: "Produkcijas serveris",

  sshConnection: "SSH savienojums",
  sshHost: "Hosts",
  sshPort: "Ports",
  sshUsername: "Lietotājvārds",
  sshPrivateKey: "Privātā atslēga",
  browse: "Izvēlēties",
  sshPassphrase: "Atslēgas passphrase",
  sshPassphraseNote:
    "Izmanto tikai šajā sesijā un nekad nesaglabā.",

  logSource: "Logu avots",
  logDirectory: "Logu direktorija",
  logPattern: "Failu šablons",
  parser: "Parseris",
  parserAuto: "Noteikt automātiski",
  parserApacheCombined: "Apache Combined",
  projectSuffix: "Projekta sufikss",
  projectSuffixHelp:
    "Neobligāts sufikss, ko noņem no atrasto logu failu nosaukumiem.",

  testConnection: "Pārbaudīt savienojumu",
  testingConnection: "Pārbauda SSH savienojumu…",
  connectionSuccess: "SSH savienojums veiksmīgs:",
  connectionFailed: "SSH savienojums neizdevās",

  discoverLogs: "Atklāt logus",
  discoveringLogs: "Meklē logu failus…",
  discoveredLogs: "Atrasti logi",
  logsFound: "logu faili atrasti",
  noLogsFound: "Neviens atbilstošs logu fails netika atrasts.",
  discoverFailed: "Logu atklāšana neizdevās",
  testBeforeDiscover:
    "Pirms logu atklāšanas pārbaudi SSH savienojumu.",

  saveServer: "Saglabāt serveri",
  savingServer: "Saglabā serveri…",
  serverSaved: "Servera profils saglabāts.",
  deleteServer: "Dzēst",
  deleteServerConfirm: "Dzēst šo servera profilu?",
  serverDeleted: "Servera profils izdzēsts.",
  testBeforeSave:
    "Pirms saglabāšanas pārbaudi SSH savienojumu.",

  cancel: "Atcelt",
  close: "Aizvērt"
};

const translations: Record<
  Language,
  Record<TranslationKey, string>
> = {
  en,
  lv
};

export function translate(
  language: Language,
  key: TranslationKey
): string {
  return translations[language][key];
}

export function applyTranslations(
  language: Language
): void {
  document.documentElement.lang =
    language;

  const textElements =
    document.querySelectorAll<HTMLElement>(
      "[data-i18n]"
    );

  for (const element of textElements) {
    const key =
      element.dataset.i18n as
        | TranslationKey
        | undefined;

    if (!key) {
      continue;
    }

    element.textContent =
      translate(
        language,
        key
      );
  }

  const placeholders =
    document.querySelectorAll<HTMLInputElement>(
      "[data-i18n-placeholder]"
    );

  for (const input of placeholders) {
    const key =
      input.dataset
        .i18nPlaceholder as
        | TranslationKey
        | undefined;

    if (!key) {
      continue;
    }

    input.placeholder =
      translate(
        language,
        key
      );
  }
}