/**
 * Tests for useAuth hook — Firebase auth listener, Neon sync, login/logout state.
 */
jest.mock('../../lib/firebase', () => ({
  onAuth: jest.fn(() => jest.fn()),
  signOutUser: jest.fn(() => Promise.resolve()),
}));
jest.mock('../../lib/api', () => ({
  syncUserToNeon: jest.fn(() => Promise.resolve({ user: null, error: null })),
  fetchBattleHistory: jest.fn(() => Promise.resolve({ history: [], error: null })),
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
}));

import { onAuth } from '../../lib/firebase';

describe('useAuth', () => {
  beforeEach(() => jest.clearAllMocks());

  it('registers a Firebase auth listener on mount', () => {
    const { renderHook } = require('@testing-library/react-hooks');
    const { useAuth } = require('../../hooks/useAuth');
    renderHook(() => useAuth({} as any));
    expect(onAuth).toHaveBeenCalledTimes(1);
  });

  it('returns the unsubscribe function from onAuth', () => {
    const unsub = jest.fn();
    (onAuth as jest.Mock).mockReturnValue(unsub);
    const { renderHook } = require('@testing-library/react-hooks');
    const { useAuth } = require('../../hooks/useAuth');
    const { unmount } = renderHook(() => useAuth({} as any));
    unmount();
    expect(unsub).toHaveBeenCalledTimes(1);
  });
});
