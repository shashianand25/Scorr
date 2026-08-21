/**
 * AddTab — thin coordinator for the Create/Add tab.
 * Delegates rendering to sub-components based on creationMode and creationStep.
 *
 * Sub-components:
 *   FlashcardEditor  → components/add/FlashcardEditor.tsx  (flashcard creation UI)
 *   QuizSetupView    → components/add/QuizSetupView.tsx    (quiz setup form)
 *   QuizDraftingView → components/add/QuizDraftingView.tsx (question drafting editor)
 */
import React from "react";
import { FlashcardEditor } from "../components/add/FlashcardEditor";
import { QuizSetupView } from "../components/add/QuizSetupView";
import { QuizDraftingView } from "../components/add/QuizDraftingView";

export { FlashcardEditor, QuizSetupView, QuizDraftingView };

export function AddTab({ p }: { p: any }) {
  const { creationMode, creationStep } = p;

  if (creationMode === "flashcard" || creationMode === "edit-flashcard") {
    return <FlashcardEditor p={p} />;
  }

  if (creationMode === "quiz" && creationStep === "setup") {
    return <QuizSetupView p={p} />;
  }

  if (creationMode === "quiz" && creationStep === "drafting") {
    return <QuizDraftingView p={p} />;
  }

  // Default: let FlashcardEditor handle the pick screen (it renders first)
  return <FlashcardEditor p={p} />;
}
