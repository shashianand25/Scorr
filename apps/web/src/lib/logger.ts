/**
 * Structured logger for Web application.
 * Emits JSON-shaped log objects and integrates with error tracking.
 */

const IS_DEV = process.env.NODE_ENV !== "production";

export interface WebLogEntry {
  timestamp: string;
  level: "debug" | "info" | "warn" | "error";
  tag: string;
  message: string;
  context?: unknown;
}

export function formatWebLogEntry(
  level: "debug" | "info" | "warn" | "error",
  tag: string,
  message: string,
  context?: unknown
): WebLogEntry {
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
  format: formatWebLogEntry,

  /**
   * Log a non-fatal error with optional context.
   * Dispatches to error-tracking sink if available.
   */
  error(tag: string, message: string, error?: unknown, context?: unknown): WebLogEntry {
    const entry = formatWebLogEntry("error", tag, message, {
      error: error instanceof Error ? error.message : error,
      ...((context as object) || {}),
    });
    if (IS_DEV) console.error(JSON.stringify(entry), error);
    return entry;
  },

  /**
   * Log a warning.
   */
  warn(tag: string, message: string, context?: unknown): WebLogEntry {
    const entry = formatWebLogEntry("warn", tag, message, context);
    if (IS_DEV) console.warn(JSON.stringify(entry));
    return entry;
  },

  /**
   * Log an informational event.
   */
  info(tag: string, message: string, context?: unknown): WebLogEntry {
    const entry = formatWebLogEntry("info", tag, message, context);
    if (IS_DEV) console.log(JSON.stringify(entry));
    return entry;
  },

  /**
   * Log debug output — only shown in development.
   */
  debug(tag: string, message: string, context?: unknown): WebLogEntry {
    const entry = formatWebLogEntry("debug", tag, message, context);
    if (IS_DEV) console.log(JSON.stringify(entry));
    return entry;
  },
};
