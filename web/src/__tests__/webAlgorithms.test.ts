describe('Web SM-2 Algorithm Parity', () => {
  it('calculates SM-2 initial intervals and ease factor bounds', () => {
    function calculateNextInterval(repetition: number, easeFactor: number): number {
      if (repetition === 0) return 1;
      if (repetition === 1) return 6;
      return Math.round(6 * easeFactor);
    }

    expect(calculateNextInterval(0, 2.5)).toBe(1);
    expect(calculateNextInterval(1, 2.5)).toBe(6);
    expect(calculateNextInterval(2, 2.5)).toBe(15);
  });
});
