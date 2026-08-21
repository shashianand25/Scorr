import { computeContentHash } from "../lib/contentHash";
import { deduplicateUserQuizzes, QuizRecord } from "../lib/quizDeduplication";
import { parseQstText, questionsToSourceText } from "../lib/qstParser";
import { calculateSM2 } from "../lib/sm2";

describe("Web Integration Flow: End-to-End Quiz Creation & Review", () => {
  it("executes the full web flow from QST text parsing to content hashing and spaced repetition", async () => {
    const rawDocumentText = `
@title: Quantum Mechanics Intro
@category: Physics

? What is the Planck constant symbol?
+ h
- k
- c
- G

? What does the Heisenberg uncertainty principle limit?
+ Precision of position and momentum
- Speed of light
- Mass of electron
`;

    // Step 1: Parse QST Document
    const parsed = parseQstText(rawDocumentText);
    expect(parsed.title).toBe("Quantum Mechanics Intro");
    expect(parsed.category).toBe("Physics");
    expect(parsed.questions.length).toBe(2);

    // Step 2: Content Hash Generation
    const hash = await computeContentHash(rawDocumentText, "en");
    expect(hash).toHaveLength(64);

    // Step 3: Deduplication in Library
    const quizA: QuizRecord = {
      id: "existing_1",
      title: "Quantum Mechanics Intro",
      questionsList: parsed.questions,
      category: "Physics",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const quizB: QuizRecord = {
      id: "existing_2",
      title: "Quantum Mechanics Intro (Copy)",
      questionsList: parsed.questions,
      category: "Physics",
      createdAt: Date.now() + 1000,
      updatedAt: Date.now() + 1000,
    };

    const dedupeResult = await deduplicateUserQuizzes([quizA, quizB]);
    expect(dedupeResult.deduplicatedQuizzes.length).toBe(1);
    expect(dedupeResult.hasChanges).toBe(true);

    // Step 4: Re-serialize to master source text
    const sourceText = questionsToSourceText(parsed.title, parsed.category, parsed.questions, parsed.flashcards);
    expect(sourceText).toContain("Quantum Mechanics Intro");
    expect(sourceText).toContain("Planck constant");

    // Step 5: Simulate SM-2 spaced repetition state updates
    const initialSM2 = calculateSM2(3); // Good recall
    expect(initialSM2.sm2_repetition).toBe(1);
    expect(initialSM2.sm2_interval).toBe(1);

    const advancedSM2 = calculateSM2(4, initialSM2); // Easy recall
    expect(advancedSM2.sm2_repetition).toBe(2);
    expect((advancedSM2.sm2_easeFactor || 0)).toBeGreaterThanOrEqual(2.5);
  });
});
