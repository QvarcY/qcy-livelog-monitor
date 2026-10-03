import {
  groupProjectDomains
} from "../../project-monitoring.js";

interface StartupLog {
  domain: string;
  fileName: string;
}

interface ProjectFilterDetail {
  domains:
    string[] | null;
}

const PROJECT_FILTER_EVENT =
  "qcy:project-filter";

const COLLAPSED_STORAGE_KEY =
  "qcy-monitor-tree-collapsed-v1";

let languageObserver:
  MutationObserver | null =
    null;

function labels(): {
  allProjects: string;
  monitored: string;
  noProjects: string;
  rootHost: string;
} {
  const latvian =
    document.documentElement.lang
      .toLowerCase()
      .startsWith("lv");

  return latvian
    ? {
        allProjects:
          "Visi projekti",

        monitored:
          "monitorē",

        noProjects:
          "Nav atrastu projektu",

        rootHost:
          "galvenais hosts"
      }
    : {
        allProjects:
          "All projects",

        monitored:
          "monitored",

        noProjects:
          "No projects found",

        rootHost:
          "root host"
      };
}

function readCollapsedGroups():
  Set<string> {
  try {
    const raw =
      window.localStorage.getItem(
        COLLAPSED_STORAGE_KEY
      );

    if (!raw) {
      return new Set();
    }

    const parsed: unknown =
      JSON.parse(
        raw
      );

    if (
      !Array.isArray(
        parsed
      )
    ) {
      return new Set();
    }

    return new Set(
      parsed.filter(
        (
          value
        ): value is string =>
          typeof value ===
          "string"
      )
    );
  } catch {
    return new Set();
  }
}

function writeCollapsedGroups(
  groups:
    Set<string>
): void {
  try {
    window.localStorage.setItem(
      COLLAPSED_STORAGE_KEY,
      JSON.stringify(
        [...groups]
      )
    );
  } catch {
    // UI preference only
  }
}

function projectHue(
  value: string
): number {
  let hash =
    0;

  for (
    const character
    of value
  ) {
    hash =
      (
        hash * 31 +
        character.charCodeAt(
          0
        )
      ) | 0;
  }

  return (
    Math.abs(
      hash
    ) %
    300
  ) + 20;
}

function broadcastFilter(
  domains:
    string[] | null
): void {
  window.dispatchEvent(
    new CustomEvent<ProjectFilterDetail>(
      PROJECT_FILTER_EVENT,
      {
        detail: {
          domains
        }
      }
    )
  );
}

