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
      " Rekini.CraftIN.lv ",
      "rekini.craftin.lv",
      "kas.id.lv"
    ],
    null
  ),
  [
    "kas.id.lv",
    "rekini.craftin.lv"
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
    "craftin.lv",
    "rekini.craftin.lv",
    "laserlearn.craftin.lv",
    "kas.id.lv",
    "apsardze.kas.id.lv",
    "portfolio.kas.id.lv",
    "craftin.lv.kas.id.lv",
    "thenshop.kas.id.lv"
  ]);

assert.deepEqual(
  groups,
  [
    {
      root:
        "craftin.lv",

      domains: [
        "craftin.lv",
        "laserlearn.craftin.lv",
        "rekini.craftin.lv"
      ]
    },
    {
      root:
        "kas.id.lv",

      domains: [
        "kas.id.lv",
        "apsardze.kas.id.lv",
        "craftin.lv.kas.id.lv",
        "portfolio.kas.id.lv",
        "thenshop.kas.id.lv"
      ]
    }
  ]
);

console.log("PASS discovered hosts grouped by existing root domain");

console.log("");
console.log("ALL PROJECT MONITORING TESTS PASSED");
console.log("");