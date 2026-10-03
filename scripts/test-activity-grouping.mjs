import assert from "node:assert/strict";

import {
  ActivityGroupingEngine,
  buildActivityActorKey,
  classifyActivityRequestRole,
  parseActivityTimestampMs
} from "../dist/activity-grouping.js";

function event(
  sequence,
  {
    receivedAt = "2026-10-03T21:00:00.000Z",
    timestamp = "",
    domain = "shop.example.test",
    category = "VISITOR",
    ip = "203.0.113.10",
    method = "GET",
    path = "/",
    status = 200,
    userAgent =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
      "AppleWebKit/537.36 Chrome/154.0.0.0 Safari/537.36",
    referer = "-"
  } = {}
) {
  return {
    sequence,
    receivedAt,
    domain,
    category,
    ip,
    timestamp,
    method,
    path,
    protocol: "HTTP/2",
    status,
    bytes: "1234",
    referer,
    userAgent,
    observedDelayMs: 100
  };
}

console.log("");
console.log("=== ACTIVITY GROUPING REGRESSION TESTS ===");

assert.equal(
  classifyActivityRequestRole(
    event(
      1,
      {
        path:
          "/assets/app.css?v=12"
      }
    )
  ),
  "asset"
);

assert.equal(
  classifyActivityRequestRole(
    event(
      2,
      {
        path:
          "/api/orders"
      }
    )
  ),
  "background"
);

assert.equal(
  classifyActivityRequestRole(
    event(
      3,
      {
        path:
          "/products/42"
      }
    )
  ),
  "document"
);

console.log("PASS request role classification");

assert.equal(
  classifyActivityRequestRole(
    event(
      10,
      {
        path:
          "/_module-assets/feedback/js?v=0.2.1"
      }
    )
  ),
  "asset"
);

assert.equal(
  classifyActivityRequestRole(
    event(
      11,
      {
        path:
          "/showcase/media/4"
      }
    )
  ),
  "asset"
);

console.log("PASS routed asset classification");

const apache =
  parseActivityTimestampMs(
    "[03/Oct/2026:23:58:49 +0300]",
    "2026-01-01T00:00:00.000Z"
  );

assert.equal(
  new Date(apache)
    .toISOString(),
  "2026-10-03T20:58:49.000Z"
);

console.log("PASS Apache timestamp parser");

assert.equal(
  buildActivityActorKey(
    event(1)
  ),
  buildActivityActorKey(
    event(2)
  )
);

assert.notEqual(
  buildActivityActorKey(
    event(1)
  ),
  buildActivityActorKey(
    event(
      2,
      {
        userAgent:
          "Different browser"
      }
    )
  )
);

console.log("PASS deterministic actor identity");

{
  const engine =
    new ActivityGroupingEngine();

  engine.push(
    event(
      1,
      {
        receivedAt:
          "2026-10-03T21:00:00.000Z",

        path:
          "/shop"
      }
    )
  );

  engine.push(
    event(
      2,
      {
        receivedAt:
          "2026-10-03T21:00:01.000Z",

        path:
          "/assets/app.css"
      }
    )
  );

  engine.push(
    event(
      3,
      {
        receivedAt:
          "2026-10-03T21:00:01.200Z",

        path:
          "/assets/logo.svg"
      }
    )
  );

  engine.push(
    event(
      4,
      {
        receivedAt:
          "2026-10-03T21:00:01.500Z",

        path:
          "/api/cart"
      }
    )
  );

  const groups =
    engine.snapshot();

  assert.equal(
    groups.length,
    1
  );

  assert.equal(
    groups[0].requestCount,
    4
  );

  assert.equal(
    groups[0].documentCount,
    1
  );

  assert.equal(
    groups[0].assetCount,
    2
  );

  assert.equal(
    groups[0].backgroundCount,
    1
  );

  assert.equal(
    groups[0].primaryRequest.path,
    "/shop"
  );

  assert.equal(
    groups[0].layer,
    "human-like"
  );
}

console.log("PASS document + assets + background grouped");

{
  const engine =
    new ActivityGroupingEngine();

  engine.push(
    event(
      1,
      {
        receivedAt:
          "2026-10-03T21:00:00.000Z",

        path:
          "/shop"
      }
    )
  );

  engine.push(
    event(
      2,
      {
        receivedAt:
          "2026-10-03T21:00:01.000Z",

        path:
          "/logo.svg"
      }
    )
  );

  engine.push(
    event(
      3,
      {
        receivedAt:
          "2026-10-03T21:00:04.000Z",

        path:
          "/checkout"
      }
    )
  );

  assert.equal(
    engine.snapshot().length,
    2
  );
}

console.log("PASS later document navigation starts new group");

{
  const engine =
    new ActivityGroupingEngine();

  engine.push(
    event(
      1,
      {
        receivedAt:
          "2026-10-03T21:00:00.000Z"
      }
    )
  );

  engine.push(
    event(
      2,
      {
        receivedAt:
          "2026-10-03T21:00:11.000Z",

        path:
          "/api/ping"
      }
    )
  );

  assert.equal(
    engine.snapshot().length,
    2
  );
}

