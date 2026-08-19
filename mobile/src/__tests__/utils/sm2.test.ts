import { calculateNextReview } from '../../utils/sm2';

describe('SM-2 algorithm', () => {
  it('returns nextReviewAt in the future', () => {
    const result = calculateNextReview({ easeFactor: 2.5, interval: 1, repetitions: 0 }, 'good');
    expect(result.nextReviewAt).toBeGreaterThan(Date.now() - 1000);
  });

  it('resets interval to 1 on "again"', () => {
    const result = calculateNextReview({ easeFactor: 2.5, interval: 10, repetitions: 5 }, 'again');
    expect(result.interval).toBe(1);
  });

  it('easy interval >= good interval', () => {
    const base = { easeFactor: 2.5, interval: 1, repetitions: 1 };
    const good = calculateNextReview(base, 'good');
    const easy = calculateNextReview(base, 'easy');
    expect(easy.interval).toBeGreaterThanOrEqual(good.interval);
  });

  it('easeFactor decreases on "hard"', () => {
    const result = calculateNextReview({ easeFactor: 2.5, interval: 6, repetitions: 3 }, 'hard');
    expect(result.easeFactor).toBeLessThan(2.5);
  });

  it('easeFactor never drops below 1.3', () => {
    let state = { easeFactor: 1.4, interval: 1, repetitions: 0 };
    for (let i = 0; i < 20; i++) state = calculateNextReview(state, 'again');
    expect(state.easeFactor).toBeGreaterThanOrEqual(1.3);
  });
});
