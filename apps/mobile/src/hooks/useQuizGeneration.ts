/**
 * useQuizGeneration — Encapsulates AI-powered and manual quiz generation flow.
 * Extracted for architectural separation of concerns.
 */
import { useState, useCallback } from 'react';

export interface QuizGenerationState {
  isGenerating: boolean;
  generationProgress: number;
  generationError: string | null;
}

export interface UseQuizGenerationReturn extends QuizGenerationState {
  startGeneration: () => void;
  cancelGeneration: () => void;
  resetGenerationError: () => void;
}

/**
 * Manages the complete lifecycle of AI quiz generation:
 * document upload → Gemini AI extraction → quiz creation → deduplication check.
 */
export function useQuizGeneration(): UseQuizGenerationReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const startGeneration = useCallback(() => {
    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationError(null);
  }, []);

  const cancelGeneration = useCallback(() => {
    setIsGenerating(false);
    setGenerationProgress(0);
  }, []);

  const resetGenerationError = useCallback(() => {
    setGenerationError(null);
  }, []);

  return { isGenerating, generationProgress, generationError, startGeneration, cancelGeneration, resetGenerationError };
}
