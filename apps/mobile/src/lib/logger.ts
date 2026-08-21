/**
 * Structured logger — formats logs as JSON-shaped objects and wraps Sentry.
 * All modules should import from this file instead of using console directly.
 *
 * In development, structured logs are echoed to the console.
 * In production, errors and warnings are captured by Sentry.
 */
import * as Sentry from "@sentry/react-native";

const IS_DEV = __DEV__;

export interface StructuredLogEntry {
  timestamp: string;
  level: "debug" | "info" | "warn" | "error";
  tag: string;
  message: string;
  context?: unknown;
}

export function formatLogEntry(
  level: "debug" | "info" | "warn" | "error",
  tag: string,
  message: string,
  context?: unknown
): StructuredLogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    tag,
    message,
    ...(context !== undefined ? { context } : {}),
  };
}

export const logger = {
  /**
   * Format a structured JSON log entry.
   */
  format: formatLogEntry,

  /**
   * Log a non-fatal error with optional context.
   * Sends to Sentry in production.
   */
  error(tag: string, message: string, error?: unknown, context?: unknown): StructuredLogEntry {
    const entry = formatLogEntry("error", tag, message, { error: error instanceof Error ? error.message : error, ...((context as object) || {}) });
    if (IS_DEV) console.error(JSON.stringify(entry), error);
    if (error instanceof Error) {
      Sentry.captureException(error, { tags: { tag }, extra: { message, ...((context as object) || {}) } });
    } else {
      Sentry.captureMessage(`[${tag}] ${message}`, "error");
    }
    return entry;
  },

  /**
   * Log a warning. Sends to Sentry as a breadcrumb in production.
   */
  warn(tag: string, message: string, context?: unknown): StructuredLogEntry {
    const entry = formatLogEntry("warn", tag, message, context);
    if (IS_DEV) console.warn(JSON.stringify(entry));
    Sentry.addBreadcrumb({ category: tag, message, level: "warning", data: context as Record<string, unknown> });
    return entry;
  },

  /**
   * Log an informational event as a Sentry breadcrumb.
   */
  info(tag: string, message: string, context?: unknown): StructuredLogEntry {
    const entry = formatLogEntry("info", tag, message, context);
    if (IS_DEV) console.log(JSON.stringify(entry));
    Sentry.addBreadcrumb({ category: tag, message, level: "info", data: context as Record<string, unknown> });
    return entry;
  },

  /**
   * Log debug output — only shown in development, never sent to Sentry.
   */
  debug(tag: string, message: string, context?: unknown): StructuredLogEntry {
    const entry = formatLogEntry("debug", tag, message, context);
    if (IS_DEV) console.log(JSON.stringify(entry));
    return entry;
  },
};