export async function setupProjectMonitorTree(
  logs:
    StartupLog[]
): Promise<void> {
  const list =
    document.getElementById(
      "project-list"
    );

  const counter =
    document.getElementById(
      "project-count"
    );

  if (
    !list ||
    !counter
  ) {
    throw new Error(
      "Project sidebar elements are missing."
    );
  }

  /*
   * Keep narrowed DOM references for callbacks
   * that execute after the initial guard.
   */
  const projectList =
    list;

  const projectCounter =
    counter;

  const uniqueLogs =
    [
      ...new Map(
        logs.map(
          log => [
            log.domain
              .trim()
              .toLowerCase(),

            {
              ...log,

              domain:
                log.domain
                  .trim()
                  .toLowerCase()
            }
          ]
        )
      ).values()
    ].sort(
      (
        left,
        right
      ) =>
        left.domain.localeCompare(
          right.domain
        )
    );

  const availableDomains =
    uniqueLogs.map(
      log =>
        log.domain
    );

  const availableSet =
    new Set(
      availableDomains
    );

  const logByDomain =
    new Map(
      uniqueLogs.map(
        log => [
          log.domain,
          log
        ]
      )
    );

  const preferences =
    await window.qcyLiveLog
      .getPreferences();

  const selected =
    new Set<string>(
      preferences
        .monitoredProjectDomains ===
        null
        ? availableDomains
        : preferences
            .monitoredProjectDomains
            .filter(
              domain =>
                availableSet.has(
                  domain
                    .trim()
                    .toLowerCase()
                )
            )
            .map(
              domain =>
                domain
                  .trim()
                  .toLowerCase()
            )
    );

  const collapsed =
    readCollapsedGroups();

  const groups =
    groupProjectDomains(
      availableDomains
    );

  let persistTimer:
    number | null =
      null;

  let persistRevision =
    0;

  function currentPayload():
    string[] | null {
    if (
      selected.size ===
      availableDomains.length
    ) {
      return null;
    }

    return [
      ...selected
    ].sort(
      (
        left,
        right
      ) =>
        left.localeCompare(
          right
        )
    );
  }

  function schedulePersist():
    void {
    const payload =
      currentPayload();

    broadcastFilter(
      payload
    );

    render();

    if (
      persistTimer !==
      null
    ) {
      window.clearTimeout(
        persistTimer
      );
    }

    const revision =
      ++persistRevision;

    projectList.classList.add(
      "is-saving"
    );

    persistTimer =
      window.setTimeout(
        () => {
          persistTimer =
            null;

          void window.qcyLiveLog
            .setMonitoredProjects(
              payload
            )
            .then(
              () => {
                if (
                  revision !==
                  persistRevision
                ) {
                  return;
                }

                projectList.classList.remove(
                  "is-saving"
                );
              }
            )
            .catch(
              error => {
                projectList.classList.remove(
                  "is-saving"
                );

                projectList.classList.add(
                  "has-save-error"
                );

                console.error(
                  "Project monitoring update failed:",
                  error
                );
              }
            );
        },
        420
      );
  }

  function makeCheckbox(
    checked:
      boolean,
    indeterminate:
      boolean
  ): HTMLInputElement {
    const input =
      document.createElement(
        "input"
      );

    input.type =
      "checkbox";

    input.className =
      "monitor-checkbox";

    input.checked =
      checked;

    input.indeterminate =
      indeterminate;

    return input;
  }

  function render():
    void {
    const text =
      labels();

    projectList.replaceChildren();

    projectList.classList.add(
      "monitor-tree"
    );

    projectList.classList.remove(
      "has-save-error"
    );

    projectCounter.textContent =
      `${selected.size}/${availableDomains.length}`;

    if (
      availableDomains.length ===
      0
    ) {
      const empty =
        document.createElement(
          "div"
        );

      empty.className =
        "monitor-tree-empty";

      empty.textContent =
        text.noProjects;

      projectList.append(
        empty
      );

      return;
    }

    const allChecked =
      selected.size ===
      availableDomains.length;

    const allIndeterminate =
      selected.size > 0 &&
      !allChecked;

    const master =
      document.createElement(
        "label"
      );

    master.className =
      "project-row monitor-master-row";

    const masterCheck =
      makeCheckbox(
        allChecked,
        allIndeterminate
      );

    masterCheck.addEventListener(
      "change",
      () => {
        selected.clear();

        if (
          masterCheck.checked
        ) {
          for (
            const domain
            of availableDomains
          ) {
            selected.add(
              domain
            );
          }
        }

        schedulePersist();
      }
    );

    const masterCopy =
      document.createElement(
        "span"
      );

    masterCopy.className =
      "monitor-master-copy";

    const masterName =
      document.createElement(
        "strong"
      );

    masterName.textContent =
      text.allProjects;

    const masterMeta =
      document.createElement(
        "small"
      );

    masterMeta.textContent =
      `${selected.size}/${availableDomains.length} ${text.monitored}`;

    masterCopy.append(
      masterName,
      masterMeta
    );

    const masterCount =
      document.createElement(
        "span"
      );

    masterCount.className =
      "monitor-tree-count";

    masterCount.textContent =
      `${selected.size}/${availableDomains.length}`;

    master.append(
      masterCheck,
      masterCopy,
      masterCount
    );

    projectList.append(
      master
    );

    for (
      const group
      of groups
    ) {
      const groupElement =
        document.createElement(
          "section"
        );

      groupElement.className =
        "monitor-group";

      const hue =
        projectHue(
          group.root
        );

      groupElement.style.setProperty(
        "--monitor-hue",
        String(
          hue
        )
      );

      const groupSelected =
        group.domains.filter(
          domain =>
            selected.has(
              domain
            )
        ).length;

      const groupChecked =
        groupSelected ===
        group.domains.length;

      const groupIndeterminate =
        groupSelected > 0 &&
        !groupChecked;

      const header =
        document.createElement(
          "div"
        );

      header.className =
        "monitor-group-header";

      const groupCheck =
        makeCheckbox(
          groupChecked,
          groupIndeterminate
        );

      groupCheck.addEventListener(
        "change",
        () => {
          for (
            const domain
            of group.domains
          ) {
            if (
              groupCheck.checked
            ) {
              selected.add(
                domain
              );
            } else {
              selected.delete(
                domain
              );
            }
          }

          schedulePersist();
        }
      );

      const toggle =
        document.createElement(
          "button"
        );

      toggle.type =
        "button";

      toggle.className =
        "monitor-group-toggle";

      const isCollapsed =
        collapsed.has(
          group.root
        );

      toggle.setAttribute(
        "aria-expanded",
        String(
          !isCollapsed
        )
      );

      const arrow =
        document.createElement(
          "span"
        );

      arrow.className =
        "monitor-group-arrow";

      arrow.textContent =
        isCollapsed
          ? "›"
          : "⌄";

      const color =
        document.createElement(
          "span"
        );

      color.className =
        "monitor-group-color";

      const name =
        document.createElement(
          "strong"
        );

      name.textContent =
        group.root;

      toggle.append(
        arrow,
        color,
        name
      );

      const groupCount =
        document.createElement(
          "span"
        );

      groupCount.className =
        "monitor-tree-count";

      groupCount.textContent =
        `${groupSelected}/${group.domains.length}`;

      header.append(
        groupCheck,
        toggle,
        groupCount
      );

      const children =
        document.createElement(
          "div"
        );

      children.className =
        "monitor-group-children";

      children.hidden =
        isCollapsed;

      toggle.addEventListener(
        "click",
        () => {
          if (
            collapsed.has(
              group.root
            )
          ) {
            collapsed.delete(
              group.root
            );
          } else {
            collapsed.add(
              group.root
            );
          }

          writeCollapsedGroups(
            collapsed
          );

          render();
        }
      );

      for (
        const domain
        of group.domains
      ) {
        const log =
          logByDomain.get(
            domain
          );

        const row =
          document.createElement(
            "label"
          );

        row.className =
          "project-row monitor-project-row";

        row.dataset.projectId =
          domain;

        row.style.setProperty(
          "--monitor-hue",
          String(
            hue
          )
        );

        row.title =
          domain;

        const checkbox =
          makeCheckbox(
            selected.has(
              domain
            ),
            false
          );

        checkbox.addEventListener(
          "change",
          () => {
            if (
              checkbox.checked
            ) {
              selected.add(
                domain
              );
            } else {
              selected.delete(
                domain
              );
            }

            schedulePersist();
          }
        );

        const marker =
          document.createElement(
            "span"
          );

        marker.className =
          "monitor-project-marker";

        const copy =
          document.createElement(
            "span"
          );

        copy.className =
          "monitor-project-copy";

        const domainName =
          document.createElement(
            "strong"
          );

        domainName.textContent =
          domain;

        const fileName =
          document.createElement(
            "small"
          );

        fileName.textContent =
          domain ===
            group.root
            ? `${text.rootHost} · ${log?.fileName ?? ""}`
            : log?.fileName ?? "";

        copy.append(
          domainName,
          fileName
        );

        row.append(
          checkbox,
          marker,
          copy
        );

        children.append(
          row
        );
      }

      groupElement.append(
        header,
        children
      );

      projectList.append(
        groupElement
      );
    }
  }

  render();

  broadcastFilter(
    currentPayload()
  );

  languageObserver
    ?.disconnect();

  languageObserver =
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
          render();
        }
      }
    );

  languageObserver.observe(
    document.documentElement,
    {
      attributes: true,
      attributeFilter: [
        "lang"
      ]
    }
  );
}