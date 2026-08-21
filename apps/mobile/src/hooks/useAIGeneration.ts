import { useState, useRef, useEffect } from 'react';
import { fetchAppConfig } from '../lib/api';
import type { AppConfig } from '../lib/api';

/**
 * useAIGeneration — owns AI generation phase state, abort controller ref,
 * and app config. Extracted from HomeScreen god-file (lines ~501-509, 1085, 1157, 1670-1708).
 */
export function useAIGeneration() {
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [aiGenPhase, setAiGenPhase] = useState<null | 'select' | 'generating'>(null);

  const aiGenAbortControllerRef = useRef<AbortController | null>(null);
  const aiGenCancelledRef = useRef<boolean>(false);

  // ── Fetch remote app config on mount ──
  useEffect(() => {
    fetchAppConfig().then(({ config, error }) => {
      if (config) {
        setAppConfig(config);
      } else {
        console.warn('[App Config] Failed to load config from backend:', error);
      }
    });
  }, []);

  return {
    // State
    appConfig, setAppConfig,
    aiGenPhase, setAiGenPhase,
    // Refs
    aiGenAbortControllerRef,
    aiGenCancelledRef,
  };
}
