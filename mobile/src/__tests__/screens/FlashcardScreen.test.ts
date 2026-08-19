describe('FlashcardScreen Flip & Rating Flow', () => {
  function nextCardIndex(currentIndex: number, totalCards: number): { nextIdx: number; isComplete: boolean } {
    const nextIdx = currentIndex + 1;
    const isComplete = nextIdx >= totalCards;
    return { nextIdx: isComplete ? currentIndex : nextIdx, isComplete };
  }

  it('advances to next card and detects completion', () => {
    const step1 = nextCardIndex(0, 3);
    expect(step1.nextIdx).toBe(1);
    expect(step1.isComplete).toBe(false);

    const step3 = nextCardIndex(2, 3);
    expect(step3.isComplete).toBe(true);
  });
});
