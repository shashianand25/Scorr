/**
 * Unit tests for domain hooks.
 * Tests verify that each hook initialises with correct default state.
 */
import { renderHook } from '@testing-library/react-hooks';
import { useQuizData } from '../hooks/useQuizData';
import { useQuizSession } from '../hooks/useQuizSession';
import { useAIGeneration } from '../hooks/useAIGeneration';
import { useNetworkState } from '../hooks/useNetworkState';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('@react-native-community/netinfo', () => ({
  configure: jest.fn(),
  addEventListener: jest.fn(() => jest.fn()),
}));
jest.mock('../lib/api', () => ({
  fetchAppConfig: jest.fn(() => Promise.resolve({ config: null, error: null })),
}));
jest.mock('../lib/quizDeduplication', () => ({
  deduplicateUserQuizzes: jest.fn((q) => Promise.resolve({ deduplicatedQuizzes: q, removedQuizIds: [], neonDeletions: [], hasChanges: false })),
}));
jest.mock('../constants/sample-quiz', () => ({
  SAMPLE_QUIZ: { id: 'sample_quiz', title: 'Sample', questionsList: [] },
}));

describe('useQuizData', () => {
  it('initialises with empty quiz list', () => {
    const { result } = renderHook(() => useQuizData());
    expect(result.current.quizzes).toEqual([]);
    expect(result.current.dataLoaded).toBe(false);
  });

  it('exposes a storageKey helper', () => {
    const { result } = renderHook(() => useQuizData());
    expect(result.current.storageKey('quizzes')).toBe('quizforge_quizzes_global');
  });
});

describe('useQuizSession', () => {
  it('initialises with correct preference defaults', () => {
    const { result } = renderHook(() => useQuizSession());
    expect(result.current.shuffleAnswers).toBe(true);
    expect(result.current.showAnswerOnSubmit).toBe(true);
    expect(result.current.autoSlideEnabled).toBe(true);
    expect(result.current.selectionMode).toBe('all');
  });

  it('activeSession starts null', () => {
    const { result } = renderHook(() => useQuizSession());
    expect(result.current.activeSession).toBeNull();
  });
});

describe('useAIGeneration', () => {
  it('starts with null appConfig and aiGenPhase', () => {
    const { result } = renderHook(() => useAIGeneration());
    expect(result.current.appConfig).toBeNull();
    expect(result.current.aiGenPhase).toBeNull();
  });
});

describe('useNetworkState', () => {
  it('initialises as connected', () => {
    const { result } = renderHook(() => useNetworkState());
    expect(result.current.isConnected).toBe(true);
    expect(result.current.bottomToast).toBeNull();
  });
});
