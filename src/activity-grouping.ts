import type {
  LogCategory
} from "./classifier.js";

export type ActivityRequestRole =
  | "document"
  | "asset"
  | "background";

export type ActivityLayer =
  | "human-like"
  | "bot"
  | "security"
  | "server"
  | "error"
  | "unknown";

export interface ActivityRequest {
  sequence: number;
  receivedAt: string;

  domain: string;
  category: LogCategory;

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

export interface ActivityPrimaryRequest {
  sequence: number;
  method: string;
  path: string;
  status: number;
}

export interface ActivityGroup {
  id: string;
  actorKey: string;

  domain: string;
  ip: string;
  userAgent: string;

  startedAt: string;
  updatedAt: string;

  layer: ActivityLayer;

  primaryRequest:
    ActivityPrimaryRequest | null;

  requestCount: number;
  documentCount: number;
  assetCount: number;
  backgroundCount: number;
  errorCount: number;

  droppedRequestCount: number;

  requests:
    Array<
      ActivityRequest & {
        role:
          ActivityRequestRole;
      }
    >;
}

export interface ActivityGroupingOptions {
  idleWindowMs?: number;
  navigationSplitMs?: number;
  maxGroups?: number;
  maxRequestsPerGroup?: number;
}

export interface ActivityGroupUpdate {
  created: boolean;
  group: ActivityGroup;
}

interface MutableActivityGroup
  extends ActivityGroup {
  startedAtMs: number;
  updatedAtMs: number;

  lastDocumentAtMs:
    number | null;

  categoryCounts:
    Map<
      LogCategory,
      number
    >;
}

interface ActorState {
  groupId: string;
  lastEventAtMs: number;
}

const DEFAULT_IDLE_WINDOW_MS =
  10_000;

const DEFAULT_NAVIGATION_SPLIT_MS =
  2_000;

const DEFAULT_MAX_GROUPS =
  500;

const DEFAULT_MAX_REQUESTS_PER_GROUP =
  100;

const MONTH_INDEX:
  Readonly<
    Record<string, number>
  > = Object.freeze({
    Jan: 0,
    Feb: 1,
    Mar: 2,
    Apr: 3,
    May: 4,
    Jun: 5,
    Jul: 6,
    Aug: 7,
    Sep: 8,
    Oct: 9,
    Nov: 10,
    Dec: 11
  });

const STATIC_ASSET_EXTENSION =
  /\.(?:css|js|mjs|map|svg|png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf|eot|mp4|webm|mp3|wav)$/iu;

const ROUTED_ASSET_PATH_HINT =
  /(?:^|\/)(?:_module-assets|assets|static|dist|build|public)(?:\/|$)/iu;

const ROUTED_MEDIA_PATH_HINT =
  /(?:^|\/)(?:img|images|fonts?|media)(?:\/|$)/iu;
const BACKGROUND_PATH_HINT =
  /(?:^|\/)(?:api|ajax|graphql|wp-json|module)(?:\/|$)/iu;

const BOT_USER_AGENT_HINT =
  /\b(?:bot|crawler|spider|slurp|headless|phantom|selenium|playwright|puppeteer)\b/iu;

const BROWSER_USER_AGENT_HINT =
  /(?:Chrome\/|CriOS\/|Firefox\/|FxiOS\/|Safari\/|Edg\/|OPR\/)/u;

function cloneGroup(
  group:
    MutableActivityGroup
): ActivityGroup {
  return {
    id:
      group.id,

    actorKey:
      group.actorKey,

    domain:
      group.domain,

    ip:
      group.ip,

    userAgent:
      group.userAgent,

    startedAt:
      group.startedAt,

    updatedAt:
      group.updatedAt,

    layer:
      group.layer,

    primaryRequest:
      group.primaryRequest
        ? {
            ...group.primaryRequest
          }
        : null,

    requestCount:
      group.requestCount,

    documentCount:
      group.documentCount,

    assetCount:
      group.assetCount,

    backgroundCount:
      group.backgroundCount,

    errorCount:
      group.errorCount,

    droppedRequestCount:
      group.droppedRequestCount,

    requests:
      group.requests.map(
        request => ({
          ...request
        })
      )
  };
}

function stripQueryAndFragment(
  value: string
): string {
  const queryIndex =
    value.indexOf("?");

  const fragmentIndex =
    value.indexOf("#");

  let end =
    value.length;

  if (
    queryIndex !== -1
  ) {
    end =
      Math.min(
        end,
        queryIndex
      );
  }

  if (
    fragmentIndex !== -1
  ) {
    end =
      Math.min(
        end,
        fragmentIndex
      );
  }

  return value.slice(
    0,
    end
  );
}

function hashActor(
  value: string
): string {
  let hash =
    0x811c9dc5;

  for (
    let index = 0;
    index < value.length;
    index += 1
  ) {
    hash ^=
      value.charCodeAt(
        index
      );

    hash =
      Math.imul(
        hash,
        0x01000193
      );
  }

  return (
    hash >>> 0
  )
    .toString(16)
    .padStart(
      8,
      "0"
    );
}

function isBrowserLikeUserAgent(
  userAgent: string
): boolean {
  return (
    userAgent.includes(
      "Mozilla/5.0"
    ) &&
    BROWSER_USER_AGENT_HINT.test(
      userAgent
    ) &&
    !BOT_USER_AGENT_HINT.test(
      userAgent
    )
  );
}

function categoryCount(
  group:
    MutableActivityGroup,
  category:
    LogCategory
): number {
  return (
    group.categoryCounts.get(
      category
    ) ??
    0
  );
}

function determineLayer(
  group:
    MutableActivityGroup
): ActivityLayer {
  if (
    categoryCount(
      group,
      "SECURITY_PROBE"
    ) > 0 ||
    categoryCount(
      group,
      "WP_PROBE"
    ) > 0
  ) {
    return "security";
  }

  if (
    categoryCount(
      group,
      "SERVER_ERROR"
    ) > 0 ||
    (
      group.primaryRequest !==
        null &&
      group.primaryRequest.status >=
        500
    )
  ) {
    return "server";
  }

  if (
    categoryCount(
      group,
      "BOT"
    ) > 0
  ) {
    return "bot";
  }

  if (
    group.primaryRequest !==
      null &&
    group.primaryRequest.status >=
      400
  ) {
    return "error";
  }

  if (
    isBrowserLikeUserAgent(
      group.userAgent
    ) &&
    group.documentCount > 0 &&
    (
      group.assetCount > 0 ||
      group.backgroundCount > 0 ||
      group.requestCount >= 3
    )
  ) {
    return "human-like";
  }

  return "unknown";
}

function eventIso(
  milliseconds: number
): string {
  return new Date(
    milliseconds
  ).toISOString();
}

export function parseActivityTimestampMs(
  timestamp: string,
  receivedAt: string
): number {
  const clean =
    timestamp
      .trim()
      .replace(
        /^\[/u,
        ""
      )
      .replace(
        /\]$/u,
        ""
      );

  const match =
    clean.match(
      /^(\d{2})\/([A-Za-z]{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2}) ([+-])(\d{2})(\d{2})$/u
    );

  if (match) {
    const [
      ,
      day,
      monthName,
      year,
      hour,
      minute,
      second,
      offsetSign,
      offsetHour,
      offsetMinute
    ] = match;

    const month =
      MONTH_INDEX[
        monthName
      ];

    if (
      month !== undefined
    ) {
      const localUtc =
        Date.UTC(
          Number(year),
          month,
          Number(day),
          Number(hour),
          Number(minute),
          Number(second)
        );

      const offsetMinutes =
        (
          Number(
            offsetHour
          ) *
            60 +
          Number(
            offsetMinute
          )
        ) *
        (
          offsetSign === "+"
            ? 1
            : -1
        );

      return (
        localUtc -
        offsetMinutes *
          60_000
      );
    }
  }

  const received =
    Date.parse(
      receivedAt
    );

  if (
    Number.isFinite(
      received
    )
  ) {
    return received;
  }

  return Date.now();
}

export function classifyActivityRequestRole(
  event:
    Pick<
      ActivityRequest,
      | "method"
      | "path"
    >
): ActivityRequestRole {
  const method =
    event.method
      .trim()
      .toUpperCase();

  const path =
    stripQueryAndFragment(
      event.path
    );

  if (
    STATIC_ASSET_EXTENSION.test(
      path
    ) ||
    ROUTED_ASSET_PATH_HINT.test(
      path
    ) ||
    ROUTED_MEDIA_PATH_HINT.test(
      path
    )
  ) {
    return "asset";
  }

  if (
    method !== "GET" &&
    method !== "HEAD"
  ) {
    return "background";
  }

  if (
    BACKGROUND_PATH_HINT.test(
      path
    )
  ) {
    return "background";
  }

  return "document";
}

export function buildActivityActorKey(
  event:
    Pick<
      ActivityRequest,
      | "domain"
      | "ip"
      | "userAgent"
    >
): string {
  const source =
    [
      event.domain
        .trim()
        .toLowerCase(),

      event.ip
        .trim(),

      event.userAgent
        .trim()
    ].join("\u001f");

  return (
    `actor:${hashActor(source)}`
  );
}

export class ActivityGroupingEngine {
  private readonly idleWindowMs:
    number;

