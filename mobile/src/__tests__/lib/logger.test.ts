/**
 * Tests for the structured logger — Sentry integration, dev/prod behaviour.
 */
jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
}));

import * as Sentry from '@sentry/react-native';
import { logger } from '../../lib/logger';

beforeEach(() => jest.clearAllMocks());

describe('logger.error', () => {
  it('calls Sentry.captureException when given an Error', () => {
    const err = new Error('test error');
    logger.error('TestTag', 'something broke', err);
    expect(Sentry.captureException).toHaveBeenCalledWith(err, expect.objectContaining({ tags: { tag: 'TestTag' } }));
  });

  it('calls Sentry.captureMessage when given a non-Error', () => {
    logger.error('TestTag', 'something broke', 'string error');
    expect(Sentry.captureMessage).toHaveBeenCalledWith('[TestTag] something broke', 'error');
  });
});

describe('logger.warn', () => {
  it('adds a Sentry breadcrumb with warning level', () => {
    logger.warn('Network', 'connection lost');
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({ level: 'warning', category: 'Network' }));
  });
});

describe('logger.info', () => {
  it('adds a Sentry breadcrumb with info level', () => {
    logger.info('Auth', 'user signed in');
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({ level: 'info', category: 'Auth' }));
  });
});

describe('logger.debug', () => {
  it('does not call any Sentry method', () => {
    logger.debug('Dev', 'verbose debug message');
    expect(Sentry.captureException).not.toHaveBeenCalled();
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
    expect(Sentry.addBreadcrumb).not.toHaveBeenCalled();
  });
});
