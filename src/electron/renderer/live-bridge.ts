import type {
  ActivityGroup,
  ActivityGroupUpdate,
  ActivityLayer
} from "../../activity-grouping.js";

import type {
  LiveCollectorStatus,
  LiveRequestEvent,
  LiveRotationEvent
} from "../window.js";

type ViewMode =
  | "smart"
  | "raw";

type UiLanguage =
  | "lv"
  | "en";

const MAX_RAW_EVENTS =
  300;

const ACTIVITY_WINDOW_SECONDS =
  60;

let selectedTimelineSecond:
  number | null =
    null;

let monitoredProjectFilter:
  Set<string> | null =
    null;

let activityTimer:
  number | null =
    null;

const ALL_LAYERS:
  ActivityLayer[] = [
    "human-like",
    "bot",
    "security",
    "server",
    "error",
    "unknown"
  ];

const rawRequests =
  new Map<
    number,
    LiveRequestEvent
  >();

const smartGroups =
  new Map<
    string,
    ActivityGroup
  >();

const expandedGroups =
  new Set<string>();

const activeLayers =
  new Set<ActivityLayer>(
    ALL_LAYERS
  );

let viewMode:
  ViewMode =
    "smart";

let renderScheduled =
  false;

let controlsReady =
  false;

type LiveFontSize =
  | "compact"
  | "normal"
  | "large";

const LIVE_FONT_STORAGE_KEY =
  "qcy-live-font-size";

const LIVE_FONT_ORDER:
  LiveFontSize[] = [
    "compact",
    "normal",
    "large"
  ];

function readLiveFontSize():
  LiveFontSize {
  try {
    const stored =
      window.localStorage.getItem(
        LIVE_FONT_STORAGE_KEY
      );

    if (
      stored === "compact" ||
      stored === "normal" ||
      stored === "large"
    ) {
      return stored;
    }
  } catch {
    // UI preference only
  }

  return "normal";
}

let liveFontSize:
  LiveFontSize =
    readLiveFontSize();

const PROJECT_LABEL_STORAGE_KEY =
  "qcy-smart-project-labels";

function readProjectLabelsVisible():
  boolean {
  try {
    return (
      window.localStorage.getItem(
        PROJECT_LABEL_STORAGE_KEY
      ) !== "collapsed"
    );
  } catch {
    return true;
  }
}

let projectLabelsVisible =
  readProjectLabelsVisible();

function applyProjectLabels():
  void {
  document.documentElement
    .dataset.smartProjectLabels =
      projectLabelsVisible
        ? "visible"
        : "collapsed";

  try {
    window.localStorage.setItem(
      PROJECT_LABEL_STORAGE_KEY,
      projectLabelsVisible
        ? "visible"
        : "collapsed"
    );
  } catch {
    // UI preference only
  }

  const button =
    document.getElementById(
      "smart-project-label-toggle"
    );

  if (
    button instanceof
      HTMLButtonElement
  ) {
    button.classList.toggle(
      "is-active",
      projectLabelsVisible
    );

    button.setAttribute(
      "aria-pressed",
      String(
        projectLabelsVisible
      )
    );
  }
}

function applyLiveFontSize():
  void {
  document.documentElement
    .dataset.liveFontSize =
      liveFontSize;

  try {
    window.localStorage.setItem(
      LIVE_FONT_STORAGE_KEY,
      liveFontSize
    );
  } catch {
    // UI preference only
  }

  const value =
    document.getElementById(
      "live-font-value"
    );

  if (value) {
    value.textContent =
      liveFontSize === "compact"
        ? "90%"
        : liveFontSize === "large"
          ? "115%"
          : "100%";
  }
}

function changeLiveFontSize(
  direction:
    -1 | 1
): void {
  const currentIndex =
    LIVE_FONT_ORDER.indexOf(
      liveFontSize
    );

  const nextIndex =
    Math.max(
      0,
      Math.min(
        LIVE_FONT_ORDER.length - 1,
        currentIndex + direction
      )
    );

  liveFontSize =
    LIVE_FONT_ORDER[
      nextIndex
    ] ?? "normal";

  applyLiveFontSize();
}

function requireElement<
  T extends HTMLElement
>(
  id: string
): T {
  const element =
    document.getElementById(id);

  if (!element) {
    throw new Error(
      `Missing live UI element: ${id}`
    );
  }

  return element as T;
}

function currentLanguage():
  UiLanguage {
  const htmlLanguage =
    document.documentElement
      .lang
      .toLowerCase();

  if (
    htmlLanguage.startsWith(
      "lv"
    )
  ) {
    return "lv";
  }

  const heading =
    document.querySelector(
      ".events-header strong"
    )?.textContent ??
    "";

  return heading.includes(
    "Tieš"
  )
    ? "lv"
    : "en";
}

