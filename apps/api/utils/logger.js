/**
 * Structured JSON Logger for Scorr Backend API.
 * Emits machine-readable JSON log events with ISO timestamps, log levels, tags, and context.
 * Includes optional Sentry error tracking integration.
 */

function formatLogEntry(level, tag, message, context = {}) {
  return {
    timestamp: new Date().toISOString(),
    level,
    tag,
    message,
    context: typeof context === 'object' && context !== null ? context : { data: context },
  };
}

const logger = {
  info(tag, message, context) {
    const entry = formatLogEntry('info', tag, message, context);
    console.log(JSON.stringify(entry));
    return entry;
  },

  warn(tag, message, context) {
    const entry = formatLogEntry('warn', tag, message, context);
    console.warn(JSON.stringify(entry));
    return entry;
  },

  error(tag, message, error, context = {}) {
    const errorDetails = error instanceof Error
      ? { message: error.message, stack: error.stack }
      : { error };

    const entry = formatLogEntry('error', tag, message, {
      ...errorDetails,
      ...(typeof context === 'object' && context !== null ? context : {}),
    });

    console.error(JSON.stringify(entry));

    // Optional error tracking sink (e.g. Sentry)
    if (process.env.SENTRY_DSN && typeof global.__sentryCaptureException === 'function') {
      try {
        global.__sentryCaptureException(error || new Error(message), {
          tags: { tag },
          extra: entry.context,
        });
      } catch {
        // Fallback silently if tracker fails
      }
    }

    return entry;
  },

  debug(tag, message, context) {
    if (process.env.NODE_ENV !== 'production') {
      const entry = formatLogEntry('debug', tag, message, context);
      console.log(JSON.stringify(entry));
      return entry;
    }
    return null;
  },
};

module.exports = logger;
