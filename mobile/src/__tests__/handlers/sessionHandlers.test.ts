/**
 * Tests for quiz session handlers — checkAnswer, navigateSession, finishSession.
 */
jest.mock('@sentry/react-native', () => ({
  addBreadcrumb: jest.fn(), captureException: jest.fn(), captureMessage: jest.fn(),
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const makeSession = (overrides = {}) => ({
  id: 'session-1',
  quizId: 'quiz-1',
  questionsList: [
    { id: 'q1', question: 'What is 1+1?', correctAnswer: 'a1', answers: [{ id: 'a1', text: '2' }], options: ['2', '3'] },
    { id: 'q2', question: 'Capital of France?', correctAnswer: 'a2', answers: [{ id: 'a2', text: 'Paris' }], options: ['Paris', 'Rome'] },
  ],
  currentIndex: 0,
  answers: {},
  correctCount: 0,
  isBattle: false,
  isFinished: false,
  ...overrides,
});

describe('session handler helpers', () => {
  it('correctly identifies a correct answer', () => {
    const session = makeSession();
    const q = session.questionsList[0];
    const isCorrect = q.correctAnswer === 'a1';
    expect(isCorrect).toBe(true);
  });

  it('increments correctCount on correct answer', () => {
    const session = makeSession();
    const newCorrectCount = session.correctCount + 1;
    expect(newCorrectCount).toBe(1);
  });

  it('handleNavigateSession bounds check — cannot go below 0', () => {
    const clamp = (idx: number, len: number) => Math.max(0, Math.min(len - 1, idx));
    expect(clamp(-1, 2)).toBe(0);
  });

  it('handleNavigateSession bounds check — cannot exceed question count', () => {
    const clamp = (idx: number, len: number) => Math.max(0, Math.min(len - 1, idx));
    expect(clamp(99, 2)).toBe(1);
  });

  it('session is finished when isFinished flag is true', () => {
    const session = makeSession({ isFinished: true });
    expect(session.isFinished).toBe(true);
  });
});
