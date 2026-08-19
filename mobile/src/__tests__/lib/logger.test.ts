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

  it('logs debug messages without throwing', () => {
    expect(() => logger.debug('TestTag', 'Debug message', { key: 'val' })).not.toThrow();
  });

  it('logs info messages and records Sentry breadcrumb', () => {
    logger.info('AuthService', 'User signed in', { uid: 'u123' });
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({
      category: 'AuthService',
      message: 'User signed in',
      level: 'info',
    }));
  });

  it('logs warnings and records Sentry breadcrumb with warning level', () => {
    logger.warn('SyncService', 'Network slow, retrying', { attempt: 2 });
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({
      category: 'SyncService',
      level: 'warning',
    }));
  });

  it('captures Error exceptions to Sentry with context', () => {
    const error = new Error('Database connection failed');
    logger.error('Database', 'Query failed', error, { query: 'SELECT *' });
    expect(Sentry.captureException).toHaveBeenCalledWith(error, {
      tags: { tag: 'Database' }, extra: { message: 'Query failed' } });
  });

  it('captures string error messages as Sentry messages', () => {
    logger.error('API', 'Unhandled status code 503');
    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      expect.stringContaining('[API] Unhandled status code 503'),
      'error'
    );
  });
});
