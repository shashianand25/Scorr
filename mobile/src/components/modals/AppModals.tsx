import React from "react";
import { QuizActionModals } from "./QuizActionModals";
import { FeedbackLegalModals } from "./FeedbackLegalModals";
import { QuizCreationModals } from "./QuizCreationModals";
import { LibraryAddModals } from "./LibraryAddModals";
import { BattleResultModal } from "./BattleResultModal";
import type { HomeScreenProps } from "../../types/HomeScreenProps";

// Re-export previously split modal components
export { QuizActionsModal } from "./QuizActionsModal";
export { RenameQuizModal, ImportLoadingModal, ImportErrorModal, DeleteQuizModal } from "./RenameDeleteModals";
export { ResetStatsModal, LogoutConfirmModal, DeleteAccountModal, QuitQuizModal, RestartQuizModal, QuizCreatedModal } from "./ConfirmationModals";
export { OfflineModal } from "./OfflineModal";

/**
 * AppModals — thin compositor for all modal groups.
 * Delegates to focused modal group components.
 */
export function AppModals({ p }: { p: any }) {
  return (
    <>
      <QuizActionModals p={p} />
      <FeedbackLegalModals p={p} />
      <QuizCreationModals p={p} />
      <LibraryAddModals p={p} />
      <BattleResultModal p={p} />
    </>
  );
}
