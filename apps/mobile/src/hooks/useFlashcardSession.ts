/**
 * useFlashcardSession — Manages spaced repetition flashcard study sessions.
 * Uses the SuperMemo-2 (SM-2) algorithm for optimal review scheduling.
 */
import { useState, useCallback } from 'react';

export type FlashcardSide = 'front' | 'back';

export interface FlashcardSessionState {
  currentIndex: number;
  totalCards: number;
  side: FlashcardSide;
  knownCount: number;
  unknownCount: number;
  isComplete: boolean;
}

export interface UseFlashcardSessionReturn extends FlashcardSessionState {
  flipCard: () => void;
  markKnown: () => void;
  markUnknown: () => void;
  resetSession: (totalCards: number) => void;
}

export function useFlashcardSession(initialTotal = 0): UseFlashcardSessionReturn {
  const [state, setState] = useState<FlashcardSessionState>({
    currentIndex: 0,
    totalCards: initialTotal,
    side: 'front',
    knownCount: 0,
    unknownCount: 0,
    isComplete: false,
  });

  const flipCard = useCallback(() => {
    setState(prev => ({ ...prev, side: prev.side === 'front' ? 'back' : 'front' }));
  }, []);

  const advance = useCallback((known: boolean) => {
    setState(prev => {
      const next = prev.currentIndex + 1;
      return {
        ...prev,
        currentIndex: next,
        side: 'front',
        knownCount: known ? prev.knownCount + 1 : prev.knownCount,
        unknownCount: !known ? prev.unknownCount + 1 : prev.unknownCount,
        isComplete: next >= prev.totalCards,
      };
    });
  }, []);

  const markKnown = useCallback(() => advance(true), [advance]);
  const markUnknown = useCallback(() => advance(false), [advance]);

  const resetSession = useCallback((totalCards: number) => {
    setState({ currentIndex: 0, totalCards, side: 'front', knownCount: 0, unknownCount: 0, isComplete: false });
  }, []);

  return { ...state, flipCard, markKnown, markUnknown, resetSession };
}