  private readonly navigationSplitMs:
    number;

  private readonly maxGroups:
    number;

  private readonly maxRequestsPerGroup:
    number;

  private readonly groups:
    MutableActivityGroup[] =
      [];

  private readonly actorStates =
    new Map<
      string,
      ActorState
    >();

  constructor(
    options:
      ActivityGroupingOptions = {}
  ) {
    this.idleWindowMs =
      Math.max(
        1000,
        options.idleWindowMs ??
          DEFAULT_IDLE_WINDOW_MS
      );

    this.navigationSplitMs =
      Math.max(
        0,
        options.navigationSplitMs ??
          DEFAULT_NAVIGATION_SPLIT_MS
      );

    this.maxGroups =
      Math.max(
        1,
        options.maxGroups ??
          DEFAULT_MAX_GROUPS
      );

    this.maxRequestsPerGroup =
      Math.max(
        1,
        options.maxRequestsPerGroup ??
          DEFAULT_MAX_REQUESTS_PER_GROUP
      );
  }

  private findGroup(
    id: string
  ):
    MutableActivityGroup |
    undefined {
    return this.groups.find(
      group =>
        group.id === id
    );
  }

  private createGroup(
    event:
      ActivityRequest,
    actorKey:
      string,
    eventAtMs:
      number
  ):
    MutableActivityGroup {
    const group:
      MutableActivityGroup = {
        id:
          `${actorKey}:${event.sequence}`,

        actorKey,

        domain:
          event.domain,

        ip:
          event.ip,

        userAgent:
          event.userAgent,

        startedAt:
          eventIso(
            eventAtMs
          ),

        updatedAt:
          eventIso(
            eventAtMs
          ),

        layer:
          "unknown",

        primaryRequest:
          null,

        requestCount:
          0,

        documentCount:
          0,

        assetCount:
          0,

        backgroundCount:
          0,

        errorCount:
          0,

        droppedRequestCount:
          0,

        requests:
          [],

        startedAtMs:
          eventAtMs,

        updatedAtMs:
          eventAtMs,

        lastDocumentAtMs:
          null,

        categoryCounts:
          new Map<
            LogCategory,
            number
          >()
      };

    this.groups.push(
      group
    );

    while (
      this.groups.length >
      this.maxGroups
    ) {
      const removed =
        this.groups.shift();

      if (!removed) {
        break;
      }

      const state =
        this.actorStates.get(
          removed.actorKey
        );

      if (
        state?.groupId ===
        removed.id
      ) {
        this.actorStates.delete(
          removed.actorKey
        );
      }
    }

    return group;
  }

