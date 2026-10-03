export type MonitoredProjectDomains =
  string[] | null;

export interface ProjectDomainGroup {
  root: string;
  domains: string[];
}

function normalizeDomain(
  value: unknown
): string | null {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const domain =
    value
      .trim()
      .toLowerCase();

  if (
    domain === "" ||
    domain.length > 253 ||
    !/^[a-z0-9.-]+$/u.test(
      domain
    ) ||
    domain.startsWith(".") ||
    domain.endsWith(".") ||
    domain.includes("..")
  ) {
    return null;
  }

  return domain;
}

export function normalizeMonitoredProjectDomains(
  value: unknown,
  fallback:
    MonitoredProjectDomains
): MonitoredProjectDomains {
  if (value === null) {
    return null;
  }

  if (!Array.isArray(value)) {
    return fallback;
  }

  const normalized =
    value
      .map(
        normalizeDomain
      )
      .filter(
        (
          domain
        ): domain is string =>
          domain !== null
      );

  return [
    ...new Set(
      normalized
    )
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

function fallbackRoot(
  domain: string
): string {
  const labels =
    domain.split(".");

  if (labels.length <= 2) {
    return domain;
  }

  return labels
    .slice(-2)
    .join(".");
}

export function groupProjectDomains(
  input:
    readonly string[]
): ProjectDomainGroup[] {
  const domains =
    normalizeMonitoredProjectDomains(
      input,
      []
    ) ?? [];

  const groups =
    new Map<
      string,
      string[]
    >();

  for (
    const domain
    of domains
  ) {
    const candidates =
      domains
        .filter(
          candidate =>
            domain ===
              candidate ||
            domain.endsWith(
              `.${candidate}`
            )
        )
        .sort(
          (
            left,
            right
          ) => {
            const labelDifference =
              left.split(".").length -
              right.split(".").length;

            if (
              labelDifference !== 0
            ) {
              return labelDifference;
            }

            return (
              left.length -
              right.length
            );
          }
        );

    const root =
      candidates[0] ??
      fallbackRoot(
        domain
      );

    const members =
      groups.get(
        root
      ) ?? [];

    members.push(
      domain
    );

    groups.set(
      root,
      members
    );
  }

  return [
    ...groups.entries()
  ]
    .map(
      (
        [
          root,
          members
        ]
      ) => ({
        root,

        domains:
          members.sort(
            (
              left,
              right
            ) => {
              if (
                left === root
              ) {
                return -1;
              }

              if (
                right === root
              ) {
                return 1;
              }

              return (
                left.localeCompare(
                  right
                )
              );
            }
          )
      })
    )
    .sort(
      (
        left,
        right
      ) =>
        left.root.localeCompare(
          right.root
        )
    );
}