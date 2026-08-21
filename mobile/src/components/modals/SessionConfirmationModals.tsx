/**
 * SessionConfirmationModals — coordinator for session and account confirmation modals.
 * Modals split into session/AccountConfirmModals.tsx and session/SessionControlModals.tsx.
 */
import React from "react";
import { AccountConfirmModals } from "./session/AccountConfirmModals";
import { SessionControlModals } from "./session/SessionControlModals";

export { AccountConfirmModals, SessionControlModals };

/** Renders all session confirmation modals: reset, logout, delete, quit, offline, settings, restart. */
export function SessionConfirmationModals({ p }: { p: any }) {
  return (
    <>
      <AccountConfirmModals p={p} />
      <SessionControlModals p={p} />
    </>
  );
}
