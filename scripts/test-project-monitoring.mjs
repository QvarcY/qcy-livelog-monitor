import assert from "node:assert/strict";

import {
  groupProjectDomains,
  normalizeMonitoredProjectDomains
} from "../dist/project-monitoring.js";

console.log("");
console.log("=== PROJECT MONITORING TESTS ===");

assert.deepEqual(
  normalizeMonitoredProjectDomains(
    [
      " App.Example.com ",
      "app.example.com",
      "example.net"
    ],
    null
  ),
  [
    "app.example.com",
    "example.net"
  ]
);

console.log("PASS monitored domain normalization");

assert.equal(
  normalizeMonitoredProjectDomains(
    null,
    []
  ),
  null
);

console.log("PASS null means monitor all");

const groups =
  groupProjectDomains([
    "example.com",
    "app.example.com",
    "docs.example.com",
    "example.net",
    "api.example.net",
    "portfolio.example.net",
    "shop.example.net",
    "status.example.net"
  ]);

assert.deepEqual(
  groups,
  [
    {
      root:
        "example.com",

      domains: [
        "example.com",
        "app.example.com",
        "docs.example.com"
      ]
    },
    {
      root:
        "example.net",

      domains: [
        "example.net",
        "api.example.net",
        "portfolio.example.net",
        "shop.example.net",
        "status.example.net"
      ]
    }
  ]
);

console.log("PASS discovered hosts grouped by existing root domain");

console.log("");
console.log("ALL PROJECT MONITORING TESTS PASSED");
console.log("");