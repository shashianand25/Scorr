/**
 * Tests for useNetworkState — NetInfo, offline detection, pill toast.
 */
jest.mock('@react-native-community/netinfo', () => ({
  configure: jest.fn(),
  addEventListener: jest.fn((cb) => {
    cb({ isConnected: true, isInternetReachable: true });
    return jest.fn();
  }),
}));
jest.mock('@sentry/react-native', () => ({
  addBreadcrumb: jest.fn(), captureException: jest.fn(), captureMessage: jest.fn(),
}));

describe('useNetworkState', () => {
  it('initialises as connected', () => {
    const { renderHook } = require('@testing-library/react-hooks');
    const { useNetworkState } = require('../../hooks/useNetworkState');
    const { result } = renderHook(() => useNetworkState());
    expect(result.current.isConnected).toBe(true);
  });

  it('exposes bottomToast as null initially', () => {
    const { renderHook } = require('@testing-library/react-hooks');
    const { useNetworkState } = require('../../hooks/useNetworkState');
    const { result } = renderHook(() => useNetworkState());
    expect(result.current.bottomToast).toBeNull();
  });

  it('registers a NetInfo listener on mount', () => {
    const NetInfo = require('@react-native-community/netinfo');
    const { renderHook } = require('@testing-library/react-hooks');
    const { useNetworkState } = require('../../hooks/useNetworkState');
    renderHook(() => useNetworkState());
    expect(NetInfo.addEventListener).toHaveBeenCalled();
  });
});
