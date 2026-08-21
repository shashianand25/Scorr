describe("AddTab Quiz Drafting Actions", () => {
  interface DraftQuestion {
    id: string;
    prompt: string;
    answers: { id: string; text: string; isCorrect: boolean }[];
  }

  function addDraftQuestion(draft: DraftQuestion[]): DraftQuestion[] {
    const newQ: DraftQuestion = {
      id: "dq-" + (draft.length + 1),
      prompt: "",
      answers: [
        { id: "a1", text: "", isCorrect: true },
        { id: "a2", text: "", isCorrect: false },
      ],
    };
    return [...draft, newQ];
  }

  function toggleOptionCorrectness(question: DraftQuestion, answerId: string): DraftQuestion {
    return {
      ...question,
      answers: question.answers.map((a) => (a.id === answerId ? { ...a, isCorrect: !a.isCorrect } : a)),
    };
  }

  it("adds a new empty question with 2 default answer slots", () => {
    const initialDraft: DraftQuestion[] = [];
    const updated = addDraftQuestion(initialDraft);
    expect(updated.length).toBe(1);
    expect(updated[0].answers.length).toBe(2);
    expect(updated[0].answers[0].isCorrect).toBe(true);
  });

  it("toggles correct answer selection correctly", () => {
    const q: DraftQuestion = {
      id: "q1",
      prompt: "Q",
      answers: [
        { id: "a1", text: "1", isCorrect: true },
        { id: "a2", text: "2", isCorrect: false },
      ],
    };
    const updated = toggleOptionCorrectness(q, "a2");
    expect(updated.answers.find((a) => a.id === "a2")?.isCorrect).toBe(true);
  });
});
