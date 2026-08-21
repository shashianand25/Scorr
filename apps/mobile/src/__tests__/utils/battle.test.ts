describe('Battle Multiplayer Logic', () => {
  function validateRoomCode(code: string): boolean {
    return /^[A-Z0-9]{6}$/.test(code.trim().toUpperCase());
  }

  function calculateBattleOutcome(hostScore: number, hostTime: number, oppScore: number, oppTime: number) {
    if (hostScore > oppScore) {
      return { winner: 'host', reason: 'score' };
    }
    if (oppScore > hostScore) {
      return { winner: 'opponent', reason: 'score' };
    }
    // Tie-breaker: faster time wins
    if (hostTime < oppTime) {
      return { winner: 'host', reason: 'time' };
    }
    if (oppTime < hostTime) {
      return { winner: 'opponent', reason: 'time' };
    }
    return { winner: 'tie', reason: 'equal' };
  }

  it('validates 6-character alphanumeric room codes', () => {
    expect(validateRoomCode('ABC123')).toBe(true);
    expect(validateRoomCode('xyz789')).toBe(true); // normalizes lowercase
    expect(validateRoomCode('12345')).toBe(false); // too short
    expect(validateRoomCode('TOOLONG123')).toBe(false); // too long
    expect(validateRoomCode('AB@#12')).toBe(false); // invalid characters
  });

  it('determines winner by highest score', () => {
    const outcome = calculateBattleOutcome(80, 45, 60, 30);
    expect(outcome.winner).toBe('host');
    expect(outcome.reason).toBe('score');
  });

  it('uses completion time as tiebreaker when scores are equal', () => {
    const outcome = calculateBattleOutcome(90, 25, 90, 40);
    expect(outcome.winner).toBe('host');
    expect(outcome.reason).toBe('time');
  });

  it('declares a tie when both scores and completion times are identical', () => {
    const outcome = calculateBattleOutcome(100, 30, 100, 30);
    expect(outcome.winner).toBe('tie');
  });
});
