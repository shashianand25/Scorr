/**
 * Tests for useBattle — battle state, room code, history.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('../../lib/multiplayer', () => ({
  listenToBattleRoom: jest.fn(() => jest.fn()),
  getBattleRoom: jest.fn(() => Promise.resolve({ room: null, error: null })),
}));
jest.mock('@sentry/react-native', () => ({
  addBreadcrumb: jest.fn(), captureException: jest.fn(), captureMessage: jest.fn(),
}));

describe('useBattle', () => {
  it('initialises with empty battle history', () => {
    const { renderHook } = require('@testing-library/react-hooks');
    const { useBattle } = require('../../hooks/useBattle');
    const { result } = renderHook(() => useBattle({ setBattlePopup: jest.fn(), triggerConfettiBurst: jest.fn() } as any));
    expect(result.current.battleHistory).toEqual([]);
  });

  it('battleCountdown starts null', () => {
    const { renderHook } = require('@testing-library/react-hooks');
    const { useBattle } = require('../../hooks/useBattle');
    const { result } = renderHook(() => useBattle({ setBattlePopup: jest.fn(), triggerConfettiBurst: jest.fn() } as any));
    expect(result.current.battleCountdown).toBeNull();
  });

  it('battleRoomCode starts as empty string', () => {
    const { renderHook } = require('@testing-library/react-hooks');
    const { useBattle } = require('../../hooks/useBattle');
    const { result } = renderHook(() => useBattle({ setBattlePopup: jest.fn(), triggerConfettiBurst: jest.fn() } as any));
    expect(result.current.battleRoomCode).toBe('');
  });
});
