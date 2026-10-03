import {
  ActivityGroupingEngine,
  type ActivityGroup,
  type ActivityGroupUpdate
} from "../activity-grouping.js";

import type {
  LiveRequestEvent
} from "./live-collector.js";

const engine =
  new ActivityGroupingEngine();

export function shouldSurfaceSmartActivity(
  group: ActivityGroup
): boolean {
  if (
    group.primaryRequest !==
      null
  ) {
    return true;
  }

  return (
    group.layer ===
      "security" ||
    group.layer ===
      "server" ||
    group.layer ===
      "error"
  );
}

export function pushSmartActivity(
  event: LiveRequestEvent
): ActivityGroupUpdate {
  return engine.push(
    event
  );
}

export function getSmartActivitySnapshot():
  ActivityGroup[] {
  return engine
    .snapshot()
    .filter(
      shouldSurfaceSmartActivity
    );
}

export function clearSmartActivity():
  void {
  engine.clear();
}