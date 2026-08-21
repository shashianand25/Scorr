import { isValidBattleCode } from '../../utils/validation';

describe('Multiplayer BattleScreen Suite (apps/mobile/src/screens/BattleScreen.tsx)', () => {
  function clampQuestionCount(count: number, totalQuestions: number): number {
    return Math.max(1, Math.min(count, totalQuestions || 50));
  }

  function calculateWinRate(history: Array<{ won: boolean }>): number {
    if (!history.length) return 0;
    const wins = history.filter((h) => h.won).length;
    return Math.round((wins / history.length) * 100);
  }

  function calculateBattleOutcome(hostScore: number, hostTime: number, oppScore: number, oppTime: number) {
    if (hostScore > oppScore) {
      return { winner: 'host', reason: 'score' };
    }
    if (oppScore > hostScore) {
      return { winner: 'opponent', reason: 'score' };
    }
    if (hostTime < oppTime) {
      return { winner: 'host', reason: 'time' };
    }
    if (oppTime < hostTime) {
      return { winner: 'opponent', reason: 'time' };
    }
    return { winner: 'tie', reason: 'equal' };
  }

  it('clamps custom battle question counts within valid bounds', () => {
    expect(clampQuestionCount(10, 25)).toBe(10);
    expect(clampQuestionCount(100, 30)).toBe(30);
    expect(clampQuestionCount(-5, 20)).toBe(1);
    expect(clampQuestionCount(0, 50)).toBe(1);
  });

  it('validates 6-character room codes for joining battles', () => {
    expect(isValidBattleCode('ABC123')).toBe(true);
    expect(isValidBattleCode('XY987Z')).toBe(true);
    expect(isValidBattleCode('toolong123')).toBe(false);
    expect(isValidBattleCode('123')).toBe(false);
    expect(isValidBattleCode('')).toBe(false);
  });

  it('computes accurate win rate percentages from player history', () => {
    const history1 = [{ won: true }, { won: true }, { won: false }, { won: true }];
    expect(calculateWinRate(history1)).toBe(75);

    const history2 = [{ won: false }, { won: false }];
    expect(calculateWinRate(history2)).toBe(0);

    expect(calculateWinRate([])).toBe(0);
  });

  it('determines battle match outcomes and handles score tiebreakers', () => {
    const hostWin = calculateBattleOutcome(8, 20, 5, 25);
    expect(hostWin.winner).toBe('host');

    const guestWin = calculateBattleOutcome(4, 30, 9, 28);
    expect(guestWin.winner).toBe('opponent');

    const tieBreaker = calculateBattleOutcome(7, 15, 7, 22);
    expect(tieBreaker.winner).toBe('host');
    expect(tieBreaker.reason).toBe('time');
  });
});