console.log("PASS idle timeout starts new group");

{
  const engine =
    new ActivityGroupingEngine();

  engine.push(
    event(
      1,
      {
        category:
          "BOT",

        path:
          "/search?q=one"
      }
    )
  );

  engine.push(
    event(
      2,
      {
        category:
          "BOT",

        receivedAt:
          "2026-10-03T21:00:01.000Z",

        path:
          "/search?q=two"
      }
    )
  );

  const groups =
    engine.snapshot();

  assert.equal(
    groups.length,
    1
  );

  assert.equal(
    groups[0].layer,
    "bot"
  );

  assert.equal(
    groups[0].requestCount,
    2
  );
}

console.log("PASS bot burst stays grouped");

{
  const engine =
    new ActivityGroupingEngine();

  engine.push(
    event(
      1,
      {
        category:
          "SECURITY_PROBE",

        path:
          "/wp-admin/install.php",

        status:
          404
      }
    )
  );

  assert.equal(
    engine.snapshot()[0].layer,
    "security"
  );
}

console.log("PASS security layer precedence");

{
  const engine =
    new ActivityGroupingEngine();

  engine.push(
    event(
      1,
      {
        category:
          "SERVER_ERROR",

        status:
          500,

        path:
          "/checkout"
      }
    )
  );

  assert.equal(
    engine.snapshot()[0].layer,
    "server"
  );
}

console.log("PASS server error layer");

{
  const engine =
    new ActivityGroupingEngine();

  engine.push(
    event(
      1,
      {
        ip:
          "203.0.113.10",

        userAgent:
          "Browser A"
      }
    )
  );

  engine.push(
    event(
      2,
      {
        ip:
          "203.0.113.10",

        userAgent:
          "Browser B",

        receivedAt:
          "2026-10-03T21:00:01.000Z"
      }
    )
  );

  assert.equal(
    engine.snapshot().length,
    2
  );
}

console.log("PASS same IP with different UA stays separate");

{
  const engine =
    new ActivityGroupingEngine({
      maxRequestsPerGroup: 2
    });

  engine.pushMany([
    event(1),
    event(
      2,
      {
        path:
          "/asset.css"
      }
    ),
    event(
      3,
      {
        path:
          "/asset.js"
      }
    )
  ]);

  const group =
    engine.snapshot()[0];

  assert.equal(
    group.requestCount,
    3
  );

  assert.equal(
    group.requests.length,
    2
  );

  assert.equal(
    group.droppedRequestCount,
    1
  );
}

console.log("PASS raw request memory cap");

{
  const engine =
    new ActivityGroupingEngine();

  engine.push(
    event(
      100,
      {
        receivedAt:
          "2026-10-03T21:00:00.000Z",

        path:
          "/gb",

        status:
          301
      }
    )
  );

  engine.push(
    event(
      101,
      {
        receivedAt:
          "2026-10-03T21:00:04.000Z",

        path:
          "/gb/",

        status:
          200
      }
    )
  );

  const groups =
    engine.snapshot();

  assert.equal(
    groups.length,
    1
  );

  assert.equal(
    groups[0].documentCount,
    2
  );

  assert.equal(
    groups[0].primaryRequest.path,
    "/gb/"
  );
}

console.log("PASS redirect chain stays grouped");

{
  const engine =
    new ActivityGroupingEngine();

  engine.push(
    event(
      110,
      {
        category:
          "BOT",

        receivedAt:
          "2026-10-03T21:00:00.000Z",

        path:
          "/catalog?page=1"
      }
    )
  );

  engine.push(
    event(
      111,
      {
        category:
          "BOT",

        receivedAt:
          "2026-10-03T21:00:04.000Z",

        path:
          "/catalog?page=2"
      }
    )
  );

  engine.push(
    event(
      112,
      {
        category:
          "BOT",

        receivedAt:
          "2026-10-03T21:00:08.000Z",

        path:
          "/catalog?page=3"
      }
    )
  );

  const groups =
    engine.snapshot();

  assert.equal(
    groups.length,
    1
  );

  assert.equal(
    groups[0].requestCount,
    3
  );

  assert.equal(
    groups[0].layer,
    "bot"
  );
}

console.log("PASS bot navigation burst stays grouped");

{
  const engine =
    new ActivityGroupingEngine();

  engine.push(
    event(
      120,
      {
        receivedAt:
          "2026-10-03T21:00:00.000Z",

        path:
          "/dashboard"
      }
    )
  );

  engine.push(
    event(
      121,
      {
        receivedAt:
          "2026-10-03T21:00:04.000Z",

        path:
          "/_module-assets/tools/js?v=0.1.2"
      }
    )
  );

  const groups =
    engine.snapshot();

  assert.equal(
    groups.length,
    1
  );

  assert.equal(
    groups[0].documentCount,
    1
  );

  assert.equal(
    groups[0].assetCount,
    1
  );
}

console.log("PASS routed asset does not create navigation group");

console.log("");
console.log("ALL ACTIVITY GROUPING TESTS PASSED");
console.log("");