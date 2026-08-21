/**
 * Structured logger for Web application.
 * All modules should import from this file instead of using raw console directly.
 */

const IS_DEV = process.env.NODE_ENV !== "production";

export const logger = {
  /**
   * Log a non-fatal error with optional context.
   */
  error(tag: string, message: string, error?: unknown): void {
    const fullMessage = `[${tag}] ${message}`;
    if (IS_DEV) console.error(fullMessage, error);
  },

  /**
   * Log a warning.
   */
  warn(tag: string, message: string, data?: unknown): void {
    const fullMessage = `[${tag}] ${message}`;
    if (IS_DEV) console.warn(fullMessage, data);
  },

  /**
   * Log an informational event.
   */
  info(tag: string, message: string, data?: unknown): void {
    if (IS_DEV) console.log(`[${tag}] ${message}`, data);
  },

  /**
   * Log debug output — only shown in development.
   */
  debug(tag: string, message: string, data?: unknown): void {
    if (IS_DEV) console.log(`[${tag}:debug] ${message}`, data);
  },
};
