/**
 * useBattleFlow — Manages the complete multiplayer Battle Arena lifecycle.
 * Extracted for clean architectural separation.
 */
import { useState, useCallback } from 'react';

export type BattlePhase = 'idle' | 'lobby' | 'playing' | 'results';

export interface BattleFlowState {
  phase: BattlePhase;
  roomCode: string | null;
  isHost: boolean;
  opponentName: string | null;
  hostScore: number;
  guestScore: number;
}

export interface UseBattleFlowReturn extends BattleFlowState {
  enterLobby: (roomCode: string, asHost: boolean) => void;
  startBattle: () => void;
  endBattle: (hostScore: number, guestScore: number) => void;
  resetBattle: () => void;
}

const INITIAL_STATE: BattleFlowState = {
  phase: 'idle',
  roomCode: null,
  isHost: false,
  opponentName: null,
  hostScore: 0,
  guestScore: 0,
};

export function useBattleFlow(): UseBattleFlowReturn {
  const [state, setState] = useState<BattleFlowState>(INITIAL_STATE);

  const enterLobby = useCallback((roomCode: string, asHost: boolean) => {
    setState(prev => ({ ...prev, phase: 'lobby', roomCode, isHost: asHost }));
  }, []);

  const startBattle = useCallback(() => {
    setState(prev => ({ ...prev, phase: 'playing' }));
  }, []);

  const endBattle = useCallback((hostScore: number, guestScore: number) => {
    setState(prev => ({ ...prev, phase: 'results', hostScore, guestScore }));
  }, []);

  const resetBattle = useCallback(() => setState(INITIAL_STATE), []);

  return { ...state, enterLobby, startBattle, endBattle, resetBattle };
}
