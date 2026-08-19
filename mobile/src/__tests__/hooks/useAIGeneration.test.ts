/**
 * Tests for useAIGeneration — app config, AI phase state.
 */
jest.mock('../../lib/api', () => ({
  fetchAppConfig: jest.fn(() => Promise.resolve({ config: null, error: null })),
}));
jest.mock('@sentry/react-native', () => ({
  addBreadcrumb: jest.fn(), captureException: jest.fn(), captureMessage: jest.fn(),
}));

describe('useAIGeneration', () => {
  it('initialises with null appConfig', () => {
    const { renderHook } = require('@testing-library/react-hooks');
    const { useAIGeneration } = require('../../hooks/useAIGeneration');
    const { result } = renderHook(() => useAIGeneration());
    expect(result.current.appConfig).toBeNull();
  });

  it('aiGenPhase starts null', () => {
    const { renderHook } = require('@testing-library/react-hooks');
    const { useAIGeneration } = require('../../hooks/useAIGeneration');
    const { result } = renderHook(() => useAIGeneration());
    expect(result.current.aiGenPhase).toBeNull();
  });

  it('exposes an abort controller ref', () => {
    const { renderHook } = require('@testing-library/react-hooks');
    const { useAIGeneration } = require('../../hooks/useAIGeneration');
    const { result } = renderHook(() => useAIGeneration());
    expect(result.current.aiGenAbortControllerRef).toBeDefined();
    expect(result.current.aiGenAbortControllerRef.current).toBeNull();
  });
});
