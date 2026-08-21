import { deduplicateUserQuizzes, chooseCanonicalQuiz, mergeQuizPersonalState, QuizRecord } from '../../lib/quizDeduplication';
import { computeQuizFingerprint } from '../../lib/quizFingerprint';

describe('Quiz Deduplication System', () => {
  const quizA: QuizRecord = {
    id: 'quiz_1',
    neonId: 'neon_1',
    title: 'Cellular Biology',
    questionsList: [
      { id: 'q1', question: 'What is the powerhouse of the cell?', answers: [{ id: 'a1', text: 'Mitochondria', isCorrect: true }, { id: 'a2', text: 'Nucleus', isCorrect: false }] },
      { id: 'q2', question: 'Which organelle contains DNA?', answers: [{ id: 'a3', text: 'Nucleus', isCorrect: true }, { id: 'a4', text: 'Ribosome', isCorrect: false }] },
    ],
    flashcards: [{ id: 'fc1', front: 'Mitochondria', back: 'Cell powerhouse' }],
    attempts: [{ id: '1700000000', score: 80, total: 100, date: 1700000000 }],
    uniqueCorrectIds: ['q1'],
    wrongQuestions: [{ id: 'q2' }],
  };

  const quizB: QuizRecord = {
    id: 'quiz_2',
    title: 'Cellular Biology (Copy)',
    questionsList: [
      // Same questions, different answer display order
      { id: 'q1', question: 'What is the powerhouse of the cell?', answers: [{ id: 'a2', text: 'Nucleus', isCorrect: false }, { id: 'a1', text: 'Mitochondria', isCorrect: true }] },
      { id: 'q2', question: 'Which organelle contains DNA?', answers: [{ id: 'a3', text: 'Nucleus', isCorrect: true }, { id: 'a4', text: 'Ribosome', isCorrect: false }] },
    ],
    flashcards: [{ id: 'fc1', front: 'Mitochondria', back: 'Cell powerhouse' }],
    attempts: [{ id: '1700005000', score: 100, total: 100, date: 1700005000 }],
    uniqueCorrectIds: ['q2'],
    wrongQuestions: [],
  };

  describe('Fingerprinting', () => {
    it('produces identical fingerprints for quizzes with identical content regardless of answer order', async () => {
      const fpA = await computeQuizFingerprint(quizA);
      const fpB = await computeQuizFingerprint(quizB);
      expect(fpA).toBe(fpB);
    });

    it('produces different fingerprints when questions differ', async () => {
      const differentQuiz: QuizRecord = {
        ...quizA,
        id: 'quiz_diff',
        questionsList: [{ id: 'q99', question: 'What is mitosis?', answers: [{ id: 'a1', text: 'Cell division', isCorrect: true }] }],
      };
      const fpA = await computeQuizFingerprint(quizA);
      const fpDiff = await computeQuizFingerprint(differentQuiz);
      expect(fpA).not.toBe(fpDiff);
    });
  });

  describe('deduplicateUserQuizzes', () => {
    it('merges duplicate quizzes into a single canonical quiz', async () => {
      const result = await deduplicateUserQuizzes([quizA, quizB]);
      expect(result.hasChanges).toBe(true);
      expect(result.deduplicatedQuizzes.length).toBe(1);
      expect(result.removedQuizIds).toContain('quiz_2');
    });

    it('merges attempts chronologically descending (newest first)', async () => {
      const result = await deduplicateUserQuizzes([quizA, quizB]);
      const merged = result.deduplicatedQuizzes[0];
      expect(merged.attempts?.length).toBe(2);
      expect(merged.attempts?.[0].id).toBe('1700005000'); // timestamp 1700005000 > 1700000000
    });

    it('merges unique correct IDs and cleans wrong questions', async () => {
      const result = await deduplicateUserQuizzes([quizA, quizB]);
      const merged = result.deduplicatedQuizzes[0];
      expect(merged.uniqueCorrectIds).toEqual(expect.arrayContaining(['q1', 'q2']));
      // q2 was answered correctly in quizB, so it should be filtered out of wrongQuestions
      expect(merged.wrongQuestions?.length).toBe(0);
    });

    it('prioritizes cloud-synced neonId as the canonical quiz', async () => {
      const result = await deduplicateUserQuizzes([quizA, quizB]);
      expect(result.deduplicatedQuizzes[0].id).toBe('quiz_1');
      expect(result.deduplicatedQuizzes[0].neonId).toBe('neon_1');
    });

    it('is idempotent when run multiple times on already deduplicated lists', async () => {
      const pass1 = await deduplicateUserQuizzes([quizA, quizB]);
      const pass2 = await deduplicateUserQuizzes(pass1.deduplicatedQuizzes);
      expect(pass2.hasChanges).toBe(false);
      expect(pass2.deduplicatedQuizzes.length).toBe(1);
      expect(pass2.removedQuizIds.length).toBe(0);
    });
  });
});
