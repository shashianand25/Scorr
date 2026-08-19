/**
 * Tests for useQuizSession — session state, preferences, timers.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('@sentry/react-native', () => ({
  addBreadcrumb: jest.fn(), captureException: jest.fn(), captureMessage: jest.fn(),
}));

describe('useQuizSession', () => {
  it('activeSession starts null', () => {
    const { renderHook } = require('@testing-library/react-hooks');
    const { useQuizSession } = require('../../hooks/useQuizSession');
    const { result } = renderHook(() => useQuizSession());
    expect(result.current.activeSession).toBeNull();
  });

  it('has correct default preference values', () => {
    const { renderHook } = require('@testing-library/react-hooks');
    const { useQuizSession } = require('../../hooks/useQuizSession');
    const { result } = renderHook(() => useQuizSession());
    expect(result.current.shuffleAnswers).toBe(true);
    expect(result.current.showAnswerOnSubmit).toBe(true);
    expect(result.current.autoSlideEnabled).toBe(true);
  });

  it('setActiveSession updates session state', () => {
    const { renderHook, act } = require('@testing-library/react-hooks');
    const { useQuizSession } = require('../../hooks/useQuizSession');
    const { result } = renderHook(() => useQuizSession());
    const mockSession = { id: 'test-session', questions: [] };
    act(() => { result.current.setActiveSession(mockSession); });
    expect(result.current.activeSession).toEqual(mockSession);
  });
});
