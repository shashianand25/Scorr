let Sentry = null;
try {
  Sentry = require('@sentry/node');
} catch {
  // Fallback if package is unavailable
}

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

    // Error tracking sink (Sentry)
    if (process.env.SENTRY_DSN) {
      try {
        if (Sentry && typeof Sentry.captureException === 'function') {
          Sentry.captureException(error instanceof Error ? error : new Error(message), {
            tags: { tag },
            extra: entry.context,
          });
        } else if (typeof global.__sentryCaptureException === 'function') {
          global.__sentryCaptureException(error || new Error(message), {
            tags: { tag },
            extra: entry.context,
          });
        }
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