  private shouldCreateGroup(
    existing:
      MutableActivityGroup |
      undefined,
    eventAtMs:
      number,
    role:
      ActivityRequestRole,
    state:
      ActorState |
      undefined
  ): boolean {
    if (
      !existing ||
      !state
    ) {
      return true;
    }

    const idleMs =
      Math.max(
        0,
        eventAtMs -
          state.lastEventAtMs
      );

    if (
      idleMs >
      this.idleWindowMs
    ) {
      return true;
    }

    const primaryStatus =
      existing.primaryRequest
        ?.status;

    if (
      primaryStatus !==
        undefined &&
      primaryStatus >= 300 &&
      primaryStatus < 400
    ) {
      return false;
    }

    if (
      existing.layer ===
        "bot" ||
      existing.layer ===
        "security"
    ) {
      return false;
    }

    if (
      role !==
        "document" ||
      existing.documentCount ===
        0 ||
      existing.lastDocumentAtMs ===
        null
    ) {
      return false;
    }

    const navigationGapMs =
      Math.max(
        0,
        eventAtMs -
          existing.lastDocumentAtMs
      );

    return (
      navigationGapMs >
      this.navigationSplitMs
    );
  }

  private addEvent(
    group:
      MutableActivityGroup,
    event:
      ActivityRequest,
    eventAtMs:
      number,
    role:
      ActivityRequestRole
  ): void {
    group.requestCount +=
      1;

    if (
      role === "document"
    ) {
      group.documentCount +=
        1;

      group.lastDocumentAtMs =
        eventAtMs;

      if (
        group.primaryRequest ===
          null ||
        (
          group.primaryRequest.status >=
            300 &&
          group.primaryRequest.status <
            400
        )
      ) {
        group.primaryRequest = {
          sequence:
            event.sequence,

          method:
            event.method,

          path:
            event.path,

          status:
            event.status
        };
      }
    } else if (
      role === "asset"
    ) {
      group.assetCount +=
        1;
    } else {
      group.backgroundCount +=
        1;
    }

    if (
      event.status >=
      400
    ) {
      group.errorCount +=
        1;
    }

    group.categoryCounts.set(
      event.category,
      (
        group.categoryCounts.get(
          event.category
        ) ??
        0
      ) +
        1
    );

    group.updatedAtMs =
      Math.max(
        group.updatedAtMs,
        eventAtMs
      );

    group.updatedAt =
      eventIso(
        group.updatedAtMs
      );

    if (
      group.requests.length <
      this.maxRequestsPerGroup
    ) {
      group.requests.push({
        ...event,
        role
      });
    } else {
      group.droppedRequestCount +=
        1;
    }

    group.layer =
      determineLayer(
        group
      );
  }

