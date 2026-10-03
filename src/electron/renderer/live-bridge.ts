import type {
  LiveCollectorStatus,
  LiveRequestEvent,
  LiveRotationEvent
} from "../window.js";

const MAX_RENDERED_EVENTS = 300;
const MAX_SEEN_SEQUENCES = 600;

const seenSequences =
  new Set<number>();

const seenSequenceOrder:
  number[] = [];

let totalEvents = 0;

function requireElement<T extends HTMLElement>(
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

function rememberSequence(
  sequence: number
): boolean {
  if (
    seenSequences.has(sequence)
  ) {
    return false;
  }

  seenSequences.add(sequence);
  seenSequenceOrder.push(sequence);

  while (
    seenSequenceOrder.length >
    MAX_SEEN_SEQUENCES
  ) {
    const oldest =
      seenSequenceOrder.shift();

    if (oldest !== undefined) {
      seenSequences.delete(oldest);
    }
  }

  return true;
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
    !Number.isFinite(delayMs)
  ) {
    return "—";
  }

  if (delayMs < 1000) {
    return `${Math.round(delayMs)}ms`;
  }

  return `${
    (delayMs / 1000).toFixed(1)
  }s`;
}

function updateCounts(): void {
  const label =
    `${totalEvents} events`;

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

  header.textContent = label;
  footer.textContent = label;
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
        status.retryInMs / 1000
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

  const labelElement =
    top.querySelector(
      "span:last-child"
    );

  if (labelElement) {
    labelElement.textContent =
      label;
  }
}

function renderRequest(
  event:
    LiveRequestEvent
): void {
  if (
    !rememberSequence(
      event.sequence
    )
  ) {
    return;
  }

  totalEvents += 1;

  const list =
    requireElement<HTMLDivElement>(
      "event-list"
    );

  list.querySelector(
    ".empty-event"
  )?.remove();

  const row =
    document.createElement("div");

  row.className =
    "event-row";

  row.dataset.sequence =
    String(event.sequence);

  row.tabIndex = 0;

  const time =
    document.createElement("span");

  const request =
    document.createElement("span");

  const type =
    document.createElement("span");

  const status =
    document.createElement("span");

  const delay =
    document.createElement("span");

  time.textContent =
    formatClock(
      event.receivedAt
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

  type.textContent =
    event.category ===
      "VISITOR"
      ? "UNCLASSIFIED"
      : event.category;

  status.textContent =
    String(event.status);

  const delayLabel =
    formatDelay(
      event.observedDelayMs
    );

  delay.textContent =
    delayLabel;

  row.append(
    time,
    request,
    type,
    status,
    delay
  );

  list.prepend(row);

  while (
    list.querySelectorAll(
      ".event-row"
    ).length >
    MAX_RENDERED_EVENTS
  ) {
    list.querySelector(
      ".event-row:last-child"
    )?.remove();
  }

  requireElement<HTMLSpanElement>(
    "status-delay"
  ).textContent =
    `delay ${delayLabel}`;

  updateCounts();
}

function renderRotation(
  event:
    LiveRotationEvent
): void {
  const project =
    document.querySelector<HTMLElement>(
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

export async function setupLiveBridge():
  Promise<void> {
  window.qcyLiveLog
    .onCollectorStatus(
      renderCollectorStatus
    );

  window.qcyLiveLog
    .onLiveRequest(
      renderRequest
    );

  window.qcyLiveLog
    .onLogRotation(
      renderRotation
    );

  const snapshot =
    await window.qcyLiveLog
      .getLiveSnapshot();

  if (
    snapshot.status !== null
  ) {
    renderCollectorStatus(
      snapshot.status
    );
  }

  for (
    const event
    of snapshot.requests
  ) {
    renderRequest(event);
  }

  for (
    const event
    of snapshot.rotations
  ) {
    renderRotation(event);
  }
}