function labels() {
  const language =
    currentLanguage();

  if (language === "lv") {
    return {
      smartTitle:
        "Viedā aktivitāte",

      rawTitle:
        "Tiešie pieprasījumi",

      smart:
        "Smart",

      raw:
        "Raw",

      layers:
        "Slāņi",

      projectLabels:
        "Adreses",

      projectLabelsTitle:
        "Rādīt vai paslēpt projektu adreses",

      activity:
        "Aktivitāte",

      requestVolume:
        "pieprasījumu apjoms",

      last60:
        "pēdējās 60s",

      peak:
        "pīķis",

      selectedSecond:
        "atlasīta sekunde",

      clearSecond:
        "Noņemt sekundes filtru",

      time:
        "Laiks",

      smartActivity:
        "Projekts / aktivitāte",

      rawRequest:
        "Projekts / pieprasījums",

      layer:
        "Slānis",

      type:
        "Tips",

      status:
        "Statuss",

      requests:
        "Pieprasījumi",

      delay:
        "Aizture",

      groups:
        "grupas",

      requestsCount:
        "pieprasījumi",

      noSmart:
        "Viedo aktivitāšu vēl nav",

      noSmartHelp:
        "Saistītie requesti tiks apvienoti vienā aktivitātes grupā.",

      noRaw:
        "Pieprasījumu vēl nav",

      noRawHelp:
        "Ienākošie access log ieraksti šeit parādīsies reāllaikā.",

      showRequests:
        "Rādīt requestus",

      hideRequests:
        "Paslēpt requestus",

      humanLike:
        "Iesp. apmeklētājs",

      bot:
        "Bots",

      security:
        "Drošība",

      server:
        "Serveris",

      error:
        "Kļūda",

      unknown:
        "Nezināms",

      pages:
        "lapas",

      actions:
        "darbības",

      assets:
        "resursi",

      background:
        "fona",

      errors:
        "kļūdas"
    };
  }

  return {
    smartTitle:
      "Smart activity",

    rawTitle:
      "Live requests",

    smart:
      "Smart",

    raw:
      "Raw",

    layers:
      "Layers",

    projectLabels:
      "Domains",

    projectLabelsTitle:
      "Show or hide project domains",

    activity:
      "Activity",

    requestVolume:
      "request volume",

    last60:
      "last 60s",

    peak:
      "peak",

    selectedSecond:
      "selected second",

    clearSecond:
      "Clear second filter",

    time:
      "Time",

    smartActivity:
      "Project / activity",

    rawRequest:
      "Project / request",

    layer:
      "Layer",

    type:
      "Type",

    status:
      "Status",

    requests:
      "Requests",

    delay:
      "Delay",

    groups:
      "groups",

    requestsCount:
      "requests",

    noSmart:
      "No smart activity yet",

    noSmartHelp:
      "Related requests will be grouped into activity sessions.",

    noRaw:
      "No requests yet",

    noRawHelp:
      "Incoming access-log entries will appear here in real time.",

    showRequests:
      "Show requests",

    hideRequests:
      "Hide requests",

    humanLike:
      "Human-like",

    bot:
      "Bot",

    security:
      "Security",

    server:
      "Server",

    error:
      "Error",

    unknown:
      "Unknown",

    pages:
      "pages",

    actions:
      "actions",

    assets:
      "assets",

    background:
      "background",

    errors:
      "errors"
  };
}

function layerLabel(
  layer:
    ActivityLayer
): string {
  const text =
    labels();

  switch (layer) {
    case "human-like":
      return text.humanLike;

    case "bot":
      return text.bot;

    case "security":
      return text.security;

    case "server":
      return text.server;

    case "error":
      return text.error;

    case "unknown":
      return text.unknown;
  }
}

function formatClock(
  iso: string
): string {
  const date =
    new Date(iso);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "--:--:--";
  }

  return date.toLocaleTimeString(
    [],
    {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }
  );
}

function formatDelay(
  delayMs:
    number | null
): string {
  if (
    delayMs === null ||
    !Number.isFinite(
      delayMs
    )
  ) {
    return "—";
  }

  if (delayMs < 1000) {
    return `${Math.round(
      delayMs
    )}ms`;
  }

  return `${
    (
      delayMs /
      1000
    ).toFixed(1)
  }s`;
}

function hashDomain(
  domain: string
): number {
  let hash =
    2166136261;

  for (
    let index = 0;
    index < domain.length;
    index += 1
  ) {
    hash ^=
      domain.charCodeAt(
        index
      );

    hash =
      Math.imul(
        hash,
        16777619
      );
  }

  return hash >>> 0;
}

function projectHue(
  domain: string
): number {
  return (
    hashDomain(domain) %
    360
  );
}

function projectMonogram(
  domain: string
): string {
  const value =
    domain
      .trim()
      .replace(
        /^www\./iu,
        ""
      );

  const match =
    value.match(
      /[a-z0-9]/iu
    );

  return (
    match?.[0] ??
    "?"
  ).toUpperCase();
}

function createEmptyState(
  title: string,
  help: string
): HTMLElement {
  const empty =
    document.createElement(
      "div"
    );

  empty.className =
    "empty-event";

  const mark =
    document.createElement(
      "span"
    );

  mark.className =
    "empty-event-mark";

  mark.textContent =
    "↳";

  const copy =
    document.createElement(
      "div"
    );

  const strong =
    document.createElement(
      "strong"
    );

  strong.textContent =
    title;

  const paragraph =
    document.createElement(
      "p"
    );

  paragraph.textContent =
    help;

  copy.append(
    strong,
    paragraph
  );

  empty.append(
    mark,
    copy
  );

  return empty;
}

interface ActivityBucket {
  second: number;
  total: number;

  counts:
    Record<
      ActivityLayer,
      number
    >;
}

function isMonitoredProject(
  domain: string
): boolean {
  return (
    monitoredProjectFilter ===
      null ||
    monitoredProjectFilter.has(
      domain
        .trim()
        .toLowerCase()
    )
  );
}

function handleProjectFilterEvent(
  event: Event
): void {
  const custom =
    event as CustomEvent<{
      domains:
        string[] | null;
    }>;

  const domains =
    custom.detail
      ?.domains;

  if (
    domains === null
  ) {
    monitoredProjectFilter =
      null;
  } else if (
    Array.isArray(
      domains
    )
  ) {
    monitoredProjectFilter =
      new Set(
        domains.map(
          domain =>
            domain
              .trim()
              .toLowerCase()
        )
      );
  } else {
    return;
  }

  selectedTimelineSecond =
    null;

  renderCurrentView();
}
function eventSecond(
  iso: string
): number | null {
  const milliseconds =
    Date.parse(
      iso
    );

  if (
    !Number.isFinite(
      milliseconds
    )
  ) {
    return null;
  }

  return Math.floor(
    milliseconds /
    1000
  );
}

function createActivityBucket(
  second: number
): ActivityBucket {
  return {
    second,
    total: 0,

    counts: {
      "human-like": 0,
      bot: 0,
      security: 0,
      server: 0,
      error: 0,
      unknown: 0
    }
  };
}

