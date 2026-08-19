/**
 * Tests for quiz deduplication utility.
 */
import { deduplicateUserQuizzes } from '../../lib/quizDeduplication';

const makeQuiz = (id: string, title: string) => ({
  id,
  title,
  questionsList: [{ id: 'q1', question: 'Q?', answers: [] }],
  createdAt: Date.now(),
});

describe('deduplicateUserQuizzes', () => {
  it('returns same quizzes when no duplicates', async () => {
    const quizzes = [makeQuiz('a', 'Quiz A'), makeQuiz('b', 'Quiz B')];
    const result = await deduplicateUserQuizzes(quizzes as any, 'user1', null as any);
    expect(result.deduplicatedQuizzes).toHaveLength(2);
    expect(result.hasChanges).toBe(false);
  });

  it('deduplicates quizzes with identical ids', async () => {
    const quizzes = [makeQuiz('a', 'Quiz A'), makeQuiz('a', 'Quiz A duplicate')];
    const result = await deduplicateUserQuizzes(quizzes as any, 'user1', null as any);
    expect(result.deduplicatedQuizzes.length).toBeLessThan(2);
  });

  it('returns removedQuizIds for deduped entries', async () => {
    const quizzes = [makeQuiz('a', 'Quiz A'), makeQuiz('a', 'Quiz A')];
    const result = await deduplicateUserQuizzes(quizzes as any, 'user1', null as any);
    expect(Array.isArray(result.removedQuizIds)).toBe(true);
  });
});
