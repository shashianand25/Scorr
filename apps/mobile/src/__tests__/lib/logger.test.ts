import { logger } from '../../lib/logger';
import * as Sentry from '@sentry/react-native';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
}));

describe('Structured Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('formats structured JSON log entries with timestamp, level, tag, and message', () => {
    const entry = logger.format('info', 'AuthService', 'User signed in', { uid: 'u123' });
    expect(entry).toHaveProperty('timestamp');
    expect(entry.level).toBe('info');
    expect(entry.tag).toBe('AuthService');
    expect(entry.message).toBe('User signed in');
    expect(entry.context).toEqual({ uid: 'u123' });
  });

  it('logs debug messages without throwing', () => {
    const entry = logger.debug('TestTag', 'Debug message', { key: 'val' });
    expect(entry.level).toBe('debug');
    expect(entry.message).toBe('Debug message');
  });

  it('logs info messages and records Sentry breadcrumb', () => {
    const entry = logger.info('AuthService', 'User signed in', { uid: 'u123' });
    expect(entry.level).toBe('info');
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({
      category: 'AuthService',
      message: 'User signed in',
      level: 'info',
    }));
  });

  it('logs warnings and records Sentry breadcrumb with warning level', () => {
    const entry = logger.warn('SyncService', 'Network slow, retrying', { attempt: 2 });
    expect(entry.level).toBe('warn');
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({
      category: 'SyncService',
      level: 'warning',
    }));
  });

  it('captures Error exceptions to Sentry with context', () => {
    const error = new Error('Database connection failed');
    const entry = logger.error('Database', 'Query failed', error, { query: 'SELECT *' });
    expect(entry.level).toBe('error');
    expect(Sentry.captureException).toHaveBeenCalledWith(error, {
      tags: { tag: 'Database' }, extra: { message: 'Query failed', query: 'SELECT *' } });
  });

  it('captures string error messages as Sentry messages', () => {
    const entry = logger.error('API', 'Unhandled status code 503');
    expect(entry.level).toBe('error');
    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      expect.stringContaining('[API] Unhandled status code 503'),
      'error'
    );
  });
});
