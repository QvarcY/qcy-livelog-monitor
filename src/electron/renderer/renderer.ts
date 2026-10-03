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

async function boot(): Promise<void> {
  buildEmptyTimeline();

  const status =
    requireElement<HTMLDivElement>(
      "shell-status"
    );

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

  authorLink.addEventListener(
    "click",
    () => {
      void window.areaLiveLogs
        .openBrandLink(
          "github"
        );
    }
  );

  supportLink.addEventListener(
    "click",
    () => {
      void window.areaLiveLogs
        .openBrandLink(
          "support"
        );
    }
  );

  try {
    const info =
      await window.areaLiveLogs
        .getAppInfo();

    version.textContent =
      `v${info.version}`;

    platform.textContent =
      info.platform;

    status.innerHTML =
      [
        '<span class="connection-dot"></span>',
        "<span>Shell ready</span>"
      ].join("");

    status.classList.add(
      "is-ready"
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    status.innerHTML =
      [
        '<span class="connection-dot"></span>',
        "<span>Bridge error</span>"
      ].join("");

    status.classList.add(
      "is-error"
    );

    platform.textContent =
      message;
  }
}

void boot();