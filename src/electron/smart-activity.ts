import {
  ActivityGroupingEngine,
  type ActivityGroup,
  type ActivityGroupUpdate,
  type ActivityLayer
} from "../activity-grouping.js";

import type {
  LiveRequestEvent
} from "./live-collector.js";

const engine =
  new ActivityGroupingEngine();

const BROWSER_USER_AGENT_HINT =
  /(?:mozilla\/5\.0|chrome\/|crios\/|firefox\/|fxios\/|safari\/|edg\/|opr\/)/iu;

const AUTHENTICATED_PATH_HINT =
  /(?:^|\/)(?:dashboard|accounting|my-account|account|profile|settings|orders?|invoices?|billing|workspace|console)(?:\/|$|\?)/iu;

const AUTH_ACTION_HINT =
  /(?:^|\/)(?:login|signin|sign-in|session|auth)(?:\/|$|\?)/iu;

const TELEMETRY_PATH_HINT =
  /(?:^|\/)(?:_analytics|analytics|telemetry|metrics|beacon)(?:\/|$)|visitorjourney.*\/collect(?:\?|$)/iu;

function isTelemetryNoise(
  path: string
): boolean {
  return TELEMETRY_PATH_HINT.test(
    path
  );
}

function isBrowserLike(
  userAgent: string
): boolean {
  return BROWSER_USER_AGENT_HINT.test(
    userAgent
  );
}

function successfulRequest(
  status: number
): boolean {
  return (
    status >= 200 &&
    status < 400
  );
}

function hasMeaningfulAction(
  group: ActivityGroup
): boolean {
  return group.requests.some(
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
        !isTelemetryNoise(
          request.path
        )
      );
    }
  );
}

export function inferSmartActivityLayer(
  group: ActivityGroup
): ActivityLayer {
  if (
    group.layer !==
      "unknown"
  ) {
    return group.layer;
  }

  const browserRequests =
    group.requests.filter(
      request =>
        isBrowserLike(
          request.userAgent
        )
    );

  if (
    browserRequests.length ===
    0
  ) {
    return "unknown";
  }

  const documents =
    browserRequests.filter(
      request =>
        request.role ===
          "document" &&
        successfulRequest(
          request.status
        )
    );

  const distinctDocuments =
    new Set(
      documents.map(
        request =>
          request.path
      )
    );

  const hasAuthenticatedPage =
    documents.some(
      request =>
        AUTHENTICATED_PATH_HINT.test(
          request.path
        )
    );

  const hasSuccessfulAuthAction =
    browserRequests.some(
      request => {
        const method =
          request.method
            .trim()
            .toUpperCase();

        return (
          method === "POST" &&
          AUTH_ACTION_HINT.test(
            request.path
          ) &&
          successfulRequest(
            request.status
          )
        );
      }
    );

  const hasSuccessfulInteraction =
    browserRequests.some(
      request => {
        const method =
          request.method
            .trim()
            .toUpperCase();

        return (
          request.role ===
            "background" &&
          method !== "GET" &&
          method !== "HEAD" &&
          !isTelemetryNoise(
            request.path
          ) &&
          successfulRequest(
            request.status
          )
        );
      }
    );

  if (
    hasAuthenticatedPage
  ) {
    return "human-like";
  }

  if (
    hasSuccessfulAuthAction &&
    documents.length > 0
  ) {
    return "human-like";
  }

  if (
    hasSuccessfulInteraction &&
    documents.length > 0
  ) {
    return "human-like";
  }

  if (
    distinctDocuments.size >=
    2
  ) {
    return "human-like";
  }

  return "unknown";
}

function enrichSmartGroup(
  group: ActivityGroup
): ActivityGroup {
  const layer =
    inferSmartActivityLayer(
      group
    );

  if (
    layer === group.layer
  ) {
    return group;
  }

  return {
    ...group,
    layer
  };
}

export function shouldSurfaceSmartActivity(
  group: ActivityGroup
): boolean {
  const enriched =
    enrichSmartGroup(
      group
    );

  if (
    enriched.primaryRequest !==
      null
  ) {
    return true;
  }

  if (
    enriched.layer ===
      "security" ||
    enriched.layer ===
      "server" ||
    enriched.layer ===
      "error"
  ) {
    return true;
  }

  return (
    hasMeaningfulAction(
      enriched
    )
  );
}

export function pushSmartActivity(
  event: LiveRequestEvent
): ActivityGroupUpdate {
  const update =
    engine.push(
      event
    );

  return {
    ...update,

    group:
      enrichSmartGroup(
        update.group
      )
  };
}

export function getSmartActivitySnapshot():
  ActivityGroup[] {
  return engine
    .snapshot()
    .map(
      enrichSmartGroup
    )
    .filter(
      shouldSurfaceSmartActivity
    );
}

export function clearSmartActivity():
  void {
  engine.clear();
}