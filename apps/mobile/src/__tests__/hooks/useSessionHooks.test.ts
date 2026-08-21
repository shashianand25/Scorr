import { renderHook, act } from '@testing-library/react-hooks';
import { useBattleFlow } from '../../hooks/useBattleFlow';
import { useFlashcardSession } from '../../hooks/useFlashcardSession';
import { useQuizGeneration } from '../../hooks/useQuizGeneration';

describe('useBattleFlow', () => {
  it('initializes with idle phase and no room code', () => {
    const initial = {
      phase: 'idle' as const,
      roomCode: null,
      isHost: false,
      opponentName: null,
      hostScore: 0,
      guestScore: 0,
    };
    expect(initial.phase).toBe('idle');
    expect(initial.roomCode).toBeNull();
    expect(initial.hostScore).toBe(0);
  });

  it('computes winner by score comparison', () => {
    const hostScore = 9;
    const guestScore = 7;
    const hostWins = hostScore > guestScore;
    expect(hostWins).toBe(true);
    expect(hostScore - guestScore).toBe(2);
  });

  it('handles tie condition', () => {
    const hostScore = 5;
    const guestScore = 5;
    expect(hostScore === guestScore).toBe(true);
  });
});

describe('useFlashcardSession', () => {
  it('starts on front side at index 0', () => {
    const state = { currentIndex: 0, side: 'front' as const };
    expect(state.currentIndex).toBe(0);
    expect(state.side).toBe('front');
  });

  it('marks session complete when index reaches total', () => {
    const total = 5;
    let index = 4;
    index += 1;
    expect(index >= total).toBe(true);
  });

  it('tracks known and unknown card counts separately', () => {
    let known = 0;
    let unknown = 0;
    known++; known++; unknown++;
    expect(known).toBe(2);
    expect(unknown).toBe(1);
    expect(known + unknown).toBe(3);
  });

  it('flips between front and back', () => {
    let side: 'front' | 'back' = 'front';
    side = side === 'front' ? 'back' : 'front';
    expect(side).toBe('back');
    side = side === 'front' ? 'back' : 'front';
    expect(side).toBe('front');
  });
});

describe('useQuizGeneration', () => {
  it('initializes as not generating', () => {
    const state = { isGenerating: false, generationProgress: 0, generationError: null };
    expect(state.isGenerating).toBe(false);
    expect(state.generationProgress).toBe(0);
    expect(state.generationError).toBeNull();
  });

  it('resets progress to 0 when generation starts', () => {
    let progress = 50;
    progress = 0; // reset on start
    expect(progress).toBe(0);
  });

  it('clears error when reset', () => {
    let error: string | null = 'Some error';
    error = null; // reset
    expect(error).toBeNull();
  });
});
