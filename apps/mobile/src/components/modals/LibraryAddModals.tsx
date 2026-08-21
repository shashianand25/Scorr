/**
 * LibraryAddModals — coordinator that renders library and flashcard modal sub-components.
 * Modals are split into library/AddMenuModals.tsx and library/FlashcardOptionModals.tsx.
 */
import React from "react";
import { AddMenuModals } from "./library/AddMenuModals";
import { FlashcardOptionModals } from "./library/FlashcardOptionModals";

export { AddMenuModals, FlashcardOptionModals };

/** Renders all library-related modals: add menu, deck report, flashcard options, language picker. */
export function LibraryAddModals({ p }: { p: any }) {
  return (
    <>
      <AddMenuModals p={p} />
      <FlashcardOptionModals p={p} />
    </>
  );
}
