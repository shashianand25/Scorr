import { normalizeDocumentText, computeContentHash } from '../lib/contentHash';
import { calculateSM2, isCardDue } from '../lib/sm2';
import { computeQuizFingerprint, buildQuizCanonicalString } from '../lib/quizFingerprint';

describe('Web Algorithms & Utilities Suite', () => {
  it('normalizes document text correctly', () => {
    expect(normalizeDocumentText('  Hello   World\n\n\n\nTest  ')).toBe('Hello World\n\nTest');
    expect(normalizeDocumentText('')).toBe('');
  });

  it('computes content hashes deterministically', async () => {
    const hash1 = await computeContentHash('Sample Study Notes', 'en');
    const hash2 = await computeContentHash('Sample Study Notes', 'en');
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);

    const hashEmpty = await computeContentHash('', '');
    expect(hashEmpty).toBeDefined();
  });

  it('computes SM-2 intervals and ease factors', () => {
    const perfect = calculateSM2(4, {});
    expect(perfect.sm2_repetition).toBe(1);
    expect(perfect.sm2_interval).toBe(1);

    const hard = calculateSM2(2, perfect);
    expect(hard.sm2_repetition).toBe(2);
    expect(hard.sm2_interval).toBe(3);

    const step2 = calculateSM2(3, perfect);
    expect(step2.sm2_repetition).toBe(2);
    expect(step2.sm2_interval).toBe(6);

    const step3 = calculateSM2(4, step2);
    expect(step3.sm2_repetition).toBe(3);

    const fail = calculateSM2(1, step2);
    expect(fail.sm2_repetition).toBe(0);
    expect(fail.sm2_interval).toBe(1);

    expect(isCardDue({ sm2_nextReviewDate: Date.now() - 1000 })).toBe(true);
    expect(isCardDue({ sm2_nextReviewDate: Date.now() + 100000 })).toBe(false);
    expect(isCardDue({})).toBe(true);
  });

  it('computes quiz fingerprints from questions and titles', async () => {
    expect(buildQuizCanonicalString(null as any)).toBe('');
    expect(await computeQuizFingerprint(null as any)).toBe('');

    const quiz = {
      title: 'Title',
      questionsList: [
        { id: '1', prompt: 'Question 1', answers: [{ text: 'A', isCorrect: true }, { text: 'B', isCorrect: false }] }
      ],
      flashcards: [
        { front: 'F1', back: 'B1' }
      ]
    };
    const canonical = buildQuizCanonicalString(quiz);
    expect(canonical).toContain('Question 1');
    const fp1 = await computeQuizFingerprint(quiz);
    const fp2 = await computeQuizFingerprint(quiz);
    expect(fp1).toBe(fp2);
    expect(fp1).toHaveLength(64);

    const textOnlyQuiz = { sourceText: 'Raw notes' };
    const fpSrc = await computeQuizFingerprint(textOnlyQuiz);
    expect(fpSrc).toBeDefined();
  });
});
