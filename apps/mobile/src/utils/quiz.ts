export function generateMockQuestionsForQuiz(title: string, count: number) {
  const list = [];
  for (let i = 1; i <= count; i++) {
    list.push({
      id: `mock-${title}-${i}`,
      prompt: `Question ${i}: This is a mock question for ${title}. Which of the following options is correct?`,
      answers: [
        { id: `opt-${i}-1`, text: `Incorrect option A for question ${i}`, isCorrect: false },
        { id: `opt-${i}-2`, text: `Correct option B for question ${i}`, isCorrect: true },
        { id: `opt-${i}-3`, text: `Incorrect option C for question ${i}`, isCorrect: false },
        { id: `opt-${i}-4`, text: `Incorrect option D for question ${i}`, isCorrect: false },
      ],
      type: "single_choice" as const,
    });
  }
  return list;
}

export function getCategoryIconDetails(categoryStr: string) {
  return {
    bg: "rgba(99, 102, 241, 0.1)",
    border: "rgba(99, 102, 241, 0.25)",
    color: "#6366f1",
    iconType: "Ionicons" as const,
    iconName: "document-text-outline" as const
  };
}
