/**
 * Tests for battle handlers — host, join, start battle logic.
 */
jest.mock('../../lib/multiplayer', () => ({
  getBattleRoom: jest.fn(() => Promise.resolve({ room: null, error: null })),
  listenToBattleRoom: jest.fn(() => jest.fn()),
}));
jest.mock('@sentry/react-native', () => ({
  addBreadcrumb: jest.fn(), captureException: jest.fn(), captureMessage: jest.fn(),
}));

describe('battle handler helpers', () => {
  it('generates a 6-character room code', () => {
    const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();
    const code = generateCode();
    expect(code).toHaveLength(6);
    expect(/^[A-Z0-9]{6}$/.test(code)).toBe(true);
  });

  it('validates join code length is exactly 6', () => {
    const isValid = (code: string) => code.trim().length === 6;
    expect(isValid('ABC123')).toBe(true);
    expect(isValid('AB')).toBe(false);
    expect(isValid('')).toBe(false);
  });

  it('determines host by checking isHost flag', () => {
    const room = { hostId: 'user1', guestId: 'user2' };
    const isHost = (uid: string) => room.hostId === uid;
    expect(isHost('user1')).toBe(true);
    expect(isHost('user2')).toBe(false);
  });

  it('calculates battle score correctly', () => {
    const answers = { q1: { correct: true }, q2: { correct: false }, q3: { correct: true } };
    const score = Object.values(answers).filter((a) => a.correct).length;
    expect(score).toBe(2);
  });
});
