describe('Quiz Session Scoring & Evaluation Algorithms', () => {
  const questions = [
    {
      id: 'q1',
      question: 'What is 2 + 2?',
      answers: [
        { id: 'a1', text: '4', isCorrect: true },
        { id: 'a2', text: '5', isCorrect: false },
      ],
    },
    {
      id: 'q2',
      question: 'Select primary colors (multi-select)',
      answers: [
        { id: 'a3', text: 'Red', isCorrect: true },
        { id: 'a4', text: 'Blue', isCorrect: true },
        { id: 'a5', text: 'Green', isCorrect: false },
      ],
    },
  ];

  function evaluateAnswers(questionsList: any[], userAnswers: Record<string, string[]>) {
    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;
    const correctIds: string[] = [];
    const wrongIds: string[] = [];

    questionsList.forEach((q) => {
      const selected = userAnswers[q.id] || [];
      const expectedCorrect = q.answers.filter((a: any) => a.isCorrect).map((a: any) => a.id);

      if (selected.length === 0) {
        skippedCount++;
        return;
      }

      const isCorrect =
        selected.length === expectedCorrect.length &&
        selected.every((id: string) => expectedCorrect.includes(id));

      if (isCorrect) {
        correctCount++;
        correctIds.push(q.id);
      } else {
        wrongCount++;
        wrongIds.push(q.id);
      }
    });

    const total = questionsList.length;
    const scorePct = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    return { correctCount, wrongCount, skippedCount, correctIds, wrongIds, scorePct };
  }

  it('correctly grades perfect single and multi-select answers as 100%', () => {
    const answers = {
      q1: ['a1'],
      q2: ['a3', 'a4'],
    };
    const result = evaluateAnswers(questions, answers);
    expect(result.correctCount).toBe(2);
    expect(result.wrongCount).toBe(0);
    expect(result.skippedCount).toBe(0);
    expect(result.scorePct).toBe(100);
    expect(result.correctIds).toEqual(['q1', 'q2']);
  });

  it('grades partially correct multi-select answers as wrong', () => {
    const answers = {
      q1: ['a1'],
      q2: ['a3'], // missed 'a4'
    };
    const result = evaluateAnswers(questions, answers);
    expect(result.correctCount).toBe(1);
    expect(result.wrongCount).toBe(1);
    expect(result.scorePct).toBe(50);
    expect(result.wrongIds).toEqual(['q2']);
  });

  it('marks unanswered questions as skipped', () => {
    const answers = {
      q1: ['a1'],
    };
    const result = evaluateAnswers(questions, answers);
    expect(result.correctCount).toBe(1);
    expect(result.skippedCount).toBe(1);
    expect(result.wrongCount).toBe(0);
    expect(result.scorePct).toBe(50);
  });
});
