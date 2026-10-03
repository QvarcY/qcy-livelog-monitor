import assert from "node:assert/strict";

import {
  inferSmartActivityLayer,
  shouldSurfaceSmartActivity
} from "../dist/electron/smart-activity.js";

function group({
  primaryRequest = null,
  layer = "unknown",
  requests = []
} = {}) {
  return {
    id: "test",
    actorKey: "actor:test",

    domain:
      "example.test",

    ip:
      "203.0.113.10",

    userAgent:
      "Test",

    startedAt:
      "2026-10-03T20:00:00.000Z",

    updatedAt:
      "2026-10-03T20:00:01.000Z",

    layer,

    primaryRequest,

    requestCount:
      requests.length,

    documentCount:
      requests.filter(
        request =>
          request.role ===
          "document"
      ).length,

    assetCount:
      requests.filter(
        request =>
          request.role ===
          "asset"
      ).length,

    backgroundCount:
      requests.filter(
        request =>
          request.role ===
          "background"
      ).length,

    errorCount:
      0,

    droppedRequestCount:
      0,

    requests
  };
}

function request({
  sequence = 1,
  role = "background",
  method = "POST",
  path = "/login",
  status = 200
} = {}) {
  return {
    sequence,

    receivedAt:
      "2026-10-03T20:00:00.000Z",

    domain:
      "example.test",

    category:
      "VISITOR",

    ip:
      "203.0.113.10",

    timestamp:
      "",

    method,
    path,

    protocol:
      "HTTP/2",

    status,

    bytes:
      "100",

    referer:
      "-",

    userAgent:
      "Test",

    observedDelayMs:
      100,

    role
  };
}

console.log("");
console.log("=== SMART ACTIVITY SURFACE TESTS ===");

assert.equal(
  shouldSurfaceSmartActivity(
    group({
      primaryRequest: {
        sequence: 1,
        method: "GET",
        path: "/dashboard",
        status: 200
      },
      requests: [
        request({
          role: "document",
          method: "GET",
          path: "/dashboard"
        })
      ]
    })
  ),
  true
);

console.log("PASS document activity is surfaced");

assert.equal(
  shouldSurfaceSmartActivity(
    group({
      requests: [
        request({
          method: "POST",
          path: "/login"
        })
      ]
    })
  ),
  true
);

console.log("PASS meaningful POST action is surfaced");

assert.equal(
  shouldSurfaceSmartActivity(
    group({
      requests: [
        request({
          method: "POST",
          path: "/api/order"
        })
      ]
    })
  ),
  true
);

console.log("PASS API mutation is surfaced");

assert.equal(
  shouldSurfaceSmartActivity(
    group({
      requests: [
        request({
          method: "POST",
          path: "/_analytics/event"
        })
      ]
    })
  ),
  false
);

console.log("PASS analytics telemetry stays suppressed");

assert.equal(
  shouldSurfaceSmartActivity(
    group({
      requests: [
        request({
          role: "asset",
          method: "GET",
          path: "/assets/app.js"
        })
      ]
    })
  ),
  false
);

console.log("PASS asset-only noise stays suppressed");

assert.equal(
  shouldSurfaceSmartActivity(
    group({
      layer: "security",
      requests: [
        request({
          method: "GET",
          path: "/wp-admin/"
        })
      ]
    })
  ),
  true
);

console.log("PASS security activity is always surfaced");

{
  const browser =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
    "AppleWebKit/537.36 Chrome/154.0.0.0 Safari/537.36";

  const activity =
    group({
      requests: [
        {
          ...request({
            role: "document",
            method: "GET",
            path: "/dashboard",
            status: 200
          }),
          userAgent: browser
        }
      ]
    });

  assert.equal(
    inferSmartActivityLayer(
      activity
    ),
    "human-like"
  );
}

console.log("PASS authenticated route becomes human-like");

{
  const browser =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
    "AppleWebKit/537.36 Chrome/154.0.0.0 Safari/537.36";

  const activity =
    group({
      requests: [
        {
          ...request({
            sequence: 1,
            role: "document",
            method: "GET",
            path: "/",
            status: 200
          }),
          userAgent: browser
        },
        {
          ...request({
            sequence: 2,
            role: "document",
            method: "GET",
            path: "/portfolio/",
            status: 200
          }),
          userAgent: browser
        }
      ]
    });

  assert.equal(
    inferSmartActivityLayer(
      activity
    ),
    "human-like"
  );
}

console.log("PASS multi-page browser journey becomes human-like");

{
  const browser =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
    "AppleWebKit/537.36 Chrome/154.0.0.0 Safari/537.36";

  const activity =
    group({
      requests: [
        {
          ...request({
            role: "background",
            method: "POST",
            path: "/lv/module/craftinvisitorjourney/collect",
            status: 200
          }),
          userAgent: browser
        }
      ]
    });

  assert.equal(
    inferSmartActivityLayer(
      activity
    ),
    "unknown"
  );

  assert.equal(
    shouldSurfaceSmartActivity(
      activity
    ),
    false
  );
}

console.log("PASS visitor journey telemetry is not human evidence");

{
  const browser =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
    "AppleWebKit/537.36 Chrome/154.0.0.0 Safari/537.36";

  const activity =
    group({
      layer: "bot",
      requests: [
        {
          ...request({
            role: "document",
            method: "GET",
            path: "/dashboard",
            status: 200
          }),
          userAgent: browser
        }
      ]
    });

  assert.equal(
    inferSmartActivityLayer(
      activity
    ),
    "bot"
  );
}

console.log("PASS existing bot evidence wins over human heuristic");

console.log("");
console.log("ALL SMART ACTIVITY SURFACE TESTS PASSED");
console.log("");