  push(
    event:
      ActivityRequest
  ): ActivityGroupUpdate {
    const actorKey =
      buildActivityActorKey(
        event
      );

    const role =
      classifyActivityRequestRole(
        event
      );

    const eventAtMs =
      parseActivityTimestampMs(
        event.timestamp,
        event.receivedAt
      );

    const state =
      this.actorStates.get(
        actorKey
      );

    const existing =
      state
        ? this.findGroup(
            state.groupId
          )
        : undefined;

    const create =
      this.shouldCreateGroup(
        existing,
        eventAtMs,
        role,
        state
      );

    const group =
      create
        ? this.createGroup(
            event,
            actorKey,
            eventAtMs
          )
        : existing;

    if (!group) {
      throw new Error(
        "Activity group state could not be resolved."
      );
    }

    this.addEvent(
      group,
      event,
      eventAtMs,
      role
    );

    this.actorStates.set(
      actorKey,
      {
        groupId:
          group.id,

        lastEventAtMs:
          Math.max(
            state?.lastEventAtMs ??
              eventAtMs,
            eventAtMs
          )
      }
    );

    return {
      created:
        create,

      group:
        cloneGroup(
          group
        )
    };
  }

  pushMany(
    events:
      ActivityRequest[]
  ): ActivityGroup[] {
    for (
      const event
      of events
    ) {
      this.push(
        event
      );
    }

    return this.snapshot();
  }

  snapshot():
    ActivityGroup[] {
    return this.groups.map(
      cloneGroup
    );
  }

  clear(): void {
    this.groups.splice(
      0,
      this.groups.length
    );

    this.actorStates.clear();
  }
}