function buildActivityBuckets():
  ActivityBucket[] {
  const nowSecond =
    Math.floor(
      Date.now() /
      1000
    );

  const firstSecond =
    nowSecond -
    ACTIVITY_WINDOW_SECONDS +
    1;

  if (
    selectedTimelineSecond !== null &&
    (
      selectedTimelineSecond <
        firstSecond ||
      selectedTimelineSecond >
        nowSecond
    )
  ) {
    selectedTimelineSecond =
      null;
  }

  const buckets =
    Array.from(
      {
        length:
          ACTIVITY_WINDOW_SECONDS
      },
      (
        _,
        index
      ) =>
        createActivityBucket(
          firstSecond +
          index
        )
    );

  const bySecond =
    new Map<
      number,
      ActivityBucket
    >(
      buckets.map(
        bucket => [
          bucket.second,
          bucket
        ]
      )
    );

  for (
    const group
    of smartGroups.values()
  ) {
    if (
      !isMonitoredProject(
        group.domain
      ) ||
      !activeLayers.has(
        group.layer
      )
    ) {
      continue;
    }

    for (
      const request
      of group.requests
    ) {
      const second =
        eventSecond(
          request.receivedAt
        );

      if (
        second === null
      ) {
        continue;
      }

      const bucket =
        bySecond.get(
          second
        );

      if (!bucket) {
        continue;
      }

      bucket.total +=
        1;

      bucket.counts[
        group.layer
      ] += 1;
    }
  }

  return buckets;
}

function formatTimelineTime(
  second: number
): string {
  return new Date(
    second *
    1000
  ).toLocaleTimeString(
    [],
    {
      hour:
        "2-digit",

      minute:
        "2-digit",

      second:
        "2-digit"
    }
  );
}

function activityTooltip(
  bucket:
    ActivityBucket
): string {
  const lines =
    [
      `${formatTimelineTime(
        bucket.second
      )} · ${bucket.total} req`
    ];

  for (
    const layer
    of ALL_LAYERS
  ) {
    const count =
      bucket.counts[
        layer
      ];

    if (
      count === 0
    ) {
      continue;
    }

    lines.push(
      `${layerLabel(layer)}: ${count}`
    );
  }

  return lines.join(
    "\n"
  );
}

function groupTouchesSecond(
  group:
    ActivityGroup,
  second:
    number
): boolean {
  return group.requests.some(
    request =>
      eventSecond(
        request.receivedAt
      ) === second
  );
}

function requestTouchesSelectedSecond(
  event:
    LiveRequestEvent
): boolean {
  if (
    selectedTimelineSecond ===
      null
  ) {
    return true;
  }

  return (
    eventSecond(
      event.receivedAt
    ) ===
    selectedTimelineSecond
  );
}

function createActivityTimeline():
  void {
  const activity =
    document.querySelector<
      HTMLElement
    >(
      ".activity"
    );

  if (!activity) {
    throw new Error(
      "Missing activity section."
    );
  }

  activity.replaceChildren();

  const header =
    document.createElement(
      "div"
    );

  header.className =
    "activity-header";

  const heading =
    document.createElement(
      "div"
    );

  const strong =
    document.createElement(
      "strong"
    );

  strong.id =
    "live-activity-title";

  const description =
    document.createElement(
      "span"
    );

  description.id =
    "live-activity-description";

  heading.append(
    strong,
    description
  );

  const range =
    document.createElement(
      "div"
    );

  range.id =
    "live-activity-range";

  range.className =
    "activity-range";

  header.append(
    heading,
    range
  );

  const chart =
    document.createElement(
      "div"
    );

  chart.className =
    "live-activity-chart";

  const legend =
    document.createElement(
      "div"
    );

  legend.className =
    "live-activity-legend";

  legend.id =
    "live-activity-legend";

  const bars =
    document.createElement(
      "div"
    );

  bars.id =
    "live-activity-bars";

  bars.className =
    "live-activity-bars";

  const selection =
    document.createElement(
      "button"
    );

  selection.id =
    "live-activity-selection";

  selection.type =
    "button";

  selection.className =
    "live-activity-selection";

  selection.hidden =
    true;

  selection.addEventListener(
    "click",
    () => {
      selectedTimelineSecond =
        null;

      renderCurrentView();
    }
  );

  chart.append(
    legend,
    bars,
    selection
  );

  activity.append(
    header,
    chart
  );
}

function toggleActivityLayer(
  layer:
    ActivityLayer
): void {
  if (
    activeLayers.has(
      layer
    )
  ) {
    activeLayers.delete(
      layer
    );
  } else {
    activeLayers.add(
      layer
    );
  }

  const option =
    document.querySelector<
      HTMLLabelElement
    >(
      `.smart-layer-option[data-layer="${layer}"]`
    );

  const input =
    option?.querySelector<
      HTMLInputElement
    >(
      'input[type="checkbox"]'
    );

  if (input) {
    input.checked =
      activeLayers.has(
        layer
      );
  }

  updateLayerButton();
  renderCurrentView();
}

function renderActivityLegend():
  void {
  const legend =
    document.getElementById(
      "live-activity-legend"
    );

  if (!legend) {
    return;
  }

  legend.replaceChildren();

  for (
    const layer
    of ALL_LAYERS
  ) {
    const button =
      document.createElement(
        "button"
      );

    button.type =
      "button";

    button.className =
      "live-activity-legend-item";

    button.dataset.layer =
      layer;

    button.classList.toggle(
      "is-disabled",
      !activeLayers.has(
        layer
      )
    );

    button.title =
      layerLabel(layer);

    const dot =
      document.createElement(
        "span"
      );

    dot.className =
      "live-activity-legend-dot";

    const text =
      document.createElement(
        "span"
      );

    text.textContent =
      layerLabel(layer);

    button.append(
      dot,
      text
    );

    button.addEventListener(
      "click",
      () => {
        toggleActivityLayer(
          layer
        );
      }
    );

    legend.append(
      button
    );
  }
}

