import { computeQuizFingerprint } from '../../lib/quizFingerprint';
import { deduplicateUserQuizzes } from '../../lib/quizDeduplication';
import { Scheduler, CardState } from '../../utils/sm2';
import { evaluateAnswers, calculateAccuracyPercentage } from '../../utils/scoring';
import { validateQuizDraft } from '../../utils/validation';

describe('Integration Flow: End-to-End Quiz Study Lifecycle', () => {
  const sampleQuizData = {
    title: 'Cellular Biology 101',
    category: 'Science',
    questions: [
      {
        id: 'q1',
        question: 'What is the powerhouse of the cell?',
        answers: [
          { id: 'a1', text: 'Mitochondria', isCorrect: true },
          { id: 'a2', text: 'Ribosome', isCorrect: false },
          { id: 'a3', text: 'Nucleus', isCorrect: false },
          { id: 'a4', text: 'Golgi Apparatus', isCorrect: false },
        ],
        explanation: 'Mitochondria generates most of the chemical energy needed by the cell.',
      },
      {
        id: 'q2',
        question: 'Which organelle contains the cell genetic material?',
        answers: [
          { id: 'a5', text: 'Nucleus', isCorrect: true },
          { id: 'a6', text: 'Lysosome', isCorrect: false },
          { id: 'a7', text: 'Vacuole', isCorrect: false },
        ],
        explanation: 'The nucleus houses the genome.',
      },
      {
        id: 'q3',
        question: 'What is the main function of ribosomes?',
        answers: [
          { id: 'a8', text: 'Protein synthesis', isCorrect: true },
          { id: 'a9', text: 'Lipid synthesis', isCorrect: false },
        ],
        explanation: 'Ribosomes translate mRNA into protein polypeptides.',
      },
    ],
  };

  it('executes the full lifecycle: validation -> fingerprinting -> study session -> SM-2 updates -> analytics', async () => {
    // Step 1: Validation
    const validationResult = validateQuizDraft({
      title: sampleQuizData.title,
      questions: sampleQuizData.questions.map((q) => ({
        question: q.question,
        options: q.answers.map((a) => a.text),
      })),
    });
    expect(validationResult.valid).toBe(true);

    // Step 2: Fingerprinting & Deduplication
    const fingerprint = await computeQuizFingerprint({ questionsList: sampleQuizData.questions });
    expect(fingerprint).toHaveLength(64); // SHA-256 hex string

    const initialQuizRecord = {
      id: 'quiz_local_1',
      title: sampleQuizData.title,
      questionsList: sampleQuizData.questions,
      contentHash: fingerprint,
      attempts: [],
    };
    const duplicateQuizRecord = {
      id: 'quiz_local_2',
      title: sampleQuizData.title,
      questionsList: sampleQuizData.questions,
      contentHash: fingerprint,
      attempts: [{ score: 10, total: 10, date: Date.now() }],
    };

    const dedupeResult = await deduplicateUserQuizzes([initialQuizRecord, duplicateQuizRecord]);
    expect(dedupeResult.deduplicatedQuizzes).toHaveLength(1);
    expect(dedupeResult.removedQuizIds).toContain('quiz_local_1');
    expect(dedupeResult.hasChanges).toBe(true);

    // Step 3: Interactive Study Session Simulation
    const userAnswersMap = {
      q1: ['a1'],
      q2: ['a6'],
      q3: ['a8'],
    };

    // Step 4: Scoring and Evaluation
    const evalResult = evaluateAnswers(sampleQuizData.questions, userAnswersMap);
    expect(evalResult.correctCount).toBe(2);
    expect(evalResult.wrongCount).toBe(1);
    expect(evalResult.scorePct).toBe(67);
    expect(evalResult.correctIds).toEqual(['q1', 'q3']);
    expect(evalResult.wrongIds).toEqual(['q2']);

    // Step 5: SuperMemo-2 (SM-2) Spaced Repetition Interval Transitions
    // Q1 was answered correctly -> Rating "easy"
    const cardQ1 = { id: 'c1', sm2_state: CardState.NEW };
    const scheduledQ1 = Scheduler.schedule(cardQ1, 'easy');
    expect(scheduledQ1.sm2_state).toBe(CardState.REVIEW);
    expect(scheduledQ1.sm2_interval).toBe(4); // Instant graduation easy interval
    expect(scheduledQ1.sm2_repetition).toBe(1);

    // Q2 was failed -> Rating "again"
    const cardQ2 = { id: 'c2', sm2_state: CardState.REVIEW, sm2_interval: 4, sm2_repetition: 2 };
    const scheduledQ2 = Scheduler.schedule(cardQ2, 'again');
    expect(scheduledQ2.sm2_state).toBe(CardState.RELEARNING);
    expect(scheduledQ2.sm2_repetition).toBe(0); // Repetitions reset on lapse

    // Step 6: Identify Wrong Questions for Targeted Remediation Queue
    const wrongQuestions = evalResult.wrongIds.map((id) =>
      sampleQuizData.questions.find((q) => q.id === id)
    );

    expect(wrongQuestions).toHaveLength(1);
    expect(wrongQuestions[0]?.id).toBe('q2');
  });
});
