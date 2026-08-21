/**
 * HomeScreen handlers — all event handler functions for HomeScreen.
 * These close over HomeScreen state via the React component closure.
 * 
 * NOTE: These are defined inline in HomeScreen and collected into the `p`
 * prop object that flows to child screen components. This file serves as
 * documentation of the handler surface area.
 *
 * Extracted from mobile/src/app/index.tsx to reduce god-file size.
 */

// The handlers below are defined inside HomeScreen() and are referenced
// by their variable names. See index.tsx for the actual runtime definitions.

export type HomeScreenHandlers = {
  handleStartQuiz: (quiz: any, options?: any) => void;
  handleDeleteAttemptOnMobile: (quizId: string, attemptId: string) => void;
  handleClearHistoryOnMobile: (quizId: string) => void;
  handleDeleteQuizOnMobile: (quizId: string) => void;
  handleCheckAnswer: (questionId: string) => void;
  handleAnswerSelect: (question: any, answerId: string) => void;
  handleNavigateSession: (idx: number) => void;
  handleFinishSession: () => void;
  handleImportQst: (text: string, fileName: string, sourceUri?: string) => void;
  handleOpenQuizOptions: (quiz: any) => void;
  handleShareQuiz: (quiz: any) => Promise<void>;
  handleProceedToDrafting: () => void;
  handleSaveDraftedQuiz: () => void;
  handleGenerateWithAI: (text: string, options?: any) => Promise<void>;
  handleDraftBack: () => void;
  handleSM2Rating: (rating: "again" | "hard" | "good" | "easy" | "perfect") => void;
  handleHostBattle: (quizId: string, source?: "lobby" | "insights") => void;
  handleStartBattle: () => Promise<void>;
  handleJoinBattle: () => Promise<void>;
  handleCancelAiGeneration: () => void;
  handleRequestCancelGeneration: () => void;
  handlePullRefresh: () => Promise<void>;
};
