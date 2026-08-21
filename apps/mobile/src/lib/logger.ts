/**
 * Structured logger — wraps Sentry for error/warn reporting.
 * All modules should import from this file instead of using console directly.
 *
 * In development, messages are also echoed to the console for debuggability.
 * In production, errors and warnings are captured by Sentry.
 */
import * as Sentry from "@sentry/react-native";

const IS_DEV = __DEV__;

export const logger = {
  /**
   * Log a non-fatal error with optional context.
   * Sends to Sentry in production.
   */
  error(tag: string, message: string, error?: unknown): void {
    const fullMessage = `[${tag}] ${message}`;
    if (IS_DEV) console.error(fullMessage, error);
    if (error instanceof Error) {
      Sentry.captureException(error, { tags: { tag }, extra: { message } });
    } else {
      Sentry.captureMessage(fullMessage, "error");
    }
  },

  /**
   * Log a warning. Sends to Sentry as a breadcrumb in production.
   */
  warn(tag: string, message: string, data?: unknown): void {
    const fullMessage = `[${tag}] ${message}`;
    if (IS_DEV) console.warn(fullMessage, data);
    Sentry.addBreadcrumb({ category: tag, message, level: "warning", data: data as Record<string, unknown> });
  },

  /**
   * Log an informational event as a Sentry breadcrumb.
   */
  info(tag: string, message: string, data?: unknown): void {
    if (IS_DEV) console.log(`[${tag}] ${message}`, data);
    Sentry.addBreadcrumb({ category: tag, message, level: "info", data: data as Record<string, unknown> });
  },

  /**
   * Log debug output — only shown in development, never sent to Sentry.
   */
  debug(tag: string, message: string, data?: unknown): void {
    if (IS_DEV) console.log(`[${tag}:debug] ${message}`, data);
  },
};
