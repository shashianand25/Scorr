import React from "react";
import { QuizActionsSheet } from "./QuizActionsSheet";
import { SessionConfirmationModals } from "./SessionConfirmationModals";

/**
 * QuizActionModals — compositor for quiz action + session confirmation modals.
 * Delegates to:
 *   - QuizActionsSheet (381 lines) — bottom sheet + import loading
 *   - SessionConfirmationModals (529 lines) — reset/logout/quit/settings/report
 */
export function QuizActionModals({ p }: { p: any }) {
  return (
    <>
      <QuizActionsSheet p={p} />
      <SessionConfirmationModals p={p} />
    </>
  );
}