function renderActivityTimeline():
  void {
  const bars =
    document.getElementById(
      "live-activity-bars"
    );

  if (!bars) {
    return;
  }

  const text =
    labels();

  const title =
    document.getElementById(
      "live-activity-title"
    );

  const description =
    document.getElementById(
      "live-activity-description"
    );

  const range =
    document.getElementById(
      "live-activity-range"
    );

  if (title) {
    title.textContent =
      text.activity;
  }

  if (description) {
    description.textContent =
      text.requestVolume;
  }

  const buckets =
    buildActivityBuckets();

  const total =
    buckets.reduce(
      (
        sum,
        bucket
      ) =>
        sum +
        bucket.total,
      0
    );

  const peak =
    Math.max(
      0,
      ...buckets.map(
        bucket =>
          bucket.total
      )
    );

  if (range) {
    range.textContent =
      `${text.last60} · ${total} req · ${text.peak} ${peak}/s`;
  }

  const selection =
    document.getElementById(
      "live-activity-selection"
    );

  if (
    selection instanceof
      HTMLButtonElement
  ) {
    if (
      selectedTimelineSecond ===
        null
    ) {
      selection.hidden =
        true;
    } else {
      selection.hidden =
        false;

      selection.textContent =
        `${text.selectedSecond}: ${
          formatTimelineTime(
            selectedTimelineSecond
          )
        } ×`;

      selection.title =
        text.clearSecond;
    }
  }

  renderActivityLegend();

  bars.replaceChildren();

  const maxVisual =
    Math.max(
      1,
      peak
    );

  const lastIndex =
    buckets.length -
    1;

  for (
    let index = 0;
    index < buckets.length;
    index += 1
  ) {
    const bucket =
      buckets[index];

    const button =
      document.createElement(
        "button"
      );

    button.type =
      "button";

    button.className =
      "live-activity-bucket";

    button.dataset.total =
      String(
        bucket.total
      );

    button.title =
      activityTooltip(
        bucket
      );

    if (
      index === lastIndex
    ) {
      button.classList.add(
        "is-live"
      );
    }

    if (
      selectedTimelineSecond ===
        bucket.second
    ) {
      button.classList.add(
        "is-selected"
      );
    }

    const scaled =
      bucket.total === 0
        ? 5
        : Math.max(
            10,
            Math.round(
              (
                Math.sqrt(
                  bucket.total
                ) /
                Math.sqrt(
                  maxVisual
                )
              ) *
                100
            )
          );

    const stack =
      document.createElement(
        "span"
      );

    stack.className =
      "live-activity-stack";

    stack.style.height =
      `${scaled}%`;

    if (
      bucket.total === 0
    ) {
      const empty =
        document.createElement(
          "span"
        );

      empty.className =
        "live-activity-empty";

      stack.append(
        empty
      );
    } else {
      for (
        const layer
        of ALL_LAYERS
      ) {
        const count =
          bucket.counts[
            layer
          ];

        if (
          count === 0
        ) {
          continue;
        }

        const segment =
          document.createElement(
            "span"
          );

        segment.className =
          "live-activity-segment";

        segment.dataset.layer =
          layer;

        segment.style.flexGrow =
          String(
            count
          );

        stack.append(
          segment
        );
      }
    }

    button.append(
      stack
    );

    button.addEventListener(
      "click",
      () => {
        selectedTimelineSecond =
          selectedTimelineSecond ===
            bucket.second
            ? null
            : bucket.second;

        renderCurrentView();
      }
    );

    bars.append(
      button
    );
  }
}

function startActivityClock():
  void {
  if (
    activityTimer !==
      null
  ) {
    return;
  }

  activityTimer =
    window.setInterval(
      () => {
        renderActivityTimeline();
      },
      1000
    );
}
function trimRawBuffer(): void {
  while (
    rawRequests.size >
    MAX_RAW_EVENTS
  ) {
    const oldest =
      [...rawRequests.keys()]
        .sort(
          (
            left,
            right
          ) =>
            left - right
        )[0];

    if (
      oldest === undefined
    ) {
      return;
    }

    rawRequests.delete(
      oldest
    );
  }
}

function recordRawRequest(
  event:
    LiveRequestEvent
): void {
  rawRequests.set(
    event.sequence,
    event
  );

  trimRawBuffer();

  requireElement<HTMLSpanElement>(
    "status-delay"
  ).textContent =
    `delay ${formatDelay(
      event.observedDelayMs
    )}`;

  scheduleRender();
}

function recordSmartGroup(
  update:
    ActivityGroupUpdate
): void {
  smartGroups.set(
    update.group.id,
    update.group
  );

  scheduleRender();
}

function setHeaderColumns(
  values:
    string[]
): void {
  const columns =
    [
      ...document.querySelectorAll<
        HTMLSpanElement
      >(
        ".event-columns > span"
      )
    ];

  for (
    let index = 0;
    index < columns.length;
    index += 1
  ) {
    const column =
      columns[index];

    const value =
      values[index];

    if (
      !column ||
      value === undefined
    ) {
      continue;
    }

    column.removeAttribute(
      "data-i18n"
    );

    column.textContent =
      value;
  }
}

function updateCounter(
  value: string
): void {
  const header =
    requireElement<HTMLSpanElement>(
      "event-count"
    );

  const footer =
    requireElement<HTMLSpanElement>(
      "status-event-count"
    );

  header.removeAttribute(
    "data-i18n"
  );

  footer.removeAttribute(
    "data-i18n"
  );

  header.textContent =
    value;

  footer.textContent =
    value;
}

function updateLayerButton():
  void {
  const button =
    document.getElementById(
      "smart-layer-toggle"
    );

  if (
    !(button instanceof HTMLButtonElement)
  ) {
    return;
  }

  const text =
    labels();

  button.textContent =
    `${text.layers} ${activeLayers.size}/${ALL_LAYERS.length}`;
}

