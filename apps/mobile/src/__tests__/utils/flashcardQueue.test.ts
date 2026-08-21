import { CardState } from '../../utils/sm2';

describe('Flashcard Deck & Study Queue Operations', () => {
  const now = Date.now();
  const mockCards = [
    { id: 'fc1', front: 'Card 1', back: 'Ans 1', sm2_state: CardState.NEW, sm2_nextReviewDate: null },
    { id: 'fc2', front: 'Card 2', back: 'Ans 2', sm2_state: CardState.REVIEW, sm2_nextReviewDate: now - 3600000 }, // Due 1 hr ago
    { id: 'fc3', front: 'Card 3', back: 'Ans 3', sm2_state: CardState.REVIEW, sm2_nextReviewDate: now + 86400000 }, // Due in 24 hrs
    { id: 'fc4', front: 'Card 4', back: 'Ans 4', sm2_state: CardState.LEARNING, sm2_nextReviewDate: now - 60000 }, // Due 1 min ago
  ];

  function getDueCards(cards: any[]): any[] {
    const currentTime = Date.now();
    return cards.filter((c) => !c.sm2_nextReviewDate || c.sm2_nextReviewDate <= currentTime);
  }

  function calculateDeckProgress(cards: any[]) {
    if (!cards || cards.length === 0) return { total: 0, studied: 0, mastered: 0, progressPct: 0 };
    const total = cards.length;
    const studied = cards.filter((c) => !!c.sm2_nextReviewDate).length;
    const mastered = cards.filter((c) => c.sm2_state === CardState.REVIEW && (c.sm2_interval || 0) >= 21).length;
    const progressPct = Math.round((studied / total) * 100);
    return { total, studied, mastered, progressPct };
  }

  function generateReversedCards(cards: { front: string; back: string }[]) {
    const generated: { front: string; back: string }[] = [];
    cards.forEach((c) => {
      generated.push({ front: c.front, back: c.back });
      generated.push({ front: c.back, back: c.front });
    });
    return generated;
  }

  it('filters cards due for review including unstudied new cards and past due cards', () => {
    const due = getDueCards(mockCards);
    expect(due.length).toBe(3); // fc1 (new), fc2 (past review), fc4 (past learning)
    expect(due.map((c) => c.id)).toEqual(['fc1', 'fc2', 'fc4']);
  });

  it('calculates deck completion and mastery statistics', () => {
    const stats = calculateDeckProgress(mockCards);
    expect(stats.total).toBe(4);
    expect(stats.studied).toBe(3); // fc2, fc3, fc4
    expect(stats.progressPct).toBe(75);
  });

  it('generates two-way reversible cards for reversed card decks', () => {
    const baseCards = [{ front: 'Bonjour', back: 'Hello' }];
    const reversed = generateReversedCards(baseCards);
    expect(reversed.length).toBe(2);
    expect(reversed[0]).toEqual({ front: 'Bonjour', back: 'Hello' });
    expect(reversed[1]).toEqual({ front: 'Hello', back: 'Bonjour' });
  });
});
