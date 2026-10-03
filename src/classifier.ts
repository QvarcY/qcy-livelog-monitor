import type { AccessLogEntry } from "./parser.js";

export type LogCategory =
  | "GREETING"
  | "WP_PROBE"
  | "WP_TRAFFIC"
  | "SECURITY_PROBE"
  | "BOT"
  | "SERVER_ERROR"
  | "NOT_FOUND"
  | "VISITOR";

const wpPath =
  /\/(?:wp-admin(?:\/|$)|wp-login\.php(?:$|[?/])|wp-content(?:\/|$)|wp-includes(?:\/|$)|wp-json(?:\/|$)|xmlrpc\.php(?:$|[?/])|wordpress(?:\/|$))/i;

const securityProbe =
  /(?:\/\.env(?:$|[/?])|\/\.git(?:\/|$)|\/phpmyadmin(?:\/|$)|\/vendor\/phpunit|\/cgi-bin(?:\/|$))/i;

const botUserAgent =
  /(?:googlebot|bingbot|facebookexternalhit|oai-searchbot|barkrowler|crawler|spider|\bbot\b)/i;

const greeting =
  /(?:sveicien|hello[\s_-]*admin|knock[\s_-]*knock|hello from|admin from terminal)/i;

export function classify(
  entry: AccessLogEntry
): LogCategory {
  if (
    greeting.test(entry.userAgent) ||
    greeting.test(entry.path)
  ) {
    return "GREETING";
  }

  if (securityProbe.test(entry.path)) {
    return "SECURITY_PROBE";
  }

  if (entry.status >= 500) {
    return "SERVER_ERROR";
  }

  if (
    wpPath.test(entry.path) &&
    entry.status >= 400
  ) {
    return "WP_PROBE";
  }

  if (botUserAgent.test(entry.userAgent)) {
    return "BOT";
  }

  if (wpPath.test(entry.path)) {
    return "WP_TRAFFIC";
  }

  if (entry.status === 404) {
    return "NOT_FOUND";
  }

  return "VISITOR";
}