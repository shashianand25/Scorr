/**
 * analytics.ts — Central event tracking for Scorr
 *
 * Routes to:
 *   • PostHog  — dashboards, funnels, retention (posthog.com)
 *   • Sentry   — breadcrumbs around crashes
 *
 * PII POLICY (enforced by this module):
 *   ✗  No user emails or display names
 *   ✗  No quiz titles or question content
 *   ✗  No file names
 *   ✓  Only metadata: counts, modes, durations, boolean outcomes
 */

import * as Sentry from "@sentry/react-native";
import { PostHog } from "posthog-react-native";

// ── PostHog client ────────────────────────────────────────────────────────────
// Dashboard: https://eu.posthog.com  (EU-hosted, GDPR-friendly)
// Key comes from EXPO_PUBLIC_POSTHOG_KEY in .env / eas.json
const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY || "";
const isPostHogDisabled = !POSTHOG_KEY || POSTHOG_KEY.includes("PASTE_YOUR_KEY");

export const posthog = new PostHog(
  POSTHOG_KEY,
  {
    host: "https://eu.i.posthog.com",
    disabled: isPostHogDisabled,
  }
);

// ── Identify a user (call after login, clear on logout) ──────────────────────
// Only pass the Firebase UID — no emails.
export function identifyUser(uid: string) {
  try {
    if (!isPostHogDisabled && uid) {
      posthog.identify(uid);
    }
  } catch (e) {
    // Gracefully handle any identification errors
  }
}

export function clearUser() {
  try {
    if (!isPostHogDisabled) {
      posthog.reset();
    }
  } catch (e) {
    // Gracefully handle any reset errors
  }
}

// ── Internal helper ───────────────────────────────────────────────────────────
function send(event: string, props: Record<string, string | number | boolean>) {
  try {
    if (!isPostHogDisabled) {
      posthog.capture(event, props);
    }
  } catch (e) {
    // Gracefully handle any network/capture errors
  }

  try {
    // Sentry: breadcrumb for crash context
    Sentry.addBreadcrumb({
      category: "analytics",
      message: event,
      data: props,
      level: "info",
    });
  } catch (e) {
    // Ignore breadcrumb errors
  }
}

// ── Events ────────────────────────────────────────────────────────────────────

/** A quiz was created (AI, manual draft, import, or shared-link save) */
export function trackQuizCreated(props: {
  source: "ai" | "manual" | "import" | "shared_link";
  questionCount: number;
  flashcardCount?: number;
}) {
  send("quiz_created", props);
}

/** User started a quiz session */
export function trackQuizStarted(props: {
  mode: string; // 'all' | 'wrong' | 'unanswered' | 'random' | 'range'
  questionCount: number;
  shuffleAnswers: boolean;
  showAnswerOnSubmit: boolean;
  hasTimeLimit: boolean;
}) {
  send("quiz_started", props);
}

/** User finished a quiz session to the results screen */
export function trackQuizCompleted(props: {
  questionCount: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  mode: string;
  durationSeconds: number;
  scorePct: number; // 0–100
}) {
  send("quiz_completed", props);
}

/** AI generation was triggered */
export function trackAiGenerationStarted(props: {
  charCount: number;
  chunkCount: number;
}) {
  send("ai_generation_started", props);
}

/** AI generation finished successfully */
export function trackAiGenerationSucceeded(props: {
  questionCount: number;
  chunkCount: number;
  durationMs: number;
  hadBackgroundPhase: boolean;
}) {
  send("ai_generation_succeeded", props);
}

/** AI generation failed */
export function trackAiGenerationFailed(props: {
  errorType: "network" | "limit_reached" | "no_questions" | "disabled" | "unknown";
  chunkCount: number;
}) {
  send("ai_generation_failed", props);
}

/** User started a battle */
export function trackBattleStarted(props: {
  questionCount: number;
  hasTimePerQuestion: boolean;
  isHost: boolean;
}) {
  send("battle_started", props);
}

/** Battle completed */
export function trackBattleCompleted(props: {
  won: boolean;
  myScore: number;
  opponentScore: number;
  questionCount: number;
}) {
  send("battle_completed", props);
}

/** User tapped Share on a quiz */
export function trackShareLinkTapped(props: {
  questionCount: number;
  isAiGenerated: boolean;
}) {
  send("share_link_tapped", props);
}