function updateViewControls():
  void {
  const smart =
    document.getElementById(
      "smart-view-toggle"
    );

  const raw =
    document.getElementById(
      "raw-view-toggle"
    );

  if (
    smart instanceof HTMLButtonElement
  ) {
    smart.classList.toggle(
      "is-active",
      viewMode === "smart"
    );

    smart.setAttribute(
      "aria-pressed",
      String(
        viewMode === "smart"
      )
    );
  }

  if (
    raw instanceof HTMLButtonElement
  ) {
    raw.classList.toggle(
      "is-active",
      viewMode === "raw"
    );

    raw.setAttribute(
      "aria-pressed",
      String(
        viewMode === "raw"
      )
    );
  }

  const layers =
    document.getElementById(
      "smart-layer-wrap"
    );

  layers?.classList.toggle(
    "is-hidden",
    viewMode !== "smart"
  );
}

function updatePresentation():
  void {
  const text =
    labels();

  const heading =
    document.querySelector<
      HTMLElement
    >(
      ".events-header strong"
    );

  if (heading) {
    heading.removeAttribute(
      "data-i18n"
    );

    heading.textContent =
      viewMode === "smart"
        ? text.smartTitle
        : text.rawTitle;
  }

  setHeaderColumns(
    viewMode === "smart"
      ? [
          text.time,
          text.smartActivity,
          text.layer,
          text.status,
          text.requests
        ]
      : [
          text.time,
          text.rawRequest,
          text.type,
          text.status,
          text.delay
        ]
  );

  const smartButton =
    document.getElementById(
      "smart-view-toggle"
    );

  const rawButton =
    document.getElementById(
      "raw-view-toggle"
    );

  if (
    smartButton instanceof
    HTMLButtonElement
  ) {
    smartButton.textContent =
      text.smart;
  }

  if (
    rawButton instanceof
    HTMLButtonElement
  ) {
    rawButton.textContent =
      text.raw;
  }

  updateLayerButton();

  const projectLabelsButton =
    document.getElementById(
      "smart-project-label-toggle"
    );

  if (
    projectLabelsButton instanceof
      HTMLButtonElement
  ) {
    projectLabelsButton.textContent =
      text.projectLabels;

    projectLabelsButton.title =
      text.projectLabelsTitle;
  }

  applyProjectLabels();
  updateViewControls();
}

function setViewMode(
  mode:
    ViewMode
): void {
  if (
    viewMode === mode
  ) {
    return;
  }

  viewMode =
    mode;

  const menu =
    document.getElementById(
      "smart-layer-menu"
    );

  menu?.classList.remove(
    "is-open"
  );

  const layerButton =
    document.getElementById(
      "smart-layer-toggle"
    );

  layerButton?.setAttribute(
    "aria-expanded",
    "false"
  );

  renderCurrentView();
}

