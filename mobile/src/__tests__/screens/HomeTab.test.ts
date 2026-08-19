describe('HomeTab Screen Data Selectors', () => {
  const quizzes = [
    { id: 'q1', title: 'Biology', questions: 5, uniqueCorrectIds: ['1', '2'], attempts: [{ score: 80, date: 1000 }] },
    { id: 'q2', title: 'Completed Quiz', questions: 3, uniqueCorrectIds: ['1', '2', '3'], attempts: [{ score: 100, date: 2000 }] },
    { id: 'q3', title: 'New Quiz', questions: 4, uniqueCorrectIds: [], attempts: [] },
  ];

  function getInProgressQuizzes(items: any[]) {
    return items.filter((q) => {
      const correctCount = (q.uniqueCorrectIds || []).length;
      const total = q.questions || 1;
      return correctCount < total;
    });
  }

  it('selects only unfinished quizzes for Continue Learning carousel', () => {
    const inProgress = getInProgressQuizzes(quizzes);
    expect(inProgress.length).toBe(2);
    expect(inProgress.map((q) => q.id)).toEqual(['q1', 'q3']);
  });
});
