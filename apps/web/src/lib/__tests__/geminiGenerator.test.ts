import {
  buildGenerationPrompt,
  parseAIResponse,
} from "../geminiGenerator";

describe("geminiGenerator Service", () => {
  describe("buildGenerationPrompt", () => {
    it("replaces all template variables correctly", () => {
      const template = "Generate {questionCount} questions from: {sourceText}. Flashcards: {includeFlashcards}. Language: {language}";
      const prompt = buildGenerationPrompt(template, "Newton's Laws of Motion", 5, true, "English");

      expect(prompt).toContain("Generate 5 questions from: Newton's Laws of Motion.");
      expect(prompt).toContain("Flashcards: true.");
      expect(prompt).toContain("Language: English");
    });

    it("appends language instruction if template does not include {language}", () => {
      const template = "Generate {questionCount} MCQs from {sourceText}.";
      const prompt = buildGenerationPrompt(template, "Physics notes", 10, false, "Spanish");

      expect(prompt).toContain('Important: Generate all questions, options, explanations, and flashcards in "Spanish" language.');
    });

    it("truncates source text to 30,000 characters to prevent overflow", () => {
      const hugeText = "A".repeat(40000);
      const prompt = buildGenerationPrompt("{sourceText} - {language}", hugeText, 5, false, "English");

      expect(prompt.startsWith("A".repeat(30000))).toBe(true);
      expect(prompt).toContain("- English");
    });
  });

  describe("parseAIResponse", () => {
    it("parses valid JSON response successfully", () => {
      const mockJson = JSON.stringify({
        questions: [
          {
            question: "What is the speed of light?",
            answers: [
              { text: "3x10^8 m/s", isCorrect: true },
              { text: "100 m/s", isCorrect: false },
            ],
            explanation: "Fundamental constant.",
          },
        ],
        flashcards: [
          { front: "c", back: "Speed of light in vacuum" },
        ],
      });

      const { parsedQuestions, parsedFlashcards } = parseAIResponse(mockJson);

      expect(parsedQuestions.length).toBe(1);
      expect(parsedQuestions[0].question).toBe("What is the speed of light?");
      expect(parsedFlashcards.length).toBe(1);
      expect(parsedFlashcards[0].front).toBe("c");
    });

    it("strips markdown codeblock backticks and parses JSON", () => {
      const markdownWrapped = "```json\n" + JSON.stringify({
        questions: [{ question: "What is H2O?", answers: ["Water", "Hydrogen"] }],
      }) + "\n```";

      const { parsedQuestions } = parseAIResponse(markdownWrapped);

      expect(parsedQuestions.length).toBe(1);
      expect(parsedQuestions[0].question).toBe("What is H2O?");
    });

    it("falls back to QST text parsing when JSON is invalid or raw formatted text", () => {
      const rawQst = `
? What is the powerhouse of the cell?
+ Mitochondria
- Nucleus
- Ribosome
- Chloroplast
      `;

      const { parsedQuestions } = parseAIResponse(rawQst);

      expect(parsedQuestions.length).toBe(1);
      expect(parsedQuestions[0].prompt || parsedQuestions[0].question).toContain("powerhouse of the cell");
    });
  });
});
