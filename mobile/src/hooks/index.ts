/**
 * Domain hooks barrel export.
 *
 * Each hook owns a bounded slice of HomeScreen state, keeping the
 * god-file thin and each concern independently testable.
 */
export { useAuth } from './useAuth';
export { useNetworkState } from './useNetworkState';
export { useQuizData } from './useQuizData';
export { useQuizSession } from './useQuizSession';
export { useBattle } from './useBattle';
export { useAIGeneration } from './useAIGeneration';
