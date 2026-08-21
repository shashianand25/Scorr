import { Scheduler, CardState, Rating } from '../../utils/sm2';

describe('SM-2 Spaced Repetition Scheduler', () => {
  const baseCard = {
    id: 'card-1',
    front: 'What is mitochondria?',
    back: 'Powerhouse of the cell',
    sm2_easeFactor: 2.5,
    sm2_repetition: 0,
    sm2_interval: 0,
    sm2_state: CardState.NEW,
    sm2_nextReviewDate: null,
  };

  describe('New Cards (Initial Learning Phase)', () => {
    it('initializes with default values when properties are missing', () => {
      const bareCard = { id: 'card-bare', front: 'Q', back: 'A' };
      const scheduled = Scheduler.schedule(bareCard, 'good');
      expect(scheduled.sm2_easeFactor).toBe(2.5);
      expect(scheduled.sm2_nextReviewDate).toBeDefined();
    });

    it('advances to next learning step on "good" rating', () => {
      const res = Scheduler.schedule(baseCard, 'good');
      expect(res.sm2_interval).toBe(1); // Step 1 (10 mins)
      expect(res.sm2_nextReviewDate).toBeGreaterThan(Date.now());
    });

    it('graduates to REVIEW state after completing learning steps on "good"', () => {
      // Advance step 1
      const step1 = Scheduler.schedule(baseCard, 'good');
      // Advance step 2 (graduation)
      const graduated = Scheduler.schedule(step1, 'good');
      expect(graduated.sm2_state).toBe(CardState.REVIEW);
      expect(graduated.sm2_interval).toBe(1); // 1 day interval
      expect(graduated.sm2_repetition).toBe(1);
    });

    it('immediately graduates to REVIEW on "easy" or "perfect" rating', () => {
      const easyRes = Scheduler.schedule(baseCard, 'easy');
      expect(easyRes.sm2_state).toBe(CardState.REVIEW);
      expect(easyRes.sm2_interval).toBe(4); // 4 days interval
      expect(easyRes.sm2_repetition).toBe(1);

      const perfectRes = Scheduler.schedule(baseCard, 'perfect');
      expect(perfectRes.sm2_state).toBe(CardState.REVIEW);
      expect(perfectRes.sm2_interval).toBe(4);
    });

    it('resets to first learning step on "again" rating', () => {
      const step1 = Scheduler.schedule(baseCard, 'good');
      const reset = Scheduler.schedule(step1, 'again');
      expect(reset.sm2_interval).toBe(0);
      expect(reset.sm2_nextReviewDate).toBeGreaterThan(Date.now() - 1000);
    });
  });

  describe('Review Phase Cards', () => {
    const reviewCard = {
      ...baseCard,
      sm2_state: CardState.REVIEW,
      sm2_interval: 5,
      sm2_repetition: 2,
      sm2_easeFactor: 2.5,
      sm2_nextReviewDate: Date.now() - 10000,
    };

    it('multiplies interval by easeFactor on "good" rating', () => {
      const res = Scheduler.schedule(reviewCard, 'good');
      expect(res.sm2_repetition).toBe(3);
      expect(res.sm2_interval).toBe(5 * 2.5); // 12.5 days
      expect(res.sm2_easeFactor).toBe(2.5); // unchanged on good
    });

    it('increases easeFactor and adds bonus multiplier on "easy" rating', () => {
      const res = Scheduler.schedule(reviewCard, 'easy');
      expect(res.sm2_repetition).toBe(3);
      expect(res.sm2_easeFactor).toBeCloseTo(2.65, 2);
      expect(res.sm2_interval).toBe(5 * 2.5 * 1.3); // interval * EF * EASY_BONUS
    });

    it('reduces easeFactor and uses hard multiplier on "hard" rating', () => {
      const res = Scheduler.schedule(reviewCard, 'hard');
      expect(res.sm2_easeFactor).toBeCloseTo(2.35, 2); // 2.5 - 0.15
      expect(res.sm2_interval).toBe(5 * 1.2); // 6 days
    });

    it('transitions to RELEARNING and resets repetitions on "again" rating', () => {
      const res = Scheduler.schedule(reviewCard, 'again');
      expect(res.sm2_state).toBe(CardState.RELEARNING);
      expect(res.sm2_interval).toBe(0);
      expect(res.sm2_repetition).toBe(0);
      expect(res.sm2_easeFactor).toBeCloseTo(2.3, 2); // 2.5 - 0.2
    });

    it('never drops easeFactor below MIN_EASE_FACTOR (1.3)', () => {
      let card = { ...reviewCard, sm2_easeFactor: 1.35 };
      card = Scheduler.schedule(card, 'again');
      expect(card.sm2_easeFactor).toBe(1.3);

      // Subsequent failures stay at 1.3
      card = Scheduler.schedule(card, 'again');
      expect(card.sm2_easeFactor).toBe(1.3);
    });
  });
});
