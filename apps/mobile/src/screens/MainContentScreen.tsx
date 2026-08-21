import React from "react";
import { useTranslation } from "react-i18next";
import { InsightsTabScreen, DeckInsightsTab } from "./InsightsTabScreen";
import { ActiveSessionScreen, ResultsScreen } from "./QuizSessionScreen";
import { BattleLobbyScreen } from "./BattleScreen";
import { FlashcardsScreen } from "./FlashcardScreen";
import { LibraryTab } from "./LibraryTab";
import { AddTab } from "./AddTab";
import { GuideTab } from "./GuideTab";
import { MenuTab } from "./MenuTab";
import { HomeTab } from "./HomeTab";
import type { HomeScreenProps } from "../types/HomeScreenProps";
import type { QuizSessionProps } from "../types/QuizSessionProps";

/**
 * MainContentScreen — thin tab router.
 * Delegates rendering entirely to per-tab screen components.
 * All state and handlers flow through the typed p prop.
 */
export function MainContentScreen({ p, overrideTab }: { p: HomeScreenProps; overrideTab?: string }) {
  const tabToRender = overrideTab || p?.activeTab || "home";

  // Active quiz session takes priority over tab routing
  if (p.activeSession && !p.activeSession.isFinished) {
    return <ActiveSessionScreen p={p as unknown as QuizSessionProps} />;
  }
  if (p.activeSession?.isFinished) {
    return <ResultsScreen p={p as unknown as QuizSessionProps} />;
  }

  switch (tabToRender) {
    case "insights":
    case "insights-flashcard":
    case "bookmarked-questions":
      return p.viewingInsightsDeck
        ? <DeckInsightsTab p={p} />
        : <InsightsTabScreen p={p} />;

    case "library":
      return <LibraryTab p={p} />;

    case "battle":
      return <BattleLobbyScreen p={p} />;

    case "add":
      return <AddTab p={p} />;

    case "flashcards" as any:
      return <FlashcardsScreen p={p} />;

    case "guide":
      return <GuideTab p={p} />;

    case "menu":
      return <MenuTab p={p} />;

    default:
      return <HomeTab p={p} />;
  }
}
