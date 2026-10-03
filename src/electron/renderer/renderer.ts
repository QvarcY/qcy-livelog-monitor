import {
  applyTranslations,
  translate,
  type Language
} from "./i18n.js";

import type {
  AppPreferences,
  AppTheme
} from "../window.js";

import {
  setupServerPanel
} from "./server-panel.js";

function requireElement<T extends HTMLElement>(
  id: string
): T {
  const element =
    document.getElementById(id);

  if (!element) {
    throw new Error(
      `Missing renderer element: ${id}`
    );
  }

  return element as T;
}

let focusMode = false;

function updateFocusControl(
  language: Language
): void {
  const button =
    requireElement<HTMLButtonElement>(
      "focus-toggle"
    );

  const label =
    requireElement<HTMLSpanElement>(
      "focus-toggle-label"
    );

  label.textContent =
    translate(
      language,
      focusMode
        ? "exitFocusMode"
        : "focusMode"
    );

  button.title =
    translate(
      language,
      "focusModeTitle"
    );

  button.setAttribute(
    "aria-pressed",
    String(focusMode)
  );
}

function setFocusMode(
  enabled: boolean,
  language: Language
): void {
  focusMode = enabled;

  document.body.classList.toggle(
    "is-focus-mode",
    enabled
  );

  updateFocusControl(
    language
  );
}

function updateAlwaysOnTopControl(
  preferences: AppPreferences
): void {
  const button =
    requireElement<HTMLButtonElement>(
      "always-on-top-toggle"
    );

  const label =
    requireElement<HTMLSpanElement>(
      "always-on-top-label"
    );

  label.textContent =
    translate(
      preferences.language,
      preferences.alwaysOnTop
        ? "alwaysOnTopActive"
        : "alwaysOnTop"
    );

  button.title =
    translate(
      preferences.language,
      "alwaysOnTopTitle"
    );

  button.classList.toggle(
    "is-active",
    preferences.alwaysOnTop
  );

  button.setAttribute(
    "aria-pressed",
    String(
      preferences.alwaysOnTop
    )
  );
}

function buildEmptyTimeline(): void {
  const timeline =
    requireElement<HTMLDivElement>(
      "timeline-bars"
    );

  const heights = [
    8, 10, 7, 12, 9, 8, 11, 7,
    9, 13, 8, 10, 7, 9, 8, 12,
    10, 7, 9, 11, 8, 7, 10, 9,
    8, 12, 7, 9, 10, 8, 11, 7,
    8, 10, 9, 7, 12, 8, 10, 7,
    9, 11, 8, 7, 10, 9, 8, 11
  ];

  for (const height of heights) {
    const bar =
      document.createElement("span");

    bar.className =
      "timeline-bar";

    bar.style.height =
      `${height}px`;

    timeline.append(bar);
  }
}

function applyPreferences(
  preferences: AppPreferences
): void {
  document.documentElement.dataset.theme =
    preferences.theme;

  applyTranslations(
    preferences.language
  );

  updatePreferenceControls(
    preferences
  );

  updateFocusControl(
    preferences.language
  );

  updateAlwaysOnTopControl(
    preferences
  );
}

function updatePreferenceControls(
  preferences: AppPreferences
): void {
  const languageButton =
    requireElement<HTMLButtonElement>(
      "language-toggle"
    );

  const themeButton =
    requireElement<HTMLButtonElement>(
      "theme-toggle"
    );

  languageButton.textContent =
    preferences.language.toUpperCase();

  languageButton.title =
    translate(
      preferences.language,
      "switchLanguage"
    );

  themeButton.textContent =
    translate(
      preferences.language,
      preferences.theme
    );

  themeButton.title =
    translate(
      preferences.language,
      "switchTheme"
    );
}

function setShellStatus(
  language: Language,
  state:
    | "ready"
    | "error"
): void {
  const status =
    requireElement<HTMLDivElement>(
      "shell-status"
    );

  status.classList.remove(
    "is-ready",
    "is-error"
  );

  const label =
    state === "ready"
      ? translate(
          language,
          "shellReady"
        )
      : translate(
          language,
          "bridgeError"
        );

  status.innerHTML =
    [
      '<span class="connection-dot"></span>',
      `<span>${label}</span>`
    ].join("");

  status.classList.add(
    state === "ready"
      ? "is-ready"
      : "is-error"
  );
}

function setStartupProjectMessage(
  message: string
): void {
  const empty =
    document.querySelector<HTMLElement>(
      "#project-list .project-empty"
    );

  if (empty) {
    empty.textContent =
      message;
  }
}

function renderStartupProjects(
  logs: Array<{
    domain: string;
    fileName: string;
  }>
): void {
  const list =
    requireElement<HTMLDivElement>(
      "project-list"
    );

  const count =
    requireElement<HTMLSpanElement>(
      "project-count"
    );

  for (
    const row of Array.from(
      list.querySelectorAll(
        '.project-row[data-project-id]'
      )
    )
  ) {
    row.remove();
  }

  list.querySelector(
    ".project-empty"
  )?.remove();

  count.textContent =
    String(
      logs.length
    );

  const allProjects =
    list.querySelector(
      ".project-row"
    );

  const allValue =
    allProjects?.querySelector<HTMLElement>(
      ".project-value"
    );

  if (allValue) {
    allValue.textContent =
      String(
        logs.length
      );
  }

  for (const log of logs) {
    const row =
      document.createElement(
        "button"
      );

    row.type =
      "button";

    row.className =
      "project-row";

    row.dataset.projectId =
      log.domain;

    const state =
      document.createElement(
        "span"
      );

    state.className =
      "project-state";

    const main =
      document.createElement(
        "span"
      );

    main.className =
      "project-main";

    const name =
      document.createElement(
        "strong"
      );

    name.textContent =
      log.domain;

    const source =
      document.createElement(
        "small"
      );

    source.textContent =
      log.fileName;

    main.append(
      name,
      source
    );

    const value =
      document.createElement(
        "span"
      );

    value.className =
      "project-value";

    value.textContent =
      "—";

    row.append(
      state,
      main,
      value
    );

    list.append(
      row
    );
  }
}