function createViewControls():
  void {
  if (controlsReady) {
    return;
  }

  const actions =
    document.querySelector<
      HTMLElement
    >(
      ".events-actions"
    );

  if (!actions) {
    throw new Error(
      "Missing events actions container."
    );
  }

  const firstExisting =
    actions.firstElementChild;

  const switcher =
    document.createElement(
      "div"
    );

  switcher.className =
    "smart-view-switch";

  switcher.setAttribute(
    "role",
    "group"
  );

  const smart =
    document.createElement(
      "button"
    );

  smart.id =
    "smart-view-toggle";

  smart.type =
    "button";

  smart.className =
    "smart-view-button";

  smart.addEventListener(
    "click",
    () => {
      setViewMode(
        "smart"
      );
    }
  );

  const raw =
    document.createElement(
      "button"
    );

  raw.id =
    "raw-view-toggle";

  raw.type =
    "button";

  raw.className =
    "smart-view-button";

  raw.addEventListener(
    "click",
    () => {
      setViewMode(
        "raw"
      );
    }
  );

  switcher.append(
    smart,
    raw
  );

  const fontControls =
    document.createElement(
      "div"
    );

  fontControls.className =
    "smart-font-controls";

  const fontDown =
    document.createElement(
      "button"
    );

  fontDown.type =
    "button";

  fontDown.className =
    "smart-font-button";

  fontDown.textContent =
    "A−";

  fontDown.title =
    "Mazāks teksts / Smaller text";

  fontDown.addEventListener(
    "click",
    () => {
      changeLiveFontSize(
        -1
      );
    }
  );

  const fontValue =
    document.createElement(
      "button"
    );

  fontValue.id =
    "live-font-value";

  fontValue.type =
    "button";

  fontValue.className =
    "smart-font-value";

  fontValue.title =
    "Atjaunot teksta izmēru / Reset text size";

  fontValue.addEventListener(
    "click",
    () => {
      liveFontSize =
        "normal";

      applyLiveFontSize();
    }
  );

  const fontUp =
    document.createElement(
      "button"
    );

  fontUp.type =
    "button";

  fontUp.className =
    "smart-font-button";

  fontUp.textContent =
    "A+";

  fontUp.title =
    "Lielāks teksts / Larger text";

  fontUp.addEventListener(
    "click",
    () => {
      changeLiveFontSize(
        1
      );
    }
  );

  fontControls.append(
    fontDown,
    fontValue,
    fontUp
  );

  const projectLabelsToggle =
    document.createElement(
      "button"
    );

  projectLabelsToggle.id =
    "smart-project-label-toggle";

  projectLabelsToggle.type =
    "button";

  projectLabelsToggle.className =
    "smart-project-label-toggle";

  projectLabelsToggle.addEventListener(
    "click",
    () => {
      projectLabelsVisible =
        !projectLabelsVisible;

      applyProjectLabels();
    }
  );

  const layerWrap =
    document.createElement(
      "div"
    );

  layerWrap.id =
    "smart-layer-wrap";

  layerWrap.className =
    "smart-layer-wrap";

  const layerToggle =
    document.createElement(
      "button"
    );

  layerToggle.id =
    "smart-layer-toggle";

  layerToggle.type =
    "button";

  layerToggle.className =
    "smart-layer-toggle";

  layerToggle.setAttribute(
    "aria-expanded",
    "false"
  );

  const menu =
    document.createElement(
      "div"
    );

  menu.id =
    "smart-layer-menu";

  menu.className =
    "smart-layer-menu";

  for (
    const layer
    of ALL_LAYERS
  ) {
    const option =
      document.createElement(
        "label"
      );

    option.className =
      "smart-layer-option";

    option.dataset.layer =
      layer;

    const input =
      document.createElement(
        "input"
      );

    input.type =
      "checkbox";

    input.checked =
      true;

    input.addEventListener(
      "change",
      () => {
        if (
          input.checked
        ) {
          activeLayers.add(
            layer
          );
        } else {
          activeLayers.delete(
            layer
          );
        }

        updateLayerButton();
        scheduleRender();
      }
    );

    const dot =
      document.createElement(
        "span"
      );

    dot.className =
      "smart-layer-dot";

    const label =
      document.createElement(
        "span"
      );

    label.className =
      "smart-layer-label";

    label.textContent =
      layerLabel(layer);

    option.append(
      input,
      dot,
      label
    );

    menu.append(
      option
    );
  }

  const closeLayerMenu =
    (): void => {
      menu.classList.remove(
        "is-open"
      );

      layerToggle.setAttribute(
        "aria-expanded",
        "false"
      );
    };

  const positionLayerMenu =
    (): void => {
      const buttonRect =
        layerToggle
          .getBoundingClientRect();

      const margin =
        8;

      const gap =
        5;

      const menuWidth =
        menu.offsetWidth;

      const menuHeight =
        menu.offsetHeight;

      let left =
        buttonRect.right -
        menuWidth;

      left =
        Math.max(
          margin,
          Math.min(
            left,
            window.innerWidth -
              menuWidth -
              margin
          )
        );

      let top =
        buttonRect.bottom +
        gap;

      if (
        top +
          menuHeight >
        window.innerHeight -
          margin
      ) {
        top =
          Math.max(
            margin,
            buttonRect.top -
              menuHeight -
              gap
          );
      }

      menu.style.left =
        `${Math.round(left)}px`;

      menu.style.top =
        `${Math.round(top)}px`;
    };

  layerToggle.addEventListener(
    "click",
    event => {
      event.stopPropagation();

      const shouldOpen =
        !menu.classList.contains(
          "is-open"
        );

      closeLayerMenu();

      if (
        shouldOpen
      ) {
        menu.classList.add(
          "is-open"
        );

        layerToggle.setAttribute(
          "aria-expanded",
          "true"
        );

        positionLayerMenu();
      }
    }
  );

  menu.addEventListener(
    "click",
    event => {
      event.stopPropagation();
    }
  );

  layerWrap.append(
    layerToggle
  );

  document.body.append(
    menu
  );

  if (firstExisting) {
    actions.insertBefore(
      switcher,
      firstExisting
    );

    actions.insertBefore(
      layerWrap,
      firstExisting
    );

    actions.insertBefore(
      fontControls,
      firstExisting
    );

    actions.insertBefore(
      projectLabelsToggle,
      firstExisting
    );
  } else {
    actions.append(
      switcher,
      layerWrap,
      fontControls,
      projectLabelsToggle
    );
  }

  document.addEventListener(
    "click",
    closeLayerMenu
  );

  window.addEventListener(
    "resize",
    closeLayerMenu
  );

  window.addEventListener(
    "blur",
    closeLayerMenu
  );

  document.addEventListener(
    "scroll",
    closeLayerMenu,
    true
  );

  controlsReady =
    true;

  applyLiveFontSize();
  applyProjectLabels();
  updatePresentation();
}

function createRawRow(
  event:
    LiveRequestEvent
): HTMLElement {
  const row =
    document.createElement(
      "div"
    );

  row.className =
    "event-row";

  row.dataset.sequence =
    String(
      event.sequence
    );

  row.tabIndex =
    0;

  const time =
    document.createElement(
      "span"
    );

  time.textContent =
    formatClock(
      event.receivedAt
    );

  const request =
    document.createElement(
      "span"
    );

  request.textContent =
    `${event.domain} · ${event.method} ${event.path}`;

  request.title =
    [
      event.domain,
      `${event.method} ${event.path}`,
      event.ip,
      event.userAgent
    ].join("\n");

  const type =
    document.createElement(
      "span"
    );

  type.textContent =
    event.category ===
      "VISITOR"
      ? "UNCLASSIFIED"
      : event.category;

  const status =
    document.createElement(
      "span"
    );

  status.textContent =
    String(
      event.status
    );

  const delay =
    document.createElement(
      "span"
    );

  delay.textContent =
    formatDelay(
      event.observedDelayMs
    );

  row.append(
    time,
    request,
    type,
    status,
    delay
  );

  return row;
}

function renderRawView():
  void {
  const text =
    labels();

  const list =
    requireElement<HTMLDivElement>(
      "event-list"
    );

  list.replaceChildren();

  const events =
    [...rawRequests.values()]
      .filter(
        event =>
          isMonitoredProject(
            event.domain
          ) &&
          requestTouchesSelectedSecond(
            event
          )
      )
      .sort(
        (
          left,
          right
        ) =>
          right.sequence -
          left.sequence
      );

  if (
    events.length === 0
  ) {
    list.append(
      createEmptyState(
        text.noRaw,
        text.noRawHelp
      )
    );
  } else {
    for (
      const event
      of events
    ) {
      list.append(
        createRawRow(
          event
        )
      );
    }
  }

  updateCounter(
    `${events.length} ${text.requestsCount}`
  );
}

function createProjectIdentity(
  domain: string
): HTMLElement {
  const identity =
    document.createElement(
      "span"
    );

  identity.className =
    "smart-project-identity";

  identity.title =
    domain;

  identity.style.setProperty(
    "--project-hue",
    String(
      projectHue(domain)
    )
  );

  const mark =
    document.createElement(
      "span"
    );

  mark.className =
    "smart-project-mark";

  mark.textContent =
    projectMonogram(
      domain
    );

  const domainLabel =
    document.createElement(
      "span"
    );

  domainLabel.className =
    "smart-project-domain";

  domainLabel.textContent =
    domain;

  identity.append(
    mark,
    domainLabel
  );

  return identity;
}

