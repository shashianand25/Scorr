// ── Flashcard Decks API Functions ─────────────────────────────────────────
// Archived from: mobile/src/lib/api.ts
// Removed: 2026-06-05

// ── Types ──────────────────────────────────────────────────────────────

export interface NeonFlashcardCard {
  id: string;
  front: string;
  back: string;
  order: number;
}

export interface NeonFlashcardDeck {
  id: string;
  title: string;
  cardType: string;
  updatedAt: string;
  createdAt: string;
  cards: NeonFlashcardCard[];
}

// ── API Calls ──────────────────────────────────────────────────────────

/**
 * Fetches all flashcard decks for the logged-in user from Neon.
 */
export async function fetchFlashcardDecks(
  userId: string
): Promise<{ decks: NeonFlashcardDeck[]; error: string | null }> {
  const { data, error } = await apiFetch<{ decks: NeonFlashcardDeck[] }>(
    `/api/flashcard-decks?userId=${encodeURIComponent(userId)}`
  );
  return { decks: data?.decks ?? [], error };
}

/**
 * Creates a new flashcard deck in Neon.
 * Returns the deck with its server-assigned id.
 */
export async function createFlashcardDeck(params: {
  userId: string;
  title: string;
  cardType: string;
  cards: { front: string; back: string }[];
}): Promise<{ deck: NeonFlashcardDeck | null; error: string | null }> {
  const { data, error } = await apiFetch<{ deck: NeonFlashcardDeck }>(
    "/api/flashcard-decks",
    { method: "POST", body: JSON.stringify(params) }
  );
  return { deck: data?.deck ?? null, error };
}

/**
 * Updates an existing deck in Neon (replaces cards wholesale).
 */
export async function updateFlashcardDeck(params: {
  userId: string;
  deckId: string;
  title?: string;
  cardType?: string;
  cards?: { front: string; back: string }[];
}): Promise<{ deck: NeonFlashcardDeck | null; error: string | null }> {
  const { data, error } = await apiFetch<{ deck: NeonFlashcardDeck }>(
    "/api/flashcard-decks",
    { method: "PUT", body: JSON.stringify(params) }
  );
  return { deck: data?.deck ?? null, error };
}

/**
 * Permanently deletes a deck from Neon.
 */
export async function deleteFlashcardDeck(
  userId: string,
  deckId: string
): Promise<{ error: string | null }> {
  const { error } = await apiFetch<{ ok: boolean }>(
    `/api/flashcard-decks?userId=${encodeURIComponent(userId)}&deckId=${encodeURIComponent(deckId)}`,
    { method: "DELETE" }
  );
  return { error };
}
