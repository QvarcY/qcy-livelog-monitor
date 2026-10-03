import type { AccessLogEntry } from "./parser.js";

export type LogCategory =
  | "GREETING"
  | "WP_PROBE"
  | "SECURITY_PROBE"
  | "BOT"
  | "SERVER_ERROR"
  | "NOT_FOUND"
  | "VISITOR";

const wpProbe =
  /\/(?:wp-admin|wp-login\.php|wp-content|wp-includes|xmlrpc\.php|wordpress(?:\/|$))/i;

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

  if (wpProbe.test(entry.path)) {
    return "WP_PROBE";
  }

  if (securityProbe.test(entry.path)) {
    return "SECURITY_PROBE";
  }

  if (entry.status >= 500) {
    return "SERVER_ERROR";
  }

  if (botUserAgent.test(entry.userAgent)) {
    return "BOT";
  }

  if (entry.status === 404) {
    return "NOT_FOUND";
  }

  return "VISITOR";
}