function createLayerPill(
  layer:
    ActivityLayer
): HTMLElement {
  const pill =
    document.createElement(
      "span"
    );

  pill.className =
    "smart-layer-pill";

  pill.dataset.layer =
    layer;

  pill.textContent =
    layerLabel(layer);

  return pill;
}

function createGroupDetails(
  group:
    ActivityGroup
): HTMLElement {
  const details =
    document.createElement(
      "div"
    );

  details.className =
    "smart-group-details";

  const requests =
    group.requests.slice(
      -30
    );

  for (
    const request
    of requests
  ) {
    const row =
      document.createElement(
        "div"
      );

    row.className =
      "smart-raw-row";

    const time =
      document.createElement(
        "span"
      );

    time.textContent =
      formatClock(
        request.receivedAt
      );

    const role =
      document.createElement(
        "span"
      );

    role.className =
      "smart-request-role";

    role.dataset.role =
      request.role;

    role.textContent =
      request.role;

    const path =
      document.createElement(
        "span"
      );

    path.textContent =
      `${request.method} ${request.path}`;

    path.title =
      [
        request.ip,
        request.userAgent,
        request.referer
      ].join("\n");

    const status =
      document.createElement(
        "span"
      );

    status.textContent =
      String(
        request.status
      );

    const delay =
      document.createElement(
        "span"
      );

    delay.textContent =
      formatDelay(
        request.observedDelayMs
      );

    row.append(
      time,
      role,
      path,
      status,
      delay
    );

    details.append(
      row
    );
  }

  if (
    group.requests.length >
    requests.length
  ) {
    const more =
      document.createElement(
        "div"
      );

    more.className =
      "smart-group-more";

    more.textContent =
      `+ ${
        group.requests.length -
        requests.length
      }`;

    details.append(
      more
    );
  }

  return details;
}

function createSmartGroup(
  group:
    ActivityGroup
): HTMLElement {
  const text =
    labels();

  const container =
    document.createElement(
      "article"
    );

  container.className =
    "smart-group";

  container.dataset.groupId =
    group.id;

  container.dataset.layer =
    group.layer;

  const expanded =
    expandedGroups.has(
      group.id
    );

  container.classList.toggle(
    "is-expanded",
    expanded
  );

  const summary =
    document.createElement(
      "button"
    );

  summary.type =
    "button";

  summary.className =
    "smart-group-summary";

  summary.setAttribute(
    "aria-expanded",
    String(expanded)
  );

  const time =
    document.createElement(
      "span"
    );

  time.className =
    "smart-group-time";

  time.textContent =
    formatClock(
      group.updatedAt
    );

  const activity =
    document.createElement(
      "span"
    );

  activity.className =
    "smart-group-activity";

  const identity =
    createProjectIdentity(
      group.domain
    );

  const copy =
    document.createElement(
      "span"
    );

  copy.className =
    "smart-activity-copy";

  const documents =
    group.requests.filter(
      request =>
        request.role ===
        "document"
    );

  const actions =
    group.requests.filter(
      request => {
        if (
          request.role !==
            "background"
        ) {
          return false;
        }

        const method =
          request.method
            .trim()
            .toUpperCase();

        if (
          method === "GET" ||
          method === "HEAD"
        ) {
          return false;
        }

        return (
          !/^\/_analytics(?:\/|$)/iu.test(
            request.path
          )
        );
      }
    );

  const meaningful =
    [
      ...documents,
      ...actions
    ].sort(
      (
        left,
        right
      ) =>
        left.sequence -
        right.sequence
    );

  const headline =
    meaningful[
      meaningful.length - 1
    ];

  const primary =
    document.createElement(
      "strong"
    );

  if (headline) {
    primary.textContent =
      `${headline.method} ${headline.path}`;
  } else if (
    group.primaryRequest
  ) {
    primary.textContent =
      `${group.primaryRequest.method} ${group.primaryRequest.path}`;
  } else {
    primary.textContent =
      "background activity";
  }

  const meta =
    document.createElement(
      "small"
    );

  const metaParts:
    string[] = [];

  if (
    documents.length > 0
  ) {
    metaParts.push(
      `${documents.length} ${text.pages}`
    );
  }

  metaParts.push(
    `${group.requestCount} req`
  );

  if (
    group.assetCount > 0
  ) {
    metaParts.push(
      `${group.assetCount} ${text.assets}`
    );
  }

  if (
    actions.length > 0
  ) {
    metaParts.push(
      `${actions.length} ${text.actions}`
    );
  }

  if (
    group.errorCount > 0
  ) {
    metaParts.push(
      `${group.errorCount} ${text.errors}`
    );
  }

  meta.textContent =
    metaParts.join(" · ");

  copy.append(
    primary,
    meta
  );

  const documentPaths =
    [
      ...new Set(
        documents.map(
          request =>
            request.path
        )
      )
    ];

  if (
    documentPaths.length >
    1
  ) {
    const trail =
      document.createElement(
        "small"
      );

    trail.className =
      "smart-navigation-trail";

    const visiblePaths =
      documentPaths.slice(
        -3
      );

    const hiddenCount =
      Math.max(
        0,
        documentPaths.length -
          visiblePaths.length
      );

    trail.textContent =
      `${
        visiblePaths.join(
          " → "
        )
      }${
        hiddenCount > 0
          ? ` · +${hiddenCount}`
          : ""
      }`;

    trail.title =
      documentPaths.join(
        "\n"
      );

    copy.append(
      trail
    );
  }

  activity.append(
    identity,
    copy
  );

  const layer =
    createLayerPill(
      group.layer
    );

  const status =
    document.createElement(
      "span"
    );

  status.className =
    "smart-group-status";

  status.textContent =
    headline
      ? String(
          headline.status
        )
      : group.primaryRequest
        ? String(
            group.primaryRequest.status
          )
        : "—";

  const count =
    document.createElement(
      "span"
    );

  count.className =
    "smart-group-count";

  count.textContent =
    String(
      group.requestCount
    );

  summary.append(
    time,
    activity,
    layer,
    status,
    count
  );

  summary.title =
    expanded
      ? text.hideRequests
      : text.showRequests;

  summary.addEventListener(
    "click",
    () => {
      if (
        expandedGroups.has(
          group.id
        )
      ) {
        expandedGroups.delete(
          group.id
        );
      } else {
        expandedGroups.add(
          group.id
        );
      }

      scheduleRender();
    }
  );

  container.append(
    summary
  );

  if (expanded) {
    container.append(
      createGroupDetails(
        group
      )
    );
  }

  return container;
}

