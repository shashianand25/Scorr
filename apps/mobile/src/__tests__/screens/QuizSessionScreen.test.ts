describe('QuizSessionScreen Timer and Answer Selection', () => {
  function toggleAnswerSelection(currentSelected: string[], answerId: string, isSingleSelect: boolean): string[] {
    if (isSingleSelect) {
      return currentSelected.includes(answerId) ? [] : [answerId];
    }
    if (currentSelected.includes(answerId)) {
      return currentSelected.filter((id) => id !== answerId);
    }
    return [...currentSelected, answerId];
  }

  it('toggles answers in single selection mode', () => {
    expect(toggleAnswerSelection([], 'a1', true)).toEqual(['a1']);
    expect(toggleAnswerSelection(['a1'], 'a2', true)).toEqual(['a2']);
    expect(toggleAnswerSelection(['a1'], 'a1', true)).toEqual([]);
  });

  it('toggles answers in multi-select mode', () => {
    expect(toggleAnswerSelection(['a1'], 'a2', false)).toEqual(['a1', 'a2']);
    expect(toggleAnswerSelection(['a1', 'a2'], 'a1', false)).toEqual(['a2']);
  });
});
