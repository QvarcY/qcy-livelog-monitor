const MONTHS: Record<string, number> = {
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
};

const APACHE_TIMESTAMP_RE =
  /^(\d{2})\/([A-Za-z]{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2}) ([+-])(\d{2})(\d{2})$/;

export function parseApacheTimestamp(
  value: string
): number | null {
  const match = value.match(
    APACHE_TIMESTAMP_RE
  );

  if (!match) {
    return null;
  }

  const day = Number(match[1]);
  const monthName =
    match[2][0].toUpperCase() +
    match[2].slice(1).toLowerCase();

  const month = MONTHS[monthName];

  if (month === undefined) {
    return null;
  }

  const year = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);

  const offsetHours = Number(match[8]);
  const offsetMinutesPart = Number(
    match[9]
  );

  if (
    day < 1 ||
    day > 31 ||
    hour > 23 ||
    minute > 59 ||
    second > 59 ||
    offsetHours > 23 ||
    offsetMinutesPart > 59
  ) {
    return null;
  }

  const localWallClockMs = Date.UTC(
    year,
    month,
    day,
    hour,
    minute,
    second
  );

  const localCheck = new Date(
    localWallClockMs
  );

  if (
    localCheck.getUTCFullYear() !== year ||
    localCheck.getUTCMonth() !== month ||
    localCheck.getUTCDate() !== day ||
    localCheck.getUTCHours() !== hour ||
    localCheck.getUTCMinutes() !== minute ||
    localCheck.getUTCSeconds() !== second
  ) {
    return null;
  }

  const offsetMinutes =
    (
      offsetHours * 60 +
      offsetMinutesPart
    ) *
    (match[7] === "+" ? 1 : -1);

  return (
    localWallClockMs -
    offsetMinutes * 60_000
  );
}

export function calculateObservedDelayMs(
  apacheTimestamp: string,
  observedAtMs = Date.now()
): number | null {
  const eventTimeMs =
    parseApacheTimestamp(
      apacheTimestamp
    );

  if (eventTimeMs === null) {
    return null;
  }

  return observedAtMs - eventTimeMs;
}

export function formatObservedDelay(
  delayMs: number
): string {
  return `${(delayMs / 1000).toFixed(1)}s`;
}