function renderSmartView():
  void {
  const text =
    labels();

  const list =
    requireElement<HTMLDivElement>(
      "event-list"
    );

  list.replaceChildren();

  const allGroups =
    [...smartGroups.values()]
      .sort(
        (
          left,
          right
        ) =>
          Date.parse(
            right.updatedAt
          ) -
          Date.parse(
            left.updatedAt
          )
      );

  const groups =
    allGroups.filter(
      group =>
        isMonitoredProject(
          group.domain
        ) &&
        activeLayers.has(
          group.layer
        ) &&
        (
          selectedTimelineSecond ===
            null ||
          groupTouchesSecond(
            group,
            selectedTimelineSecond
          )
        )
    );

  if (
    groups.length === 0
  ) {
    list.append(
      createEmptyState(
        text.noSmart,
        text.noSmartHelp
      )
    );
  } else {
    for (
      const group
      of groups
    ) {
      list.append(
        createSmartGroup(
          group
        )
      );
    }
  }

  const count =
    groups.length ===
      allGroups.length
      ? `${groups.length} ${text.groups}`
      : `${groups.length}/${allGroups.length} ${text.groups}`;

  updateCounter(
    count
  );
}

function renderCurrentView():
  void {
  updatePresentation();
  renderActivityTimeline();

  if (
    viewMode === "smart"
  ) {
    renderSmartView();
  } else {
    renderRawView();
  }
}

function scheduleRender():
  void {
  if (renderScheduled) {
    return;
  }

  renderScheduled =
    true;

  requestAnimationFrame(
    () => {
      renderScheduled =
        false;

      renderCurrentView();
    }
  );
}

function renderCollectorStatus(
  status:
    LiveCollectorStatus
): void {
  const top =
    requireElement<HTMLDivElement>(
      "shell-status"
    );

  const footer =
    requireElement<HTMLSpanElement>(
      "collector-status-text"
    );

  footer.removeAttribute(
    "data-i18n"
  );

  let label =
    `collector ${status.state}`;

  if (
    status.state ===
    "monitoring"
  ) {
    label =
      status.projectCount ===
        undefined
        ? "collector live"
        : `collector live · ${status.projectCount} projects`;
  }

  if (
    status.state ===
      "reconnecting" &&
    status.retryInMs !==
      undefined
  ) {
    label =
      `collector reconnecting · ${Math.round(
        status.retryInMs /
        1000
      )}s`;
  }

  footer.textContent =
    label;

  top.classList.remove(
    "is-ready",
    "is-error"
  );

  if (
    status.state ===
      "monitoring" ||
    status.state ===
      "connected"
  ) {
    top.classList.add(
      "is-ready"
    );
  } else if (
    status.state ===
      "reconnecting" ||
    status.state ===
      "stopped"
  ) {
    top.classList.add(
      "is-error"
    );
  }

  const topLabel =
    top.querySelector(
      "span:last-child"
    );

  if (topLabel) {
    topLabel.textContent =
      label;
  }
}

function renderLogRotation(
  event:
    LiveRotationEvent
): void {
  const project =
    document.querySelector<
      HTMLElement
    >(
      `.project-row[data-project-id="${CSS.escape(
        event.domain
      )}"]`
    );

  if (!project) {
    return;
  }

  project.dataset.logState =
    event.state;

  project.title =
    event.state ===
      "following"
      ? `${event.domain} · following log`
      : `${event.domain} · log unavailable`;
}

function watchLanguage():
  void {
  const observer =
    new MutationObserver(
      mutations => {
        if (
          mutations.some(
            mutation =>
              mutation.type ===
                "attributes" &&
              mutation.attributeName ===
                "lang"
          )
        ) {
          renderCurrentView();
        }
      }
    );

  observer.observe(
    document.documentElement,
    {
      attributes: true,
      attributeFilter: [
        "lang"
      ]
    }
  );
}

export async function setupLiveBridge():
  Promise<void> {
  window.addEventListener(
    "qcy:project-filter",
    handleProjectFilterEvent
  );

  createActivityTimeline();
  createViewControls();
  watchLanguage();
  startActivityClock();

  window.qcyLiveLog
    .onCollectorStatus(
      renderCollectorStatus
    );

  window.qcyLiveLog
    .onLiveRequest(
      recordRawRequest
    );

  window.qcyLiveLog
    .onLogRotation(
      renderLogRotation
    );

  window.qcyLiveLog
    .onSmartGroupUpdate(
      recordSmartGroup
    );

  const [
    liveSnapshot,
    smartSnapshot
  ] =
    await Promise.all([
      window.qcyLiveLog
        .getLiveSnapshot(),

      window.qcyLiveLog
        .getSmartSnapshot()
    ]);

  if (
    liveSnapshot.status !==
    null
  ) {
    renderCollectorStatus(
      liveSnapshot.status
    );
  }

  for (
    const event
    of liveSnapshot.requests
  ) {
    rawRequests.set(
      event.sequence,
      event
    );
  }

  trimRawBuffer();

  for (
    const event
    of liveSnapshot.rotations
  ) {
    renderLogRotation(
      event
    );
  }

  for (
    const group
    of smartSnapshot
  ) {
    smartGroups.set(
      group.id,
      group
    );
  }

  renderCurrentView();
}