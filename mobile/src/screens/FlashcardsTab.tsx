/**
 * FlashcardsTab — thin coordinator for flashcard tab rendering.
 * Delegates to:
 *   FlashcardStudyView  → components/flashcards/FlashcardStudyView.tsx (card-flip study session)
 *   FlashcardDeckList   → components/flashcards/FlashcardDeckList.tsx  (deck management list)
 */
import React from "react";
import { FlashcardStudyView } from "../components/flashcards/FlashcardStudyView";
import { FlashcardDeckList } from "../components/flashcards/FlashcardDeckList";

export { FlashcardStudyView, FlashcardDeckList };

/** Renders the active flashcard study session if a deck is being studied, otherwise shows the deck list. */
export function FlashcardsTab({ p }: { p: any }) {
  if (p.studyingDeck && (p.studyQueue?.length > 0 || p.isPreviewMode)) {
    return <FlashcardStudyView p={p} />;
  }
  return <FlashcardDeckList p={p} />;
}