async function boot(): Promise<void> {
  buildEmptyTimeline();

  const version =
    requireElement<HTMLSpanElement>(
      "app-version"
    );

  const platform =
    requireElement<HTMLSpanElement>(
      "runtime-platform"
    );

  const authorLink =
    requireElement<HTMLButtonElement>(
      "author-link"
    );

  const supportLink =
    requireElement<HTMLButtonElement>(
      "support-link"
    );

  const languageButton =
    requireElement<HTMLButtonElement>(
      "language-toggle"
    );

  const themeButton =
    requireElement<HTMLButtonElement>(
      "theme-toggle"
    );

  const focusButton =
    requireElement<HTMLButtonElement>(
      "focus-toggle"
    );

  const alwaysOnTopButton =
    requireElement<HTMLButtonElement>(
      "always-on-top-toggle"
    );

  let preferences =
    await window.qcyLiveLog
      .getPreferences();

  const appliedAlwaysOnTop =
    await window.qcyLiveLog
      .setAlwaysOnTop(
        preferences.alwaysOnTop
      );

  if (
    appliedAlwaysOnTop !==
    preferences.alwaysOnTop
  ) {
    preferences =
      await window.qcyLiveLog
        .updatePreferences({
          alwaysOnTop:
            appliedAlwaysOnTop
        });
  }

  applyPreferences(
    preferences
  );

  const serverPanel =
    await setupServerPanel(
      () =>
        preferences.language
    );

  void window.qcyLiveLog
    .bootstrapStartup()
    .then(
      startup => {
        if (
          startup.status ===
          "ready"
        ) {
          renderStartupProjects(
            startup.logs
          );

          return;
        }

        if (
          startup.status ===
          "passphrase-required"
        ) {
          setStartupProjectMessage(
            translate(
              preferences.language,
              "startupPassphraseRequired"
            )
          );

          return;
        }

        if (
          startup.status ===
          "profile-missing"
        ) {
          setStartupProjectMessage(
            translate(
              preferences.language,
              "startupProfileMissing"
            )
          );

          return;
        }

        if (
          startup.status ===
          "host-key-trust-required"
        ) {
          setStartupProjectMessage(
            translate(
              preferences.language,
              "startupHostKeyRequired"
            )
          );
        }
      }
    )
    .catch(
      (error: unknown) => {
        console.error(
          "Automatic SSH startup failed:",
          error
        );
      }
    );

  authorLink.addEventListener(
    "click",
    () => {
      void window.qcyLiveLog
        .openBrandLink(
          "github"
        );
    }
  );

  supportLink.addEventListener(
    "click",
    () => {
      void window.qcyLiveLog
        .openBrandLink(
          "support"
        );
    }
  );

  languageButton.addEventListener(
    "click",
    async () => {
      const language =
        preferences.language === "en"
          ? "lv"
          : "en";

      preferences =
        await window.qcyLiveLog
          .updatePreferences({
            language
          });

      applyPreferences(
        preferences
      );

      await serverPanel
        .refreshLanguage();

      setShellStatus(
        preferences.language,
        "ready"
      );
    }
  );

  themeButton.addEventListener(
    "click",
    async () => {
      const theme: AppTheme =
        preferences.theme === "dark"
          ? "light"
          : "dark";

      preferences =
        await window.qcyLiveLog
          .updatePreferences({
            theme
          });

      applyPreferences(
        preferences
      );
    }
  );

  alwaysOnTopButton.addEventListener(
    "click",
    async () => {
      const requested =
        !preferences.alwaysOnTop;

      const actual =
        await window.qcyLiveLog
          .setAlwaysOnTop(
            requested
          );

      preferences =
        await window.qcyLiveLog
          .updatePreferences({
            alwaysOnTop: actual
          });

      applyPreferences(
        preferences
      );
    }
  );

  focusButton.addEventListener(
    "click",
    () => {
      setFocusMode(
        !focusMode,
        preferences.language
      );
    }
  );

  window.addEventListener(
    "keydown",
    (
      event: KeyboardEvent
    ) => {
      if (
        event.ctrlKey &&
        event.shiftKey &&
        event.key.toLowerCase() === "l"
      ) {
        event.preventDefault();

        setFocusMode(
          !focusMode,
          preferences.language
        );

        return;
      }

      if (
        event.key === "Escape" &&
        focusMode
      ) {
        setFocusMode(
          false,
          preferences.language
        );
      }
    }
  );

  try {
    const info =
      await window.qcyLiveLog
        .getAppInfo();

    version.textContent =
      `v${info.version}`;

    platform.textContent =
      info.platform;

    setShellStatus(
      preferences.language,
      "ready"
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    setShellStatus(
      preferences.language,
      "error"
    );

    platform.textContent =
      message;
  }
}

void boot();