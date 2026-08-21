describe('Quiz Data Filtering & Tombstone Exclusions', () => {
  const mockQuizzes = [
    { id: 'q1', neonId: 'n1', title: 'Calculus I', questions: 10, category: 'Math' },
    { id: 'q2', neonId: 'n2', title: 'Physics Mechanics', questions: 15, category: 'Science' },
    { id: 'q3', neonId: null, title: 'Chemistry Lab', questions: 8, category: 'Science' },
  ];

  function filterActiveQuizzes(quizzes: any[], tombstoneSet: Set<string>, searchQuery = ''): any[] {
    return quizzes.filter((q) => {
      if (tombstoneSet.has(q.id) || (q.neonId && tombstoneSet.has(q.neonId))) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchTitle = q.title.toLowerCase().includes(query);
        const matchCategory = (q.category || '').toLowerCase().includes(query);
        return matchTitle || matchCategory;
      }
      return true;
    });
  }

  it('filters out deleted quizzes present in tombstone set', () => {
    const tombstones = new Set(['q2']);
    const active = filterActiveQuizzes(mockQuizzes, tombstones);
    expect(active.length).toBe(2);
    expect(active.map((q) => q.id)).toEqual(['q1', 'q3']);
  });

  it('filters by case-insensitive title search query', () => {
    const tombstones = new Set<string>();
    const filtered = filterActiveQuizzes(mockQuizzes, tombstones, 'calculus');
    expect(filtered.length).toBe(1);
    expect(filtered[0].title).toBe('Calculus I');
  });
});
