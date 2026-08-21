import React from "react";
import {
  ResetStatsModal,
  LogoutConfirmModal,
  DeleteAccountModal,
  QuitQuizModal,
  RestartQuizModal,
  QuizCreatedModal,
} from "./ConfirmationModals";
import type { HomeScreenProps } from "../../types/HomeScreenProps";

export {
  ResetStatsModal,
  LogoutConfirmModal,
  DeleteAccountModal,
  QuitQuizModal,
  RestartQuizModal,
  QuizCreatedModal,
};

/** Renders all session confirmation modals: reset, logout, delete, quit, settings, restart. */
export function SessionConfirmationModals({ p }: { p: HomeScreenProps }) {
  return (
    <>
      <ResetStatsModal p={p} />
      <LogoutConfirmModal p={p} />
      <DeleteAccountModal p={p} />
      <QuitQuizModal p={p} />
      <RestartQuizModal p={p} />
      <QuizCreatedModal p={p} />
    </>
  );
}
