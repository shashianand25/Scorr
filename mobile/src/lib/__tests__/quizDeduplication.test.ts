import { computeQuizFingerprint, normalizeQuizText, buildQuizCanonicalString } from '../quizFingerprint';
import { chooseCanonicalQuiz, mergeQuizPersonalState, deduplicateUserQuizzes, QuizRecord } from '../quizDeduplication';
interface CustomAssert {
  (condition: any, msg?: string): void;
  ok(condition: any, msg?: string): void;
  strictEqual(actual: any, expected: any, msg?: string): void;
  notStrictEqual(actual: any, expected: any, msg?: string): void;
  deepStrictEqual(actual: any, expected: any, msg?: string): void;
}

const assert: CustomAssert = Object.assign(
  function (condition: any, msg?: string) {
    if (!condition) throw new Error(msg || "Assertion failed");
  },
  {
    ok: (condition: any, msg?: string) => {
      if (!condition) throw new Error(msg || "Assertion failed");
    },
    strictEqual: (actual: any, expected: any, msg?: string) => {
      if (actual !== expected) throw new Error(msg || `Expected ${expected} but got ${actual}`);
    },
    notStrictEqual: (actual: any, expected: any, msg?: string) => {
      if (actual === expected) throw new Error(msg || `Expected values to differ, but both were ${actual}`);
    },
    deepStrictEqual: (actual: any, expected: any, msg?: string) => {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(msg || `Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
    },
  }
);

async function runTests() {
  console.log('--- Starting Quiz Deduplication Test Suite ---');
  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    return (async () => {
      try {
        await fn();
        console.log(`✅ [PASS] ${name}`);
        passed++;
      } catch (err: any) {
        console.error(`❌ [FAIL] ${name}:`, err.message);
        failed++;
      }
    })();
  }

  // 1. Two identical quizzes -> one remains
  await test('1. Two identical quizzes -> one remains', async () => {
    const q1: QuizRecord = {
      id: 'quiz_1',
      title: 'Biology 101',
      questionsList: [
        { question: 'What is photosynthesis?', answers: [{ text: 'Light to energy', isCorrect: true }, { text: 'Water to ice', isCorrect: false }] }
      ],
      flashcards: [{ front: 'Mitochondria', back: 'Powerhouse of cell' }]
    };
    const q2: QuizRecord = {
      id: 'quiz_2',
      title: 'Biology 101 Copy',
      questionsList: [
        { question: 'What is photosynthesis?', answers: [{ text: 'Light to energy', isCorrect: true }, { text: 'Water to ice', isCorrect: false }] }
      ],
      flashcards: [{ front: 'Mitochondria', back: 'Powerhouse of cell' }]
    };

    const fp1 = await computeQuizFingerprint(q1);
    const fp2 = await computeQuizFingerprint(q2);
    assert.strictEqual(fp1, fp2, 'Fingerprints should match');

    const result = await deduplicateUserQuizzes([q1, q2]);
    assert.strictEqual(result.deduplicatedQuizzes.length, 1, 'Should keep only 1 quiz');
    assert.strictEqual(result.removedQuizIds.length, 1, 'Should remove 1 quiz ID');
    assert.strictEqual(result.hasChanges, true);
  });

  // 2. Identical questions but different flashcards -> both remain
  await test('2. Identical questions but different flashcards -> both remain', async () => {
    const q1: QuizRecord = {
      id: 'quiz_1',
      title: 'Math Quiz',
      questionsList: [{ question: '2 + 2 = ?', answers: [{ text: '4', isCorrect: true }, { text: '5', isCorrect: false }] }],
      flashcards: [{ front: 'Sum', back: 'Addition' }]
    };
    const q2: QuizRecord = {
      id: 'quiz_2',
      title: 'Math Quiz 2',
      questionsList: [{ question: '2 + 2 = ?', answers: [{ text: '4', isCorrect: true }, { text: '5', isCorrect: false }] }],
      flashcards: [{ front: 'Difference', back: 'Subtraction' }]
    };

    const fp1 = await computeQuizFingerprint(q1);
    const fp2 = await computeQuizFingerprint(q2);
    assert.notStrictEqual(fp1, fp2, 'Fingerprints should not match');

    const result = await deduplicateUserQuizzes([q1, q2]);
    assert.strictEqual(result.deduplicatedQuizzes.length, 2, 'Both quizzes must remain');
    assert.strictEqual(result.hasChanges, false);
  });

  // 3. Different questions but identical flashcards -> both remain
  await test('3. Different questions but identical flashcards -> both remain', async () => {
    const q1: QuizRecord = {
      id: 'quiz_1',
      title: 'Chemistry 1',
      questionsList: [{ question: 'What is H2O?', answers: [{ text: 'Water', isCorrect: true }] }],
      flashcards: [{ front: 'Atom', back: 'Basic unit of chemical element' }]
    };
    const q2: QuizRecord = {
      id: 'quiz_2',
      title: 'Chemistry 2',
      questionsList: [{ question: 'What is NaCl?', answers: [{ text: 'Salt', isCorrect: true }] }],
      flashcards: [{ front: 'Atom', back: 'Basic unit of chemical element' }]
    };

    const fp1 = await computeQuizFingerprint(q1);
    const fp2 = await computeQuizFingerprint(q2);
    assert.notStrictEqual(fp1, fp2, 'Fingerprints should not match');

    const result = await deduplicateUserQuizzes([q1, q2]);
    assert.strictEqual(result.deduplicatedQuizzes.length, 2, 'Both quizzes must remain');
    assert.strictEqual(result.hasChanges, false);
  });

  // 4. Same content with harmless whitespace differences -> treated as identical
  await test('4. Same content with harmless whitespace differences -> treated as identical', async () => {
    const q1: QuizRecord = {
      id: 'quiz_1',
      title: 'History',
      questionsList: [{ question: ' When did WWII end?  \r\n', answers: [{ text: ' 1945 ', isCorrect: true }, { text: '1939\t', isCorrect: false }] }],
      flashcards: [{ front: '  Allies ', back: ' Coalition  forces\r\n' }]
    };
    const q2: QuizRecord = {
      id: 'quiz_2',
      title: 'History Clean',
      questionsList: [{ question: 'When did WWII end?\n', answers: [{ text: '1945', isCorrect: true }, { text: '1939', isCorrect: false }] }],
      flashcards: [{ front: 'Allies', back: 'Coalition forces' }]
    };

    const fp1 = await computeQuizFingerprint(q1);
    const fp2 = await computeQuizFingerprint(q2);
    assert.strictEqual(fp1, fp2, 'Normalized fingerprints must be identical');

    const result = await deduplicateUserQuizzes([q1, q2]);
    assert.strictEqual(result.deduplicatedQuizzes.length, 1);
  });

  // 5. Different answer options -> not treated as identical
  await test('5. Different answer options -> not treated as identical', async () => {
    const q1: QuizRecord = {
      id: 'quiz_1',
      title: 'Geography',
      questionsList: [{ question: 'Capital of France?', answers: [{ text: 'Paris', isCorrect: true }, { text: 'Lyon', isCorrect: false }] }]
    };
    const q2: QuizRecord = {
      id: 'quiz_2',
      title: 'Geography Var',
      questionsList: [{ question: 'Capital of France?', answers: [{ text: 'Paris', isCorrect: true }, { text: 'Marseille', isCorrect: false }] }]
    };

    const fp1 = await computeQuizFingerprint(q1);
    const fp2 = await computeQuizFingerprint(q2);
    assert.notStrictEqual(fp1, fp2, 'Different answer choices must not match');

    const result = await deduplicateUserQuizzes([q1, q2]);
    assert.strictEqual(result.deduplicatedQuizzes.length, 2);
  });

  // 6. Duplicate quizzes with different attempts -> attempts/progress are merged before deletion
  await test('6. Duplicate quizzes with different attempts -> attempts/progress are merged before deletion', async () => {
    const q1: QuizRecord = {
      id: 'quiz_1',
      title: 'CS 101',
      questionsList: [{ id: 'q_1', question: 'What is a pointer?', answers: [{ text: 'Memory address', isCorrect: true }] }],
      flashcards: [{ front: 'Heap', back: 'Dynamic memory', interval: 3, repetition: 2 }],
      attempts: [{ id: 'att_1', score: 10, total: 10, date: 1700000000 }],
      uniqueCorrectIds: ['q_1'],
      wrongQuestions: []
    };
    const q2: QuizRecord = {
      id: 'quiz_2',
      title: 'CS 101 Copy',
      questionsList: [{ id: 'q_1', question: 'What is a pointer?', answers: [{ text: 'Memory address', isCorrect: true }] }],
      flashcards: [{ front: 'Heap', back: 'Dynamic memory', interval: 5, repetition: 4 }],
      attempts: [{ id: 'att_2', score: 8, total: 10, date: 1700005000 }],
      uniqueCorrectIds: [],
      wrongQuestions: ['q_1']
    };

    const result = await deduplicateUserQuizzes([q1, q2]);
    assert.strictEqual(result.deduplicatedQuizzes.length, 1);
    const retained = result.deduplicatedQuizzes[0];
    assert.strictEqual(retained.attempts?.length, 2, 'Both attempts should be merged');
    assert.deepStrictEqual(retained.uniqueCorrectIds, ['q_1'], 'Correct IDs should be merged');
    assert.strictEqual(retained.wrongQuestions?.length, 0, 'Wrong questions should be filtered against known correct IDs');
    assert.strictEqual(retained.flashcards?.[0]?.interval, 5, 'Highest spaced repetition interval should be preserved');
  });

  // 7. Duplicate quizzes belonging to different users -> neither is deleted
  await test('7. Duplicate quizzes belonging to different users -> neither is deleted', async () => {
    const q1: QuizRecord = {
      id: 'quiz_userA',
      userId: 'user_A',
      title: 'Shared Material',
      questionsList: [{ question: '2 * 3 = ?', answers: [{ text: '6', isCorrect: true }] }]
    };
    const q2: QuizRecord = {
      id: 'quiz_userB',
      userId: 'user_B',
      title: 'Shared Material',
      questionsList: [{ question: '2 * 3 = ?', answers: [{ text: '6', isCorrect: true }] }]
    };

    // When deduplicating for user_A
    const resultUserA = await deduplicateUserQuizzes([q1, q2], { currentUserId: 'user_A' });
    assert.strictEqual(resultUserA.deduplicatedQuizzes.length, 2, 'Should not modify or delete other user quizzes');
    assert.strictEqual(resultUserA.removedQuizIds.length, 0);
  });

  // 8. Duplicate quizzes with different master_quiz_id values -> local duplicate removed without deleting master record
  await test('8. Duplicate quizzes with different master_quiz_id values -> local duplicate removed without deleting master record', async () => {
    const q1: QuizRecord = {
      id: 'quiz_local_1',
      masterQuizId: 'uq_master_aaa',
      title: 'Physics',
      questionsList: [{ question: 'F = ma?', answers: [{ text: 'Yes', isCorrect: true }] }]
    };
    const q2: QuizRecord = {
      id: 'quiz_local_2',
      masterQuizId: 'uq_master_bbb',
      title: 'Physics Duplicate',
      questionsList: [{ question: 'F = ma?', answers: [{ text: 'Yes', isCorrect: true }] }]
    };

    const result = await deduplicateUserQuizzes([q1, q2]);
    assert.strictEqual(result.deduplicatedQuizzes.length, 1, 'Only 1 local quiz remains');
    assert.strictEqual(result.removedQuizIds.length, 1, 'Duplicate local ID is marked for removal');
    // Ensure the retained quiz keeps a valid master reference
    assert.ok(result.deduplicatedQuizzes[0].masterQuizId, 'Retained quiz has masterQuizId');
  });

  // 9. Running deduplication twice -> no additional changes (idempotency)
  await test('9. Running deduplication twice -> no additional changes (idempotent)', async () => {
    const q1: QuizRecord = {
      id: 'quiz_1',
      title: 'Art History',
      questionsList: [{ question: 'Who painted Mona Lisa?', answers: [{ text: 'Da Vinci', isCorrect: true }] }]
    };
    const q2: QuizRecord = {
      id: 'quiz_2',
      title: 'Art History',
      questionsList: [{ question: 'Who painted Mona Lisa?', answers: [{ text: 'Da Vinci', isCorrect: true }] }]
    };

    const pass1 = await deduplicateUserQuizzes([q1, q2]);
    assert.strictEqual(pass1.deduplicatedQuizzes.length, 1);
    assert.strictEqual(pass1.hasChanges, true);

    const pass2 = await deduplicateUserQuizzes(pass1.deduplicatedQuizzes);
    assert.strictEqual(pass2.deduplicatedQuizzes.length, 1);
    assert.strictEqual(pass2.hasChanges, false);
    assert.strictEqual(pass2.removedQuizIds.length, 0);
  });

  // 10. Failed progress merge / write safety -> duplicate is retained and no data is deleted
  await test('10. Failed progress merge / write safety -> duplicate is retained and no data is deleted', async () => {
    const q1: QuizRecord = {
      id: 'quiz_corrupted',
      title: 'Corrupted Quiz',
      questionsList: null as any // deliberately unhashable/null to test graceful handling
    };
    const q2: QuizRecord = {
      id: 'quiz_valid',
      title: 'Valid Quiz',
      questionsList: [{ question: 'Valid Q', answers: [{ text: 'Valid A', isCorrect: true }] }]
    };

    const result = await deduplicateUserQuizzes([q1, q2]);
    assert.strictEqual(result.deduplicatedQuizzes.length, 2, 'Both quizzes retained safely on error');
    assert.strictEqual(result.removedQuizIds.length, 0, 'No quizzes deleted on unhandled structures');
  });

  console.log(`\n--- Test Results: ${passed} Passed, ${failed} Failed ---`);
  if (failed > 0) process.exit(1);
}

runTests();
