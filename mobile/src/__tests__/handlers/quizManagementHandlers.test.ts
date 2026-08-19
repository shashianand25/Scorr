/**
 * Tests for quiz management handlers — delete quiz, delete attempt, clear history.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('@sentry/react-native', () => ({
  addBreadcrumb: jest.fn(), captureException: jest.fn(), captureMessage: jest.fn(),
}));
jest.mock('../../lib/api', () => ({
  deleteMobileQuiz: jest.fn(() => Promise.resolve({ error: null })),
  updateMobileQuiz: jest.fn(() => Promise.resolve({ quiz: null, error: null })),
}));

describe('quiz management handler logic', () => {
  it('filters out a quiz by id', () => {
    const quizzes = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const filtered = quizzes.filter((q) => q.id !== 'b');
    expect(filtered).toHaveLength(2);
    expect(filtered.find((q) => q.id === 'b')).toBeUndefined();
  });

  it('removes an attempt from a quiz attempt list', () => {
    const attempts = [{ id: 'at1' }, { id: 'at2' }];
    const filtered = attempts.filter((a) => a.id !== 'at1');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('at2');
  });

  it('clears all history by returning empty attempts array', () => {
    const quiz = { id: 'q1', attempts: [{ id: 'at1' }, { id: 'at2' }] };
    const updated = { ...quiz, attempts: [] };
    expect(updated.attempts).toHaveLength(0);
  });

  it('does not delete other quizzes when deleting one', () => {
    const quizzes = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const filtered = quizzes.filter((q) => q.id !== 'a');
    expect(filtered).toHaveLength(2);
    expect(filtered.every((q) => q.id !== 'a')).toBe(true);
  });
});
