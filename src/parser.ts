export interface AccessLogEntry {
  ip: string;
  timestamp: string;
  method: string;
  path: string;
  protocol: string;
  status: number;
  bytes: string;
  referer: string;
  userAgent: string;
  raw: string;
}

const ACCESS_LOG_RE =
  /^(\S+)\s+\S+\s+\S+\s+\[([^\]]+)\]\s+"([A-Z]+)\s+(.+?)\s+(HTTP\/[^"]+)"\s+(\d{3})\s+(\S+)\s+"([^"]*)"\s+"([^"]*)"$/;

export function parseAccessLogLine(
  line: string
): AccessLogEntry | null {
  const match = line.match(ACCESS_LOG_RE);

  if (!match) {
    return null;
  }

  return {
    ip: match[1],
    timestamp: match[2],
    method: match[3],
    path: match[4],
    protocol: match[5],
    status: Number(match[6]),
    bytes: match[7],
    referer: match[8],
    userAgent: match[9],
    raw: line
  };
}